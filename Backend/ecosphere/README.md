# EcoSphere Backend — MongoDB Edition

This is your original FastAPI backend refactored from **SQLite (SQLModel)** to
**MongoDB (Beanie ODM + Motor)**. The API surface (routes, request/response shapes,
business rules) is kept as close as possible to the original — the main visible
difference is the **id format**.

## What changed

| | Before (SQLite/SQLModel) | After (MongoDB/Beanie) |
|---|---|---|
| DB driver | `sqlmodel` (sync, SQLAlchemy) | `beanie` + `motor` (async) |
| Models | `SQLModel(table=True)` classes | `beanie.Document` classes |
| IDs | auto-increment `int` | MongoDB `ObjectId` (24-char hex string, e.g. `"64f1a2b3c4d5e6f7a8b9c0d1"`) |
| Foreign keys | `Field(foreign_key="model.id")` | plain `PydanticObjectId` fields (no enforced FK — same as before, Mongo has no constraints either) |
| Route handlers | `def foo(..., session: Session = Depends(get_session))` | `async def foo(...)` — no session dependency needed, Beanie uses a global Motor client |
| Date parsing hack | `coerce_dates()` util (needed because SQLModel table classes skip pydantic validation) | removed — Beanie documents *are* pydantic models, so date/datetime strings from JSON are parsed automatically |
| Startup | `@app.on_event("startup")` | `lifespan` context manager (the modern FastAPI pattern) |

**⚠️ Breaking change for any frontend/client you've already built:** every `id` field
(and every `*_id` foreign key) is now a string ObjectId instead of an integer.
If your frontend does things like `department.id === 3` or increments IDs, that logic
needs to change to just treat IDs as opaque strings.

All business rules are preserved exactly:
- Auto Emission Calculation toggle
- Evidence Requirement toggle (CSR + Challenges)
- Badge Auto-Award toggle
- Compliance Issue Ownership enforcement + overdue flagging
- Notifications for compliance issues, approval decisions, policy reminders, badge unlocks
- Reward redemption with stock/points checks
- Department/Overall ESG scoring with configurable weights (default 40/30/30)

## Project structure

```
ecosphere/
├── app/
│   ├── main.py              # FastAPI app, lifespan startup, settings endpoints
│   ├── database.py          # Motor client + init_beanie()
│   ├── models.py            # Beanie Document models (was SQLModel models.py)
│   ├── routers/              # same 8 routers as before, now all async
│   └── logic/                 # scoring, badges, notifications, compliance, settings
│                                (logic/utils.py's coerce_dates was removed — no longer needed)
├── seed.py                   # unchanged — hits the REST API, works as-is
├── requirements.txt
├── docker-compose.yml        # spins up a local MongoDB for you
└── .env.example
```

## Running it

1. **Start MongoDB** (pick one):
   ```bash
   docker compose up -d          # uses the included docker-compose.yml
   # or point MONGO_URI at MongoDB Atlas / an existing instance
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **(Optional) configure connection** — defaults to `mongodb://localhost:27017`,
   database `ecosphere`. Copy `.env.example` to `.env` and edit if needed, or just
   export the vars:
   ```bash
   export MONGO_URI="mongodb://localhost:27017"
   export MONGO_DB_NAME="ecosphere"
   ```

4. **Run the server:**
   ```bash
   uvicorn app.main:app --reload
   ```
   Visit `http://127.0.0.1:8000/docs` for interactive Swagger docs.

5. **(Optional) seed demo data** in another terminal, once the server is running:
   ```bash
   python3 seed.py
   ```

## Notes on the Beanie query patterns used

- Simple lookups: `await Model.get(id)`, `await Model.find_all().to_list()`
- Filtered queries: `await Model.find(Model.field == value).to_list()`
- Multiple conditions (AND): `await Model.find(Model.a == x, Model.b == y).to_list()`
- "IN" queries (replaces SQLModel's `.in_()`): `from beanie.operators import In` →
  `await Model.find(In(Model.field, [id1, id2])).to_list()`
- "NOT EQUAL" (replaces SQLModel's `!=` in a query context): `from beanie.operators import NE` →
  `await Model.find(NE(Model.field, value)).to_list()`
- Sorting: `.sort([("field", -1)])` for descending

If you outgrow the simple `find()` patterns (e.g. need real aggregation pipelines
for reporting), Motor's raw `Model.get_motor_collection().aggregate([...])` is
available underneath any Beanie Document.
