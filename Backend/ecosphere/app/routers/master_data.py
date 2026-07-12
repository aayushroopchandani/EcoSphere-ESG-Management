from typing import Type, TypeVar

from beanie import Document, PydanticObjectId
from fastapi import APIRouter, HTTPException

from app.models import (
    Department, Category, EmissionFactor, Badge, Reward, ESGPolicy,
    EnvironmentalGoal, Employee
)

router = APIRouter(tags=["Master Data"])

ModelT = TypeVar("ModelT", bound=Document)


def _crud(router: APIRouter, model: Type[ModelT], path: str):

    @router.post(f"/{path}", response_model=model)
    async def create(item: model):
        await item.insert()
        return item

    @router.get(f"/{path}", response_model=list[model])
    async def list_all():
        return await model.find_all().to_list()

    @router.get(f"/{path}/{{item_id}}", response_model=model)
    async def get_one(item_id: PydanticObjectId):
        obj = await model.get(item_id)
        if not obj:
            raise HTTPException(404, f"{model.__name__} not found")
        return obj

    @router.put(f"/{path}/{{item_id}}", response_model=model)
    async def update(item_id: PydanticObjectId, item: model):
        obj = await model.get(item_id)
        if not obj:
            raise HTTPException(404, f"{model.__name__} not found")
        data = item.model_dump(exclude_unset=True, exclude={"id"})
        for k, v in data.items():
            setattr(obj, k, v)
        await obj.save()
        return obj

    @router.delete(f"/{path}/{{item_id}}")
    async def delete(item_id: PydanticObjectId):
        obj = await model.get(item_id)
        if not obj:
            raise HTTPException(404, f"{model.__name__} not found")
        await obj.delete()
        return {"ok": True}


_crud(router, Department, "departments")
_crud(router, Category, "categories")
_crud(router, EmissionFactor, "emission-factors")
_crud(router, Badge, "badges")
_crud(router, Reward, "rewards")
_crud(router, ESGPolicy, "policies")
_crud(router, EnvironmentalGoal, "environmental-goals")
_crud(router, Employee, "employees")
