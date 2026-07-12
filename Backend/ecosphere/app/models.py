from datetime import date, datetime
from typing import Optional

from beanie import Document, PydanticObjectId
from pydantic import Field


# ---------- MASTER DATA ----------

class Department(Document):
    name: str
    code: str
    head: Optional[str] = None
    parent_department_id: Optional[PydanticObjectId] = None
    employee_count: int = 0
    status: str = "Active"  # Active / Inactive

    class Settings:
        name = "departments"


class Category(Document):
    name: str
    type: str  # "CSR_ACTIVITY" or "CHALLENGE"
    status: str = "Active"

    class Settings:
        name = "categories"


class EmissionFactor(Document):
    name: str
    source_type: str  # Purchase / Manufacturing / Expense / Fleet
    unit: str  # e.g. "kg", "liter", "kWh", "km"
    co2_per_unit: float  # kg CO2e per unit
    status: str = "Active"

    class Settings:
        name = "emission_factors"


class Badge(Document):
    name: str
    description: Optional[str] = None
    unlock_rule_type: str  # "XP_THRESHOLD" or "CHALLENGE_COUNT"
    unlock_rule_value: float
    icon: Optional[str] = None

    class Settings:
        name = "badges"


class Reward(Document):
    name: str
    description: Optional[str] = None
    points_required: int
    stock: int
    status: str = "Active"

    class Settings:
        name = "rewards"


class ESGPolicy(Document):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None  # Environmental / Social / Governance
    effective_date: Optional[date] = None
    status: str = "Active"

    class Settings:
        name = "esg_policies"


class EnvironmentalGoal(Document):
    department_id: PydanticObjectId
    title: str
    target_metric: str  # e.g. "CO2e reduction"
    target_value: float
    current_value: float = 0
    deadline: Optional[date] = None
    status: str = "Active"

    class Settings:
        name = "environmental_goals"


class Employee(Document):
    name: str
    email: str
    department_id: Optional[PydanticObjectId] = None
    role: str = "employee"  # employee / admin
    xp: int = 0
    points: int = 0

    class Settings:
        name = "employees"


class SettingConfig(Document):
    key: str
    value: str  # "true" / "false" for toggles

    class Settings:
        name = "settings"


# ---------- TRANSACTIONAL DATA ----------

class CarbonTransaction(Document):
    department_id: PydanticObjectId
    emission_factor_id: PydanticObjectId
    source_type: str  # Purchase / Manufacturing / Expense / Fleet
    quantity: float
    co2e: float = 0  # calculated
    date: date
    auto_calculated: bool = False
    notes: Optional[str] = None

    class Settings:
        name = "carbon_transactions"


class CSRActivity(Document):
    title: str
    category_id: Optional[PydanticObjectId] = None
    department_id: Optional[PydanticObjectId] = None
    description: Optional[str] = None
    date: date
    status: str = "Planned"  # Planned / Ongoing / Completed

    class Settings:
        name = "csr_activities"


class EmployeeParticipation(Document):
    employee_id: PydanticObjectId
    activity_id: PydanticObjectId
    proof: Optional[str] = None  # file path/url
    approval_status: str = "Pending"  # Pending / Approved / Rejected
    points_earned: int = 0
    completion_date: Optional[date] = None

    class Settings:
        name = "employee_participation"


class Challenge(Document):
    title: str
    category_id: Optional[PydanticObjectId] = None
    description: Optional[str] = None
    xp: int
    difficulty: str = "Easy"  # Easy / Medium / Hard
    evidence_required: bool = True
    deadline: Optional[date] = None
    status: str = "Draft"  # Draft / Active / Under Review / Completed / Archived

    class Settings:
        name = "challenges"


class ChallengeParticipation(Document):
    challenge_id: PydanticObjectId
    employee_id: PydanticObjectId
    progress: float = 0  # 0-100 percent
    proof: Optional[str] = None
    approval: str = "Pending"  # Pending / Approved / Rejected
    xp_awarded: int = 0

    class Settings:
        name = "challenge_participation"


class PolicyAcknowledgement(Document):
    policy_id: PydanticObjectId
    employee_id: PydanticObjectId
    acknowledged_at: Optional[datetime] = None

    class Settings:
        name = "policy_acknowledgements"


class Audit(Document):
    title: str
    department_id: Optional[PydanticObjectId] = None
    date: date
    status: str = "Scheduled"  # Scheduled / In Progress / Completed
    findings: Optional[str] = None

    class Settings:
        name = "audits"


class ComplianceIssue(Document):
    audit_id: Optional[PydanticObjectId] = None
    severity: str  # Low / Medium / High / Critical
    description: str
    owner_id: PydanticObjectId
    due_date: date
    status: str = "Open"  # Open / In Progress / Resolved
    is_overdue: bool = False

    class Settings:
        name = "compliance_issues"


class DepartmentScore(Document):
    department_id: PydanticObjectId
    period: str  # e.g. "2026-07"
    environmental_score: float = 0
    social_score: float = 0
    governance_score: float = 0
    total_score: float = 0

    class Settings:
        name = "department_scores"


class RewardRedemption(Document):
    employee_id: PydanticObjectId
    reward_id: PydanticObjectId
    points_spent: int
    redeemed_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "reward_redemptions"


class Notification(Document):
    employee_id: Optional[PydanticObjectId] = None  # null = broadcast/admin
    type: str  # compliance_issue / approval_decision / policy_reminder / badge_unlock
    message: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "notifications"


class EmployeeBadge(Document):
    employee_id: PydanticObjectId
    badge_id: PydanticObjectId
    awarded_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "employee_badges"


ALL_DOCUMENTS = [
    Department, Category, EmissionFactor, Badge, Reward, ESGPolicy,
    EnvironmentalGoal, Employee, SettingConfig, CarbonTransaction, CSRActivity,
    EmployeeParticipation, Challenge, ChallengeParticipation, PolicyAcknowledgement,
    Audit, ComplianceIssue, DepartmentScore, RewardRedemption, Notification, EmployeeBadge,
]
