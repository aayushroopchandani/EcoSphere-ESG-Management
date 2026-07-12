import csv
import io
from datetime import date
from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.models import (
    CarbonTransaction, EmployeeParticipation, ChallengeParticipation,
    ComplianceIssue, PolicyAcknowledgement, Department
)
from app.logic.scoring import calculate_department_score

router = APIRouter(prefix="/reports", tags=["Reports"])


async def _carbon_query(department_id=None, start_date=None, end_date=None):
    conditions = []
    if department_id:
        conditions.append(CarbonTransaction.department_id == department_id)
    if start_date:
        conditions.append(CarbonTransaction.date >= start_date)
    if end_date:
        conditions.append(CarbonTransaction.date <= end_date)
    query = CarbonTransaction.find(*conditions) if conditions else CarbonTransaction.find_all()
    return await query.to_list()


@router.get("/environmental")
async def environmental_report(
    department_id: Optional[PydanticObjectId] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
):
    rows = await _carbon_query(department_id, start_date, end_date)
    return {
        "total_co2e": round(sum(r.co2e for r in rows), 3),
        "transaction_count": len(rows),
        "transactions": rows,
    }


@router.get("/social")
async def social_report(department_id: Optional[PydanticObjectId] = None):
    participation = await EmployeeParticipation.find_all().to_list()
    challenges = await ChallengeParticipation.find_all().to_list()
    return {
        "csr_participation_count": len(participation),
        "csr_approved": sum(1 for p in participation if p.approval_status == "Approved"),
        "challenge_participation_count": len(challenges),
        "challenge_approved": sum(1 for c in challenges if c.approval == "Approved"),
        "csr_records": participation,
        "challenge_records": challenges,
    }


@router.get("/governance")
async def governance_report():
    acks = await PolicyAcknowledgement.find_all().to_list()
    issues = await ComplianceIssue.find_all().to_list()
    return {
        "policy_acknowledgement_count": len(acks),
        "open_compliance_issues": sum(1 for i in issues if i.status != "Resolved"),
        "overdue_compliance_issues": sum(1 for i in issues if i.is_overdue),
        "issues": issues,
    }


@router.get("/esg-summary")
async def esg_summary_report(period: Optional[str] = None):
    period = period or f"{date.today().year}-{date.today().month:02d}"
    departments = await Department.find(Department.status == "Active").to_list()
    scores = [await calculate_department_score(d.id, period) for d in departments]
    overall = round(sum(s.total_score for s in scores) / len(scores), 2) if scores else 0
    return {"period": period, "overall_esg_score": overall, "department_scores": scores}


@router.get("/export/csv")
async def export_csv(report: str):
    """report: environmental | social | governance | esg-summary"""
    buffer = io.StringIO()
    writer = csv.writer(buffer)

    if report == "environmental":
        rows = await CarbonTransaction.find_all().to_list()
        writer.writerow(["id", "department_id", "source_type", "quantity", "co2e", "date"])
        for r in rows:
            writer.writerow([str(r.id), str(r.department_id), r.source_type, r.quantity, r.co2e, r.date])
    elif report == "governance":
        rows = await ComplianceIssue.find_all().to_list()
        writer.writerow(["id", "severity", "description", "owner_id", "due_date", "status", "is_overdue"])
        for r in rows:
            writer.writerow([str(r.id), r.severity, r.description, str(r.owner_id), r.due_date, r.status, r.is_overdue])
    else:
        writer.writerow(["error"])
        writer.writerow([f"Unknown or unsupported report type for CSV: {report}"])

    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]), media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={report}_report.csv"},
    )
