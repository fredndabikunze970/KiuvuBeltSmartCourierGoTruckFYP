-- Add delivery time fields to packages table
ALTER TABLE packages 
ADD COLUMN estimated_delivery_date DATE,
ADD COLUMN estimated_delivery_time TIME,
ADD COLUMN delivery_notes TEXT;

-- Add index for delivery date queries
CREATE INDEX idx_packages_delivery_date ON packages(estimated_delivery_date);

-- Update existing packages with NULL values
UPDATE packages 
SET estimated_delivery_date = NULL,
    estimated_delivery_time = NULL,
    delivery_notes = NULL
WHERE estimated_delivery_date IS NULL;