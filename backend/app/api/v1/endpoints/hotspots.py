"""Accident Hotspot Management API endpoints.
Provides complete CRUD, PostGIS spatial queries (ST_DWithin), and Leaflet-compatible GeoJSON exports.
"""
import math
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_admin, get_optional_current_user
from app.models.user import User
from app.schemas.hotspot import (
    HotspotCreate,
    HotspotUpdate,
    HotspotResponse,
    HotspotNearbyResponse,
    HotspotDetailResponse,
    PaginatedHotspotResponse,
    HotspotRiskLevel,
    HotspotSource,
)
from app.schemas.accident import GeoJSONFeatureCollection
from app.services.hotspot_service import HotspotService

router = APIRouter()


@router.post(
    "",
    response_model=HotspotResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new accident hotspot (Admin only)",
    description="Requires administrator privileges. Creates an accident hotspot cluster with PostGIS Point geometry (SRID 4326).",
)
def create_hotspot(
    hotspot_in: HotspotCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Create hotspot cluster."""
    hotspot = HotspotService.create_hotspot(
        db=db,
        hotspot_in=hotspot_in,
    )
    return hotspot


@router.get(
    "",
    response_model=PaginatedHotspotResponse,
    summary="Get paginated list of hotspots with filters",
    description="Retrieve paginated accident hotspots with optional filtering by risk level, minimum risk score, algorithm, source, and text search.",
)
def get_hotspots(
    risk_level: Optional[HotspotRiskLevel] = Query(None, description="Filter by risk severity level (CRITICAL, HIGH, MEDIUM, LOW)"),
    min_risk_score: Optional[float] = Query(None, ge=0.0, le=1.0, description="Minimum risk score threshold (0.0 to 1.0)"),
    algorithm: Optional[str] = Query(None, description="Filter by clustering algorithm (e.g. HDBSCAN, DBSCAN)"),
    source: Optional[HotspotSource] = Query(None, description="Filter by source method (MANUAL, ML, IMPORTED, SEED)"),
    search: Optional[str] = Query(None, description="Search term in hotspot name or description"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(200, ge=1, le=1000, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """List hotspots with pagination and filtering."""
    items, total = HotspotService.get_hotspots(
        db=db,
        risk_level=risk_level.value if risk_level else None,
        min_risk_score=min_risk_score,
        algorithm=algorithm,
        source=source.value if source else None,
        search=search,
        is_active=is_active,
        page=page,
        limit=limit,
    )
    total_pages = math.ceil(total / limit) if total > 0 else 1
    return PaginatedHotspotResponse(
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        items=[HotspotResponse.model_validate(item) for item in items]
    )


# IMPORTANT: Define /nearby and /geojson before /{hotspot_id} to prevent path collisions
@router.get(
    "/nearby",
    response_model=List[HotspotNearbyResponse],
    summary="Find hotspots within a geographic radius using PostGIS ST_DWithin",
    description="Calculates geodesic distance using native PostGIS ST_DWithin and ST_Distance on geography. Radius in meters.",
)
def get_nearby_hotspots(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Center point latitude in WGS 84 (-90 to 90)"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Center point longitude in WGS 84 (-180 to 180)"),
    radius: float = Query(5000.0, gt=0, description="Search radius in meters (e.g. 5000 = 5km)"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of nearby hotspots to return"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Find nearby hotspots."""
    return HotspotService.get_nearby_hotspots(
        db=db,
        latitude=latitude,
        longitude=longitude,
        radius_meters=radius,
        limit=limit,
    )


@router.get(
    "/geojson",
    response_model=GeoJSONFeatureCollection,
    summary="Export hotspots as Leaflet-compatible RFC 7946 GeoJSON FeatureCollection",
    description="Returns standard RFC 7946 FeatureCollection with [longitude, latitude] Point coordinates for Leaflet map layers.",
)
def get_hotspots_geojson(
    risk_level: Optional[HotspotRiskLevel] = Query(None, description="Optional risk level filter"),
    min_risk_score: Optional[float] = Query(None, ge=0.0, le=1.0, description="Optional minimum risk score"),
    limit: int = Query(500, ge=1, le=2000, description="Maximum number of features to export"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Export hotspots as GeoJSON FeatureCollection."""
    return HotspotService.get_hotspots_geojson(
        db=db,
        risk_level=risk_level.value if risk_level else None,
        min_risk_score=min_risk_score,
        limit=limit,
    )


@router.get(
    "/{hotspot_id}",
    response_model=HotspotDetailResponse,
    summary="Get single hotspot by ID",
    description="Retrieve full details for a hotspot cluster, including list of associated accident IDs.",
)
def get_hotspot_by_id(
    hotspot_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Get hotspot details."""
    hotspot = HotspotService.get_hotspot_detail(db=db, hotspot_id=hotspot_id)
    if not hotspot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hotspot record with ID {hotspot_id} not found"
        )
    return hotspot


@router.put(
    "/{hotspot_id}",
    response_model=HotspotResponse,
    summary="Update hotspot details (Admin only)",
    description="Requires administrator privileges. Updates fields and recalculates PostGIS geometry if coordinates change.",
)
def update_hotspot(
    hotspot_id: int,
    hotspot_in: HotspotUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Update hotspot details."""
    updated = HotspotService.update_hotspot(
        db=db,
        hotspot_id=hotspot_id,
        hotspot_in=hotspot_in
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hotspot record with ID {hotspot_id} not found"
        )
    return updated


@router.delete(
    "/{hotspot_id}",
    summary="Delete hotspot (Admin only)",
    description="Requires administrator privileges. Permanently deletes a hotspot cluster.",
)
def delete_hotspot(
    hotspot_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Delete hotspot."""
    deleted = HotspotService.delete_hotspot(db=db, hotspot_id=hotspot_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hotspot record with ID {hotspot_id} not found"
        )
    return {
        "detail": f"Hotspot record {hotspot_id} deleted successfully",
        "id": hotspot_id
    }
