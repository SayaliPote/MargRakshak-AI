"""Accident business logic service for MargRakshak AI.
Handles CRUD operations, PostGIS spatial queries (ST_DWithin, ST_Distance), and GeoJSON generation.
"""
from datetime import datetime
from enum import Enum
import math
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy import select, func, cast
from sqlalchemy.orm import Session
from geoalchemy2 import Geography
from geoalchemy2.elements import WKTElement

from app.models.accident import Accident
from app.schemas.accident import (
    AccidentCreate,
    AccidentUpdate,
    AccidentResponse,
    AccidentNearbyResponse,
    PaginatedAccidentResponse,
    GeoJSONFeatureCollection,
    GeoJSONFeature,
    GeoJSONGeometry,
    AccidentSeverity,
)


class AccidentService:
    """Service encapsulating database transactions and PostGIS operations for accidents."""

    @staticmethod
    def create_accident(
        db: Session,
        accident_in: AccidentCreate,
        reporter_id: Optional[int] = None
    ) -> Accident:
        """Create a new accident record with SRID 4326 PostGIS geometry."""
        severity_str = (
            accident_in.severity.value
            if isinstance(accident_in.severity, Enum)
            else str(accident_in.severity)
        )

        # Build PostGIS Point geometry: SRID 4326 with (longitude, latitude) order
        geom_wkt = WKTElement(f"POINT({accident_in.longitude} {accident_in.latitude})", srid=4326)

        db_accident = Accident(
            title=accident_in.title,
            location_name=accident_in.location_name,
            latitude=accident_in.latitude,
            longitude=accident_in.longitude,
            geom=geom_wkt,
            severity=severity_str,
            accident_type=accident_in.accident_type,
            fatalities=accident_in.fatalities,
            injuries=accident_in.injuries,
            vehicles_involved=accident_in.vehicles_involved,
            weather_condition=accident_in.weather_condition,
            road_condition=accident_in.road_condition,
            lighting_condition=accident_in.lighting_condition,
            accident_date=accident_in.accident_date,
            description=accident_in.description,
            reported_by_id=reporter_id,
        )
        db.add(db_accident)
        db.commit()
        db.refresh(db_accident)
        return db_accident

    @staticmethod
    def get_accident_by_id(db: Session, accident_id: int) -> Optional[Accident]:
        """Fetch a single accident record by primary key ID."""
        return db.get(Accident, accident_id)

    @staticmethod
    def get_accidents(
        db: Session,
        *,
        severity: Optional[str] = None,
        accident_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        location_query: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
    ) -> Tuple[List[Accident], int]:
        """Retrieve paginated accidents with optional filtering by severity, date range, type, and location."""
        stmt = select(Accident)

        if severity:
            sev_val = severity.value if isinstance(severity, Enum) else str(severity)
            stmt = stmt.where(Accident.severity == sev_val.upper())

        if accident_type:
            stmt = stmt.where(Accident.accident_type.ilike(f"%{accident_type}%"))

        if start_date:
            stmt = stmt.where(Accident.accident_date >= start_date)

        if end_date:
            stmt = stmt.where(Accident.accident_date <= end_date)

        if location_query:
            stmt = stmt.where(Accident.location_name.ilike(f"%{location_query}%"))

        # Calculate total count efficiently
        count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
        total = db.scalar(count_stmt) or 0

        # Apply ordering and pagination
        offset = (page - 1) * limit
        stmt = stmt.order_by(Accident.accident_date.desc(), Accident.id.desc()).offset(offset).limit(limit)

        items = list(db.scalars(stmt).all())
        return items, total

    @staticmethod
    def update_accident(
        db: Session,
        accident_id: int,
        accident_in: AccidentUpdate
    ) -> Optional[Accident]:
        """Update an existing accident record and recalculate PostGIS geometry if coordinates change."""
        db_accident = db.get(Accident, accident_id)
        if not db_accident:
            return None

        update_data = accident_in.model_dump(exclude_unset=True)

        # Check if coordinates are modified to re-generate PostGIS geometry
        lat_changed = "latitude" in update_data
        lon_changed = "longitude" in update_data

        if lat_changed or lon_changed:
            new_lat = update_data.get("latitude", db_accident.latitude)
            new_lon = update_data.get("longitude", db_accident.longitude)
            db_accident.geom = WKTElement(f"POINT({new_lon} {new_lat})", srid=4326)

        # Handle severity enum conversion if present
        if "severity" in update_data and update_data["severity"] is not None:
            sev = update_data["severity"]
            update_data["severity"] = sev.value if isinstance(sev, Enum) else str(sev)

        for key, value in update_data.items():
            setattr(db_accident, key, value)

        db.commit()
        db.refresh(db_accident)
        return db_accident

    @staticmethod
    def delete_accident(db: Session, accident_id: int) -> bool:
        """Delete an accident record by ID."""
        db_accident = db.get(Accident, accident_id)
        if not db_accident:
            return False

        db.delete(db_accident)
        db.commit()
        return True

    @staticmethod
    def get_nearby_accidents(
        db: Session,
        latitude: float,
        longitude: float,
        radius_meters: float,
        limit: int = 50,
    ) -> List[AccidentNearbyResponse]:
        """Spatial query using PostGIS ST_DWithin & ST_Distance on cast Geography to find accidents within radius in meters."""
        # PostGIS ST_MakePoint takes (longitude, latitude)
        point_geom = func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326)
        geog_point = cast(point_geom, Geography)
        geog_accident = cast(Accident.geom, Geography)

        distance_expr = func.ST_Distance(geog_accident, geog_point).label("distance_meters")

        stmt = (
            select(Accident, distance_expr)
            .where(func.ST_DWithin(geog_accident, geog_point, radius_meters))
            .order_by(distance_expr.asc())
            .limit(limit)
        )

        rows = db.execute(stmt).all()
        results: List[AccidentNearbyResponse] = []
        for accident, dist in rows:
            accident_resp = AccidentResponse.model_validate(accident)
            nearby_resp = AccidentNearbyResponse(
                **accident_resp.model_dump(),
                distance_meters=round(float(dist), 2) if dist is not None else 0.0
            )
            results.append(nearby_resp)

        return results

    @staticmethod
    def get_accidents_geojson(
        db: Session,
        *,
        severity: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 500,
    ) -> GeoJSONFeatureCollection:
        """Generate Leaflet-compatible RFC 7946 GeoJSON FeatureCollection with [longitude, latitude] coordinates."""
        stmt = select(Accident)

        if severity:
            sev_val = severity.value if isinstance(severity, Enum) else str(severity)
            stmt = stmt.where(Accident.severity == sev_val.upper())

        if start_date:
            stmt = stmt.where(Accident.accident_date >= start_date)

        if end_date:
            stmt = stmt.where(Accident.accident_date <= end_date)

        stmt = stmt.order_by(Accident.accident_date.desc()).limit(limit)
        accidents = list(db.scalars(stmt).all())

        features: List[GeoJSONFeature] = []
        for acc in accidents:
            feature = GeoJSONFeature(
                type="Feature",
                geometry=GeoJSONGeometry(
                    type="Point",
                    # RFC 7946 strictly requires [longitude, latitude] order
                    coordinates=[float(acc.longitude), float(acc.latitude)]
                ),
                properties={
                    "id": acc.id,
                    "title": acc.title,
                    "location_name": acc.location_name,
                    "severity": acc.severity,
                    "accident_type": acc.accident_type,
                    "fatalities": acc.fatalities,
                    "injuries": acc.injuries,
                    "vehicles_involved": acc.vehicles_involved,
                    "weather_condition": acc.weather_condition,
                    "road_condition": acc.road_condition,
                    "lighting_condition": acc.lighting_condition,
                    "accident_date": acc.accident_date.isoformat() if acc.accident_date else None,
                    "description": acc.description,
                    "created_at": acc.created_at.isoformat() if acc.created_at else None,
                }
            )
            features.append(feature)

        return GeoJSONFeatureCollection(
            type="FeatureCollection",
            features=features
        )
