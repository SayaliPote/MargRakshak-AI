"""Accident database model storing historical accident records with PostGIS spatial geometry."""
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.hotspot import Hotspot


class Accident(Base, TimestampMixin):
    """Accident incident record with spatial coordinates, severity metrics, and road factors."""
    __tablename__ = "accidents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    location_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    
    # Geographic coordinates (WGS 84)
    latitude: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    longitude: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    
    # PostGIS spatial point (SRID 4326: WGS 84 GPS standard)
    geom = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=True
    )

    # Severity & Impact metrics
    # Severities: 'FATAL', 'GRIEVOUS', 'MINOR', 'PROPERTY_DAMAGE'
    severity: Mapped[str] = mapped_column(String(50), default="MINOR", nullable=False, index=True)
    accident_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    fatalities: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    injuries: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    vehicles_involved: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Environmental and Road Factors (matching frontend analytics factors)
    weather_condition: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    road_condition: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    lighting_condition: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Temporal info
    accident_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Hotspot cluster linkage (optional: unclustered/isolated accidents have None)
    hotspot_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("hotspots.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    hotspot: Mapped[Optional["Hotspot"]] = relationship("Hotspot", back_populates="accidents")

    # Reporter reference (optional for historical bulk-loaded records)
    reported_by_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    reported_by: Mapped[Optional["User"]] = relationship("User", back_populates="accidents")

    def __repr__(self) -> str:
        return f"<Accident id={self.id} location='{self.location_name}' severity='{self.severity}'>"
