"""User database model supporting authentication, role-based access, and driver preferences."""
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.accident import Accident
    from app.models.alert import SafetyAlert
    from app.models.report import Report


class User(Base, TimestampMixin):
    """User account model for drivers, traffic authorities, and system administrators."""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    
    # Roles: 'user' (driver), 'admin' (system admin), 'authority' (traffic police / NHAI)
    role: Mapped[str] = mapped_column(String(50), default="user", nullable=False, index=True)
    mobile: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    
    # UI and Localization preferences
    preferred_language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Driver safety alert preferences
    voice_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sound_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    vibration_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Status flags
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    accidents: Mapped[List["Accident"]] = relationship(
        "Accident",
        back_populates="reported_by",
        cascade="all, delete-orphan"
    )
    alerts: Mapped[List["SafetyAlert"]] = relationship(
        "SafetyAlert",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    reports: Mapped[List["Report"]] = relationship(
        "Report",
        back_populates="generated_by"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email='{self.email}' role='{self.role}'>"
