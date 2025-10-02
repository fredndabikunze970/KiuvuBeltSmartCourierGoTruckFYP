-- Add route and delivery time information to packages table
ALTER TABLE packages 
ADD COLUMN route_stops JSONB, -- Store multiple stops in the route
ADD COLUMN estimated_distance DECIMAL(10,2), -- Distance in kilometers
ADD COLUMN estimated_duration INTEGER, -- Duration in minutes
ADD COLUMN actual_delivery_time TIMESTAMP, -- When package was actually delivered
ADD COLUMN preferred_delivery_time_window JSONB, -- Preferred delivery time window (start and end time)
ADD COLUMN route_optimization_score INTEGER; -- Score for route optimization (1-100)

-- Add index for delivery time queries
CREATE INDEX idx_packages_delivery_time ON packages(delivery_time);
CREATE INDEX idx_packages_actual_delivery ON packages(actual_delivery_time);

-- Update existing packages with NULL values for new columns
UPDATE packages 
SET route_stops = NULL,
    estimated_distance = NULL,
    estimated_duration = NULL,
    actual_delivery_time = NULL,
    preferred_delivery_time_window = NULL,
    route_optimization_score = NULL
WHERE route_stops IS NULL;