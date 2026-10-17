"""SafetyAlert database model storing location-aware alerts and driver notifications."""
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, Float, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class SafetyAlert(Base):
    """Driver alert record matching notification feeds and real-time warnings."""
    __tablename__ = "safety_alerts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)

    # Severity: 'CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'INFO'
    severity: Mapped[str] = mapped_column(String(50), default="INFO", nullable=False, index=True)
    # Status: 'past', 'upcoming', 'acknowledged'
    status: Mapped[str] = mapped_column(String(50), default="upcoming", nullable=False)

    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    geom = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    user: Mapped[Optional["User"]] = relationship("User", back_populates="alerts")

    def __repr__(self) -> str:
        return f"<SafetyAlert id={self.id} title='{self.title}' severity='{self.severity}'>"
