-- Add 'read' status to notifications table
-- This allows notifications to be marked as read by users

-- Drop the existing constraint
ALTER TABLE notifications DROP CONSTRAINT notifications_status_check;

-- Add the new constraint with 'read' included
ALTER TABLE notifications ADD CONSTRAINT notifications_status_check
CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read'));

-- Update any existing notifications that should be marked as read
-- For now, we'll leave them as is, but you can update specific ones if needed
-- UPDATE notifications SET status = 'read' WHERE [condition];

SELECT 'Notifications status constraint updated to include read status' as message;
