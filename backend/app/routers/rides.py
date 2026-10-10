from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models import User, Vehicle, Ride
from app.schemas import RideCreate, RideResponse
from app.deps import get_current_user

router = APIRouter(prefix="/api/rides", tags=["Rides"])

@router.get("", response_model=List[RideResponse])
def get_available_rides(
    origin: Optional[str] = None,
    destination: Optional[str] = None,
    min_seats: Optional[int] = 1,
    db: Session = Depends(get_db)
):
    query = db.query(Ride).filter(
        Ride.status == "scheduled",
        Ride.available_seats >= min_seats
    )
    if origin:
        query = query.filter(Ride.origin_name.ilike(f"%{origin}%"))
    if destination:
        query = query.filter(Ride.dest_name.ilike(f"%{destination}%"))
        
    rides = query.order_by(Ride.departure_time.asc()).all()
    return rides


@router.post("", response_model=RideResponse)
def post_new_ride(
    ride_in: RideCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify vehicle belongs to current user
    vehicle = db.query(Vehicle).filter(Vehicle.id == ride_in.vehicle_id, Vehicle.driver_id == current_user.id).first()
    if not vehicle:
        raise HTTPException(status_code=400, detail="Selected vehicle does not belong to you or does not exist.")

    # Capacity validation
    if ride_in.available_seats > vehicle.capacity:
        raise HTTPException(
            status_code=400, 
            detail=f"Available seats cannot exceed vehicle total capacity ({vehicle.capacity} seats)."
        )

    new_ride = Ride(
        driver_id=current_user.id,
        vehicle_id=ride_in.vehicle_id,
        origin_name=ride_in.origin_name,
        origin_lat=ride_in.origin_lat,
        origin_lng=ride_in.origin_lng,
        dest_name=ride_in.dest_name,
        dest_lat=ride_in.dest_lat,
        dest_lng=ride_in.dest_lng,
        departure_time=ride_in.departure_time,
        available_seats=ride_in.available_seats,
        total_seats=ride_in.available_seats,
        price_per_seat=ride_in.price_per_seat or 0.00,
        status="scheduled",
        notes=ride_in.notes
    )

    db.add(new_ride)
    db.commit()
    db.refresh(new_ride)
    return new_ride


@router.get("/my-posts", response_model=List[RideResponse])
def get_driver_posted_rides(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rides = db.query(Ride).filter(Ride.driver_id == current_user.id).order_by(Ride.departure_time.desc()).all()
    return rides


@router.get("/{ride_id}", response_model=RideResponse)
def get_ride_by_id(ride_id: int, db: Session = Depends(get_db)):
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    return ride


@router.patch("/{ride_id}/status")
def update_ride_status(
    ride_id: int,
    status_str: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ride = db.query(Ride).filter(Ride.id == ride_id, Ride.driver_id == current_user.id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found or not owned by you")

    if status_str not in ["scheduled", "active", "completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status value")

    ride.status = status_str
    db.commit()
    db.refresh(ride)
    return {"message": f"Ride status updated to {status_str}", "ride": ride}
