from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Text, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="both")  # 'driver', 'rider', 'both'
    department = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    vehicles = relationship("Vehicle", back_populates="driver", cascade="all, delete-orphan")
    posted_rides = relationship("Ride", back_populates="driver", cascade="all, delete-orphan")
    ride_requests = relationship("RideRequest", back_populates="rider", cascade="all, delete-orphan")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    license_number = Column(String(50), unique=True, nullable=False)
    vehicle_type = Column(String(30), nullable=False)  # 'car', 'suv', 'sedan', 'scooter', 'hatchback', 'bike'
    make_model = Column(String(100), nullable=False)
    capacity = Column(Integer, default=4, nullable=False)
    color = Column(String(30), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    driver = relationship("User", back_populates="vehicles")
    rides = relationship("Ride", back_populates="vehicle")


class Ride(Base):
    __tablename__ = "rides"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False)
    origin_name = Column(String(150), nullable=False)
    origin_lat = Column(Float, nullable=False)
    origin_lng = Column(Float, nullable=False)
    dest_name = Column(String(150), nullable=False)
    dest_lat = Column(Float, nullable=False)
    dest_lng = Column(Float, nullable=False)
    departure_time = Column(DateTime(timezone=True), nullable=False)
    available_seats = Column(Integer, nullable=False)
    total_seats = Column(Integer, nullable=False)
    price_per_seat = Column(Float, default=0.00)
    status = Column(String(20), default="scheduled")  # 'scheduled', 'active', 'completed', 'cancelled'
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    driver = relationship("User", back_populates="posted_rides")
    vehicle = relationship("Vehicle", back_populates="rides")
    requests = relationship("RideRequest", back_populates="ride", cascade="all, delete-orphan")


class RideRequest(Base):
    __tablename__ = "ride_requests"

    id = Column(Integer, primary_key=True, index=True)
    ride_id = Column(Integer, ForeignKey("rides.id", ondelete="CASCADE"), nullable=True)
    rider_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    pickup_name = Column(String(150), nullable=False)
    pickup_lat = Column(Float, nullable=False)
    pickup_lng = Column(Float, nullable=False)
    dropoff_name = Column(String(150), nullable=False)
    dropoff_lat = Column(Float, nullable=False)
    dropoff_lng = Column(Float, nullable=False)
    requested_seats = Column(Integer, default=1)
    status = Column(String(20), default="pending")  # 'pending', 'accepted', 'rejected', 'cancelled'
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    ride = relationship("Ride", back_populates="requests")
    rider = relationship("User", back_populates="ride_requests")
