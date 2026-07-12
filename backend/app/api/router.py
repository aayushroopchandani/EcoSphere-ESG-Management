from fastapi import APIRouter

from app.api.routes import activity_logs, dashboard, departments, users

api_router = APIRouter()
api_router.include_router(activity_logs.router)
api_router.include_router(dashboard.router)
api_router.include_router(departments.router)
api_router.include_router(users.router)
