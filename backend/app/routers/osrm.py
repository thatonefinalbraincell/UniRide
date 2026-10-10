from fastapi import APIRouter, HTTPException
import httpx
from app.config import settings

router = APIRouter(prefix="/api/osrm", tags=["OSRM Routing"])

@router.get("/route")
async def get_route(
    start_lat: float,
    start_lng: float,
    end_lat: float,
    end_lng: float
):
    """
    Proxy OSRM route request between start and end coordinates.
    Returns geometries, distance in meters/km, and duration in seconds/minutes.
    """
    url = f"{settings.OSRM_BASE_URL}/route/v1/driving/{start_lng},{start_lat};{end_lng},{end_lat}?overview=full&geometries=geojson"
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("code") == "Ok" and data.get("routes"):
                    route = data["routes"][0]
                    return {
                        "status": "success",
                        "distance_km": round(route["distance"] / 1000, 2),
                        "duration_mins": round(route["duration"] / 60, 1),
                        "geometry": route["geometry"]
                    }
    except Exception as e:
        pass
    
    # Fallback straight line estimation if OSRM server is unreachable
    import math
    # Haversine distance formula fallback
    R = 6371.0 # km
    dlat = math.radians(end_lat - start_lat)
    dlng = math.radians(end_lng - start_lng)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(start_lat)) * math.cos(math.radians(end_lat)) * math.sin(dlng/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    dist_km = round(R * c, 2)
    duration_mins = round(dist_km * 2.5, 1) # ~24 km/h campus speed estimate

    return {
        "status": "fallback",
        "distance_km": dist_km,
        "duration_mins": duration_mins,
        "geometry": {
            "type": "LineString",
            "coordinates": [[start_lng, start_lat], [end_lng, end_lat]]
        }
    }
