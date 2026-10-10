from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User, Vehicle
from app.schemas import VehicleCreate, VehicleResponse
from app.deps import get_current_user

router = APIRouter(prefix="/api/vehicles", tags=["Vehicles"])

@router.get("", response_model=List[VehicleResponse])
def get_my_vehicles(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    vehicles = db.query(Vehicle).filter(Vehicle.driver_id == current_user.id).order_by(Vehicle.created_at.desc()).all()
    return vehicles

@router.post("", response_model=VehicleResponse)
def register_vehicle(
    vehicle_in: VehicleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if license plate is already registered
    existing = db.query(Vehicle).filter(Vehicle.license_number == vehicle_in.license_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="A vehicle with this license plate number is already registered.")

    # If this is the driver's first vehicle, make it active automatically
    has_vehicles = db.query(Vehicle).filter(Vehicle.driver_id == current_user.id).count() > 0
    
    new_vehicle = Vehicle(
        driver_id=current_user.id,
        license_number=vehicle_in.license_number.upper().strip(),
        vehicle_type=vehicle_in.vehicle_type.lower(),
        make_model=vehicle_in.make_model,
        capacity=vehicle_in.capacity,
        color=vehicle_in.color,
        is_active=not has_vehicles  # true if first vehicle
    )
    
    # Also update user role to driver/both if needed
    if current_user.role == "rider":
        current_user.role = "both"
        db.add(current_user)

    db.add(new_vehicle)
    db.commit()
    db.refresh(new_vehicle)
    return new_vehicle


@router.put("/{vehicle_id}/set-active", response_model=VehicleResponse)
def set_active_vehicle(
    vehicle_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.driver_id == current_user.id).first()
    if not target_vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    # Deactivate all other vehicles for driver
    db.query(Vehicle).filter(Vehicle.driver_id == current_user.id).update({"is_active": False})
    target_vehicle.is_active = True
    db.commit()
    db.refresh(target_vehicle)
    return target_vehicle


@router.delete("/{vehicle_id}")
def delete_vehicle(
    vehicle_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.driver_id == current_user.id).first()
    if not target_vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    db.delete(target_vehicle)
    db.commit()
    return {"message": "Vehicle removed successfully"}
