from enum import Enum

USERS_COLLECTION = "users"


class UserRole(str, Enum):
    ADMIN = "admin"
    EMPLOYEE = "employee"
