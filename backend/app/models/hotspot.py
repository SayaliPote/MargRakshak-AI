"""Hotspot database model representing identified accident clusters with PostGIS geometry."""
from datetime import datetime
from typing import List, Optional, Any, TYPE_CHECKING
from sqlalchemy import String, Integer, Float, DateTime, Text, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.risk_zone import RiskZone
    from app.models.accident import Accident


class Hotspot(Base, TimestampMixin):
    """Accident Hotspot cluster detected by HDBSCAN/DBSCAN or analytical clustering."""
    __tablename__ = "hotspots"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    # Centroid coordinates
    latitude: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    longitude: Mapped[float] = mapped_column(Float, nullable=False, index=True)

    # PostGIS spatial point
    geom = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=True
    )

    # Risk assessment
    # Levels: 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
    risk_level: Mapped[str] = mapped_column(String(50), default="MEDIUM", nullable=False, index=True)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    density: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Statistics
    accident_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    fatalities: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    radius_meters: Mapped[float] = mapped_column(Float, default=200.0, nullable=False)

    # Safety advisory and risk factors (JSON list of string factors)
    safety_recommendation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    risk_factors: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Model metadata
    algorithm: Mapped[str] = mapped_column(String(100), default="HDBSCAN", nullable=False)
    source: Mapped[str] = mapped_column(String(50), default="MANUAL", nullable=False, server_default="MANUAL")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    last_updated: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Associated Risk Zones
    risk_zones: Mapped[List["RiskZone"]] = relationship(
        "RiskZone",
        back_populates="hotspot"
    )

    # Linked historical accident records
    accidents: Mapped[List["Accident"]] = relationship(
        "Accident",
        back_populates="hotspot"
    )

    def __repr__(self) -> str:
        return f"<Hotspot id={self.id} name='{self.name}' risk_level='{self.risk_level}' score={self.risk_score}>"
