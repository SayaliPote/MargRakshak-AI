"""API v1 router aggregator."""
from fastapi import APIRouter
from app.api.v1.endpoints import auth, accidents, hotspots, users, tracking

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(accidents.router, prefix="/accidents", tags=["Accidents"])
api_router.include_router(hotspots.router, prefix="/hotspots", tags=["Hotspots"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(tracking.router, prefix="/tracking", tags=["Real-Time Tracking"])

