"""Main FastAPI application entrypoint for MargRakshak AI."""
from datetime import datetime, timezone
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine, get_db_info
from app.api.v1.api import api_router
from app.api.v1.endpoints import auth, accidents, hotspots, users, tracking

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "AI-Based Accident Hotspot Detection and Risk Prediction System for Nashik City. "
        "Provides REST APIs for GIS Hotspots, Accident Management, AI HDBSCAN Clustering, and Safety Alerts."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json"
)

# CORS middleware for React frontend (allows all origins in dev, restricted in prod)
cors_origins = ["*"] if settings.ENVIRONMENT == "development" else settings.CORS_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True if cors_origins != ["*"] else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers (both versioned /api/v1 and convenient direct /api/ aliases)
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication (Direct)"])
app.include_router(accidents.router, prefix="/api/accidents", tags=["Accidents (Direct)"])
app.include_router(hotspots.router, prefix="/api/hotspots", tags=["Hotspots (Direct)"])
app.include_router(users.router, prefix="/api/users", tags=["Users (Direct)"])
app.include_router(tracking.router, prefix="/api/tracking", tags=["Tracking (Direct)"])



@app.get("/", tags=["Root"])
def root():
    """Root welcoming endpoint with basic system information."""
    return {
        "system": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs_url": "/docs",
        "api_v1": settings.API_V1_PREFIX,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.get(f"{settings.API_V1_PREFIX}/health", tags=["System"])
def health_check():
    """Health-check endpoint to verify API server status, DB, and PostGIS readiness."""
    info = get_db_info()
    return {
        "status": "healthy" if info["status"] == "operational" else "degraded",
        "service": "MargRakshak AI Backend",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "components": {
            "api": "operational",
            "cors": "enabled",
            "database": f"operational ({info['type']})",
            "postgis": "enabled" if info["postgis_enabled"] else "disabled",
        },
        "database_type": info["type"],
        "hotspots_count": info["hotspots_count"],
        "postgis_version": info["postgis_version"]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
