-- ====================================================================
-- LAPORMAGANG — SKEMA DATABASE LENGKAP POSTGRESQL / SUPABASE (FASE PRODUCTION)
-- Kepatuhan UU PDP No. 27/2022 & Kompatibel Penuh Vercel + Supabase
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABEL PROFILES (Penyimpanan Profil & Akun Pengguna)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  password_hash TEXT,
  salt TEXT,
  full_name TEXT DEFAULT '',
  instance_name TEXT DEFAULT '',
  timezone TEXT DEFAULT 'WIB' CHECK (timezone IN ('WIB', 'WITA', 'WIT')),
  is_pro BOOLEAN DEFAULT FALSE,
  pro_expires_at TIMESTAMPTZ,
  reminder_email_enabled BOOLEAN DEFAULT FALSE,
  reminder_email_time TEXT DEFAULT '15:00',
  telegram_chat_id TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MIGRATION SAFEGUARDS (Bila tabel sudah ada dari eksekusi skema lama):
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS salt TEXT;

-- 3. TABEL DAILY_REPORTS (Logbook Harian 3 Kolom Maganghub)
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  raw_notes TEXT,
  activity_desc TEXT NOT NULL,
  learning_desc TEXT NOT NULL,
  obstacle_desc TEXT NOT NULL,
  is_reported BOOLEAN DEFAULT FALSE,
  reported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_daily_report UNIQUE(user_id, date)
);

-- 4. TABEL PAYMENTS (Transaksi Pembayaran QRIS / VA Berbasis ID User)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('pro_1_month', 'pro_3_months', 'pro_6_months')),
  gross_amount INTEGER NOT NULL,
  payment_method TEXT DEFAULT 'qris',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'pending_approval', 'settlement', 'expired', 'failed')),
  qris_url TEXT,
  va_number TEXT,
  snap_token TEXT,
  snap_redirect_url TEXT,
  note TEXT,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.payments ADD COLUMN IF NOT EXISTS snap_token TEXT;
ALTER TABLE IF EXISTS public.payments ADD COLUMN IF NOT EXISTS snap_redirect_url TEXT;

-- 5. TABEL AI_KEYS (Pool Kunci API AI Dinamis Multi-Key)
CREATE TABLE IF NOT EXISTS public.ai_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  provider TEXT DEFAULT 'gemini' CHECK (provider IN ('gemini', 'openai', 'claude')),
  api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL ADMIN_AUDIT_LOGS (Pencatatan Audit Trail Akses Manual & Kepatuhan)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  target_user_id TEXT NOT NULL,
  target_email TEXT NOT NULL,
  action TEXT NOT NULL,
  tier TEXT,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.admin_audit_logs DROP CONSTRAINT IF EXISTS admin_audit_logs_target_user_id_fkey;
ALTER TABLE IF EXISTS public.admin_audit_logs DROP CONSTRAINT IF EXISTS admin_audit_logs_admin_id_fkey;

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all for server on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all for server on daily_reports" ON public.daily_reports;
DROP POLICY IF EXISTS "Allow all for server on payments" ON public.payments;
DROP POLICY IF EXISTS "Allow all for server on ai_keys" ON public.ai_keys;
DROP POLICY IF EXISTS "Allow all for server on admin_audit_logs" ON public.admin_audit_logs;

-- Policies allowing access via anon / service_role from Vercel Server Backend
CREATE POLICY "Allow all for server on profiles"
  ON public.profiles FOR ALL
  TO anon, service_role, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all for server on daily_reports"
  ON public.daily_reports FOR ALL
  TO anon, service_role, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all for server on payments"
  ON public.payments FOR ALL
  TO anon, service_role, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all for server on ai_keys"
  ON public.ai_keys FOR ALL
  TO anon, service_role, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all for server on admin_audit_logs"
  ON public.admin_audit_logs FOR ALL
  TO anon, service_role, authenticated
  USING (true)
  WITH CHECK (true);

-- 8. DEFAULT SEED ADMIN (Kredensial Super Admin Awal)
-- Email: admin@lapormagang.id
-- Password: AdminMagang2026!
INSERT INTO public.profiles (
  id, email, username, full_name, instance_name, role, is_pro, timezone, password_hash, salt
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@lapormagang.id',
  'admin',
  'Super Administrator',
  'Pusat Kontrol LaporMagang',
  'admin',
  true,
  'WIB',
  '17b413f581982259f7fc556ca6005954208509762dd4103c8122c5cff6dac87182e2d8b7d82fdad9ccb43f2167856e325020efc31aa8f623926accb23c19c630',
  'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6'
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  salt = EXCLUDED.salt,
  role = 'admin';
