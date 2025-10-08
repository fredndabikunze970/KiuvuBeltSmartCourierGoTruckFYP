-- Seed a test package for delivery verification testing
INSERT INTO packages (
  package_id, pickup_code, sender_name, sender_phone, sender_address,
  receiver_name, receiver_phone, receiver_address,
  package_description, weight, dimensions, declared_value, delivery_fee,
  status, priority, origin_branch_id, destination_branch_id,
  assigned_car, assigned_driver, agent_id, created_at, updated_at
) VALUES (
  'PKG-TEST001', 'ABC123', 'Test Sender', '+250788111111', 'Test Sender Address',
  'Test Receiver', '+250788222222', 'Test Receiver Address',
  'Test Package', 5.0, '10x10x10', 1000.00, 500.00,
  'out_for_delivery', 'normal', 'BR001', 'BR002',
  'CAR001', 'DRV001', 'user_J3Rbsc2wFr', NOW(), NOW()
);

-- Insert initial tracking entry
INSERT INTO tracking (
  package_id, status, location_name, progress_percentage, notes, updated_by, created_at
) VALUES (
  'PKG-TEST001', 'out_for_delivery', 'Out for delivery', 80, 'Package is out for delivery', 'system', NOW()
);
