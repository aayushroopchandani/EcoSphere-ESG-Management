from datetime import datetime

from beanie import PydanticObjectId
from fastapi import APIRouter, HTTPException

from app.models import PolicyAcknowledgement, ESGPolicy, Employee, Audit, ComplianceIssue
from app.logic.notifications import notify
from app.logic.compliance import refresh_overdue_flags

router = APIRouter(tags=["Governance"])


# --- Policy Acknowledgements ---
@router.post("/policy-acknowledgements", response_model=PolicyAcknowledgement)
async def acknowledge_policy(item: PolicyAcknowledgement):
    policy = await ESGPolicy.get(item.policy_id)
    if not policy:
        raise HTTPException(404, "Policy not found")
    item.acknowledged_at = datetime.utcnow()
    await item.insert()
    return item


@router.get("/policy-acknowledgements", response_model=list[PolicyAcknowledgement])
async def list_acknowledgements():
    return await PolicyAcknowledgement.find_all().to_list()


@router.post("/policy-acknowledgements/remind/{employee_id}/{policy_id}")
async def send_reminder(employee_id: PydanticObjectId, policy_id: PydanticObjectId):
    policy = await ESGPolicy.get(policy_id)
    if not policy:
        raise HTTPException(404, "Policy not found")
    await notify(
        type="policy_reminder", employee_id=employee_id,
        message=f"Reminder: please acknowledge the policy '{policy.title}'.",
    )
    return {"ok": True}


# --- Audits ---
@router.post("/audits", response_model=Audit)
async def create_audit(item: Audit):
    await item.insert()
    return item


@router.get("/audits", response_model=list[Audit])
async def list_audits():
    return await Audit.find_all().to_list()


# --- Compliance Issues ---
@router.post("/compliance-issues", response_model=ComplianceIssue)
async def create_issue(item: ComplianceIssue):
    # Compliance Issue Ownership (compulsory): must have Owner + Due Date - enforced
    # by owner_id and due_date being required (non-nullable) fields on the model.
    owner = await Employee.get(item.owner_id)
    if not owner:
        raise HTTPException(400, "A valid Owner (employee) is required for every Compliance Issue.")

    await item.insert()

    # new compliance issue raised notification (compulsory)
    await notify(
        type="compliance_issue", employee_id=item.owner_id,
        message=f"New compliance issue assigned to you: {item.description[:80]}",
    )
    return item


@router.get("/compliance-issues", response_model=list[ComplianceIssue])
async def list_issues():
    await refresh_overdue_flags()  # keep is_overdue fresh on every read
    return await ComplianceIssue.find_all().to_list()


@router.patch("/compliance-issues/{item_id}/status", response_model=ComplianceIssue)
async def update_status(item_id: PydanticObjectId, status: str):
    item = await ComplianceIssue.get(item_id)
    if not item:
        raise HTTPException(404, "Compliance Issue not found")
    item.status = status
    if status == "Resolved":
        item.is_overdue = False
    await item.save()
    return item
