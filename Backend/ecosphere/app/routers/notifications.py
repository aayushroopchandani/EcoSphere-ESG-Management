from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, HTTPException

from app.models import Notification

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[Notification])
async def list_notifications(employee_id: Optional[PydanticObjectId] = None, unread_only: bool = False):
    conditions = []
    if employee_id is not None:
        conditions.append(Notification.employee_id == employee_id)
    if unread_only:
        conditions.append(Notification.is_read == False)  # noqa: E712

    query = Notification.find(*conditions) if conditions else Notification.find_all()
    return await query.sort([("created_at", -1)]).to_list()


@router.patch("/{item_id}/read", response_model=Notification)
async def mark_read(item_id: PydanticObjectId):
    item = await Notification.get(item_id)
    if not item:
        raise HTTPException(404, "Notification not found")
    item.is_read = True
    await item.save()
    return item
