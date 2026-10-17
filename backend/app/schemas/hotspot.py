"""Pydantic schemas for Hotspot CRUD, PostGIS spatial queries, and GeoJSON export.
Compatible with frontend React expectations (MapView, HotspotDetailsModal, AdminHotspots).
"""
from datetime import datetime
from enum import Enum
from typing import List, Optional, Any, Union
from pydantic import BaseModel, Field, ConfigDict, computed_field


class HotspotRiskLevel(str, Enum):
    """Recognized hotspot risk severity classifications."""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class HotspotSource(str, Enum):
    """Hotspot origin/detection method (MANUAL by traffic engineers, ML clustering, historical IMPORTED, or SEED dataset)."""
    MANUAL = "MANUAL"
    ML = "ML"
    IMPORTED = "IMPORTED"
    SEED = "SEED"
    UNIFIED = "Unified Blackspot Integration 2026"


class HotspotBase(BaseModel):
    """Core attributes for an accident hotspot cluster."""
    name: str = Field(..., min_length=2, max_length=255, description="Hotspot / intersection name")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="WGS 84 Centroid Latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="WGS 84 Centroid Longitude")
    risk_level: HotspotRiskLevel = Field(default=HotspotRiskLevel.MEDIUM, description="Calculated risk category")
    risk_score: float = Field(default=0.5, ge=0.0, le=1.0, description="Normalized risk score between 0.0 and 1.0")
    density: float = Field(default=0.0, ge=0.0, description="Accident density metric per km²")
    accident_count: int = Field(default=0, ge=0, description="Number of recorded accidents within cluster")
    fatalities: int = Field(default=0, ge=0, description="Total fatalities across associated accidents")
    radius_meters: float = Field(default=200.0, gt=0.0, description="Effective radius of cluster in meters")
    safety_recommendation: Optional[str] = Field(None, description="Driver safety advisory for this location")
    risk_factors: Optional[List[str]] = Field(default_factory=list, description="Contributing causal risk factors")
    algorithm: str = Field(default="HDBSCAN", max_length=100, description="Clustering algorithm name")
    source: Union[HotspotSource, str] = Field(default=HotspotSource.SEED, description="Hotspot source method")
    description: Optional[str] = Field(None, description="Detailed narrative or notes")
    is_active: bool = Field(default=True, description="Active status for navigation alerts")


class HotspotCreate(HotspotBase):
    """Schema for registering a new hotspot cluster."""
    pass


class HotspotUpdate(BaseModel):
    """Schema for updating an existing hotspot. All fields optional."""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    risk_level: Optional[HotspotRiskLevel] = None
    risk_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    density: Optional[float] = Field(None, ge=0.0)
    accident_count: Optional[int] = Field(None, ge=0)
    fatalities: Optional[int] = Field(None, ge=0)
    radius_meters: Optional[float] = Field(None, gt=0.0)
    safety_recommendation: Optional[str] = None
    risk_factors: Optional[List[str]] = None
    algorithm: Optional[str] = Field(None, max_length=100)
    source: Optional[Union[HotspotSource, str]] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class HotspotResponse(HotspotBase):
    """Output schema for a hotspot, enriched with frontend camelCase convenience fields."""
    id: int
    last_updated: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    # Frontend-compatible computed properties
    @computed_field
    @property
    def lat(self) -> float:
        """Alias matching Leaflet/React MapView `spot.lat`."""
        return self.latitude

    @computed_field
    @property
    def lng(self) -> float:
        """Alias matching Leaflet/React MapView `spot.lng`."""
        return self.longitude

    @computed_field
    @property
    def riskLevel(self) -> str:
        """Alias matching React components `spot.riskLevel`."""
        return self.risk_level.value if isinstance(self.risk_level, Enum) else str(self.risk_level)

    @computed_field
    @property
    def riskScore(self) -> float:
        """Alias matching React components `spot.riskScore`."""
        return self.risk_score

    @computed_field
    @property
    def accidentCount(self) -> int:
        """Alias matching React components `spot.accidentCount`."""
        return self.accident_count

    @computed_field
    @property
    def radius(self) -> float:
        """Alias matching MapView circle radius."""
        return self.radius_meters

    @computed_field
    @property
    def safetyRecommendation(self) -> Optional[str]:
        """Alias matching HotspotDetailsModal."""
        return self.safety_recommendation

    @computed_field
    @property
    def riskFactors(self) -> List[str]:
        """Alias matching HotspotDetailsModal."""
        return self.risk_factors or []

    @computed_field
    @property
    def lastUpdated(self) -> Optional[str]:
        """Formatted timestamp string matching frontend mock data format."""
        dt = self.last_updated or self.updated_at
        return dt.strftime("%Y-%m-%d %H:%M") if dt else None


class HotspotNearbyResponse(HotspotResponse):
    """Hotspot output augmented with calculated geodesic distance in meters from query location."""
    distance_meters: Optional[float] = Field(None, description="Calculated distance in meters")


class HotspotDetailResponse(HotspotResponse):
    """Detailed hotspot representation including linked accident IDs."""
    linked_accident_ids: List[int] = Field(default_factory=list, description="IDs of historical accidents in cluster")


class PaginatedHotspotResponse(BaseModel):
    """Standardized paginated list wrapper for hotspots."""
    total: int
    page: int
    limit: int
    total_pages: int
    items: List[HotspotResponse]
