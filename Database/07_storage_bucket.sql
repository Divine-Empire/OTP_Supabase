-- ==============================================================================
-- 07_storage_bucket.sql
-- Storage Bucket Setup for OTP File Attachments (Invoices, Photos, Bilty, Certs)
-- ==============================================================================

-- Create public bucket 'otp-attachments'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'otp-attachments',
  'otp-attachments',
  true,
  52428800, -- 50 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- Storage Policies for 'otp-attachments' bucket

-- 1. Service role has full access to upload and manage objects
CREATE POLICY "service_role_manage_otp_attachments" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'otp-attachments')
  WITH CHECK (bucket_id = 'otp-attachments');

-- 2. Public / Anon can view and download files
CREATE POLICY "public_read_otp_attachments" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'otp-attachments');

-- 3. Authenticated / Anon upload policy (if needed for direct client uploads)
CREATE POLICY "anon_insert_otp_attachments" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'otp-attachments');
