"""Pydantic schemas for User entity, registration, login, and profile management."""
from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserRole(str, Enum):
    """Supported application roles."""
    USER = "user"          # Standard driver
    ADMIN = "admin"        # System administrator
    AUTHORITY = "authority" # Traffic Police / NHAI Official


class UserBase(BaseModel):
    """Base user schema with common attributes."""
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=150)
    mobile: Optional[str] = Field(None, max_length=30)
    preferred_language: str = Field(default="en", max_length=10)


class UserCreate(UserBase):
    """Registration schema with password and role options."""
    password: str = Field(..., min_length=6, max_length=100)
    role: UserRole = UserRole.USER
    voice_alerts: bool = True
    sound_alerts: bool = True
    vibration_alerts: bool = True


class UserLogin(BaseModel):
    """Login request payload."""
    email: EmailStr
    password: str = Field(..., min_length=1)


class UserUpdate(BaseModel):
    """Profile update schema."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    mobile: Optional[str] = Field(None, max_length=30)
    preferred_language: Optional[str] = Field(None, max_length=10)
    avatar_url: Optional[str] = Field(None, max_length=500)
    voice_alerts: Optional[bool] = None
    sound_alerts: Optional[bool] = None
    vibration_alerts: Optional[bool] = None


class UserResponse(UserBase):
    """Public user response schema without sensitive password hashes."""
    id: int
    role: str
    avatar_url: Optional[str] = None
    voice_alerts: bool
    sound_alerts: bool
    vibration_alerts: bool
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedUserResponse(BaseModel):
    """Paginated user accounts list response."""
    total: int
    page: int
    limit: int
    total_pages: int
    items: list[UserResponse]

