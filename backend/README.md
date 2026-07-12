# EcoSphere Backend

FastAPI API for EcoSphere application data.

## Local setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

The API exposes:

```text
GET  /health
GET  /api/users/me
POST /api/users/sync

GET   /api/departments
POST  /api/departments
PATCH /api/departments/{department_id}

GET  /api/dashboard/summary
GET  /api/dashboard/department-scores
POST /api/dashboard/department-scores

GET /api/activity-logs/recent
```

Clerk-protected routes expect:

```text
Authorization: Bearer <clerk_session_token>
```
