"""Pydantic schemas for JWT access tokens and payloads."""
from typing import Optional
from pydantic import BaseModel
from app.schemas.user import UserResponse


class Token(BaseModel):
    """JWT response structure."""
    access_token: str
    token_type: str = "bearer"
    user: Optional[UserResponse] = None


class TokenPayload(BaseModel):
    """Decoded JWT payload structure."""
    sub: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    exp: Optional[int] = None
