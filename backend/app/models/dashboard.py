from enum import Enum

DEPARTMENTS_COLLECTION = "departments"
DEPARTMENT_SCORES_COLLECTION = "department_scores"
ACTIVITY_LOGS_COLLECTION = "activity_logs"


class DepartmentStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class ActivityType(str, Enum):
    DEPARTMENT_ADDED = "department_added"
    DEPARTMENT_UPDATED = "department_updated"
    SCORE_UPDATED = "score_updated"
