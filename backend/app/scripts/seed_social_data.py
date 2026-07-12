from datetime import UTC, datetime, timedelta
from pymongo import MongoClient
from app.core.config import settings

def now_utc() -> datetime:
    return datetime.now(UTC)

def seed_social_data():
    client = MongoClient(settings.mongodb_uri)
    db = client[settings.mongodb_database]

    print("Cleaning existing social and gamification data...")
    db["csr_activities"].delete_many({})
    db["employee_participations"].delete_many({})
    db["activity_logs"].delete_many({"type": {"$regex": "^csr_"}})

    print("Inserting sample CSR activities...")
    activities = [
        {
            "title": "Tree Plantation Drive 2026",
            "category": "environment",
            "description": "Help plant 500 saplings around the university campus and residential areas to improve green cover.",
            "department_id": None,
            "points": 50,
            "start_date": now_utc() - timedelta(days=5),
            "end_date": now_utc() + timedelta(days=5),
            "status": "active",
            "created_by": "demo_admin_seed",
            "created_at": now_utc() - timedelta(days=6),
            "updated_at": now_utc() - timedelta(days=6),
        },
        {
            "title": "Beach Cleanup Volunteer Campaign",
            "category": "environment",
            "description": "Join the weekend beach cleanup drive to collect plastic waste and promote ocean safety.",
            "department_id": None,
            "points": 40,
            "start_date": now_utc() - timedelta(days=2),
            "end_date": now_utc() + timedelta(days=1),
            "status": "active",
            "created_by": "demo_admin_seed",
            "created_at": now_utc() - timedelta(days=3),
            "updated_at": now_utc() - timedelta(days=3),
        },
        {
            "title": "Corporate Ethics and Governance Webinar",
            "category": "social",
            "description": "Complete the webinar training session on compliance, ESG data ethics, and report drafting.",
            "department_id": None,
            "points": 30,
            "start_date": now_utc() - timedelta(days=10),
            "end_date": now_utc() + timedelta(days=20),
            "status": "active",
            "created_by": "demo_admin_seed",
            "created_at": now_utc() - timedelta(days=11),
            "updated_at": now_utc() - timedelta(days=11),
        },
        {
            "title": "Health & Mental Well-being Seminar",
            "category": "health",
            "description": "Attend the weekly session with experts sharing tips on ergonomics, stress management and mental fitness.",
            "department_id": None,
            "points": 20,
            "start_date": now_utc() - timedelta(days=1),
            "end_date": now_utc() + timedelta(days=10),
            "status": "active",
            "created_by": "demo_admin_seed",
            "created_at": now_utc() - timedelta(days=2),
            "updated_at": now_utc() - timedelta(days=2),
        },
        {
            "title": "Underprivileged Child Tutoring Session",
            "category": "education",
            "description": "Volunteer to tutor children from local shelter homes in mathematics and basic computing skills.",
            "department_id": None,
            "points": 60,
            "start_date": now_utc() - timedelta(days=8),
            "end_date": now_utc() + timedelta(days=4),
            "status": "active",
            "created_by": "demo_admin_seed",
            "created_at": now_utc() - timedelta(days=9),
            "updated_at": now_utc() - timedelta(days=9),
        },
        {
            "title": "E-Waste Recycling Collection Drive",
            "category": "environment",
            "description": "Donate your old electronic appliances, chargers and batteries for environment-friendly scientific disposal.",
            "department_id": None,
            "points": 35,
            "start_date": now_utc() - timedelta(days=4),
            "end_date": now_utc() + timedelta(days=6),
            "status": "active",
            "created_by": "demo_admin_seed",
            "created_at": now_utc() - timedelta(days=5),
            "updated_at": now_utc() - timedelta(days=5),
        },
        {
            "title": "Blood Donation Camp 2026",
            "category": "health",
            "description": "Participate in the quarterly blood donation camp organized at the HQ in collaboration with Red Cross.",
            "department_id": None,
            "points": 45,
            "start_date": now_utc() - timedelta(days=15),
            "end_date": now_utc() - timedelta(days=12),
            "status": "completed",
            "created_by": "demo_admin_seed",
            "created_at": now_utc() - timedelta(days=16),
            "updated_at": now_utc() - timedelta(days=12),
        },
        {
            "title": "Community Meal Distribution Drive",
            "category": "social",
            "description": "Distribute fresh meals to local community shelters and raise awareness about food waste prevention.",
            "department_id": None,
            "points": 50,
            "start_date": now_utc() - timedelta(days=3),
            "end_date": now_utc() + timedelta(days=7),
            "status": "active",
            "created_by": "demo_admin_seed",
            "created_at": now_utc() - timedelta(days=4),
            "updated_at": now_utc() - timedelta(days=4),
        }
    ]

    inserted_activities = []
    for act in activities:
        res = db["csr_activities"].insert_one(act)
        act["_id"] = str(res.inserted_id)
        inserted_activities.append(act)
        print(f"Created Activity: {act['title']} (ID: {act['_id']})")

    # Let's target the two main clerk users in your database
    users = [
        "user_3GOFDGDUra482r4MSg0DDI7udaG",
        "user_3GOIyVujPrP5kQwOID4yMkBTbbD",
        "demo_employee_seed"
    ]

    print("Seeding employee participations and updating user scores...")
    
    # 1. Approved participation for the tree drive
    tree_activity = inserted_activities[0]
    for idx, user_id in enumerate(users):
        db["employee_participations"].insert_one({
            "activity_id": tree_activity["_id"],
            "employee_id": user_id,
            "proof_url": "https://example.com/tree-plantation-proof-photo.jpg",
            "note": f"Planted 5 oak saplings behind Block C.",
            "approval_status": "approved",
            "points_earned": tree_activity["points"],
            "reviewed_by": "demo_admin_seed",
            "reviewed_at": now_utc() - timedelta(days=2),
            "completion_date": now_utc() - timedelta(days=2),
            "created_at": now_utc() - timedelta(days=3),
            "updated_at": now_utc() - timedelta(days=2),
        })

    # 2. Approved participation for child tutoring
    tutor_activity = inserted_activities[4]
    for idx, user_id in enumerate(users):
        db["employee_participations"].insert_one({
            "activity_id": tutor_activity["_id"],
            "employee_id": user_id,
            "proof_url": "https://example.com/tutor-proof-log.pdf",
            "note": "Spent 2 hours tutoring basic arithmetic.",
            "approval_status": "approved",
            "points_earned": tutor_activity["points"],
            "reviewed_by": "demo_admin_seed",
            "reviewed_at": now_utc() - timedelta(days=1),
            "completion_date": now_utc() - timedelta(days=1),
            "created_at": now_utc() - timedelta(days=2),
            "updated_at": now_utc() - timedelta(days=1),
        })

    # 3. Pending participation for the Beach Cleanup for the two active clerk users
    beach_activity = inserted_activities[1]
    for idx, user_id in enumerate(users[:2]):
        db["employee_participations"].insert_one({
            "activity_id": beach_activity["_id"],
            "employee_id": user_id,
            "proof_url": "https://example.com/beach-cleanup-photo.jpg",
            "note": "Collected 4 bags of plastic containers from the shore.",
            "approval_status": "pending",
            "points_earned": 0,
            "reviewed_by": None,
            "reviewed_at": None,
            "completion_date": None,
            "created_at": now_utc() - timedelta(hours=4),
            "updated_at": now_utc() - timedelta(hours=4),
        })

    # 4. Rejected participation for E-Waste Drive (so they can see the Rejected pill styling)
    ewaste_activity = inserted_activities[5]
    for idx, user_id in enumerate(users[:2]):
        db["employee_participations"].insert_one({
            "activity_id": ewaste_activity["_id"],
            "employee_id": user_id,
            "proof_url": "https://example.com/not-actual-ewaste.jpg",
            "note": "Submitted plastic bottle recycled instead of electronic waste.",
            "approval_status": "rejected",
            "points_earned": 0,
            "reviewed_by": "demo_admin_seed",
            "reviewed_at": now_utc() - timedelta(hours=12),
            "completion_date": None,
            "created_at": now_utc() - timedelta(hours=20),
            "updated_at": now_utc() - timedelta(hours=12),
        })

    # Let's set some varied XP values on the user records so the leaderboard shows nicely!
    user_scores = {
        "user_3GOFDGDUra482r4MSg0DDI7udaG": {
            "first_name": "Aayush",
            "last_name": "Roopchandani",
            "email": "aayush.r@ahduni.edu.in",
            "xp": 350,
            "points": 350,
            "badges": ["CSR Starter", "Green Advocate", "Child Tutor"]
        },
        "user_3GOIyVujPrP5kQwOID4yMkBTbbD": {
            "first_name": "Aayush (Personal)",
            "last_name": "Roopchandani",
            "email": "roopchandaniaayush@gmail.com",
            "xp": 480,
            "points": 480,
            "badges": ["CSR Starter", "Climate Champion", "Clean Oceans", "Child Tutor"]
        },
        "demo_admin_seed": {
            "first_name": "Aarav",
            "last_name": "Admin",
            "email": "admin.demo@ecosphere.local",
            "xp": 120,
            "points": 120,
            "badges": ["Policy Reader"]
        },
        "demo_employee_seed": {
            "first_name": "Meera",
            "last_name": "Employee",
            "email": "employee.demo@ecosphere.local",
            "xp": 250,
            "points": 250,
            "badges": ["CSR Starter", "Child Tutor"]
        },
        # Additional mock users to populate the leaderboard up to 10 rows
        "mock_clerk_user_1": {
            "first_name": "Priya",
            "last_name": "Patel",
            "email": "priya.patel@ecosphere.local",
            "xp": 590,
            "points": 590,
            "badges": ["Top Champion", "Climate Champion", "Clean Oceans", "Health First"]
        },
        "mock_clerk_user_2": {
            "first_name": "Rahul",
            "last_name": "Sharma",
            "email": "rahul.sharma@ecosphere.local",
            "xp": 410,
            "points": 410,
            "badges": ["CSR Starter", "Green Advocate"]
        },
        "mock_clerk_user_3": {
            "first_name": "Karan",
            "last_name": "Johri",
            "email": "karan.johri@ecosphere.local",
            "xp": 380,
            "points": 380,
            "badges": ["CSR Starter", "Child Tutor"]
        },
        "mock_clerk_user_4": {
            "first_name": "Sneha",
            "last_name": "Desai",
            "email": "sneha.desai@ecosphere.local",
            "xp": 310,
            "points": 310,
            "badges": ["CSR Starter"]
        },
        "mock_clerk_user_5": {
            "first_name": "Aditya",
            "last_name": "Varma",
            "email": "aditya.varma@ecosphere.local",
            "xp": 200,
            "points": 200,
            "badges": ["Green Advocate"]
        },
        "mock_clerk_user_6": {
            "first_name": "Riya",
            "last_name": "Sen",
            "email": "riya.sen@ecosphere.local",
            "xp": 90,
            "points": 90,
            "badges": []
        }
    }

    for user_id, profile in user_scores.items():
        db["users"].update_one(
            {"clerk_user_id": user_id},
            {"$set": {
                "first_name": profile.get("first_name"),
                "last_name": profile.get("last_name"),
                "email": profile.get("email"),
                "xp": profile["xp"],
                "points": profile["points"],
                "badges": profile["badges"],
                "updated_at": now_utc(),
                "created_at": now_utc() - timedelta(days=20),
            }},
            upsert=True
        )
        print(f"Updated profile and score for {user_id} -> XP: {profile['xp']}, Badges: {profile['badges']}")

    print("Social seeding complete!")

if __name__ == "__main__":
    seed_social_data()
