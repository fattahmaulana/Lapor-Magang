/**
 * Adapter Client-Side Database untuk Pengujian Lokal & Persiapan Supabase
 * Memungkinkan pengujian menyeluruh (logbook, user profile, payments)
 * dengan isolasi multi-tenant yang 100% kompatibel dengan skema Supabase.
 */

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  full_name: string;
  instance_name: string;
  timezone: 'WIB' | 'WITA' | 'WIT';
  is_pro: boolean;
  pro_expires_at?: string;
  reminder_email_enabled: boolean;
  reminder_email_time: string;
  role: 'user' | 'admin';
}

export interface UserDailyReport {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  raw_notes?: string;
  activity_desc: string;
  learning_desc: string;
  obstacle_desc: string;
  is_reported: boolean;
  reported_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserPayment {
  id: string;
  order_id: string;
  user_id: string;
  user_email: string;
  tier: 'pro_1_month' | 'pro_3_months' | 'pro_6_months';
  gross_amount: number;
  payment_method: string;
  status: 'pending' | 'settlement' | 'expired' | 'failed';
  qris_url?: string;
  va_number?: string;
  settled_at?: string;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  admin_email: string;
  target_user_id: string;
  target_email: string;
  action: string;
  tier?: string;
  reason: string;
  created_at: string;
}

const STORAGE_KEYS = {
  CURRENT_USER: 'lm_current_user',
  PROFILES: 'lm_db_profiles',
  REPORTS: 'lm_db_daily_reports',
  PAYMENTS: 'lm_db_payments',
  AUDIT_LOGS: 'lm_db_admin_audit_logs',
};

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export const localDb = {
  // --- AUTENTIKASI & PROFIL ---
  getCurrentUser(): UserProfile | null {
    return readStorage<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);
  },

  setCurrentUser(user: UserProfile | null): void {
    writeStorage(STORAGE_KEYS.CURRENT_USER, user);
    if (typeof document !== 'undefined') {
      if (user) {
        document.cookie = `lm_session=${user.id}; path=/; max-age=2592000; SameSite=Lax;`;
      } else {
        document.cookie = 'lm_session=; path=/; max-age=0; SameSite=Lax;';
      }
    }
  },

  updateProfile(updates: Partial<UserProfile>): UserProfile | null {
    const current = this.getCurrentUser();
    if (!current) return null;
    const updated = { ...current, ...updates };
    this.setCurrentUser(updated);

    // Update in profiles table
    const profiles = readStorage<UserProfile[]>(STORAGE_KEYS.PROFILES, []);
    const idx = profiles.findIndex((p) => p.id === current.id);
    if (idx >= 0) {
      profiles[idx] = updated;
    } else {
      profiles.push(updated);
    }
    writeStorage(STORAGE_KEYS.PROFILES, profiles);
    return updated;
  },

  // --- LOGBOOK / DAILY REPORTS (Row Level Security Simulation) ---
  getUserReports(userId?: string): UserDailyReport[] {
    const activeUid = userId || this.getCurrentUser()?.id;
    if (!activeUid) return [];
    const all = readStorage<UserDailyReport[]>(STORAGE_KEYS.REPORTS, []);
    // RLS: hanya ambil baris yang sesuai dengan activeUid
    return all.filter((r) => r.user_id === activeUid).sort((a, b) => b.date.localeCompare(a.date));
  },

  saveUserReport(data: {
    date: string;
    raw_notes?: string;
    activity_desc: string;
    learning_desc: string;
    obstacle_desc: string;
    is_reported?: boolean;
  }): UserDailyReport | null {
    const user = this.getCurrentUser();
    if (!user) return null;

    const all = readStorage<UserDailyReport[]>(STORAGE_KEYS.REPORTS, []);
    const existingIndex = all.findIndex((r) => r.user_id === user.id && r.date === data.date);

    const now = new Date().toISOString();
    let report: UserDailyReport;

    if (existingIndex >= 0) {
      report = {
        ...all[existingIndex],
        ...data,
        is_reported: data.is_reported ?? all[existingIndex].is_reported,
        reported_at: data.is_reported ? now : all[existingIndex].reported_at,
        updated_at: now,
      };
      all[existingIndex] = report;
    } else {
      report = {
        id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: user.id,
        date: data.date,
        raw_notes: data.raw_notes,
        activity_desc: data.activity_desc,
        learning_desc: data.learning_desc,
        obstacle_desc: data.obstacle_desc,
        is_reported: data.is_reported ?? false,
        reported_at: data.is_reported ? now : undefined,
        created_at: now,
        updated_at: now,
      };
      all.push(report);
    }

    writeStorage(STORAGE_KEYS.REPORTS, all);
    return report;
  },

  deleteUserReport(id: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    const all = readStorage<UserDailyReport[]>(STORAGE_KEYS.REPORTS, []);
    const filtered = all.filter((r) => !(r.id === id && r.user_id === user.id));
    writeStorage(STORAGE_KEYS.REPORTS, filtered);
    return true;
  },

  // --- TRANSAKSI PEMBAYARAN (Dengan User ID & Order ID) ---
  createPayment(data: {
    tier: 'pro_1_month' | 'pro_3_months' | 'pro_6_months';
    gross_amount: number;
    payment_method?: string;
  }): UserPayment | null {
    const user = this.getCurrentUser();
    if (!user) return null;

    const now = new Date();
    const shortUid = user.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase();
    const orderId = `LM-${shortUid}-${Date.now().toString().slice(-6)}`;

    const newPayment: UserPayment = {
      id: `pay_${Date.now()}`,
      order_id: orderId,
      user_id: user.id,
      user_email: user.email,
      tier: data.tier,
      gross_amount: data.gross_amount,
      payment_method: data.payment_method || 'qris',
      status: 'pending',
      created_at: now.toISOString(),
    };

    const allPayments = readStorage<UserPayment[]>(STORAGE_KEYS.PAYMENTS, []);
    allPayments.push(newPayment);
    writeStorage(STORAGE_KEYS.PAYMENTS, allPayments);

    return newPayment;
  },

  getUserPayments(): UserPayment[] {
    const user = this.getCurrentUser();
    if (!user) return [];
    const all = readStorage<UserPayment[]>(STORAGE_KEYS.PAYMENTS, []);
    return all.filter((p) => p.user_id === user.id);
  },

  getAllPaymentsForAdmin(): UserPayment[] {
    return readStorage<UserPayment[]>(STORAGE_KEYS.PAYMENTS, []);
  },

  settlePayment(orderId: string): boolean {
    const allPayments = readStorage<UserPayment[]>(STORAGE_KEYS.PAYMENTS, []);
    const payment = allPayments.find((p) => p.order_id === orderId);
    if (!payment) return false;

    payment.status = 'settlement';
    payment.settled_at = new Date().toISOString();
    writeStorage(STORAGE_KEYS.PAYMENTS, allPayments);

    // Aktifkan status Pro pengguna
    const current = this.getCurrentUser();
    if (current && current.id === payment.user_id) {
      this.updateProfile({ is_pro: true });
    }
    return true;
  },

  // --- AUDIT TRAIL ADMIN (Kepatuhan UU PDP No. 27/2022) ---
  getAuditLogs(): AdminAuditLog[] {
    return readStorage<AdminAuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, [
      {
        id: 'aud-1',
        admin_id: 'usr_admin_001',
        admin_email: 'admin@lapormagang.id',
        target_user_id: 'usr_budi_1029',
        target_email: 'budi.peserta@example.com',
        action: 'GRANT_PRO_MANUAL',
        tier: 'pro_1_month',
        reason: 'Bantuan verifikasi QRIS manual via tiket #1029',
        created_at: '2026-10-07 14:32 WIB',
      },
      {
        id: 'aud-2',
        admin_id: 'usr_admin_001',
        admin_email: 'admin@lapormagang.id',
        target_user_id: 'usr_siti_1030',
        target_email: 'siti.magang@example.com',
        action: 'GRANT_PRO_MANUAL',
        tier: 'pro_3_months',
        reason: 'Koreksi status settlement webhook terlambat',
        created_at: '2026-10-06 09:12 WIB',
      },
    ]);
  },

  grantProManual(targetEmail: string, tier: string, reason: string): AdminAuditLog {
    const admin = this.getCurrentUser();
    const logs = this.getAuditLogs();
    const now = new Date();

    const newLog: AdminAuditLog = {
      id: `aud-${Date.now()}`,
      admin_id: admin?.id || 'usr_admin_root',
      admin_email: admin?.email || 'admin@lapormagang.id',
      target_user_id: `usr_${targetEmail.replace(/[^a-zA-Z0-9]/g, '').slice(-4)}`,
      target_email: targetEmail,
      action: 'GRANT_PRO_MANUAL',
      tier,
      reason,
      created_at: now.toLocaleString('id-ID'),
    };

    logs.unshift(newLog);
    writeStorage(STORAGE_KEYS.AUDIT_LOGS, logs);

    // Jika target email cocok dengan current user atau ada di profiles, aktifkan Pro
    if (admin && admin.email.toLowerCase() === targetEmail.toLowerCase()) {
      this.updateProfile({ is_pro: true });
    }
    const profiles = readStorage<UserProfile[]>(STORAGE_KEYS.PROFILES, []);
    const pIdx = profiles.findIndex((p) => p.email.toLowerCase() === targetEmail.toLowerCase());
    if (pIdx >= 0) {
      profiles[pIdx].is_pro = true;
      writeStorage(STORAGE_KEYS.PROFILES, profiles);
    }

    return newLog;
  },
};
