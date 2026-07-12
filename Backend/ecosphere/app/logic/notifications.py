from typing import Optional

from beanie import PydanticObjectId

from app.models import Notification


async def notify(type: str, message: str, employee_id: Optional[PydanticObjectId] = None):
    """
    Central place to raise notifications. Called for the 4 required events:
    - new compliance issue raised
    - CSR/Challenge approval decisions
    - policy acknowledgement reminders
    - badge unlocks
    """
    n = Notification(employee_id=employee_id, type=type, message=message)
    await n.insert()
    return n
