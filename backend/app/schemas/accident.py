"""Pydantic schemas for Accident CRUD, PostGIS spatial queries, and GeoJSON export."""
from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class AccidentSeverity(str, Enum):
    """Recognized severity levels matching reporting guidelines."""
    FATAL = "FATAL"
    GRIEVOUS = "GRIEVOUS"
    MINOR = "MINOR"
    PROPERTY_DAMAGE = "PROPERTY_DAMAGE"


class AccidentBase(BaseModel):
    """Core attributes for an accident incident record."""
    title: Optional[str] = Field(None, max_length=255)
    location_name: str = Field(..., min_length=2, max_length=255)
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180")
    severity: AccidentSeverity = AccidentSeverity.MINOR
    accident_type: Optional[str] = Field(None, max_length=100, description="Accident classification or collision type")
    fatalities: int = Field(default=0, ge=0)
    injuries: int = Field(default=0, ge=0)
    vehicles_involved: int = Field(default=1, ge=1)
    weather_condition: Optional[str] = Field(None, max_length=100)
    road_condition: Optional[str] = Field(None, max_length=100)
    lighting_condition: Optional[str] = Field(None, max_length=100)
    accident_date: datetime
    description: Optional[str] = None


class AccidentCreate(AccidentBase):
    """Schema for creating a new accident incident."""
    pass


class AccidentUpdate(BaseModel):
    """Schema for updating an existing accident incident. All fields optional."""
    title: Optional[str] = Field(None, max_length=255)
    location_name: Optional[str] = Field(None, min_length=2, max_length=255)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    severity: Optional[AccidentSeverity] = None
    accident_type: Optional[str] = Field(None, max_length=100)
    fatalities: Optional[int] = Field(None, ge=0)
    injuries: Optional[int] = Field(None, ge=0)
    vehicles_involved: Optional[int] = Field(None, ge=1)
    weather_condition: Optional[str] = Field(None, max_length=100)
    road_condition: Optional[str] = Field(None, max_length=100)
    lighting_condition: Optional[str] = Field(None, max_length=100)
    accident_date: Optional[datetime] = None
    description: Optional[str] = None


class AccidentResponse(AccidentBase):
    """Full serialized output for an accident incident."""
    id: int
    reported_by_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AccidentNearbyResponse(AccidentResponse):
    """Accident output augmented with calculated geodesic distance in meters."""
    distance_meters: Optional[float] = Field(None, description="Calculated distance in meters from query coordinate")


class PaginatedAccidentResponse(BaseModel):
    """Standardized paginated list wrapper."""
    total: int
    page: int
    limit: int
    total_pages: int
    items: List[AccidentResponse]


# RFC 7946 Compliant GeoJSON Schemas for Leaflet mapping
class GeoJSONGeometry(BaseModel):
    type: str = "Point"
    coordinates: List[float] = Field(..., description="[longitude, latitude] pair")


class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: GeoJSONGeometry
    properties: Dict[str, Any]


class GeoJSONFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[GeoJSONFeature]
