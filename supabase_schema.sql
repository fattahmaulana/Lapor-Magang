-- ====================================================================
-- LAPORMAGANG — SKEMA DATABASE LENGKAP POSTGRESQL / SUPABASE (FASE PRODUCTION)
-- Kepatuhan UU PDP No. 27/2022 & Zero-Trust RLS (Row Level Security)
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABEL PROFILES (Terkoneksi langsung ke Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
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

-- RLS PROFILES: Pengguna hanya boleh membaca & mengubah profil miliknya sendiri
-- Catatan: Status is_pro & pro_expires_at hanya dapat diupdate lewat service_role/admin
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile settings"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Mencegah eskalasi hak akses mandiri
    is_pro = (SELECT is_pro FROM public.profiles WHERE id = auth.uid()) AND
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

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

-- RLS DAILY_REPORTS: Isolasi multi-tenant penuh
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own daily reports"
  ON public.daily_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily reports"
  ON public.daily_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily reports"
  ON public.daily_reports FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily reports"
  ON public.daily_reports FOR DELETE
  USING (auth.uid() = user_id);

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
  note TEXT,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS PAYMENTS: Pengguna membaca riwayat transaksinya sendiri
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

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

ALTER TABLE public.ai_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage ai keys"
  ON public.ai_keys FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 6. TABEL ADMIN_AUDIT_LOGS (Pencatatan Audit Trail Akses Manual & Kepatuhan)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  admin_email TEXT NOT NULL,
  target_user_id UUID NOT NULL REFERENCES public.profiles(id),
  target_email TEXT NOT NULL,
  action TEXT NOT NULL,
  tier TEXT,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS ADMIN_AUDIT_LOGS: Hanya admin yang dapat melihat audit log
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit logs"
  ON public.admin_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 7. TRIGGER OTOMATIS: BUAT PROFIL KETIKA USER SIGN UP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
