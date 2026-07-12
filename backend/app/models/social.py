from enum import Enum

CSR_ACTIVITIES_COLLECTION = "csr_activities"
EMPLOYEE_PARTICIPATIONS_COLLECTION = "employee_participations"
BADGES_COLLECTION = "badges"


class CSRStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class ParticipationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class CSRCategory(str, Enum):
    ENVIRONMENT = "environment"
    SOCIAL = "social"
    EDUCATION = "education"
    HEALTH = "health"
    OTHER = "other"