"""Accident Management API endpoints.
Provides complete CRUD, PostGIS spatial queries (ST_DWithin), and Leaflet-compatible GeoJSON exports.
"""
from datetime import datetime
import math
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_admin
from app.models.user import User
from app.schemas.accident import (
    AccidentCreate,
    AccidentUpdate,
    AccidentResponse,
    AccidentNearbyResponse,
    PaginatedAccidentResponse,
    GeoJSONFeatureCollection,
    AccidentSeverity,
)
from app.services.accident_service import AccidentService

router = APIRouter()


@router.post(
    "",
    response_model=AccidentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new accident record (Admin only)",
    description="Requires administrator privileges. Creates an accident incident with PostGIS Point geometry (SRID 4326).",
)
def create_accident(
    accident_in: AccidentCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Create accident record."""
    accident = AccidentService.create_accident(
        db=db,
        accident_in=accident_in,
        reporter_id=current_admin.id
    )
    return accident


@router.get(
    "",
    response_model=PaginatedAccidentResponse,
    summary="Get paginated list of accidents with filters",
    description="Retrieve paginated accidents with optional filtering by severity, type, date range, and location name.",
)
def get_accidents(
    severity: Optional[AccidentSeverity] = Query(None, description="Filter by accident severity"),
    accident_type: Optional[str] = Query(None, description="Filter by collision or accident type"),
    start_date: Optional[datetime] = Query(None, description="Filter incidents starting on or after ISO datetime"),
    end_date: Optional[datetime] = Query(None, description="Filter incidents occurring on or before ISO datetime"),
    location: Optional[str] = Query(None, description="Search location name (case-insensitive)"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List accidents with pagination and filters."""
    items, total = AccidentService.get_accidents(
        db=db,
        severity=severity.value if severity else None,
        accident_type=accident_type,
        start_date=start_date,
        end_date=end_date,
        location_query=location,
        page=page,
        limit=limit,
    )
    total_pages = math.ceil(total / limit) if total > 0 else 1
    return PaginatedAccidentResponse(
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        items=[AccidentResponse.model_validate(item) for item in items]
    )


# IMPORTANT: Define /nearby and /geojson before /{accident_id} to prevent path parameter collisions
@router.get(
    "/nearby",
    response_model=List[AccidentNearbyResponse],
    summary="Find accidents within a geographic radius using PostGIS ST_DWithin",
    description="Calculates geodesic distance using native PostGIS ST_DWithin and ST_Distance on geography. Radius in meters.",
)
def get_nearby_accidents(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Center point latitude in WGS 84 (-90 to 90)"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Center point longitude in WGS 84 (-180 to 180)"),
    radius: float = Query(5000.0, gt=0, description="Search radius in meters (e.g. 5000 = 5km)"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of nearby accidents to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Find nearby accidents."""
    return AccidentService.get_nearby_accidents(
        db=db,
        latitude=latitude,
        longitude=longitude,
        radius_meters=radius,
        limit=limit,
    )


@router.get(
    "/geojson",
    response_model=GeoJSONFeatureCollection,
    summary="Export accidents as Leaflet-compatible RFC 7946 GeoJSON FeatureCollection",
    description="Returns standard RFC 7946 FeatureCollection with [longitude, latitude] coordinates suitable for Leaflet/GIS layers.",
)
def get_accidents_geojson(
    severity: Optional[AccidentSeverity] = Query(None, description="Optional severity filter"),
    start_date: Optional[datetime] = Query(None, description="Optional start datetime"),
    end_date: Optional[datetime] = Query(None, description="Optional end datetime"),
    limit: int = Query(500, ge=1, le=2000, description="Maximum number of GeoJSON features to export"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export accidents as GeoJSON FeatureCollection."""
    return AccidentService.get_accidents_geojson(
        db=db,
        severity=severity.value if severity else None,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
    )


@router.get(
    "/{accident_id}",
    response_model=AccidentResponse,
    summary="Get single accident by ID",
    description="Retrieve full details for an accident record by its ID.",
)
def get_accident_by_id(
    accident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get accident details."""
    accident = AccidentService.get_accident_by_id(db=db, accident_id=accident_id)
    if not accident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Accident record with ID {accident_id} not found"
        )
    return accident


@router.put(
    "/{accident_id}",
    response_model=AccidentResponse,
    summary="Update accident record (Admin only)",
    description="Requires administrator privileges. Updates fields and recalculates PostGIS geometry if coordinates change.",
)
def update_accident(
    accident_id: int,
    accident_in: AccidentUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Update accident details."""
    updated = AccidentService.update_accident(
        db=db,
        accident_id=accident_id,
        accident_in=accident_in
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Accident record with ID {accident_id} not found"
        )
    return updated


@router.delete(
    "/{accident_id}",
    summary="Delete accident record (Admin only)",
    description="Requires administrator privileges. Permanently deletes an accident record.",
)
def delete_accident(
    accident_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Delete accident."""
    deleted = AccidentService.delete_accident(db=db, accident_id=accident_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Accident record with ID {accident_id} not found"
        )
    return {
        "detail": f"Accident record {accident_id} deleted successfully",
        "id": accident_id
    }
