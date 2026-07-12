from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, HTTPException

from app.models import CarbonTransaction, EmissionFactor
from app.logic.settings import get_setting

router = APIRouter(prefix="/carbon-transactions", tags=["Environmental"])


@router.post("", response_model=CarbonTransaction)
async def create_transaction(item: CarbonTransaction):
    factor = await EmissionFactor.get(item.emission_factor_id)
    if not factor:
        raise HTTPException(404, "Emission Factor not found")

    # Auto Emission Calculation (compulsory feature, toggle-gated):
    # if ON, co2e is always derived from quantity * factor, ignoring any client-sent value.
    if await get_setting("auto_emission_calc"):
        item.co2e = round(item.quantity * factor.co2_per_unit, 3)
        item.auto_calculated = True
    else:
        item.auto_calculated = False  # manual entry, co2e as provided by caller

    await item.insert()
    return item


@router.get("", response_model=list[CarbonTransaction])
async def list_transactions(department_id: Optional[PydanticObjectId] = None):
    if department_id:
        return await CarbonTransaction.find(CarbonTransaction.department_id == department_id).to_list()
    return await CarbonTransaction.find_all().to_list()


@router.get("/{item_id}", response_model=CarbonTransaction)
async def get_transaction(item_id: PydanticObjectId):
    obj = await CarbonTransaction.get(item_id)
    if not obj:
        raise HTTPException(404, "Carbon Transaction not found")
    return obj


@router.get("/department/{department_id}/total")
async def department_total(department_id: PydanticObjectId):
    rows = await CarbonTransaction.find(CarbonTransaction.department_id == department_id).to_list()
    return {
        "department_id": str(department_id),
        "total_co2e": round(sum(r.co2e for r in rows), 3),
        "count": len(rows),
    }
