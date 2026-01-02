-- Migration: Add Notification System
-- Created: 2025-11-13
-- Description: Adds phone number and notification settings to users table, creates notification_logs table

-- Step 1: Add notification fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT true;

-- Step 2: Create notification_logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  phone_number VARCHAR(20),
  message_id VARCHAR(255),
  error_message TEXT,
  metadata TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at DESC);

-- Step 4: Add comments for documentation
COMMENT ON TABLE notification_logs IS 'Stores logs of all notification attempts (Kakao Alimtalk and Naver SENS)';
COMMENT ON COLUMN notification_logs.type IS 'Notification type: payment_success, revision_credit_purchased, writing_analysis_complete, application_generated';
COMMENT ON COLUMN notification_logs.channel IS 'Notification channel: kakao (Alimtalk), sms (Naver SENS)';
COMMENT ON COLUMN notification_logs.status IS 'Notification status: pending, sent, failed';
COMMENT ON COLUMN notification_logs.metadata IS 'JSON string containing additional notification data';

COMMENT ON COLUMN users.phone IS 'User phone number for notifications (format: 010-1234-5678)';
COMMENT ON COLUMN users.notification_enabled IS 'Whether user has consented to receive notifications';
