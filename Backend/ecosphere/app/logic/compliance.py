from datetime import date

from beanie.operators import NE

from app.models import ComplianceIssue
from app.logic.notifications import notify


async def refresh_overdue_flags():
    """
    Run this on startup and/or periodically (or trigger it from a GET /compliance-issues
    call) to flag issues that passed their due date while still Open, and fire a
    notification the first time an issue flips to overdue.
    """
    issues = await ComplianceIssue.find(NE(ComplianceIssue.status, "Resolved")).to_list()
    newly_overdue = []
    today = date.today()
    for issue in issues:
        was_overdue = issue.is_overdue
        issue.is_overdue = issue.due_date < today
        if issue.is_overdue and not was_overdue:
            newly_overdue.append(issue)
        await issue.save()

    for issue in newly_overdue:
        await notify(
            type="compliance_issue",
            employee_id=issue.owner_id,
            message=f"Compliance issue #{issue.id} is now overdue (due {issue.due_date}).",
        )
    return newly_overdue
