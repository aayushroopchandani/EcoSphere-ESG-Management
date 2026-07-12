from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db, close_db
from app.routers import (
    master_data, environmental, social, governance, gamification,
    notifications, scores, reports,
)
from app.logic.settings import ensure_defaults, get_setting, set_setting
from app.logic.compliance import refresh_overdue_flags


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await ensure_defaults()
    await refresh_overdue_flags()
    yield
    await close_db()


app = FastAPI(title="EcoSphere ESG Management Platform", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(master_data.router, prefix="/api")
app.include_router(environmental.router, prefix="/api")
app.include_router(social.router, prefix="/api")
app.include_router(governance.router, prefix="/api")
app.include_router(gamification.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(scores.router, prefix="/api")
app.include_router(reports.router, prefix="/api")


@app.get("/")
def root():
    return {"status": "EcoSphere API running", "docs": "/docs"}


# --- Settings toggle endpoints (used by Settings -> ESG Configuration) ---

@app.get("/api/settings")
async def get_settings():
    keys = ["auto_emission_calc", "evidence_requirement", "badge_auto_award"]
    return {k: await get_setting(k) for k in keys}


@app.patch("/api/settings/{key}")
async def update_setting(key: str, value: bool):
    await set_setting(key, value)
    return {key: value}
