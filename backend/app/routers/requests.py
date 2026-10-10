from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import User, Ride, RideRequest
from app.schemas import RideRequestCreate, RideRequestResponse, RequestStatusUpdate
from app.deps import get_current_user

router = APIRouter(prefix="/api/requests", tags=["Ride Requests"])

@router.post("", response_model=RideRequestResponse)
def create_ride_request(
    request_in: RideRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_ride = None
    if request_in.ride_id:
        target_ride = db.query(Ride).filter(Ride.id == request_in.ride_id).first()
        if not target_ride:
            raise HTTPException(status_code=404, detail="Target ride not found")
        
        if target_ride.driver_id == current_user.id:
            raise HTTPException(status_code=400, detail="You cannot request a seat on your own ride!")
            
        if target_ride.available_seats < request_in.requested_seats:
            raise HTTPException(
                status_code=400, 
                detail=f"Not enough seats available. Only {target_ride.available_seats} seat(s) remaining."
            )

    new_request = RideRequest(
        ride_id=request_in.ride_id,
        rider_id=current_user.id,
        pickup_name=request_in.pickup_name,
        pickup_lat=request_in.pickup_lat,
        pickup_lng=request_in.pickup_lng,
        dropoff_name=request_in.dropoff_name,
        dropoff_lat=request_in.dropoff_lat,
        dropoff_lng=request_in.dropoff_lng,
        requested_seats=request_in.requested_seats or 1,
        status="pending",
        notes=request_in.notes
    )

    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    return new_request


@router.get("/driver", response_model=List[RideRequestResponse])
def get_incoming_driver_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch requests for rides posted by current driver, or general unassigned rider requests
    requests = db.query(RideRequest).join(Ride, RideRequest.ride_id == Ride.id, isouter=True).filter(
        (Ride.driver_id == current_user.id) | (RideRequest.ride_id == None)
    ).order_by(RideRequest.created_at.desc()).all()
    return requests


@router.get("/rider", response_model=List[RideRequestResponse])
def get_my_rider_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    requests = db.query(RideRequest).filter(RideRequest.rider_id == current_user.id).order_by(RideRequest.created_at.desc()).all()
    return requests


@router.patch("/{request_id}/status", response_model=RideRequestResponse)
def update_request_status(
    request_id: int,
    status_update: RequestStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    req = db.query(RideRequest).filter(RideRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    new_status = status_update.status.lower()
    if new_status not in ["accepted", "rejected", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid request status")

    # If updating to accepted: check permissions & deduct seats from ride
    if new_status == "accepted":
        if not req.ride_id:
            raise HTTPException(status_code=400, detail="Cannot accept custom unassigned request directly without linking a ride.")
        
        ride = db.query(Ride).filter(Ride.id == req.ride_id).first()
        if not ride or ride.driver_id != current_user.id:
            raise HTTPException(status_code=403, detail="Only the driver of this ride can accept requests.")
            
        if req.status == "accepted":
            return req  # already accepted

        if ride.available_seats < req.requested_seats:
            raise HTTPException(status_code=400, detail="Not enough seats left on this ride!")

        # Deduct seats
        ride.available_seats -= req.requested_seats
        db.add(ride)

    elif req.status == "accepted" and new_status in ["rejected", "cancelled"]:
        # If revoking previous acceptance, return seats to ride
        if req.ride_id:
            ride = db.query(Ride).filter(Ride.id == req.ride_id).first()
            if ride:
                ride.available_seats += req.requested_seats
                db.add(ride)

    req.status = new_status
    db.commit()
    db.refresh(req)
    return req
