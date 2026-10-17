-- When the student acknowledged the notification in the Student Portal (NULL = not yet).
-- Run after add_notifications.sql.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP;
