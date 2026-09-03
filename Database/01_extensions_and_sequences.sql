-- ==============================================================================
-- 01_extensions_and_sequences.sql
-- Extensions and Sequences for OTP System in Supabase PostgreSQL
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Order number sequence
-- Generates sequential order numbers in DO-XXXX format (e.g., DO-0001, DO-4728)
CREATE SEQUENCE IF NOT EXISTS otp_order_no_seq START WITH 1 INCREMENT BY 1;

-- Function to generate formatted order numbers
CREATE OR REPLACE FUNCTION generate_order_no()
RETURNS TEXT AS $$
  SELECT 'DO-' || LPAD(nextval('otp_order_no_seq')::TEXT, 4, '0');
$$ LANGUAGE SQL;

-- Dispatch number sequence
-- Generates sequential dispatch numbers in D-XXXX format (e.g., D-0001, D-1649)
CREATE SEQUENCE IF NOT EXISTS otp_dispatch_no_seq START WITH 1 INCREMENT BY 1;

-- Function to generate formatted dispatch numbers (replaces D-Sr Number)
CREATE OR REPLACE FUNCTION generate_dispatch_no()
RETURNS TEXT AS $$
  SELECT 'D-' || LPAD(nextval('otp_dispatch_no_seq')::TEXT, 4, '0');
$$ LANGUAGE SQL;
