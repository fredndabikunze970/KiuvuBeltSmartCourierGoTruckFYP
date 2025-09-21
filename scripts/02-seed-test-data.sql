-- Seed test data for Smart Courier Go Track System
-- This creates sample users, packages, and tracking data for testing

-- Insert test users
INSERT INTO users (user_id, email, password_hash, full_name, phone, role, status) VALUES
('USR-ADMIN-001', 'admin@kivubelt.rw', '$2b$10$example.hash.for.testing', 'System Administrator', '+250788123456', 'admin', 'active'),
('USR-AGENT-001', 'agent1@kivubelt.rw', '$2b$10$example.hash.for.testing', 'Jean Baptiste Uwimana', '+250788234567', 'agent', 'active'),
('USR-AGENT-002', 'agent2@kivubelt.rw', '$2b$10$example.hash.for.testing', 'Marie Claire Mukamana', '+250788345678', 'agent', 'active')
ON CONFLICT (user_id) DO NOTHING;

-- Insert test packages
INSERT INTO packages (
  package_id, pickup_code, sender_name, sender_phone, sender_address,
  receiver_name, receiver_phone, receiver_address,
  package_type, weight, dimensions, declared_value, delivery_fee,
  pickup_location, delivery_location, special_instructions,
  status, created_by
) VALUES
(
  'PKG-TEST-001', 'PU001',
  'John Doe', '+250788111111', 'KN 5 Ave, Kigali',
  'Jane Smith', '+250788222222', 'Avenue de la Paix, Butare',
  'documents', 0.5, '30x20x5 cm', 50000, 5000,
  'Kigali City Center', 'Butare Town',
  'Handle with care - important documents',
  'in_transit', 'USR-AGENT-001'
),
(
  'PKG-TEST-002', 'PU002',
  'Alice Johnson', '+250788333333', 'Kimisagara, Kigali',
  'Bob Wilson', '+250788444444', 'Remera, Kigali',
  'electronics', 2.0, '40x30x15 cm', 200000, 3000,
  'Kimisagara Market', 'Remera Office Park',
  'Fragile - electronic equipment',
  'picked_up', 'USR-AGENT-002'
),
(
  'PKG-TEST-003', 'PU003',
  'David Brown', '+250788555555', 'Nyamirambo, Kigali',
  'Sarah Davis', '+250788666666', 'Musanze Town',
  'clothing', 1.5, '50x40x20 cm', 75000, 8000,
  'Nyamirambo Market', 'Musanze Central',
  'New clothes for family',
  'registered', 'USR-AGENT-001'
)
ON CONFLICT (package_id) DO NOTHING;

-- Insert initial tracking records
INSERT INTO tracking (package_id, status, notes, updated_by, latitude, longitude, location_name, progress_percentage) VALUES
('PKG-TEST-001', 'registered', 'Package registered and ready for pickup', 'USR-AGENT-001', -1.9441, 30.0619, 'Kigali City Center', 10),
('PKG-TEST-001', 'picked_up', 'Package picked up from sender', 'USR-AGENT-001', -1.9441, 30.0619, 'Kigali City Center', 25),
('PKG-TEST-001', 'in_transit', 'Package in transit to destination', 'USR-AGENT-001', -2.1189, 29.7378, 'En route to Butare', 60),

('PKG-TEST-002', 'registered', 'Package registered and ready for pickup', 'USR-AGENT-002', -1.9706, 30.1044, 'Kimisagara Market', 10),
('PKG-TEST-002', 'picked_up', 'Package picked up from sender', 'USR-AGENT-002', -1.9706, 30.1044, 'Kimisagara Market', 25),

('PKG-TEST-003', 'registered', 'Package registered and ready for pickup', 'USR-AGENT-001', -1.9659, 30.0588, 'Nyamirambo Market', 10);

-- Insert test payment records
INSERT INTO payments (
  payment_id, package_id, amount, payment_method, payment_status,
  transaction_reference, confirmed_by
) VALUES
('PAY-TEST-001', 'PKG-TEST-001', 5000, 'cash', 'confirmed', 'CASH-001', 'USR-AGENT-001'),
('PAY-TEST-002', 'PKG-TEST-002', 3000, 'mobile_money', 'pending', 'MM-002', NULL)
ON CONFLICT (payment_id) DO NOTHING;

-- Insert test notifications
INSERT INTO notifications (
  notification_id, package_id, recipient_phone, message,
  notification_type, status
) VALUES
('NOT-TEST-001', 'PKG-TEST-001', '+250788222222', 'Your package PKG-TEST-001 is now in transit. Track at: http://track.kivubelt.rw/PKG-TEST-001', 'sms', 'sent'),
('NOT-TEST-002', 'PKG-TEST-002', '+250788444444', 'Your package PKG-TEST-002 has been picked up and is on the way.', 'sms', 'sent')
ON CONFLICT (notification_id) DO NOTHING;

-- Update package timestamps
UPDATE packages SET 
  picked_up_at = NOW() - INTERVAL '2 hours',
  updated_at = NOW()
WHERE package_id IN ('PKG-TEST-001', 'PKG-TEST-002');

UPDATE packages SET 
  updated_at = NOW()
WHERE package_id = 'PKG-TEST-003';

SELECT 'Test data seeded successfully!' as message;
