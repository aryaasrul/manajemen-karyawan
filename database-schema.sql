-- ============================================
-- SISTEM MANAJEMEN KARYAWAN - DATABASE SCHEMA
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES (Extend Supabase Auth)
-- ============================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  employee_id TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'admin')),
  phone TEXT,
  hire_date DATE NOT NULL,
  base_salary DECIMAL(10,2) NOT NULL DEFAULT 750000,
  work_minutes_per_day INTEGER NOT NULL DEFAULT 240,
  rate_per_minute DECIMAL(10,2) GENERATED ALWAYS AS (base_salary / 30 / work_minutes_per_day) STORED,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. ATTENDANCE (Absensi)
-- ============================================
CREATE TABLE attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  check_in_location POINT, -- GPS coordinates (lat, lng)
  check_out_location POINT,
  check_in_selfie_url TEXT,
  check_out_selfie_url TEXT,
  total_minutes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'incomplete')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: satu record per user per hari
  UNIQUE(user_id, date)
);

-- ============================================
-- 3. BONUS SYSTEM
-- ============================================

-- Bonus yang pending approval
CREATE TABLE bonus_pending (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID REFERENCES profiles(id) NOT NULL, -- shift B yang telat
  to_user_id UUID REFERENCES profiles(id) NOT NULL,   -- shift A yang dapat bonus
  date DATE NOT NULL,
  late_minutes INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bonus yang sudah di-ACC
CREATE TABLE bonus_approved (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  bonus_minutes INTEGER NOT NULL,
  date DATE NOT NULL,
  source_bonus_id UUID REFERENCES bonus_pending(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. SLIP GAJI
-- ============================================
CREATE TABLE salary_slips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  total_work_minutes INTEGER NOT NULL DEFAULT 0,
  total_bonus_minutes INTEGER NOT NULL DEFAULT 0,
  base_salary DECIMAL(10,2) NOT NULL,
  rate_per_minute DECIMAL(10,2) NOT NULL,
  work_salary DECIMAL(10,2) GENERATED ALWAYS AS (total_work_minutes * rate_per_minute) STORED,
  bonus_salary DECIMAL(10,2) GENERATED ALWAYS AS (total_bonus_minutes * rate_per_minute) STORED,
  total_salary DECIMAL(10,2) GENERATED ALWAYS AS ((total_work_minutes + total_bonus_minutes) * rate_per_minute) STORED,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'sent')),
  pdf_url TEXT,
  finalized_by UUID REFERENCES profiles(id),
  finalized_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: satu slip per user per bulan
  UNIQUE(user_id, month, year)
);

-- ============================================
-- 5. COMPANY SETTINGS
-- ============================================
CREATE TABLE company_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO company_settings (key, value, description) VALUES
('office_latitude', '-6.2088', 'Latitude kantor untuk validasi GPS'),
('office_longitude', '106.8456', 'Longitude kantor untuk validasi GPS'),
('office_radius_meters', '100', 'Radius maksimal dari kantor (meter)'),
('work_start_time', '09:00', 'Jam mulai kerja'),
('work_end_time', '13:00', 'Jam selesai kerja'),
('selfie_auto_delete_hours', '24', 'Auto delete selfie setelah X jam');

-- ============================================
-- 6. AUDIT LOG
-- ============================================
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Attendance indexes
CREATE INDEX idx_attendance_user_date ON attendance(user_id, date);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_check_in_time ON attendance(check_in_time);

-- Bonus indexes
CREATE INDEX idx_bonus_pending_to_user ON bonus_pending(to_user_id);
CREATE INDEX idx_bonus_pending_status ON bonus_pending(status);
CREATE INDEX idx_bonus_approved_user_date ON bonus_approved(user_id, date);

-- Salary slip indexes
CREATE INDEX idx_salary_slips_user_month_year ON salary_slips(user_id, month, year);
CREATE INDEX idx_salary_slips_status ON salary_slips(status);

-- Audit log indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_pending ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_approved ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for attendance
CREATE POLICY "Users can view own attendance" ON attendance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own attendance" ON attendance FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own attendance" ON attendance FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all attendance" ON attendance FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update all attendance" ON attendance FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for bonus_pending
CREATE POLICY "Users can view own bonus" ON bonus_pending FOR SELECT USING (
  auth.uid() = from_user_id OR auth.uid() = to_user_id
);
CREATE POLICY "Users can insert bonus" ON bonus_pending FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Admins can view all bonus" ON bonus_pending FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update all bonus" ON bonus_pending FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for bonus_approved
CREATE POLICY "Users can view own approved bonus" ON bonus_approved FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all approved bonus" ON bonus_approved FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can insert approved bonus" ON bonus_approved FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for salary_slips
CREATE POLICY "Users can view own salary slips" ON salary_slips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all salary slips" ON salary_slips FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage salary slips" ON salary_slips FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for company_settings
CREATE POLICY "Everyone can view company settings" ON company_settings FOR SELECT USING (true);
CREATE POLICY "Only admins can update company settings" ON company_settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for audit_logs
CREATE POLICY "Only admins can view audit logs" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_salary_slips_updated_at BEFORE UPDATE ON salary_slips
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate total minutes in attendance
CREATE OR REPLACE FUNCTION calculate_attendance_minutes()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
        NEW.total_minutes = EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 60;
        NEW.status = 'completed';
    ELSIF NEW.check_in_time IS NOT NULL THEN
        NEW.status = 'incomplete';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for attendance calculation
CREATE TRIGGER calculate_attendance_minutes_trigger
BEFORE INSERT OR UPDATE ON attendance
FOR EACH ROW EXECUTE FUNCTION calculate_attendance_minutes();

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Note: Insert sample data after creating actual users through Supabase Auth
-- This is just for reference structure

/*
-- Sample profiles (insert after auth.users exists)
INSERT INTO profiles (id, full_name, employee_id, role, hire_date, base_salary) VALUES
('user-uuid-1', 'John Doe', 'EMP001', 'employee', '2024-01-15', 750000),
('user-uuid-2', 'Jane Smith', 'EMP002', 'employee', '2024-01-16', 750000),
('admin-uuid-1', 'Admin User', 'ADM001', 'admin', '2024-01-01', 1000000);

-- Sample attendance
INSERT INTO attendance (user_id, date, check_in_time, check_out_time, status) VALUES
('user-uuid-1', '2024-01-15', '2024-01-15 09:00:00+07', '2024-01-15 13:00:00+07', 'completed'),
('user-uuid-2', '2024-01-15', '2024-01-15 09:05:00+07', '2024-01-15 13:00:00+07', 'completed');
*/

-- ============================================
-- FIX RLS POLICIES UNTUK ADMIN ACCESS
-- ============================================

-- STEP 1: Hapus policies yang bermasalah
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- STEP 2: Buat ulang policies yang lebih permissive

-- Profiles policies - Fix admin access
CREATE POLICY "Enable read access for authenticated users" ON profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON profiles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for users based on id" ON profiles
    FOR UPDATE USING (auth.uid() = id OR 
                     EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- STEP 3: Fix attendance policies
DROP POLICY IF EXISTS "Users can view own attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can view all attendance" ON attendance;

CREATE POLICY "Enable read access for authenticated users" ON attendance
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON attendance
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for users" ON attendance
    FOR UPDATE USING (auth.uid() = user_id OR 
                     EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- STEP 4: Fix other tables
DROP POLICY IF EXISTS "Users can view own bonus" ON bonus_pending;
DROP POLICY IF EXISTS "Admins can view all bonus" ON bonus_pending;

CREATE POLICY "Enable read access for authenticated users" ON bonus_pending
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON bonus_pending
    FOR ALL USING (auth.role() = 'authenticated');

-- Bonus approved
DROP POLICY IF EXISTS "Users can view own approved bonus" ON bonus_approved;
DROP POLICY IF EXISTS "Admins can view all approved bonus" ON bonus_approved;

CREATE POLICY "Enable read access for authenticated users" ON bonus_approved
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON bonus_approved
    FOR ALL USING (auth.role() = 'authenticated');

-- Salary slips
DROP POLICY IF EXISTS "Users can view own salary slips" ON salary_slips;
DROP POLICY IF EXISTS "Admins can view all salary slips" ON salary_slips;

CREATE POLICY "Enable read access for authenticated users" ON salary_slips
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON salary_slips
    FOR ALL USING (auth.role() = 'authenticated');

-- Company settings - Everyone can read
CREATE POLICY "Enable read access for everyone" ON company_settings
    FOR SELECT USING (true);

-- Audit logs - Only authenticated
CREATE POLICY "Enable read access for authenticated users" ON audit_logs
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- STEP 5: BUAT ADMIN PROFILE (PENTING!)
-- ============================================

-- Cek user ID dari auth.users terlebih dahulu
-- Ganti 'your-admin-email@company.com' dengan email admin yang sudah dibuat

-- Option A: Jika tahu email admin
INSERT INTO profiles (
    id,
    full_name,
    employee_id,
    role,
    phone,
    hire_date,
    base_salary,
    work_minutes_per_day,
    is_active
) 
SELECT 
    au.id,
    'Admin System',
    'ADM001',
    'admin',
    '08123456789',
    CURRENT_DATE,
    1000000,
    240,
    true
FROM auth.users au 
WHERE au.email = 'admin@live.com'  -- GANTI DENGAN EMAIL ADMIN ANDA
ON CONFLICT (id) DO UPDATE SET 
    role = 'admin',
    is_active = true;

-- Confirm Unverified Users
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  updated_at = NOW()
WHERE email_confirmed_at IS NULL;

-- User email confirmation status
SELECT 
  id,
  email, 
  email_confirmed_at,
  created_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN 'Not Confirmed'
    ELSE 'Confirmed'
  END as status
FROM auth.users 
ORDER BY created_at DESC;

-- AUTO-CONFIRM FUNCTION + TRIGGER
-- Jalankan sekali di SQL Editor untuk setup permanent fix

-- Step 1: Buat function untuk auto-confirm
CREATE OR REPLACE FUNCTION auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto confirm email untuk user baru
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at = NOW();
    NEW.updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Buat trigger yang jalankan function setiap ada user baru
CREATE TRIGGER auto_confirm_new_users
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_confirm_user();

-- Step 3: Update existing unconfirmed users (one-time)
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  updated_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Step 4: Verify trigger exists
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table, 
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'auto_confirm_new_users';

-- Test: Check all users status
SELECT 
  email,
  email_confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN '❌ Not Confirmed'
    ELSE '✅ Confirmed'
  END as status,
  created_at
FROM auth.users 
ORDER BY created_at DESC;

-- FIX 406 NOT ACCEPTABLE ERROR
-- Problem: RLS policies terlalu ketat untuk attendance table

-- Step 1: Drop existing problematic policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON attendance;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON attendance;
DROP POLICY IF EXISTS "Enable update for users" ON attendance;

-- Step 2: Create more permissive policies
CREATE POLICY "Allow attendance read for authenticated users" ON attendance
    FOR SELECT USING (
        auth.role() = 'authenticated'
    );

CREATE POLICY "Allow attendance insert for authenticated users" ON attendance
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND auth.uid() = user_id
    );

CREATE POLICY "Allow attendance update for owners and admins" ON attendance
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Allow attendance delete for admins" ON attendance
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Step 3: Fix other tables that might cause 406
-- Profiles policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
CREATE POLICY "Allow profiles read for authenticated users" ON profiles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Salary slips policies  
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON salary_slips;
CREATE POLICY "Allow salary slips read for authenticated users" ON salary_slips
    FOR SELECT USING (auth.role() = 'authenticated');

-- Company settings policies
DROP POLICY IF EXISTS "Enable read access for everyone" ON company_settings;
CREATE POLICY "Allow company settings read for authenticated users" ON company_settings
    FOR SELECT USING (auth.role() = 'authenticated');

-- Step 4: Verify policies
SELECT 
    schemaname,
    tablename, 
    policyname, 
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('attendance', 'profiles', 'salary_slips', 'company_settings')
ORDER BY tablename, policyname;

-- Step 5: Test query yang biasa error
-- Ini query yang sering error di dashboard
SELECT 
    id,
    date,
    check_in_time,
    check_out_time,
    total_minutes,
    status
FROM attendance 
WHERE user_id = auth.uid() 
AND date = CURRENT_DATE;

-- Step 6: Alternative - Temporary disable RLS for testing
-- HANYA untuk testing, jangan untuk production!
-- ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Setelah testing, enable lagi:
-- ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload selfies
INSERT INTO storage.buckets (id, name, public)
VALUES ('selfies', 'selfies', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policy untuk upload selfies
CREATE POLICY "Allow authenticated upload selfies" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'selfies' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage policy untuk read selfies
CREATE POLICY "Allow authenticated read selfies" ON storage.objects
FOR SELECT USING (
  bucket_id = 'selfies' 
  AND auth.role() = 'authenticated'
);

-- Storage policy untuk delete selfies (admin only or own files)
CREATE POLICY "Allow delete own selfies" ON storage.objects
FOR DELETE USING (
  bucket_id = 'selfies' 
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
);

-- Verify bucket exists
SELECT * FROM storage.buckets WHERE id = 'selfies';

-- Test storage policy
SELECT 
  bucket_id,
  name,
  created_at
FROM storage.objects 
WHERE bucket_id = 'selfies' 
LIMIT 5;

-- Fix RLS Policy untuk table company_settings
-- Jalankan query ini di Supabase SQL Editor

-- 1. Cek current policies
SELECT * FROM pg_policies WHERE tablename = 'company_settings';

-- 2. Drop existing policies jika ada yang conflict
DROP POLICY IF EXISTS "Admin can manage company settings" ON company_settings;
DROP POLICY IF EXISTS "Admin can view company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can view company settings" ON company_settings;

-- 3. Create new comprehensive policies
-- Policy untuk admin bisa melakukan semua operasi
CREATE POLICY "Admin full access to company settings" 
ON company_settings FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Policy untuk employee hanya bisa read
CREATE POLICY "Employee can view company settings" 
ON company_settings FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('employee', 'admin')
  )
);

-- 4. Ensure RLS is enabled
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- 5. Insert default settings jika belum ada
INSERT INTO company_settings (key, value, description, created_at, updated_at) 
VALUES 
  ('office_latitude', '', 'Latitude kantor untuk validasi GPS', NOW(), NOW()),
  ('office_longitude', '', 'Longitude kantor untuk validasi GPS', NOW(), NOW()),
  ('office_radius_meters', '100', 'Radius maksimal dari kantor (meter)', NOW(), NOW()),
  ('work_start_time', '09:00', 'Jam mulai kerja', NOW(), NOW()),
  ('work_end_time', '13:00', 'Jam selesai kerja', NOW(), NOW()),
  ('selfie_auto_delete_hours', '24', 'Auto delete selfie setelah X jam', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- 6. Verify policies
SELECT * FROM pg_policies WHERE tablename = 'company_settings';

-- ============================================
-- SIMPLIFIED ATTENDANCE SYSTEM WITH ENHANCED VALIDATION
-- ============================================

-- 1. TAMBAHAN UNTUK ATTENDANCE TABLE
-- ============================================
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS wifi_mac_address TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS network_info JSONB;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. WHITELIST LOCATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS whitelist_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_name TEXT NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 100,
  wifi_ssid TEXT[], -- Array of allowed WiFi SSIDs
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default office location
INSERT INTO whitelist_locations (location_name, latitude, longitude, radius_meters, wifi_ssid, created_at) 
VALUES 
  ('Kantor Pusat', -6.2088, 106.8456, 200, ARRAY['OfficeWiFi_Main', 'OfficeWiFi_Guest'], NOW()),
  ('Cabang Jakarta', -6.1751, 106.8650, 150, ARRAY['CabangJKT_WiFi'], NOW())
ON CONFLICT DO NOTHING;

-- 3. APPROVED WIFI NETWORKS
-- ============================================
CREATE TABLE IF NOT EXISTS approved_wifi_networks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ssid TEXT NOT NULL UNIQUE,
  bssid TEXT, -- MAC address router (optional, lebih specific)
  location_id UUID REFERENCES whitelist_locations(id),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default WiFi networks
INSERT INTO approved_wifi_networks (ssid, location_id, description) 
VALUES 
  ('OfficeWiFi_Main', (SELECT id FROM whitelist_locations WHERE location_name = 'Kantor Pusat' LIMIT 1), 'WiFi utama kantor'),
  ('OfficeWiFi_Guest', (SELECT id FROM whitelist_locations WHERE location_name = 'Kantor Pusat' LIMIT 1), 'WiFi tamu kantor'),
  ('CabangJKT_WiFi', (SELECT id FROM whitelist_locations WHERE location_name = 'Cabang Jakarta' LIMIT 1), 'WiFi cabang Jakarta')
ON CONFLICT (ssid) DO NOTHING;

-- 4. DEVICE WHITELIST
-- ============================================
CREATE TABLE IF NOT EXISTS approved_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  device_info JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(user_id, device_fingerprint)
);

-- 5. ATTENDANCE APPROVAL QUEUE
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_approval_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attendance_id UUID REFERENCES attendance(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  submission_type TEXT NOT NULL CHECK (submission_type IN ('check_in', 'check_out')),
  validation_flags JSONB NOT NULL DEFAULT '{}', -- Store validation results
  auto_validation_score INTEGER DEFAULT 0, -- 0-100 score
  requires_manual_review BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 1, -- 1=low, 2=medium, 3=high
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. COMPANY SETTINGS TAMBAHAN
-- ============================================
INSERT INTO company_settings (key, value, description) VALUES
('require_wifi_validation', 'true', 'Wajib terkoneksi WiFi yang disetujui'),
('require_selfie_mandatory', 'true', 'Selfie wajib untuk setiap absen'),
('auto_approve_threshold', '80', 'Skor minimum untuk auto-approve (0-100)'),
('max_devices_per_user', '2', 'Maksimal device yang bisa didaftarkan per user'),
('attendance_approval_timeout_hours', '24', 'Batas waktu review absen (jam)')
ON CONFLICT (key) DO NOTHING;

-- 7. VALIDATION FUNCTIONS
-- ============================================

-- Function to check if location is whitelisted
CREATE OR REPLACE FUNCTION is_location_whitelisted(lat DECIMAL, lng DECIMAL)
RETURNS TABLE(location_id UUID, location_name TEXT, is_valid BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wl.id,
    wl.location_name,
    ST_DWithin(
      ST_GeogFromText('POINT(' || lng || ' ' || lat || ')'),
      ST_GeogFromText('POINT(' || wl.longitude || ' ' || wl.latitude || ')'),
      wl.radius_meters
    ) as is_valid
  FROM whitelist_locations wl
  WHERE wl.is_active = true
  ORDER BY ST_Distance(
    ST_GeogFromText('POINT(' || lng || ' ' || lat || ')'),
    ST_GeogFromText('POINT(' || wl.longitude || ' ' || wl.latitude || ')')
  ) ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to validate WiFi network
CREATE OR REPLACE FUNCTION is_wifi_approved(wifi_ssid TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM approved_wifi_networks 
    WHERE ssid = wifi_ssid AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;

-- Function to calculate validation score
CREATE OR REPLACE FUNCTION calculate_validation_score(
  has_valid_location BOOLEAN,
  has_approved_wifi BOOLEAN,
  has_selfie BOOLEAN,
  is_approved_device BOOLEAN,
  is_work_hours BOOLEAN
) RETURNS INTEGER AS $$
BEGIN
  RETURN (
    CASE WHEN has_valid_location THEN 25 ELSE 0 END +
    CASE WHEN has_approved_wifi THEN 25 ELSE 0 END +
    CASE WHEN has_selfie THEN 20 ELSE 0 END +
    CASE WHEN is_approved_device THEN 20 ELSE 0 END +
    CASE WHEN is_work_hours THEN 10 ELSE 0 END
  );
END;
$$ LANGUAGE plpgsql;

-- 8. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_attendance_approval_status ON attendance(approval_status);
CREATE INDEX IF NOT EXISTS idx_attendance_approval_queue_user ON attendance_approval_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_approval_queue_status ON attendance_approval_queue(requires_manual_review);
CREATE INDEX IF NOT EXISTS idx_approved_devices_user ON approved_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_approved_devices_fingerprint ON approved_devices(device_fingerprint);

-- 9. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE whitelist_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_wifi_networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_approval_queue ENABLE ROW LEVEL SECURITY;

-- Policies untuk admin access
CREATE POLICY "Admin can manage whitelist locations" ON whitelist_locations FOR ALL TO authenticated USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin can manage wifi networks" ON approved_wifi_networks FOR ALL TO authenticated USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can view their own devices" ON approved_devices FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can manage all devices" ON approved_devices FOR ALL TO authenticated USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin can view approval queue" ON attendance_approval_queue FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can view their own approval queue" ON attendance_approval_queue FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Pastikan Anda sudah mengaktifkan ekstensi postgis
-- Anda bisa cek di Database -> Extensions di dashboard Supabase

CREATE OR REPLACE FUNCTION is_location_whitelisted(lat double precision, lng double precision)
RETURNS TABLE(location_id uuid, location_name text, is_valid boolean) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wl.id,
    wl.location_name,
    ST_DWithin(
      ST_MakePoint(lng, lat)::geography,
      ST_MakePoint(wl.longitude, wl.latitude)::geography,
      wl.radius_meters
    ) as is_valid
  FROM whitelist_locations wl
  WHERE wl.is_active = true
  ORDER BY ST_Distance(
    ST_MakePoint(lng, lat)::geography,
    ST_MakePoint(wl.longitude, wl.latitude)::geography
  ) ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Hapus fungsi lama jika ada
DROP FUNCTION IF EXISTS is_location_whitelisted(lat double precision, lng double precision);

-- Buat fungsi baru yang lebih spesifik
CREATE OR REPLACE FUNCTION is_location_whitelisted(
    p_lat double precision,
    p_lng double precision
)
RETURNS TABLE(location_id uuid, location_name text, is_valid boolean) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wl.id,
    wl.location_name,
    ST_DWithin(
      ST_MakePoint(p_lng, p_lat)::geography,
      ST_MakePoint(wl.longitude, wl.latitude)::geography,
      wl.radius_meters
    ) as is_valid
  FROM 
    whitelist_locations wl
  WHERE 
    wl.is_active = true
  ORDER BY 
    ST_Distance(
      ST_MakePoint(p_lng, p_lat)::geography,
      ST_MakePoint(wl.longitude, wl.latitude)::geography
    ) ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
