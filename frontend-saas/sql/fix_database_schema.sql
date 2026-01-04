-- ============================================================================
-- Database Schema Fix - Missing Columns and Tables
-- ============================================================================
-- This script fixes missing database schema elements that are causing errors
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Add missing 'phone' column to users table
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE users ADD COLUMN phone VARCHAR(20);
    COMMENT ON COLUMN users.phone IS '전화번호 (알림 시스템용)';
  END IF;
END $$;

-- 2. Add missing 'notification_enabled' column to users table
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'notification_enabled'
  ) THEN
    ALTER TABLE users ADD COLUMN notification_enabled BOOLEAN DEFAULT TRUE;
    COMMENT ON COLUMN users.notification_enabled IS '알림 수신 동의';
  END IF;
END $$;

-- 3. Verify refunds table exists (already created from schema.ts)
-- ============================================================================
-- If refunds table doesn't exist, create it
CREATE TABLE IF NOT EXISTS refunds (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  payment_id INTEGER NOT NULL REFERENCES payments(id),
  portone_payment_id VARCHAR(255) NOT NULL,
  portone_cancellation_id VARCHAR(255),
  requested_amount INTEGER NOT NULL,
  refund_fee INTEGER NOT NULL DEFAULT 0,
  actual_refund_amount INTEGER NOT NULL,
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);

-- Enable RLS for refunds table
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- RLS policies for refunds
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'refunds' AND policyname = 'Users can view their own refunds'
  ) THEN
    CREATE POLICY "Users can view their own refunds"
      ON refunds FOR SELECT TO authenticated
      USING (user_id = auth.uid()::integer);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'refunds' AND policyname = 'Users can create their own refunds'
  ) THEN
    CREATE POLICY "Users can create their own refunds"
      ON refunds FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid()::integer);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'refunds' AND policyname = 'Admins can view all refunds'
  ) THEN
    CREATE POLICY "Admins can view all refunds"
      ON refunds FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()::integer
          AND users.role = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'refunds' AND policyname = 'Service role can do anything on refunds'
  ) THEN
    CREATE POLICY "Service role can do anything on refunds"
      ON refunds FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE refunds IS '환불 요청 및 처리 내역';

-- 4. Add indexes for better performance
-- ============================================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Payments table indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Credits table indexes
CREATE INDEX IF NOT EXISTS idx_credits_user_id ON credits(user_id);

-- Credit transactions table indexes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- 5. Verification query
-- ============================================================================
-- Run this to verify all changes
SELECT
  'users.phone exists' as check_item,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'phone'
  ) as status
UNION ALL
SELECT
  'users.notification_enabled exists',
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'notification_enabled'
  )
UNION ALL
SELECT
  'refunds table exists',
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'refunds'
  )
UNION ALL
SELECT
  'search_logs table exists',
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'search_logs'
  );
