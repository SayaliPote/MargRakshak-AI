"""Real-Time Fleet & Vehicle Tracking Endpoints.
Inspired by TrackPulse 1-second GPS architecture.
Provides WebSocket real-time telemetry streaming and REST fleet status.
"""
import time
from typing import Dict, List, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel

router = APIRouter()

class VehicleLocationPayload(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = "Fleet Vehicle"
    vehicleType: Optional[str] = "car"
    color: Optional[str] = "#3b82f6"
    latitude: float
    longitude: float
    speed: Optional[float] = 0.0
    heading: Optional[float] = 0.0
    accuracy: Optional[float] = 10.0
    altitude: Optional[float] = None
    timestamp: Optional[float] = None

# In-memory active tracker registry: id -> dict
active_trackers: Dict[str, dict] = {}
active_connections: Dict[str, WebSocket] = {}

INACTIVITY_TIMEOUT_SEC = 60

def prune_inactive_trackers():
    """Remove vehicles that have not transmitted in over 60 seconds."""
    now = time.time()
    stale_ids = [
        uid for uid, info in active_trackers.items()
        if now - info.get("updatedAt", now) > INACTIVITY_TIMEOUT_SEC
    ]
    for uid in stale_ids:
        active_trackers.pop(uid, None)


@router.get("/fleet", summary="List active real-time fleet trackers")
def get_active_fleet():
    """Returns all currently transmitting fleet vehicles and their telemetry."""
    prune_inactive_trackers()
    return {
        "success": True,
        "count": len(active_trackers),
        "timestamp": time.time(),
        "fleet": list(active_trackers.values())
    }


@router.post("/update", summary="REST endpoint to push single location telemetry update")
def push_location_update(payload: VehicleLocationPayload):
    """Fallback REST endpoint for devices without WebSocket support."""
    now = time.time()
    tracker_id = payload.id or f"vehicle-{int(now)}"
    
    tracker_info = {
        "id": tracker_id,
        "name": payload.name or "Fleet Vehicle",
        "vehicleType": payload.vehicleType or "car",
        "color": payload.color or "#3b82f6",
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "speed": round(payload.speed or 0.0, 1),
        "heading": round(payload.heading or 0.0, 1),
        "accuracy": round(payload.accuracy or 10.0, 1),
        "altitude": payload.altitude,
        "timestamp": payload.timestamp or now,
        "updatedAt": now
    }
    
    active_trackers[tracker_id] = tracker_info
    return {"success": True, "tracker": tracker_info}


# Rate limiting map: client_id -> list of timestamp floats within the last 1.0 second
client_rate_limits: Dict[str, List[float]] = {}
MAX_PACKETS_PER_SEC = 30

@router.websocket("/ws/{client_id}")
async def tracking_websocket(websocket: WebSocket, client_id: str):
    """High-frequency WebSocket stream for 1-second GPS location broadcast."""
    await websocket.accept()
    active_connections[client_id] = websocket
    
    try:
        # Send initial active fleet snapshot
        prune_inactive_trackers()
        await websocket.send_json({
            "type": "init-fleet",
            "fleet": list(active_trackers.values())
        })
        
        while True:
            data = await websocket.receive_json()
            now = time.time()
            
            # Handle ping-pong latency check
            if data.get("type") == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": now
                })
                continue

            # Rate-limiting check to prevent network flooding (up to 30 packets/sec)
            times = client_rate_limits.get(client_id, [])
            recent_times = [t for t in times if now - t < 1.0]
            if len(recent_times) >= MAX_PACKETS_PER_SEC:
                continue
            recent_times.append(now)
            client_rate_limits[client_id] = recent_times
            
            # Validate coordinates (-90 to 90 lat, -180 to 180 lng)
            try:
                lat = float(data.get("latitude"))
                lng = float(data.get("longitude"))
            except (TypeError, ValueError):
                continue
                
            if lat < -90 or lat > 90 or lng < -180 or lng > 180:
                continue

            existing = active_trackers.get(client_id, {})
            history = existing.get("history", [])
            history.append({
                "lat": lat,
                "lng": lng,
                "heading": float(data.get("heading") or 0.0),
                "timestamp": now
            })
            if len(history) > 20:
                history.pop(0)
                
            tracker_info = {
                "id": client_id,
                "name": data.get("name") or existing.get("name") or f"Fleet #{client_id[:6]}",
                "vehicleType": data.get("vehicleType") or existing.get("vehicleType") or "car",
                "color": data.get("color") or existing.get("color") or "#3b82f6",
                "latitude": lat,
                "longitude": lng,
                "speed": round(float(data.get("speed") or 0.0), 1),
                "heading": round(float(data.get("heading") or 0.0), 1),
                "accuracy": round(float(data.get("accuracy") or 10.0), 1),
                "altitude": data.get("altitude"),
                "timestamp": data.get("timestamp") or now,
                "updatedAt": now,
                "history": history
            }
            active_trackers[client_id] = tracker_info
            
            # Broadcast to all connected clients
            broadcast_msg = {
                "type": "location-update",
                "data": tracker_info
            }
            
            disconnected_clients = []
            for cid, conn in active_connections.items():
                try:
                    await conn.send_json(broadcast_msg)
                except Exception:
                    disconnected_clients.append(cid)
                    
            for cid in disconnected_clients:
                active_connections.pop(cid, None)
                client_rate_limits.pop(cid, None)
                
    except WebSocketDisconnect:
        active_connections.pop(client_id, None)
        active_trackers.pop(client_id, None)
        client_rate_limits.pop(client_id, None)
        
        # Notify others
        disconnect_msg = {
            "type": "user-disconnected",
            "id": client_id
        }
        for cid, conn in list(active_connections.items()):
            try:
                await conn.send_json(disconnect_msg)
            except Exception:
                active_connections.pop(cid, None)
                client_rate_limits.pop(cid, None)
