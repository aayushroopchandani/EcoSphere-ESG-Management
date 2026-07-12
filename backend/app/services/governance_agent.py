from __future__ import annotations

import asyncio
import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from functools import lru_cache
from typing import Any, Literal, TypedDict

from bson import ObjectId
from langgraph.graph import END, StateGraph
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.models.dashboard import (
    ACTIVITY_LOGS_COLLECTION,
    DEPARTMENT_SCORES_COLLECTION,
    DEPARTMENTS_COLLECTION,
)
from app.models.environment import (
    CARBON_TRANSACTIONS_COLLECTION,
    EMISSION_FACTORS_COLLECTION,
    ENVIRONMENTAL_GOALS_COLLECTION,
)
from app.models.governance import (
    AUDITS_COLLECTION,
    COMPLIANCE_ISSUES_COLLECTION,
    ESG_POLICIES_COLLECTION,
    POLICY_ACKNOWLEDGEMENTS_COLLECTION,
    POLICY_DOCUMENTS_COLLECTION,
    ComplianceIssueStatus,
    DocumentIngestionStatus,
    PolicyCategory,
    PolicyStatus,
)
from app.models.user import USERS_COLLECTION
from app.repositories import governance as governance_repository
from app.schemas.governance import (
    GovernanceCitation,
    GovernanceDataPanel,
    GovernanceDataPanelColumn,
    GovernanceDataPanelMetric,
    GovernanceDataPanelTable,
    PolicyRead,
)
from app.services.governance_rag import (
    GovernanceRagResult,
    NOT_FOUND_PHRASE,
    answer_governance_question,
    answer_governance_question_from_context,
)

AgentToolName = Literal[
    "mongodb_schema",
    "governance_database",
    "environment_database",
    "department_database",
    "policy_rag",
]

AVAILABLE_TOOLS: tuple[AgentToolName, ...] = (
    "mongodb_schema",
    "governance_database",
    "environment_database",
    "department_database",
    "policy_rag",
)


@dataclass(frozen=True)
class AgentToolResult:
    name: AgentToolName
    content: str
    citations: list[GovernanceCitation]
    data_panel: GovernanceDataPanel | None = None


class GovernanceAgentState(TypedDict, total=False):
    database: AsyncIOMotorDatabase
    question: str
    policy_ids: list[str] | None
    document_ids: list[str] | None
    selected_tools: list[AgentToolName]
    tool_results: list[AgentToolResult]
    data_panel: GovernanceDataPanel | None
    answer: str
    citations: list[GovernanceCitation]
    answer_found: bool


def _clean_secret(value: str | None) -> str | None:
    if value is None:
        return None

    stripped = value.strip().strip('"').strip("'")
    return stripped or None


@lru_cache(maxsize=1)
def _get_chat_client():
    try:
        from openai import OpenAI
    except ModuleNotFoundError as exc:
        raise RuntimeError("openai is not installed") from exc

    openrouter_key = _clean_secret(settings.openrouter_api_key)
    openai_key = _clean_secret(settings.openai_api_key)

    if openrouter_key:
        return OpenAI(
            api_key=openrouter_key,
            base_url=settings.openrouter_base_url,
            default_headers={
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": settings.app_name,
            },
        )

    if not openai_key:
        raise RuntimeError("OPENAI_API_KEY or OPENROUTER_API_KEY is required")

    return OpenAI(
        api_key=openai_key,
        base_url=_clean_secret(settings.openai_base_url),
    )


def _chat_model_name() -> str:
    if _clean_secret(settings.openrouter_api_key):
        return settings.governance_llm_model

    return settings.openai_chat_model


def _chat_completion(
    *,
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.1,
) -> str:
    response = _get_chat_client().chat.completions.create(
        model=_chat_model_name(),
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=temperature,
    )
    content = response.choices[0].message.content
    if not content:
        raise RuntimeError("The governance agent returned an empty response")

    return content.strip()


def _json_safe(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)

    if isinstance(value, datetime):
        return value.isoformat()

    if isinstance(value, list):
        return [_json_safe(item) for item in value]

    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}

    return value


def _to_json_block(value: Any) -> str:
    return json.dumps(_json_safe(value), indent=2, ensure_ascii=False, default=str)


def _format_metric_value(value: Any) -> str:
    if value is None:
        return "0"

    if isinstance(value, float):
        return f"{value:,.2f}".rstrip("0").rstrip(".")

    if isinstance(value, int):
        return f"{value:,}"

    return str(value)


def _cell_value(value: Any) -> str | int | float | bool | None:
    safe_value = _json_safe(value)

    if safe_value is None or isinstance(safe_value, (str, int, float, bool)):
        return safe_value

    if isinstance(safe_value, list):
        return ", ".join(str(item) for item in safe_value[:4])

    if isinstance(safe_value, dict):
        compact_items = [
            f"{key}: {item}"
            for key, item in safe_value.items()
            if item not in (None, "", [])
        ][:4]
        return ", ".join(compact_items)

    return str(safe_value)


def _metric(
    label: str,
    value: Any,
    *,
    detail: str | None = None,
    tone: str = "slate",
) -> GovernanceDataPanelMetric:
    return GovernanceDataPanelMetric(
        label=label,
        value=_format_metric_value(value),
        detail=detail,
        tone=tone,
    )


def _columns(
    pairs: list[tuple[str, str] | tuple[str, str, str]],
) -> list[GovernanceDataPanelColumn]:
    return [
        GovernanceDataPanelColumn(
            key=pair[0],
            label=pair[1],
            kind=pair[2] if len(pair) > 2 else "text",
        )
        for pair in pairs
    ]


def _table(
    table_id: str,
    title: str,
    columns: list[GovernanceDataPanelColumn],
    rows: list[dict[str, Any]],
    *,
    description: str | None = None,
    limit: int = 12,
) -> GovernanceDataPanelTable:
    keys = [column.key for column in columns]
    return GovernanceDataPanelTable(
        id=table_id,
        title=title,
        description=description,
        columns=columns,
        rows=[
            {key: _cell_value(row.get(key)) for key in keys}
            for row in rows[:limit]
        ],
    )


def _schema_data_panel(schema: dict[str, Any]) -> GovernanceDataPanel:
    collections = schema.get("collections", {})
    rows = [
        {
            "collection": name,
            "records": count,
            "important_fields": ", ".join(
                schema.get("important_fields", {}).get(name, [])[:6]
            ),
        }
        for name, count in collections.items()
    ]

    return GovernanceDataPanel(
        title="MongoDB Schema Snapshot",
        summary="Current EcoSphere collections and the fields the agent can inspect.",
        source_tools=["mongodb_schema"],
        generated_at=datetime.now(UTC),
        metrics=[
            _metric("Collections", len(collections), tone="cyan"),
            _metric("Records", sum(collections.values()), tone="emerald"),
        ],
        tables=[
            _table(
                "mongodb_collections",
                "Collections",
                _columns(
                    [
                        ("collection", "Collection"),
                        ("records", "Records", "number"),
                        ("important_fields", "Important Fields"),
                    ]
                ),
                rows,
                limit=20,
            )
        ],
    )


def _governance_data_panel(overview: dict[str, Any]) -> GovernanceDataPanel:
    counts = overview.get("counts", {})
    return GovernanceDataPanel(
        title="Governance Records",
        summary="Live policy, document, audit, and compliance issue data from MongoDB.",
        source_tools=["governance_database"],
        generated_at=datetime.now(UTC),
        metrics=[
            _metric("Active Policies", counts.get("active_policies"), tone="emerald"),
            _metric("Ready PDFs", counts.get("ready_policy_documents"), tone="cyan"),
            _metric("Open Issues", counts.get("open_or_in_progress_issues"), tone="amber"),
            _metric("Overdue", counts.get("overdue_issues"), tone="rose"),
        ],
        tables=[
            _table(
                "compliance_issues",
                "Compliance Issues",
                _columns(
                    [
                        ("title", "Issue"),
                        ("severity", "Severity", "status"),
                        ("status", "Status", "status"),
                        ("department", "Department"),
                        ("due_date", "Due Date", "date"),
                        ("is_overdue", "Overdue", "boolean"),
                        ("source_policy", "Policy"),
                    ]
                ),
                overview.get("compliance_issues", []),
                description="Open, in-progress, and historical governance issues.",
            ),
            _table(
                "policies",
                "Policies",
                _columns(
                    [
                        ("title", "Policy"),
                        ("category", "Category", "status"),
                        ("status", "Status", "status"),
                        ("department", "Department"),
                    ]
                ),
                overview.get("policies", []),
            ),
            _table(
                "policy_documents",
                "Indexed Documents",
                _columns(
                    [
                        ("filename", "PDF"),
                        ("storage_provider", "Storage"),
                        ("has_cloudinary_url", "Cloudinary URL", "boolean"),
                        ("page_count", "Pages", "number"),
                        ("chunk_count", "Chunks", "number"),
                    ]
                ),
                overview.get("documents", []),
            ),
            _table(
                "audits",
                "Audits",
                _columns(
                    [
                        ("title", "Audit"),
                        ("status", "Status", "status"),
                        ("department", "Department"),
                        ("findings_count", "Findings", "number"),
                        ("start_date", "Start", "date"),
                        ("end_date", "End", "date"),
                    ]
                ),
                overview.get("audits", []),
            ),
        ],
    )


def _environment_data_panel(overview: dict[str, Any]) -> GovernanceDataPanel:
    period = overview.get("period", {})
    current_emissions = overview.get("current_month_department_emissions", [])
    total_current = sum(float(row.get("total_emissions") or 0) for row in current_emissions)

    return GovernanceDataPanel(
        title="Environmental MongoDB Records",
        summary=(
            f"Carbon and target data for {period.get('month')}/{period.get('year')} "
            "from EcoSphere MongoDB."
        ),
        source_tools=["environment_database"],
        generated_at=datetime.now(UTC),
        metrics=[
            _metric("Monthly CO2e", total_current, detail="kg CO2e", tone="emerald"),
            _metric("Departments", len(current_emissions), tone="cyan"),
            _metric("Goals", len(overview.get("environmental_goals", [])), tone="amber"),
            _metric("Emission Factors", len(overview.get("emission_factors", [])), tone="indigo"),
        ],
        tables=[
            _table(
                "environmental_goals",
                "Environmental Goals",
                _columns(
                    [
                        ("title", "Goal"),
                        ("department", "Department"),
                        ("target_emission", "Target", "number"),
                        ("actual_emission", "Actual", "number"),
                        ("progress_percent", "Progress %", "number"),
                        ("deadline", "Deadline", "date"),
                        ("status", "Status", "status"),
                    ]
                ),
                overview.get("environmental_goals", []),
                description="Target versus actual carbon performance.",
            ),
            _table(
                "current_month_department_emissions",
                "Current Month Emissions",
                _columns(
                    [
                        ("department", "Department"),
                        ("total_emissions", "kg CO2e", "number"),
                    ]
                ),
                current_emissions,
            ),
            _table(
                "recent_carbon_transactions",
                "Recent Carbon Transactions",
                _columns(
                    [
                        ("department", "Department"),
                        ("source_type", "Source"),
                        ("description", "Description"),
                        ("quantity", "Qty", "number"),
                        ("unit", "Unit"),
                        ("emission_value", "kg CO2e", "number"),
                        ("transaction_date", "Date", "date"),
                    ]
                ),
                overview.get("recent_transactions", []),
            ),
            _table(
                "emission_factors",
                "Emission Factors",
                _columns(
                    [
                        ("name", "Factor"),
                        ("category", "Category", "status"),
                        ("unit", "Unit"),
                        ("factor", "Factor", "number"),
                        ("status", "Status", "status"),
                    ]
                ),
                overview.get("emission_factors", []),
            ),
        ],
    )


def _department_data_panel(overview: dict[str, Any]) -> GovernanceDataPanel:
    departments = overview.get("departments", [])
    scores = overview.get("latest_scores", [])
    best_score = max(
        [float(score.get("total_score") or 0) for score in scores],
        default=0,
    )

    return GovernanceDataPanel(
        title="Department Records",
        summary="Departments, ESG score snapshots, users, and recent EcoSphere activity.",
        source_tools=["department_database"],
        generated_at=datetime.now(UTC),
        metrics=[
            _metric("Departments", len(departments), tone="emerald"),
            _metric("Users", len(overview.get("users", [])), tone="cyan"),
            _metric("Best ESG Score", best_score, tone="indigo"),
            _metric("Activity Items", len(overview.get("recent_activity", [])), tone="amber"),
        ],
        tables=[
            _table(
                "departments",
                "Departments",
                _columns(
                    [
                        ("name", "Department"),
                        ("code", "Code"),
                        ("employee_count", "Employees", "number"),
                        ("status", "Status", "status"),
                    ]
                ),
                departments,
            ),
            _table(
                "latest_scores",
                "Latest ESG Scores",
                _columns(
                    [
                        ("department", "Department"),
                        ("environmental_score", "Env", "number"),
                        ("social_score", "Social", "number"),
                        ("governance_score", "Gov", "number"),
                        ("total_score", "Total", "number"),
                        ("period_month", "Month", "number"),
                        ("period_year", "Year", "number"),
                    ]
                ),
                scores,
            ),
            _table(
                "users",
                "Users",
                _columns(
                    [
                        ("name", "Name"),
                        ("email", "Email"),
                        ("role", "Role", "status"),
                        ("department", "Department"),
                        ("xp", "XP", "number"),
                    ]
                ),
                overview.get("users", []),
            ),
            _table(
                "recent_activity",
                "Recent Activity",
                _columns(
                    [
                        ("type", "Type", "status"),
                        ("title", "Title"),
                        ("message", "Message"),
                        ("department", "Department"),
                        ("created_at", "Created", "date"),
                    ]
                ),
                overview.get("recent_activity", []),
            ),
        ],
    )


def _merge_data_panels(
    panels: list[GovernanceDataPanel],
) -> GovernanceDataPanel | None:
    if not panels:
        return None

    if len(panels) == 1:
        return panels[0]

    metrics: list[GovernanceDataPanelMetric] = []
    tables: list[GovernanceDataPanelTable] = []
    source_tools: list[str] = []

    for panel in panels:
        metrics.extend(panel.metrics)
        tables.extend(panel.tables)
        source_tools.extend(panel.source_tools)

    return GovernanceDataPanel(
        title="EcoSphere MongoDB Results",
        summary="Combined live records retrieved by the agent from MongoDB.",
        source_tools=list(dict.fromkeys(source_tools)),
        generated_at=datetime.now(UTC),
        metrics=metrics[:8],
        tables=tables[:8],
    )


def _extract_json_object(text: str) -> dict[str, Any]:
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not match:
        raise ValueError("No JSON object found")

    return json.loads(match.group(0))


def _month_bounds(period_month: int, period_year: int) -> tuple[datetime, datetime]:
    start = datetime(period_year, period_month, 1, tzinfo=UTC)
    if period_month == 12:
        end = datetime(period_year + 1, 1, 1, tzinfo=UTC)
    else:
        end = datetime(period_year, period_month + 1, 1, tzinfo=UTC)

    return start, end


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None

    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)

    return value.astimezone(UTC)


async def _department_maps(
    database: AsyncIOMotorDatabase,
) -> tuple[dict[str, dict[str, Any]], dict[str, str]]:
    departments = await database[DEPARTMENTS_COLLECTION].find({}).to_list(length=500)
    by_id = {str(department["_id"]): department for department in departments}
    name_to_id = {
        str(department.get("name", "")).lower(): str(department["_id"])
        for department in departments
        if department.get("name")
    }
    code_to_id = {
        str(department.get("code", "")).lower(): str(department["_id"])
        for department in departments
        if department.get("code")
    }

    return by_id, {**name_to_id, **code_to_id}


def _department_label(department_id: str | None, departments_by_id: dict[str, Any]) -> str:
    if not department_id:
        return "All departments"

    department = departments_by_id.get(department_id)
    if not department:
        return department_id

    code = department.get("code")
    return f"{department.get('name', department_id)} ({code})" if code else department.get("name", department_id)


def _default_policy_preview(policy: PolicyRead) -> str:
    previews = {
        PolicyCategory.DATA_PRIVACY: (
            "Employees must protect personal, supplier, and operational data. "
            "Suspected data breaches must be escalated immediately to the policy "
            "owner, with evidence preserved for governance review. Corrective "
            "actions must have an owner, due date, and completion evidence."
        ),
        PolicyCategory.SUPPLIER_GOVERNANCE: (
            "Suppliers must maintain current code of conduct evidence, ESG ethics "
            "attestations, and corrective action records. Missing supplier evidence "
            "should be treated as a governance risk until reviewed and assigned."
        ),
        PolicyCategory.SAFETY: (
            "Employees and shift leads must acknowledge safety SOPs before audit "
            "cycles. Safety incidents, training gaps, and missing acknowledgement "
            "records must be reported and resolved before the due date."
        ),
        PolicyCategory.ETHICS: (
            "Employees must follow ESG ethics expectations, report conflicts of "
            "interest, protect confidential information, and escalate suspected "
            "misconduct through governance channels."
        ),
    }

    return previews.get(
        policy.category,
        "Employees must follow the policy, keep required evidence, report compliance gaps, and complete assigned actions before due dates.",
    )


async def _build_policy_metadata_context(
    database: AsyncIOMotorDatabase,
    policy_ids: list[str] | None = None,
) -> tuple[str, list[GovernanceCitation]]:
    policies = await governance_repository.list_policies(
        database=database,
        status=PolicyStatus.ACTIVE,
        limit=50,
    )

    if policy_ids:
        selected_policy_ids = set(policy_ids)
        policies = [policy for policy in policies if policy.id in selected_policy_ids]

    blocks: list[str] = []
    citations: list[GovernanceCitation] = []

    for index, policy in enumerate(policies[:8], start=1):
        document = await database[POLICY_DOCUMENTS_COLLECTION].find_one(
            {
                "policy_id": policy.id,
                "ingestion_status": DocumentIngestionStatus.READY.value,
            },
            sort=[("created_at", -1)],
        )
        content_preview = (
            document.get("content_preview") if document is not None else None
        ) or _default_policy_preview(policy)
        document_id = document.get("document_id") if document else policy.id
        document_name = (
            document.get("filename") if document else f"{policy.title}.pdf"
        )
        citation_id = f"C{index}"
        excerpt = content_preview[:260] + ("..." if len(content_preview) > 260 else "")

        citations.append(
            GovernanceCitation(
                citation_id=citation_id,
                document_id=str(document_id),
                policy_id=policy.id,
                document_name=str(document_name),
                policy_title=policy.title,
                page_number=1,
                excerpt=excerpt,
            )
        )
        blocks.append(
            "\n".join(
                [
                    f"[{citation_id}]",
                    f"Policy: {policy.title}",
                    f"Document: {document_name}",
                    "Page: 1",
                    "",
                    f"Description: {policy.description or 'No description provided.'}",
                    f"Policy guidance: {content_preview}",
                ]
            )
        )

    return "\n\n---\n\n".join(blocks), citations


def _heuristic_tools(question: str) -> list[AgentToolName]:
    normalized = question.lower()
    tools: list[AgentToolName] = []

    if any(
        token in normalized
        for token in (
            "collection",
            "database",
            "mongodb",
            "schema",
            "what data",
            "what is stored",
        )
    ):
        tools.append("mongodb_schema")

    if any(
        token in normalized
        for token in (
            "policy",
            "document",
            "pdf",
            "responsibilit",
            "procedure",
            "rule",
            "ethics",
            "privacy",
            "supplier",
            "conduct",
            "safety",
        )
    ):
        tools.append("policy_rag")

    if any(
        token in normalized
        for token in (
            "compliance",
            "issue",
            "audit",
            "acknowledge",
            "acknowledgement",
            "overdue",
            "risk",
            "governance",
        )
    ):
        tools.append("governance_database")

    if any(
        token in normalized
        for token in (
            "emission",
            "carbon",
            "target",
            "goal",
            "factor",
            "transaction",
            "co2",
            "co2e",
            "environment",
        )
    ):
        tools.append("environment_database")

    if any(
        token in normalized
        for token in (
            "department",
            "score",
            "ranking",
            "rank",
            "employee",
            "activity",
            "overall",
            "esg score",
        )
    ):
        tools.append("department_database")

    if not tools:
        tools = ["governance_database", "environment_database", "policy_rag"]

    return list(dict.fromkeys(tools))[:4]


def _plan_with_llm(question: str) -> list[AgentToolName]:
    system_prompt = """
You are the planner for EcoSphere Governance Copilot.
Choose the smallest useful set of tools for the user question.
Return ONLY JSON like: {"tools":["environment_database","policy_rag"],"reason":"..."}.

Tools:
- mongodb_schema: collection names and important fields.
- governance_database: policies, policy documents, acknowledgements, audits, compliance issues, overdue risks.
- environment_database: emission factors, carbon transactions, emissions by department/source, environmental goals and targets.
- department_database: departments, ESG scores, rankings, employees/users, recent activity.
- policy_rag: semantic search over uploaded governance policy PDFs.
""".strip()
    user_prompt = f"Question: {question}\nAvailable tools: {', '.join(AVAILABLE_TOOLS)}"

    response = _chat_completion(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0,
    )
    parsed = _extract_json_object(response)
    tools = parsed.get("tools", [])

    selected = [
        tool for tool in tools if isinstance(tool, str) and tool in AVAILABLE_TOOLS
    ]
    if not selected:
        raise ValueError("Planner selected no valid tools")

    return list(dict.fromkeys(selected))[:4]


async def _schema_tool(database: AsyncIOMotorDatabase) -> AgentToolResult:
    collection_names = await database.list_collection_names()
    counts = {
        name: await database[name].count_documents({})
        for name in sorted(collection_names)
        if name
    }
    schema = {
        "collections": counts,
        "important_fields": {
            DEPARTMENTS_COLLECTION: [
                "name",
                "code",
                "employee_count",
                "status",
            ],
            DEPARTMENT_SCORES_COLLECTION: [
                "department_id",
                "environmental_score",
                "social_score",
                "governance_score",
                "total_score",
                "period_month",
                "period_year",
            ],
            EMISSION_FACTORS_COLLECTION: [
                "name",
                "category",
                "unit",
                "factor",
                "status",
            ],
            CARBON_TRANSACTIONS_COLLECTION: [
                "department_id",
                "emission_factor_id",
                "quantity",
                "unit",
                "emission_value",
                "transaction_date",
                "factor_snapshot",
            ],
            ENVIRONMENTAL_GOALS_COLLECTION: [
                "department_id",
                "title",
                "target_emission",
                "period_month",
                "period_year",
                "deadline",
                "status",
            ],
            ESG_POLICIES_COLLECTION: [
                "title",
                "category",
                "description",
                "department_id",
                "status",
                "effective_date",
            ],
            POLICY_DOCUMENTS_COLLECTION: [
                "policy_id",
                "document_id",
                "filename",
                "secure_url",
                "page_count",
                "chunk_count",
                "ingestion_status",
            ],
            COMPLIANCE_ISSUES_COLLECTION: [
                "title",
                "description",
                "severity",
                "status",
                "owner_user_id",
                "department_id",
                "due_date",
                "source_policy_id",
                "resolution_note",
            ],
            AUDITS_COLLECTION: [
                "title",
                "scope",
                "department_id",
                "auditor_user_id",
                "status",
                "start_date",
                "end_date",
                "findings_count",
            ],
            USERS_COLLECTION: [
                "clerk_user_id",
                "email",
                "first_name",
                "last_name",
                "role",
                "department_id",
                "xp",
                "badges",
            ],
        },
    }

    return AgentToolResult(
        name="mongodb_schema",
        content=_to_json_block(schema),
        citations=[],
        data_panel=_schema_data_panel(schema),
    )


async def _governance_database_tool(
    database: AsyncIOMotorDatabase,
) -> AgentToolResult:
    departments_by_id, _ = await _department_maps(database)
    now = datetime.now(UTC)
    active_issue_statuses = [
        ComplianceIssueStatus.OPEN.value,
        ComplianceIssueStatus.IN_PROGRESS.value,
    ]

    policies = await database[ESG_POLICIES_COLLECTION].find({}).sort(
        [("updated_at", -1)]
    ).limit(20).to_list(length=20)
    policy_titles = {str(policy["_id"]): policy.get("title") for policy in policies}
    ready_documents = await database[POLICY_DOCUMENTS_COLLECTION].find(
        {"ingestion_status": DocumentIngestionStatus.READY.value}
    ).sort([("created_at", -1)]).limit(20).to_list(length=20)
    issues = await database[COMPLIANCE_ISSUES_COLLECTION].find({}).sort(
        [("due_date", 1), ("created_at", -1)]
    ).limit(30).to_list(length=30)
    audits = await database[AUDITS_COLLECTION].find({}).sort(
        [("created_at", -1)]
    ).limit(15).to_list(length=15)

    overview = {
        "counts": {
            "total_policies": await database[ESG_POLICIES_COLLECTION].count_documents({}),
            "active_policies": await database[ESG_POLICIES_COLLECTION].count_documents(
                {"status": PolicyStatus.ACTIVE.value}
            ),
            "ready_policy_documents": await database[
                POLICY_DOCUMENTS_COLLECTION
            ].count_documents({"ingestion_status": DocumentIngestionStatus.READY.value}),
            "acknowledgements": await database[
                POLICY_ACKNOWLEDGEMENTS_COLLECTION
            ].count_documents({}),
            "open_or_in_progress_issues": await database[
                COMPLIANCE_ISSUES_COLLECTION
            ].count_documents({"status": {"$in": active_issue_statuses}}),
            "overdue_issues": await database[
                COMPLIANCE_ISSUES_COLLECTION
            ].count_documents(
                {
                    "status": {"$in": active_issue_statuses},
                    "due_date": {"$lt": now},
                }
            ),
            "audits": await database[AUDITS_COLLECTION].count_documents({}),
        },
        "policies": [
            {
                "id": str(policy["_id"]),
                "title": policy.get("title"),
                "category": policy.get("category"),
                "status": policy.get("status"),
                "department": _department_label(
                    policy.get("department_id"), departments_by_id
                ),
            }
            for policy in policies
        ],
        "documents": [
            {
                "filename": document.get("filename"),
                "policy_id": document.get("policy_id"),
                "storage_provider": document.get("storage_provider"),
                "has_cloudinary_url": bool(document.get("secure_url")),
                "page_count": document.get("page_count"),
                "chunk_count": document.get("chunk_count"),
            }
            for document in ready_documents
        ],
        "compliance_issues": [
            {
                "title": issue.get("title"),
                "severity": issue.get("severity"),
                "status": issue.get("status"),
                "department": _department_label(
                    issue.get("department_id"), departments_by_id
                ),
                "owner": issue.get("owner_user_id"),
                "due_date": _json_safe(issue.get("due_date")),
                "is_overdue": bool(
                    _as_utc(issue.get("due_date"))
                    and issue.get("status") in active_issue_statuses
                    and _as_utc(issue.get("due_date")) < now
                ),
                "source_policy": policy_titles.get(str(issue.get("source_policy_id"))),
                "description": issue.get("description"),
            }
            for issue in issues
        ],
        "audits": [
            {
                "title": audit.get("title"),
                "status": audit.get("status"),
                "department": _department_label(audit.get("department_id"), departments_by_id),
                "findings_count": audit.get("findings_count", 0),
                "start_date": _json_safe(audit.get("start_date")),
                "end_date": _json_safe(audit.get("end_date")),
                "scope": audit.get("scope"),
            }
            for audit in audits
        ],
    }

    return AgentToolResult(
        name="governance_database",
        content=_to_json_block(overview),
        citations=[],
        data_panel=_governance_data_panel(overview),
    )


async def _environment_database_tool(
    database: AsyncIOMotorDatabase,
) -> AgentToolResult:
    departments_by_id, _ = await _department_maps(database)
    now = datetime.now(UTC)
    period_month = now.month
    period_year = now.year
    start, end = _month_bounds(period_month, period_year)

    factors = await database[EMISSION_FACTORS_COLLECTION].find({}).sort(
        [("category", 1), ("name", 1)]
    ).limit(50).to_list(length=50)
    recent_transactions = await database[CARBON_TRANSACTIONS_COLLECTION].find({}).sort(
        [("transaction_date", -1)]
    ).limit(25).to_list(length=25)
    goals = await database[ENVIRONMENTAL_GOALS_COLLECTION].find({}).sort(
        [("period_year", -1), ("period_month", -1)]
    ).limit(30).to_list(length=30)

    department_emissions_cursor = database[CARBON_TRANSACTIONS_COLLECTION].aggregate(
        [
            {"$match": {"transaction_date": {"$gte": start, "$lt": end}}},
            {"$group": {"_id": "$department_id", "total_emissions": {"$sum": "$emission_value"}}},
            {"$sort": {"total_emissions": -1}},
        ]
    )
    source_emissions_cursor = database[CARBON_TRANSACTIONS_COLLECTION].aggregate(
        [
            {"$match": {"transaction_date": {"$gte": start, "$lt": end}}},
            {"$group": {"_id": "$source_type", "total_emissions": {"$sum": "$emission_value"}}},
            {"$sort": {"total_emissions": -1}},
        ]
    )
    all_time_department_cursor = database[CARBON_TRANSACTIONS_COLLECTION].aggregate(
        [
            {"$group": {"_id": "$department_id", "total_emissions": {"$sum": "$emission_value"}}},
            {"$sort": {"total_emissions": -1}},
        ]
    )

    department_emissions = await department_emissions_cursor.to_list(length=100)
    source_emissions = await source_emissions_cursor.to_list(length=100)
    all_time_department_emissions = await all_time_department_cursor.to_list(length=100)

    async def goal_progress(goal: dict[str, Any]) -> dict[str, Any]:
        goal_start, goal_end = _month_bounds(goal["period_month"], goal["period_year"])
        pipeline = [
            {
                "$match": {
                    "department_id": goal["department_id"],
                    "transaction_date": {"$gte": goal_start, "$lt": goal_end},
                }
            },
            {"$group": {"_id": "$department_id", "actual": {"$sum": "$emission_value"}}},
        ]
        rows = await database[CARBON_TRANSACTIONS_COLLECTION].aggregate(pipeline).to_list(length=1)
        actual = float(rows[0]["actual"]) if rows else 0.0
        target = float(goal.get("target_emission") or 0)
        progress = round((actual / target) * 100, 2) if target else 0
        return {
            "title": goal.get("title"),
            "department": _department_label(goal.get("department_id"), departments_by_id),
            "target_emission": target,
            "actual_emission": round(actual, 4),
            "progress_percent": progress,
            "period_month": goal.get("period_month"),
            "period_year": goal.get("period_year"),
            "deadline": _json_safe(goal.get("deadline")),
            "status": goal.get("status"),
        }

    overview = {
        "period": {"month": period_month, "year": period_year},
        "emission_factors": [
            {
                "name": factor.get("name"),
                "category": factor.get("category"),
                "unit": factor.get("unit"),
                "factor": factor.get("factor"),
                "status": factor.get("status"),
            }
            for factor in factors
        ],
        "current_month_department_emissions": [
            {
                "department": _department_label(row.get("_id"), departments_by_id),
                "total_emissions": round(float(row.get("total_emissions", 0)), 4),
            }
            for row in department_emissions
        ],
        "all_time_department_emissions": [
            {
                "department": _department_label(row.get("_id"), departments_by_id),
                "total_emissions": round(float(row.get("total_emissions", 0)), 4),
            }
            for row in all_time_department_emissions
        ],
        "current_month_source_breakdown": [
            {
                "source_type": row.get("_id"),
                "total_emissions": round(float(row.get("total_emissions", 0)), 4),
            }
            for row in source_emissions
        ],
        "environmental_goals": [await goal_progress(goal) for goal in goals],
        "recent_transactions": [
            {
                "department": _department_label(
                    transaction.get("department_id"), departments_by_id
                ),
                "source_type": transaction.get("source_type"),
                "description": transaction.get("description"),
                "quantity": transaction.get("quantity"),
                "unit": transaction.get("unit"),
                "emission_value": transaction.get("emission_value"),
                "transaction_date": _json_safe(transaction.get("transaction_date")),
                "factor_snapshot": transaction.get("factor_snapshot"),
            }
            for transaction in recent_transactions
        ],
    }

    return AgentToolResult(
        name="environment_database",
        content=_to_json_block(overview),
        citations=[],
        data_panel=_environment_data_panel(overview),
    )


async def _department_database_tool(
    database: AsyncIOMotorDatabase,
) -> AgentToolResult:
    departments = await database[DEPARTMENTS_COLLECTION].find({}).sort("name", 1).to_list(length=200)
    departments_by_id = {str(department["_id"]): department for department in departments}
    latest_scores = await database[DEPARTMENT_SCORES_COLLECTION].find({}).sort(
        [("period_year", -1), ("period_month", -1), ("total_score", -1)]
    ).limit(50).to_list(length=50)
    users = await database[USERS_COLLECTION].find({}).sort(
        [("role", 1), ("email", 1)]
    ).limit(50).to_list(length=50)
    activity = await database[ACTIVITY_LOGS_COLLECTION].find({}).sort(
        [("created_at", -1)]
    ).limit(12).to_list(length=12)

    overview = {
        "departments": [
            {
                "id": str(department["_id"]),
                "name": department.get("name"),
                "code": department.get("code"),
                "employee_count": department.get("employee_count", 0),
                "status": department.get("status"),
            }
            for department in departments
        ],
        "latest_scores": [
            {
                "department": _department_label(score.get("department_id"), departments_by_id),
                "environmental_score": score.get("environmental_score"),
                "social_score": score.get("social_score"),
                "governance_score": score.get("governance_score"),
                "total_score": score.get("total_score"),
                "period_month": score.get("period_month"),
                "period_year": score.get("period_year"),
            }
            for score in latest_scores
        ],
        "users": [
            {
                "email": user.get("email"),
                "name": " ".join(
                    part
                    for part in (user.get("first_name"), user.get("last_name"))
                    if part
                )
                or None,
                "role": user.get("role"),
                "department": _department_label(user.get("department_id"), departments_by_id),
                "xp": user.get("xp", 0),
                "badges": user.get("badges", []),
            }
            for user in users
        ],
        "recent_activity": [
            {
                "type": item.get("type"),
                "title": item.get("title"),
                "message": item.get("message"),
                "department": _department_label(item.get("department_id"), departments_by_id),
                "created_at": _json_safe(item.get("created_at")),
            }
            for item in activity
        ],
    }

    return AgentToolResult(
        name="department_database",
        content=_to_json_block(overview),
        citations=[],
        data_panel=_department_data_panel(overview),
    )


async def _policy_rag_tool(
    database: AsyncIOMotorDatabase,
    question: str,
    policy_ids: list[str] | None,
    document_ids: list[str] | None,
) -> AgentToolResult:
    result: GovernanceRagResult | None = None
    try:
        result = await asyncio.to_thread(
            answer_governance_question,
            question=question,
            policy_ids=policy_ids,
            document_ids=document_ids,
        )
    except Exception:
        result = None

    if result is None or not result.answer_found:
        fallback_context, fallback_citations = await _build_policy_metadata_context(
            database=database,
            policy_ids=policy_ids,
        )
        fallback = await asyncio.to_thread(
            answer_governance_question_from_context,
            question=question,
            formatted_context=fallback_context,
            citations=fallback_citations,
        )
        if fallback.answer_found or result is None:
            result = fallback

    return AgentToolResult(
        name="policy_rag",
        content=result.answer if result else NOT_FOUND_PHRASE,
        citations=result.citations if result else [],
    )


async def _plan_node(state: GovernanceAgentState) -> GovernanceAgentState:
    question = state["question"]

    try:
        selected_tools = await asyncio.to_thread(_plan_with_llm, question)
    except Exception:
        selected_tools = _heuristic_tools(question)

    return {"selected_tools": selected_tools}


async def _execute_node(state: GovernanceAgentState) -> GovernanceAgentState:
    database = state["database"]
    question = state["question"]
    selected_tools = state.get("selected_tools") or _heuristic_tools(question)
    results: list[AgentToolResult] = []

    for tool_name in selected_tools:
        try:
            if tool_name == "mongodb_schema":
                results.append(await _schema_tool(database))
            elif tool_name == "governance_database":
                results.append(await _governance_database_tool(database))
            elif tool_name == "environment_database":
                results.append(await _environment_database_tool(database))
            elif tool_name == "department_database":
                results.append(await _department_database_tool(database))
            elif tool_name == "policy_rag":
                results.append(
                    await _policy_rag_tool(
                        database=database,
                        question=question,
                        policy_ids=state.get("policy_ids"),
                        document_ids=state.get("document_ids"),
                    )
                )
        except Exception as error:
            results.append(
                AgentToolResult(
                    name=tool_name,
                    content=f"{tool_name} was unavailable: {error}",
                    citations=[],
                )
            )

    return {"tool_results": results}


def _deterministic_answer(
    question: str,
    tool_results: list[AgentToolResult],
) -> tuple[str, bool]:
    rag_result = next(
        (
            result
            for result in tool_results
            if result.name == "policy_rag" and result.content != NOT_FOUND_PHRASE
        ),
        None,
    )
    if rag_result is not None and len(tool_results) == 1:
        return rag_result.content, True

    if not tool_results:
        return NOT_FOUND_PHRASE, False

    sections = [
        f"### {result.name.replace('_', ' ').title()}\n{result.content[:1800]}"
        for result in tool_results
        if result.content
    ]
    return (
        "I found the following EcoSphere data for your question:\n\n"
        + "\n\n".join(sections),
        True,
    )


async def _answer_node(state: GovernanceAgentState) -> GovernanceAgentState:
    question = state["question"]
    tool_results = state.get("tool_results", [])
    citations = [
        citation
        for result in tool_results
        for citation in result.citations
    ]
    data_panel = _merge_data_panels(
        [
            result.data_panel
            for result in tool_results
            if result.data_panel is not None
        ]
    )

    if not tool_results:
        return {
            "answer": NOT_FOUND_PHRASE,
            "citations": [],
            "data_panel": None,
            "answer_found": False,
        }

    tool_context = "\n\n".join(
        [
            f"<tool_result name=\"{result.name}\">\n{result.content}\n</tool_result>"
            for result in tool_results
        ]
    )
    citation_context = _to_json_block([citation.model_dump() for citation in citations])
    system_prompt = """
You are EcoSphere's agentic ESG copilot.

You can answer from two grounded sources:
1. MongoDB tool results containing current EcoSphere departments, scores, carbon data, goals, policies, audits, and compliance issues.
2. Policy RAG tool results from uploaded governance PDFs.

Rules:
- Use only the supplied tool results. Do not invent records.
- If the answer uses policy RAG citation markers like [C1], keep those markers.
- For MongoDB facts, mention that they come from current EcoSphere records when useful.
- Be concise, practical, and specific. Use bullets for lists and include key numbers, targets, owners, dates, and statuses.
- If the supplied tool results do not contain the answer, say that the current EcoSphere records do not contain it.
""".strip()
    user_prompt = f"""
Question:
{question}

Tool results:
{tool_context}

Available policy citations:
{citation_context}

Write the final answer now.
""".strip()

    try:
        answer = await asyncio.to_thread(
            _chat_completion,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.15,
        )
        answer_found = NOT_FOUND_PHRASE.lower() not in answer.lower()
        return {
            "answer": answer,
            "citations": citations,
            "data_panel": data_panel,
            "answer_found": answer_found,
        }
    except Exception:
        answer, answer_found = _deterministic_answer(question, tool_results)
        return {
            "answer": answer,
            "citations": citations,
            "data_panel": data_panel,
            "answer_found": answer_found,
        }


@lru_cache(maxsize=1)
def _build_agent_graph():
    graph = StateGraph(GovernanceAgentState)
    graph.add_node("plan", _plan_node)
    graph.add_node("execute_tools", _execute_node)
    graph.add_node("answer", _answer_node)

    graph.set_entry_point("plan")
    graph.add_edge("plan", "execute_tools")
    graph.add_edge("execute_tools", "answer")
    graph.add_edge("answer", END)

    return graph.compile()


async def run_governance_agent(
    *,
    database: AsyncIOMotorDatabase,
    question: str,
    policy_ids: list[str] | None = None,
    document_ids: list[str] | None = None,
) -> GovernanceRagResult:
    graph = _build_agent_graph()
    state = await graph.ainvoke(
        {
            "database": database,
            "question": question,
            "policy_ids": policy_ids,
            "document_ids": document_ids,
        }
    )

    return GovernanceRagResult(
        answer=state.get("answer") or NOT_FOUND_PHRASE,
        citations=state.get("citations") or [],
        answer_found=bool(state.get("answer_found")),
        data_panel=state.get("data_panel"),
    )
