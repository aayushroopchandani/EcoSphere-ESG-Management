from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, HTTPException

from app.models import CSRActivity, EmployeeParticipation, Employee
from app.logic.settings import get_setting
from app.logic.notifications import notify

router = APIRouter(tags=["Social"])


# --- CSR Activities ---
@router.post("/csr-activities", response_model=CSRActivity)
async def create_activity(item: CSRActivity):
    await item.insert()
    return item


@router.get("/csr-activities", response_model=list[CSRActivity])
async def list_activities():
    return await CSRActivity.find_all().to_list()


# --- Employee Participation ---
@router.post("/employee-participation", response_model=EmployeeParticipation)
async def log_participation(item: EmployeeParticipation):
    activity = await CSRActivity.get(item.activity_id)
    if not activity:
        raise HTTPException(404, "CSR Activity not found")

    # Evidence Requirement (compulsory, toggle-gated): can't be Approved without proof
    if await get_setting("evidence_requirement") and item.approval_status == "Approved" and not item.proof:
        raise HTTPException(400, "Evidence Requirement is ON: proof file is required to approve this participation.")

    await item.insert()
    return item


@router.get("/employee-participation", response_model=list[EmployeeParticipation])
async def list_participation(employee_id: Optional[PydanticObjectId] = None):
    if employee_id:
        return await EmployeeParticipation.find(EmployeeParticipation.employee_id == employee_id).to_list()
    return await EmployeeParticipation.find_all().to_list()


@router.patch("/employee-participation/{item_id}/decision", response_model=EmployeeParticipation)
async def approval_decision(item_id: PydanticObjectId, approval_status: str, points: int = 0):
    """approval_status: 'Approved' or 'Rejected'"""
    item = await EmployeeParticipation.get(item_id)
    if not item:
        raise HTTPException(404, "Participation record not found")

    if approval_status == "Approved" and await get_setting("evidence_requirement") and not item.proof:
        raise HTTPException(400, "Evidence Requirement is ON: cannot approve without proof.")

    item.approval_status = approval_status
    if approval_status == "Approved":
        item.points_earned = points
        employee = await Employee.get(item.employee_id)
        if employee:
            employee.points += points
            await employee.save()

    await item.save()

    # CSR approval decision notification (compulsory)
    await notify(
        type="approval_decision",
        employee_id=item.employee_id,
        message=f"Your CSR activity participation was {approval_status.lower()}.",
    )
    return item
