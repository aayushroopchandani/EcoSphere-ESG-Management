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

GET  /api/environment/emission-factors
POST /api/environment/emission-factors
GET  /api/environment/carbon-transactions
POST /api/environment/carbon-transactions
GET  /api/environment/goals
POST /api/environment/goals
GET  /api/environment/summary

GET   /api/governance/policies
POST  /api/governance/policies
PATCH /api/governance/policies/{policy_id}
POST  /api/governance/policies/{policy_id}/documents
GET   /api/governance/policies/{policy_id}/documents
POST  /api/governance/policies/{policy_id}/acknowledge
GET   /api/governance/my-acknowledgements
GET   /api/governance/audits
POST  /api/governance/audits
GET   /api/governance/compliance-issues
POST  /api/governance/compliance-issues
PATCH /api/governance/compliance-issues/{issue_id}
GET   /api/governance/summary
POST  /api/governance/rag/upload
POST  /api/governance/rag/chat
POST  /api/governance/rag/risk-summary

GET /api/activity-logs/recent
```

Clerk-protected routes expect:

```text
Authorization: Bearer <clerk_session_token>
```
