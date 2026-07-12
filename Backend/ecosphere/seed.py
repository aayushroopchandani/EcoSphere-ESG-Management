"""
Run this after starting the server to populate realistic demo data:
    python3 seed.py
Requires the API server to be running on http://127.0.0.1:8000
"""
import requests

BASE = "http://127.0.0.1:8000/api"


def post(path, data):
    r = requests.post(f"{BASE}{path}", json=data)
    r.raise_for_status()
    return r.json()


print("Seeding departments...")
mfg = post("/departments", {"name": "Manufacturing", "code": "MFG", "employee_count": 25})
sales = post("/departments", {"name": "Sales", "code": "SLS", "employee_count": 15})

print("Seeding employees...")
asha = post("/employees", {"name": "Asha Patel", "email": "asha@ecosphere.com", "department_id": mfg["id"]})
rohit = post("/employees", {"name": "Rohit Shah", "email": "rohit@ecosphere.com", "department_id": sales["id"], "role": "admin"})

print("Seeding emission factors...")
diesel = post("/emission-factors", {"name": "Diesel Fleet", "source_type": "Fleet", "unit": "liter", "co2_per_unit": 2.68})
elec = post("/emission-factors", {"name": "Grid Electricity", "source_type": "Manufacturing", "unit": "kWh", "co2_per_unit": 0.71})

print("Seeding carbon transactions...")
post("/carbon-transactions", {"department_id": mfg["id"], "emission_factor_id": diesel["id"], "source_type": "Fleet", "quantity": 120, "co2e": 0, "date": "2026-07-01"})
post("/carbon-transactions", {"department_id": mfg["id"], "emission_factor_id": elec["id"], "source_type": "Manufacturing", "quantity": 500, "co2e": 0, "date": "2026-07-03"})

print("Seeding badges & rewards...")
post("/badges", {"name": "Green Rookie", "description": "Complete your first challenge", "unlock_rule_type": "XP_THRESHOLD", "unlock_rule_value": 50})
post("/badges", {"name": "Eco Champion", "description": "Complete 3 challenges", "unlock_rule_type": "CHALLENGE_COUNT", "unlock_rule_value": 3})
post("/rewards", {"name": "Coffee Voucher", "points_required": 30, "stock": 20, "status": "Active"})
post("/rewards", {"name": "Extra Day Off", "points_required": 200, "stock": 3, "status": "Active"})

print("Seeding categories & challenges...")
cat = post("/categories", {"name": "Energy Saving", "type": "CHALLENGE"})
challenge = post("/challenges", {"title": "Turn off lights after hours", "category_id": cat["id"], "xp": 60, "difficulty": "Easy", "evidence_required": True, "deadline": "2026-08-01", "status": "Active"})

print("Seeding CSR activity...")
csr_cat = post("/categories", {"name": "Tree Planting", "type": "CSR_ACTIVITY"})
activity = post("/csr-activities", {"title": "Community Tree Plantation", "category_id": csr_cat["id"], "department_id": mfg["id"], "date": "2026-07-05", "status": "Completed"})

print("Seeding policy...")
policy = post("/policies", {"title": "Code of Conduct 2026", "description": "Annual acknowledgement", "category": "Governance", "effective_date": "2026-01-01", "status": "Active"})

print("Seeding compliance issue...")
post("/compliance-issues", {"severity": "Medium", "description": "Fire extinguisher inspection overdue", "owner_id": rohit["id"], "due_date": "2026-07-20", "status": "Open"})

print("\nDone. Demo data seeded.")
print(f"Try: GET {BASE}/dashboard  |  GET {BASE}/leaderboard  |  GET {BASE}/reports/esg-summary")
