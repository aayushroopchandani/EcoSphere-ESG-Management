from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class UserSyncRequest(BaseModel):
    email: EmailStr | None = None
    first_name: str | None = None
    last_name: str | None = None
    image_url: str | None = None
    department_id: str | None = None


class UserRead(BaseModel):
    id: str
    clerk_user_id: str
    email: EmailStr | None = None
    first_name: str | None = None
    last_name: str | None = None
    image_url: str | None = None
    role: UserRole = UserRole.EMPLOYEE
    department_id: str | None = None

    xp: int = Field(default=0, ge=0)
    points: int = Field(default=0, ge=0)

    badges: list[str] = Field(default_factory=list)

    created_at: datetime
    updated_at: datetime
