from __future__ import annotations

from datetime import UTC, datetime
from hashlib import sha256
from typing import Any

from pymongo import MongoClient, ReturnDocument

from app.core.config import settings

DEMO_ADMIN_ID = "demo_admin_seed"
DEMO_EMPLOYEE_ID = "demo_employee_seed"
PERIOD_MONTH = 7
PERIOD_YEAR = 2026


def now_utc() -> datetime:
    return datetime.now(UTC)


def month_date(day: int) -> datetime:
    return datetime(PERIOD_YEAR, PERIOD_MONTH, day, tzinfo=UTC)


def upsert_one(
    collection,
    filter_query: dict[str, Any],
    set_data: dict[str, Any],
    insert_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    current_time = now_utc()
    set_fields = dict(set_data)
    created_at = set_fields.pop("created_at", current_time)
    update = {
        "$set": {**set_fields, "updated_at": current_time},
        "$setOnInsert": {
            "created_at": created_at,
            **(insert_data or {}),
        },
    }
    return collection.find_one_and_update(
        filter_query,
        update,
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )


def seed_users(database) -> list[dict[str, Any]]:
    users = database["users"]
    demo_users = [
        {
            "clerk_user_id": DEMO_ADMIN_ID,
            "email": "admin.demo@ecosphere.local",
            "first_name": "Aarav",
            "last_name": "Admin",
            "role": "admin",
            "xp": 420,
            "badges": ["Governance Starter", "Carbon Mapper"],
        },
        {
            "clerk_user_id": DEMO_EMPLOYEE_ID,
            "email": "employee.demo@ecosphere.local",
            "first_name": "Meera",
            "last_name": "Employee",
            "role": "employee",
            "xp": 180,
            "badges": ["Policy Reader"],
        },
    ]

    for user in demo_users:
        clerk_user_id = user.pop("clerk_user_id")
        upsert_one(
            users,
            {"clerk_user_id": clerk_user_id},
            user,
            {"clerk_user_id": clerk_user_id},
        )
        user["clerk_user_id"] = clerk_user_id

    return list(users.find({}))


def seed_departments(database) -> dict[str, str]:
    departments = database["departments"]
    demo_departments = [
        {
            "name": "Manufacturing",
            "code": "MFG",
            "employee_count": 84,
            "status": "active",
        },
        {
            "name": "Human Resources",
            "code": "HR",
            "employee_count": 28,
            "status": "active",
        },
        {
            "name": "Finance",
            "code": "FIN",
            "employee_count": 32,
            "status": "active",
        },
        {
            "name": "Operations",
            "code": "OPS",
            "employee_count": 61,
            "status": "active",
        },
    ]
    department_ids: dict[str, str] = {}

    for department in demo_departments:
        code = department["code"]
        created = upsert_one(
            departments,
            {"code": code},
            department,
        )
        department_ids[code] = str(created["_id"])

    return department_ids


def seed_department_scores(database, department_ids: dict[str, str]) -> None:
    scores = database["department_scores"]
    score_rows = [
        ("MFG", 82, 76, 79),
        ("HR", 72, 88, 81),
        ("FIN", 69, 74, 86),
        ("OPS", 78, 70, 73),
    ]

    for code, environmental, social, governance in score_rows:
        total = round((environmental * 0.4) + (social * 0.3) + (governance * 0.3), 2)
        upsert_one(
            scores,
            {
                "department_id": department_ids[code],
                "period_month": PERIOD_MONTH,
                "period_year": PERIOD_YEAR,
            },
            {
                "department_id": department_ids[code],
                "environmental_score": environmental,
                "social_score": social,
                "governance_score": governance,
                "total_score": total,
                "period_month": PERIOD_MONTH,
                "period_year": PERIOD_YEAR,
                "created_by": DEMO_ADMIN_ID,
            },
        )


def seed_environment(database, department_ids: dict[str, str]) -> None:
    factors = database["emission_factors"]
    transactions = database["carbon_transactions"]
    goals = database["environmental_goals"]

    factor_rows = [
        ("Electricity", "energy", "kWh", 0.82, "Default ESG estimate"),
        ("Diesel", "fleet", "liter", 2.68, "DEFRA-style demo estimate"),
        ("Business Flight", "travel", "km", 0.15, "Default travel estimate"),
        ("Landfill Waste", "waste", "kg", 0.45, "Waste disposal estimate"),
    ]
    factor_ids: dict[str, str] = {}

    for name, category, unit, factor, source in factor_rows:
        created = upsert_one(
            factors,
            {"name": name, "category": category},
            {
                "name": name,
                "category": category,
                "unit": unit,
                "factor": factor,
                "source": source,
                "status": "active",
                "created_by": DEMO_ADMIN_ID,
            },
        )
        factor_ids[name] = str(created["_id"])

    transaction_rows = [
        (
            "MFG",
            "Electricity",
            "Monthly electricity usage",
            500,
            month_date(8),
        ),
        (
            "OPS",
            "Diesel",
            "Fleet fuel for delivery operations",
            120,
            month_date(10),
        ),
        (
            "HR",
            "Landfill Waste",
            "Office landfill waste",
            40,
            month_date(11),
        ),
        (
            "FIN",
            "Business Flight",
            "Quarterly investor travel",
            540,
            month_date(12),
        ),
    ]

    factor_docs = {factor["name"]: factor for factor in factors.find({})}
    for dept_code, factor_name, description, quantity, transaction_date in transaction_rows:
        factor = factor_docs[factor_name]
        emission_value = round(quantity * factor["factor"], 4)
        upsert_one(
            transactions,
            {
                "department_id": department_ids[dept_code],
                "emission_factor_id": factor_ids[factor_name],
                "description": description,
                "transaction_date": transaction_date,
            },
            {
                "department_id": department_ids[dept_code],
                "emission_factor_id": factor_ids[factor_name],
                "source_type": factor["category"],
                "description": description,
                "quantity": quantity,
                "unit": factor["unit"],
                "emission_value": emission_value,
                "calculation_method": "auto",
                "transaction_date": transaction_date,
                "factor_snapshot": {
                    "name": factor["name"],
                    "unit": factor["unit"],
                    "factor": factor["factor"],
                },
                "created_by": DEMO_ADMIN_ID,
            },
        )

    goal_rows = [
        (
            "MFG",
            "Keep Manufacturing emissions under 1000 kg CO2e",
            1000,
            month_date(31),
        ),
        (
            "OPS",
            "Reduce Operations fleet emissions below 500 kg CO2e",
            500,
            month_date(31),
        ),
        (
            "HR",
            "Keep HR office waste emissions below 100 kg CO2e",
            100,
            month_date(31),
        ),
    ]

    for dept_code, title, target, deadline in goal_rows:
        upsert_one(
            goals,
            {
                "department_id": department_ids[dept_code],
                "title": title,
                "period_month": PERIOD_MONTH,
                "period_year": PERIOD_YEAR,
            },
            {
                "department_id": department_ids[dept_code],
                "title": title,
                "target_emission": target,
                "period_month": PERIOD_MONTH,
                "period_year": PERIOD_YEAR,
                "deadline": deadline,
                "status": "active",
                "created_by": DEMO_ADMIN_ID,
            },
        )


def seed_governance(
    database,
    department_ids: dict[str, str],
    users: list[dict[str, Any]],
) -> None:
    policies = database["esg_policies"]
    documents = database["policy_documents"]
    acknowledgements = database["policy_acknowledgements"]
    audits = database["audits"]
    issues = database["compliance_issues"]
    ai_logs = database["ai_insight_logs"]

    policy_rows = [
        {
            "title": "Data Privacy & ESG Ethics Policy",
            "category": "data_privacy",
            "description": (
                "Defines employee responsibilities for data privacy, ESG ethics, "
                "supplier evidence handling, and incident escalation."
            ),
            "department_id": department_ids["OPS"],
            "status": "active",
            "effective_date": month_date(1),
        },
        {
            "title": "Supplier Governance and Code of Conduct",
            "category": "supplier_governance",
            "description": (
                "Sets supplier review requirements, corrective action ownership, "
                "and governance evidence expectations."
            ),
            "department_id": department_ids["FIN"],
            "status": "active",
            "effective_date": month_date(1),
        },
        {
            "title": "Workplace Safety and Compliance Manual",
            "category": "safety",
            "description": (
                "Outlines reporting, audit readiness, and safety compliance "
                "controls for operational teams."
            ),
            "department_id": department_ids["MFG"],
            "status": "active",
            "effective_date": month_date(1),
        },
    ]
    policy_ids: dict[str, str] = {}

    for policy in policy_rows:
        created = upsert_one(
            policies,
            {"title": policy["title"]},
            {**policy, "created_by": DEMO_ADMIN_ID},
        )
        policy_ids[policy["title"]] = str(created["_id"])

    policy_previews = {
        "Data Privacy & ESG Ethics Policy": (
            "Employees must protect personal, supplier, employee, and ESG operational "
            "data. Any suspected data breach must be reported to the policy owner and "
            "governance team immediately. Evidence must be preserved, affected systems "
            "must be identified, and corrective actions must include an owner, due date, "
            "risk level, and completion evidence. Employees must not share confidential "
            "data outside approved systems and must complete required policy "
            "acknowledgements before handling sensitive information."
        ),
        "Supplier Governance and Code of Conduct": (
            "Suppliers must follow EcoSphere's code of conduct, anti-bribery rules, "
            "data protection expectations, and ESG evidence requirements. Vendor owners "
            "must collect updated attestations, review missing evidence, document "
            "corrective action plans, and escalate high-risk supplier violations to the "
            "governance team. Supplier issues remain open until evidence is reviewed and "
            "the assigned corrective actions are completed."
        ),
        "Workplace Safety and Compliance Manual": (
            "Manufacturing and operations teams must follow safety SOPs, complete "
            "training, acknowledge updated procedures, and report incidents before the "
            "next audit cycle. Shift leads are responsible for checking acknowledgement "
            "gaps, keeping training records, and resolving safety findings before their "
            "due date. Unresolved incident evidence or missing SOP acknowledgements must "
            "be treated as a compliance risk."
        ),
    }

    for policy_title, policy_id in policy_ids.items():
        document_text = f"{policy_title} demo governance policy document"
        document_hash = sha256(document_text.encode()).hexdigest()
        upsert_one(
            documents,
            {"policy_id": policy_id, "filename": f"{policy_title}.pdf"},
            {
                "policy_id": policy_id,
                "document_id": document_hash,
                "filename": f"{policy_title}.pdf",
                "storage_provider": "demo_seed",
                "secure_url": None,
                "public_id": None,
                "resource_type": "raw",
                "bytes": 184000,
                "page_count": 6,
                "chunk_count": 18,
                "ingestion_status": "ready",
                "content_preview": policy_previews[policy_title],
                "uploaded_by": DEMO_ADMIN_ID,
            },
        )

    for user in users:
        clerk_user_id = user.get("clerk_user_id")
        if not clerk_user_id:
            continue

        for policy_title in list(policy_ids)[:2]:
            policy_id = policy_ids[policy_title]
            upsert_one(
                acknowledgements,
                {"policy_id": policy_id, "user_id": clerk_user_id},
                {
                    "policy_id": policy_id,
                    "user_id": clerk_user_id,
                    "status": "acknowledged",
                    "acknowledged_at": month_date(9),
                },
            )

    audit_rows = [
        {
            "title": "Data privacy and ESG ethics audit",
            "scope": (
                "Review policy acknowledgements, supplier data controls, "
                "incident escalation records, and ESG ethics evidence."
            ),
            "department_id": department_ids["OPS"],
            "auditor_user_id": "admin.demo@ecosphere.local",
            "status": "in_progress",
            "start_date": month_date(5),
            "end_date": month_date(28),
            "findings_count": 3,
        },
        {
            "title": "Manufacturing safety compliance audit",
            "scope": "Check safety SOP acknowledgement and evidence records.",
            "department_id": department_ids["MFG"],
            "auditor_user_id": "admin.demo@ecosphere.local",
            "status": "planned",
            "start_date": month_date(18),
            "end_date": month_date(30),
            "findings_count": 0,
        },
    ]

    for audit in audit_rows:
        upsert_one(
            audits,
            {"title": audit["title"]},
            {**audit, "created_by": DEMO_ADMIN_ID},
        )

    issue_rows = [
        {
            "title": "Supplier data breach not reviewed",
            "description": (
                "Supplier data breach has been reported, but evidence review, "
                "policy mapping, and corrective action ownership have not been completed."
            ),
            "severity": "high",
            "status": "open",
            "owner_user_id": "operations.owner@ecosphere.local",
            "department_id": department_ids["OPS"],
            "due_date": month_date(7),
            "source_policy_id": policy_ids["Data Privacy & ESG Ethics Policy"],
            "resolution_note": None,
            "resolved_at": None,
        },
        {
            "title": "Supplier code of conduct evidence missing",
            "description": (
                "Finance has not received updated supplier governance evidence "
                "for two strategic vendors."
            ),
            "severity": "critical",
            "status": "in_progress",
            "owner_user_id": "finance.owner@ecosphere.local",
            "department_id": department_ids["FIN"],
            "due_date": month_date(20),
            "source_policy_id": policy_ids["Supplier Governance and Code of Conduct"],
            "resolution_note": None,
            "resolved_at": None,
        },
        {
            "title": "Safety SOP acknowledgement gap",
            "description": (
                "Manufacturing shift leads need to complete renewed safety SOP "
                "acknowledgement before the next internal audit."
            ),
            "severity": "medium",
            "status": "resolved",
            "owner_user_id": "manufacturing.owner@ecosphere.local",
            "department_id": department_ids["MFG"],
            "due_date": month_date(14),
            "source_policy_id": policy_ids["Workplace Safety and Compliance Manual"],
            "resolution_note": "Shift leads completed acknowledgement review.",
            "resolved_at": month_date(12),
        },
    ]

    for issue in issue_rows:
        upsert_one(
            issues,
            {"title": issue["title"]},
            {**issue, "created_by": DEMO_ADMIN_ID},
        )

    sample_answer = (
        "Risk level: High\n\n"
        "The supplier data breach requires evidence review, owner assignment, "
        "and corrective action tracking under the uploaded governance policies [C1]."
    )
    upsert_one(
        ai_logs,
        {"type": "risk_summary", "prompt": "Supplier data breach not reviewed"},
        {
            "type": "risk_summary",
            "prompt": "Supplier data breach not reviewed",
            "answer": sample_answer,
            "citations": [
                {
                    "citation_id": "C1",
                    "document_id": sha256(
                        "Data Privacy & ESG Ethics Policy demo governance policy document".encode()
                    ).hexdigest(),
                    "policy_id": policy_ids["Data Privacy & ESG Ethics Policy"],
                    "document_name": "Data Privacy & ESG Ethics Policy.pdf",
                    "policy_title": "Data Privacy & ESG Ethics Policy",
                    "page_number": 2,
                    "excerpt": (
                        "Employees must escalate data incidents and maintain "
                        "supplier evidence for governance review."
                    ),
                }
            ],
            "created_by": DEMO_ADMIN_ID,
            "created_at": now_utc(),
        },
    )


def seed_activity_logs(database, department_ids: dict[str, str]) -> None:
    logs = database["activity_logs"]
    rows = [
        {
            "type": "department_added",
            "title": "Manufacturing department added",
            "message": "Manufacturing is now available for ESG scoring.",
            "department_id": department_ids["MFG"],
            "created_by": DEMO_ADMIN_ID,
            "metadata": {},
            "created_at": month_date(2),
        },
        {
            "type": "score_updated",
            "title": "HR ESG score updated",
            "message": "Human Resources total ESG score is now 80.1.",
            "department_id": department_ids["HR"],
            "created_by": DEMO_ADMIN_ID,
            "metadata": {"period_month": PERIOD_MONTH, "period_year": PERIOD_YEAR},
            "created_at": month_date(9),
        },
        {
            "type": "score_updated",
            "title": "Operations ESG score updated",
            "message": "Operations total ESG score is now 74.2.",
            "department_id": department_ids["OPS"],
            "created_by": DEMO_ADMIN_ID,
            "metadata": {"period_month": PERIOD_MONTH, "period_year": PERIOD_YEAR},
            "created_at": month_date(10),
        },
    ]

    for row in rows:
        upsert_one(
            logs,
            {"title": row["title"], "created_at": row["created_at"]},
            row,
        )


def main() -> None:
    client = MongoClient(settings.mongodb_uri)
    database = client[settings.mongodb_database]

    users = seed_users(database)
    department_ids = seed_departments(database)
    seed_department_scores(database, department_ids)
    seed_environment(database, department_ids)
    seed_governance(database, department_ids, users)
    seed_activity_logs(database, department_ids)

    print("Demo seed complete")
    print(f"Database: {settings.mongodb_database}")
    print(f"Departments: {database['departments'].count_documents({})}")
    print(f"Emission factors: {database['emission_factors'].count_documents({})}")
    print(f"Carbon transactions: {database['carbon_transactions'].count_documents({})}")
    print(f"Governance policies: {database['esg_policies'].count_documents({})}")
    print(f"Compliance issues: {database['compliance_issues'].count_documents({})}")


if __name__ == "__main__":
    main()
