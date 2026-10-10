-- UniRide Database Schema (PostgreSQL / Supabase Compatible)

-- Enable UUID Extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'both', -- 'driver', 'rider', 'both'
    department VARCHAR(100),
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Vehicles Table (Drivers can register multiple vehicles)
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    driver_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    vehicle_type VARCHAR(30) NOT NULL, -- 'car', 'suv', 'sedan', 'scooter', 'hatchback', 'bike'
    make_model VARCHAR(100) NOT NULL,
    capacity INT NOT NULL DEFAULT 4,
    color VARCHAR(30),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Rides Table (Driver Posted Rides)
CREATE TABLE IF NOT EXISTS rides (
    id SERIAL PRIMARY KEY,
    driver_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id INT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    origin_name VARCHAR(150) NOT NULL,
    origin_lat DOUBLE PRECISION NOT NULL,
    origin_lng DOUBLE PRECISION NOT NULL,
    dest_name VARCHAR(150) NOT NULL,
    dest_lat DOUBLE PRECISION NOT NULL,
    dest_lng DOUBLE PRECISION NOT NULL,
    departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
    available_seats INT NOT NULL,
    total_seats INT NOT NULL,
    price_per_seat DECIMAL(10, 2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'active', 'completed', 'cancelled'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Ride Requests Table (Rider requests to drivers)
CREATE TABLE IF NOT EXISTS ride_requests (
    id SERIAL PRIMARY KEY,
    ride_id INT REFERENCES rides(id) ON DELETE CASCADE, -- NULL if custom unassigned rider request
    rider_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pickup_name VARCHAR(150) NOT NULL,
    pickup_lat DOUBLE PRECISION NOT NULL,
    pickup_lng DOUBLE PRECISION NOT NULL,
    dropoff_name VARCHAR(150) NOT NULL,
    dropoff_lat DOUBLE PRECISION NOT NULL,
    dropoff_lng DOUBLE PRECISION NOT NULL,
    requested_seats INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'cancelled'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for high performance queries
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_requests_ride_id ON ride_requests(ride_id);
CREATE INDEX IF NOT EXISTS idx_requests_rider_id ON ride_requests(rider_id);

-- Sample Data Insertion (Optional Seed Data)
INSERT INTO users (student_id, full_name, email, password_hash, role, department, phone)
VALUES 
('STU-1001', 'Alex Johnson', 'alex@campus.edu', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', 'both', 'Computer Science', '555-0192'),
('STU-1002', 'Sarah Parker', 'sarah@campus.edu', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', 'both', 'Mechanical Engineering', '555-0184')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO vehicles (driver_id, license_number, vehicle_type, make_model, capacity, color, is_active)
VALUES 
(1, 'CAMPUS-789', 'car', 'Honda Civic 2022', 4, 'White', TRUE),
(1, 'MOTO-456', 'scooter', 'Vespa Sprint 150', 1, 'Blue', FALSE)
ON CONFLICT (license_number) DO NOTHING;
