-- Smart Courier Go Track System Database Schema
-- Create tables for KIVU Belt Express courier operations

-- Users table for agents, admin, and receivers
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('agent', 'admin', 'receiver')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Packages table for tracking courier packages
CREATE TABLE IF NOT EXISTS packages (
    id SERIAL PRIMARY KEY,
    package_id VARCHAR(50) UNIQUE NOT NULL,
    pickup_code VARCHAR(10) UNIQUE NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    sender_phone VARCHAR(20) NOT NULL,
    sender_address TEXT NOT NULL,
    receiver_name VARCHAR(255) NOT NULL,
    receiver_phone VARCHAR(20) NOT NULL,
    receiver_address TEXT NOT NULL,
    package_type VARCHAR(50) DEFAULT 'general',
    weight DECIMAL(10,2),
    dimensions VARCHAR(100),
    declared_value DECIMAL(12,2),
    delivery_fee DECIMAL(10,2) NOT NULL,
    pickup_location VARCHAR(255),
    delivery_location VARCHAR(255),
    special_instructions TEXT,
    status VARCHAR(20) DEFAULT 'registered' CHECK (status IN ('registered', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled')),
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('normal', 'express', 'urgent')),
    created_by VARCHAR(50) REFERENCES users(user_id),
    picked_up_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tracking table for package location and status updates
CREATE TABLE IF NOT EXISTS tracking (
    id SERIAL PRIMARY KEY,
    package_id VARCHAR(50) REFERENCES packages(package_id),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_name VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    notes TEXT,
    updated_by VARCHAR(50) REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table for tracking payment status
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    payment_id VARCHAR(50) UNIQUE NOT NULL,
    package_id VARCHAR(50) REFERENCES packages(package_id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'mobile_money', 'bank_transfer')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'confirmed', 'failed', 'refunded')),
    transaction_reference VARCHAR(100),
    confirmed_by VARCHAR(50) REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP NULL
);

-- Notifications table for SMS and system notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    notification_id VARCHAR(50) UNIQUE NOT NULL,
    package_id VARCHAR(50) REFERENCES packages(package_id),
    recipient_phone VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(20) NOT NULL CHECK (notification_type IN ('sms', 'system', 'email')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_packages_status ON packages(status);
CREATE INDEX IF NOT EXISTS idx_packages_created_by ON packages(created_by);
CREATE INDEX IF NOT EXISTS idx_tracking_package ON tracking(package_id);
CREATE INDEX IF NOT EXISTS idx_tracking_created ON tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_package ON payments(package_id);
CREATE INDEX IF NOT EXISTS idx_notifications_package ON notifications(package_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Insert default admin user (password: admin123 - should be changed in production)
INSERT INTO users (user_id, email, password_hash, full_name, phone, role, status) 
VALUES (
    'admin001', 
    'admin@kivubelt.com', 
    '$2b$10$rOzJqQZJqQZJqQZJqQZJqOzJqQZJqQZJqQZJqQZJqQZJqQZJqQZJq', 
    'System Administrator', 
    '+250788000000', 
    'admin',
    'active'
) ON CONFLICT (user_id) DO NOTHING;

SELECT 'Database schema created successfully!' as message;
