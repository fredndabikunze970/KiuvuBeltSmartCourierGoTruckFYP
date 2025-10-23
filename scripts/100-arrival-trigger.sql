-- Migration: 100-arrival-trigger.sql
-- Create trigger and function to mark packages and tracking rows as 'arrived'
-- Run this file with psql or include in your migration runner.

-- DROP existing to make the script idempotent
DROP TRIGGER IF EXISTS trg_tracking_arrived ON tracking;
DROP FUNCTION IF EXISTS fn_tracking_set_arrived();

-- Create trigger function
CREATE OR REPLACE FUNCTION fn_tracking_set_arrived()
RETURNS TRIGGER AS
$$
BEGIN
  -- Only act for INSERT or UPDATE
  IF TG_OP = 'INSERT' THEN
    IF NEW.progress_percentage IS NULL OR NEW.progress_percentage::int <> 100 THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only proceed when NEW.progress_percentage = 100 and it wasn't 100 before
    IF NEW.progress_percentage IS NULL OR NEW.progress_percentage::int <> 100 THEN
      RETURN NEW;
    END IF;
    IF OLD.progress_percentage IS NOT NULL AND OLD.progress_percentage::int = 100 THEN
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  -- 1) Update packages status to 'arrived'
  UPDATE packages
  SET status = 'arrived'
  WHERE package_id = NEW.package_id
    AND (status IS DISTINCT FROM 'arrived');

  -- 2 & 3) Ensure the tracking row is set to arrived and progress=100.
  -- If your tracking table has a primary key (recommended), replace the ctid condition
  -- with: WHERE tracking_id = NEW.tracking_id
  IF NEW.status IS DISTINCT FROM 'arrived' OR NEW.progress_percentage::int <> 100 THEN
    UPDATE tracking
    SET status = 'arrived',
        progress_percentage = 100
    WHERE package_id = NEW.package_id
      AND id = NEW.id; -- use the primary key 'id' to target the specific row
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger to fire AFTER INSERT OR UPDATE on tracking
CREATE TRIGGER trg_tracking_arrived
AFTER INSERT OR UPDATE
ON tracking
FOR EACH ROW
EXECUTE FUNCTION fn_tracking_set_arrived();

-- === Test examples (commented) ===
-- Use these to verify behavior in a safe/test DB.
--
-- INSERT INTO packages (package_id, status) VALUES ('pkg_test_1','in_transit');
-- INSERT INTO tracking (package_id, status, progress_percentage) VALUES ('pkg_test_1','in_transit', 99);
-- UPDATE tracking SET progress_percentage = 100 WHERE package_id = 'pkg_test_1';
-- SELECT * FROM packages WHERE package_id = 'pkg_test_1';
-- SELECT * FROM tracking WHERE package_id = 'pkg_test_1';

-- Direct insert with 100:
-- INSERT INTO packages (package_id, status) VALUES ('pkg_test_2','on_route');
-- INSERT INTO tracking (package_id, status, progress_percentage) VALUES ('pkg_test_2','on_route', 100);

-- Notes:
-- Replace ctid usage with a real PK condition if your tracking table has one.
-- Ensure the user running migrations has UPDATE privileges on both tables.
