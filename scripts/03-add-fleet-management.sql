-- Add fleet management tables

-- Branches table
CREATE TABLE IF NOT EXISTS branches (
    branch_id VARCHAR(50) PRIMARY KEY,
    branch_name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
    driver_id VARCHAR(50) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    license_number VARCHAR(50) UNIQUE NOT NULL,
    license_expiry DATE NOT NULL,
    branch_id VARCHAR(50) REFERENCES branches(branch_id),
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'on_delivery', 'off_duty', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cars/Vehicles table
CREATE TABLE IF NOT EXISTS cars (
    car_id VARCHAR(50) PRIMARY KEY,
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    model VARCHAR(100) NOT NULL,
    capacity_kg DECIMAL(10,2) NOT NULL,
    branch_id VARCHAR(50) REFERENCES branches(branch_id),
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'in-use', 'maintenance')),
    current_driver_id VARCHAR(50) REFERENCES drivers(driver_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add new columns to packages table for fleet management
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS origin_branch_id VARCHAR(50) REFERENCES branches(branch_id),
ADD COLUMN IF NOT EXISTS destination_branch_id VARCHAR(50) REFERENCES branches(branch_id),
ADD COLUMN IF NOT EXISTS assigned_car_id VARCHAR(50) REFERENCES cars(car_id),
ADD COLUMN IF NOT EXISTS assigned_driver_id VARCHAR(50) REFERENCES drivers(driver_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_drivers_branch ON drivers(branch_id);
CREATE INDEX IF NOT EXISTS idx_cars_branch ON cars(branch_id);
CREATE INDEX IF NOT EXISTS idx_cars_driver ON cars(current_driver_id);
CREATE INDEX IF NOT EXISTS idx_packages_origin ON packages(origin_branch_id);
CREATE INDEX IF NOT EXISTS idx_packages_destination ON packages(destination_branch_id);
CREATE INDEX IF NOT EXISTS idx_packages_car ON packages(assigned_car_id);
CREATE INDEX IF NOT EXISTS idx_packages_driver ON packages(assigned_driver_id);