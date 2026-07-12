from enum import Enum

EMISSION_FACTORS_COLLECTION = "emission_factors"
CARBON_TRANSACTIONS_COLLECTION = "carbon_transactions"
ENVIRONMENTAL_GOALS_COLLECTION = "environmental_goals"


class EmissionCategory(str, Enum):
    ENERGY = "energy"
    FLEET = "fleet"
    TRAVEL = "travel"
    WASTE = "waste"
    PURCHASE = "purchase"
    MANUFACTURING = "manufacturing"
    OTHER = "other"


class EmissionFactorStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class CalculationMethod(str, Enum):
    AUTO = "auto"


class EnvironmentalGoalStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    MISSED = "missed"
    ARCHIVED = "archived"


class GoalProgressStatus(str, Enum):
    ON_TRACK = "on_track"
    OVER_TARGET = "over_target"
    COMPLETED = "completed"
    MISSED = "missed"
    ARCHIVED = "archived"
