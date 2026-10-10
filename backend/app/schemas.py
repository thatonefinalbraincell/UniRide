from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# --- Auth & User Schemas ---
class UserRegister(BaseModel):
    student_id: str
    full_name: str
    email: str
    password: str
    role: Optional[str] = "both"  # 'driver', 'rider', 'both'
    department: Optional[str] = None
    phone: Optional[str] = None

class UserLogin(BaseModel):
    student_id_or_email: str
    password: str

class UserResponse(BaseModel):
    id: int
    student_id: str
    full_name: str
    email: str
    role: str
    department: Optional[str] = None
    phone: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# --- Vehicle Schemas ---
class VehicleCreate(BaseModel):
    license_number: str
    vehicle_type: str  # 'car', 'scooter', 'suv', 'sedan', 'hatchback', 'bike'
    make_model: str
    capacity: int
    color: Optional[str] = None

class VehicleResponse(BaseModel):
    id: int
    driver_id: int
    license_number: str
    vehicle_type: str
    make_model: str
    capacity: int
    color: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# --- Ride Schemas ---
class RideCreate(BaseModel):
    vehicle_id: int
    origin_name: str
    origin_lat: float
    origin_lng: float
    dest_name: str
    dest_lat: float
    dest_lng: float
    departure_time: datetime
    available_seats: int
    price_per_seat: Optional[float] = 0.00
    notes: Optional[str] = None

class RideResponse(BaseModel):
    id: int
    driver_id: int
    vehicle_id: int
    origin_name: str
    origin_lat: float
    origin_lng: float
    dest_name: str
    dest_lat: float
    dest_lng: float
    departure_time: datetime
    available_seats: int
    total_seats: int
    price_per_seat: float
    status: str
    notes: Optional[str] = None
    created_at: datetime
    driver: Optional[UserResponse] = None
    vehicle: Optional[VehicleResponse] = None

    class Config:
        from_attributes = True


# --- Ride Request Schemas ---
class RideRequestCreate(BaseModel):
    ride_id: Optional[int] = None
    pickup_name: str
    pickup_lat: float
    pickup_lng: float
    dropoff_name: str
    dropoff_lat: float
    dropoff_lng: float
    requested_seats: Optional[int] = 1
    notes: Optional[str] = None

class RideRequestResponse(BaseModel):
    id: int
    ride_id: Optional[int] = None
    rider_id: int
    pickup_name: str
    pickup_lat: float
    pickup_lng: float
    dropoff_name: str
    dropoff_lat: float
    dropoff_lng: float
    requested_seats: int
    status: str
    notes: Optional[str] = None
    created_at: datetime
    rider: Optional[UserResponse] = None
    ride: Optional[RideResponse] = None

    class Config:
        from_attributes = True


class RequestStatusUpdate(BaseModel):
    status: str  # 'accepted', 'rejected', 'cancelled'
