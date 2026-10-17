"""RiskZone database model representing spatial polygons and danger corridors."""
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, Float, Text, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.hotspot import Hotspot


class RiskZone(Base, TimestampMixin):
    """Geographic polygon or corridor demarcating an elevated accident risk area."""
    __tablename__ = "risk_zones"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    
    # Types: 'POLYGON', 'CORRIDOR', 'BUFFER', 'INTERSECTION'
    zone_type: Mapped[str] = mapped_column(String(100), default="POLYGON", nullable=False)

    # PostGIS Polygon geometry for spatial boundary containment tests
    boundary = mapped_column(
        Geometry(geometry_type="POLYGON", srid=4326, spatial_index=False),
        nullable=True
    )

    # Centroid / anchor coordinates
    center_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    center_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Risk classification
    risk_level: Mapped[str] = mapped_column(String(50), default="MEDIUM", nullable=False, index=True)
    risk_score: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    speed_limit_kmh: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Hotspot linkage (optional if zone encompasses a detected cluster)
    hotspot_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("hotspots.id", ondelete="SET NULL"),
        nullable=True
    )
    hotspot: Mapped[Optional["Hotspot"]] = relationship("Hotspot", back_populates="risk_zones")

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    def __repr__(self) -> str:
        return f"<RiskZone id={self.id} name='{self.name}' risk_level='{self.risk_level}'>"
