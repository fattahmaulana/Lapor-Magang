import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface UserRecord {
  id: string;
  email: string;
  username?: string;
  password_hash: string;
  salt: string;
  full_name: string;
  instance_name: string;
  timezone: 'WIB' | 'WITA' | 'WIT';
  role: 'user' | 'admin';
  is_pro: boolean;
  pro_expires_at?: string;
  reminder_email_enabled: boolean;
  reminder_email_time: string;
  telegram_chat_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportRecord {
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

export interface PaymentRecord {
  id: string;
  order_id: string;
  user_id: string;
  user_email: string;
  user_name?: string;
  tier: 'pro_1_month' | 'pro_3_months' | 'pro_6_months';
  gross_amount: number;
  payment_method: string;
  status: 'pending' | 'pending_approval' | 'settlement' | 'expired' | 'failed';
  snap_token?: string;
  snap_redirect_url?: string;
  note?: string;
  settled_at?: string;
  created_at: string;
}

export interface AuditRecord {
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

export interface AiKeyRecord {
  id: string;
  name: string;
  provider: 'gemini' | 'openai' | 'claude';
  api_key: string;
  is_active: boolean;
  usage_count: number;
  last_used_at?: string;
  created_at: string;
}

interface DatabaseSchema {
  users: UserRecord[];
  reports: ReportRecord[];
  payments: PaymentRecord[];
  audit_logs: AuditRecord[];
  ai_keys?: AiKeyRecord[];
}

const DB_FILE = path.join(process.cwd(), 'data', 'app_database.json');

function seedAdminIfEmpty(db: DatabaseSchema): void {
  const hasAdmin = (db.users || []).some((u) => u.role === 'admin' || u.email === 'admin@lapormagang.id');
  if (!hasAdmin) {
    const salt = crypto.randomBytes(16).toString('hex');
    const password_hash = crypto.scryptSync('AdminMagang2026!', salt, 64).toString('hex');
    const now = new Date().toISOString();
    const adminUser: UserRecord = {
      id: 'usr_admin_root',
      email: 'admin@lapormagang.id',
      username: 'admin',
      password_hash,
      salt,
      full_name: 'Super Administrator',
      instance_name: 'Pusat Kontrol LaporMagang',
      timezone: 'WIB',
      role: 'admin',
      is_pro: true,
      reminder_email_enabled: false,
      reminder_email_time: '15:00',
      created_at: now,
      updated_at: now,
    };
    db.users.unshift(adminUser);
    writeDb(db);
  }
}

function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial: DatabaseSchema = { users: [], reports: [], payments: [], audit_logs: [], ai_keys: [] };
      seedAdminIfEmpty(initial);
      return initial;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    parsed.ai_keys = parsed.ai_keys || [];
    seedAdminIfEmpty(parsed);
    return parsed;
  } catch {
    return { users: [], reports: [], payments: [], audit_logs: [], ai_keys: [] };
  }
}

function writeDb(data: DatabaseSchema): void {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write database file:', err);
  }
}

export const serverDb = {
  // Password hashing menggunakan scrypt (KDF Memory-Hard aman)
  hashPassword(password: string): { hash: string; salt: string } {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return { hash, salt };
  },

  verifyPassword(password: string, hash: string, salt: string): boolean {
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    const a = Buffer.from(derived, 'hex');
    const b = Buffer.from(hash, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  },

  // USERS
  createUser(params: {
    email: string;
    password: string;
    full_name: string;
    instance_name: string;
  }): UserRecord {
    const db = readDb();
    const existing = db.users.find((u) => u.email.toLowerCase() === params.email.toLowerCase());
    if (existing) {
      throw new Error('Alamat email sudah terdaftar.');
    }

    const { hash, salt } = this.hashPassword(params.password);
    const now = new Date().toISOString();
    const id = `usr_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;

    const username = params.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') || `user_${id.slice(-4)}`;

    const user: UserRecord = {
      id,
      email: params.email.trim().toLowerCase(),
      username,
      password_hash: hash,
      salt,
      full_name: params.full_name.trim(),
      instance_name: params.instance_name.trim(),
      timezone: 'WIB',
      role: params.email.includes('admin') ? 'admin' : 'user',
      is_pro: false,
      reminder_email_enabled: false,
      reminder_email_time: '17:30',
      created_at: now,
      updated_at: now,
    };

    db.users.push(user);
    writeDb(db);
    return user;
  },

  findUserByEmail(email: string): UserRecord | null {
    const db = readDb();
    return db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase()) || null;
  },

  findUserById(id: string): UserRecord | null {
    const db = readDb();
    return db.users.find((u) => u.id === id) || null;
  },

  updateUser(id: string, updates: Partial<UserRecord>): UserRecord | null {
    const db = readDb();
    const idx = db.users.findIndex((u) => u.id === id);
    if (idx < 0) return null;

    db.users[idx] = {
      ...db.users[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    writeDb(db);
    return db.users[idx];
  },

  updatePassword(userId: string, oldPass: string, newPass: string): boolean {
    const user = this.findUserById(userId);
    if (!user) throw new Error('Pengguna tidak ditemukan.');

    const isValid = this.verifyPassword(oldPass, user.password_hash, user.salt);
    if (!isValid) throw new Error('Kata sandi lama tidak sesuai.');

    if (newPass.length < 10) throw new Error('Kata sandi baru minimal 10 karakter.');

    const { hash, salt } = this.hashPassword(newPass);
    this.updateUser(userId, { password_hash: hash, salt });
    return true;
  },

  deleteUser(userId: string): boolean {
    const db = readDb();
    db.users = db.users.filter((u) => u.id !== userId);
    // Hapus juga laporan pengguna (cascading delete)
    db.reports = db.reports.filter((r) => r.user_id !== userId);
    db.payments = db.payments.filter((p) => p.user_id !== userId);
    writeDb(db);
    return true;
  },

  // REPORTS (Isolasi Row Level Security: hanya milik user_id)
  getReports(userId: string): ReportRecord[] {
    const db = readDb();
    return db.reports
      .filter((r) => r.user_id === userId)
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  saveReport(
    userId: string,
    data: {
      date: string;
      raw_notes?: string;
      activity_desc: string;
      learning_desc: string;
      obstacle_desc: string;
      is_reported?: boolean;
    }
  ): ReportRecord {
    const db = readDb();
    const now = new Date().toISOString();
    const existingIdx = db.reports.findIndex(
      (r) => r.user_id === userId && r.date === data.date
    );

    let report: ReportRecord;
    if (existingIdx >= 0) {
      report = {
        ...db.reports[existingIdx],
        ...data,
        is_reported: data.is_reported ?? db.reports[existingIdx].is_reported,
        reported_at: data.is_reported ? now : db.reports[existingIdx].reported_at,
        updated_at: now,
      };
      db.reports[existingIdx] = report;
    } else {
      report = {
        id: `rep_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        user_id: userId,
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
      db.reports.push(report);
    }

    writeDb(db);
    return report;
  },

  deleteReport(userId: string, reportId: string): boolean {
    const db = readDb();
    const beforeCount = db.reports.length;
    db.reports = db.reports.filter((r) => !(r.id === reportId && r.user_id === userId));
    const deleted = db.reports.length < beforeCount;
    if (deleted) writeDb(db);
    return deleted;
  },

  // PAYMENTS
  createPayment(data: {
    order_id: string;
    user_id: string;
    user_email: string;
    tier: 'pro_1_month' | 'pro_3_months' | 'pro_6_months';
    gross_amount: number;
    payment_method?: string;
    snap_token?: string;
    snap_redirect_url?: string;
  }): PaymentRecord {
    const db = readDb();
    const payment: PaymentRecord = {
      id: `pay_${Date.now()}`,
      order_id: data.order_id,
      user_id: data.user_id,
      user_email: data.user_email,
      tier: data.tier,
      gross_amount: data.gross_amount,
      payment_method: data.payment_method || 'midtrans',
      status: 'pending',
      snap_token: data.snap_token,
      snap_redirect_url: data.snap_redirect_url,
      created_at: new Date().toISOString(),
    };
    db.payments.push(payment);
    writeDb(db);
    return payment;
  },

  submitPaymentForApproval(data: {
    order_id: string;
    user_id: string;
    user_email: string;
    user_name?: string;
    tier: 'pro_1_month' | 'pro_3_months' | 'pro_6_months';
    gross_amount: number;
    payment_method?: string;
    note?: string;
  }): PaymentRecord {
    const db = readDb();
    const existingIdx = db.payments.findIndex((p) => p.order_id === data.order_id);
    const now = new Date().toISOString();

    const payment: PaymentRecord = {
      id: `pay_${Date.now()}`,
      order_id: data.order_id,
      user_id: data.user_id,
      user_email: data.user_email,
      user_name: data.user_name,
      tier: data.tier,
      gross_amount: data.gross_amount,
      payment_method: data.payment_method || 'qris_manual',
      status: 'pending_approval',
      note: data.note,
      created_at: now,
    };

    if (existingIdx >= 0) {
      db.payments[existingIdx] = {
        ...db.payments[existingIdx],
        ...payment,
      };
    } else {
      db.payments.unshift(payment);
    }

    writeDb(db);
    return payment;
  },

  getAllPayments(): PaymentRecord[] {
    const db = readDb();
    return (db.payments || []).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  approvePayment(orderId: string, adminId: string, adminEmail: string): boolean {
    const db = readDb();
    const payment = db.payments.find((p) => p.order_id === orderId);
    if (!payment) return false;

    payment.status = 'settlement';
    payment.settled_at = new Date().toISOString();

    // Aktifkan Pro pada user bersangkutan
    const user = db.users.find((u) => u.id === payment.user_id);
    if (user) {
      user.is_pro = true;
      user.updated_at = new Date().toISOString();
    }

    writeDb(db);

    this.addAuditLog({
      admin_id: adminId,
      admin_email: adminEmail,
      target_user_id: payment.user_id,
      target_email: payment.user_email,
      action: 'APPROVE_QRIS_PAYMENT',
      tier: payment.tier,
      reason: `Verifikasi & aktivasi Pro untuk Order ${orderId} (Rp ${payment.gross_amount.toLocaleString('id-ID')})`,
    });

    return true;
  },

  rejectPayment(orderId: string, adminId: string, adminEmail: string, reason: string): boolean {
    const db = readDb();
    const payment = db.payments.find((p) => p.order_id === orderId);
    if (!payment) return false;

    payment.status = 'failed';
    payment.note = reason;
    writeDb(db);

    this.addAuditLog({
      admin_id: adminId,
      admin_email: adminEmail,
      target_user_id: payment.user_id,
      target_email: payment.user_email,
      action: 'REJECT_QRIS_PAYMENT',
      tier: payment.tier,
      reason: reason || `Pembayaran Order ${orderId} ditolak oleh admin.`,
    });

    return true;
  },

  getPayment(orderId: string): PaymentRecord | null {
    const db = readDb();
    return db.payments.find((p) => p.order_id === orderId) || null;
  },

  settlePayment(orderId: string): boolean {
    const db = readDb();
    const payment = db.payments.find((p) => p.order_id === orderId);
    if (!payment) return false;

    payment.status = 'settlement';
    payment.settled_at = new Date().toISOString();

    // Aktifkan Pro pada user bersangkutan
    const user = db.users.find((u) => u.id === payment.user_id);
    if (user) {
      user.is_pro = true;
      user.updated_at = new Date().toISOString();
    }

    writeDb(db);
    return true;
  },

  // AUDIT LOGS
  getAuditLogs(): AuditRecord[] {
    const db = readDb();
    return db.audit_logs.sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  addAuditLog(data: Omit<AuditRecord, 'id' | 'created_at'>): AuditRecord {
    const db = readDb();
    const log: AuditRecord = {
      id: `aud_${Date.now()}`,
      ...data,
      created_at: new Date().toISOString(),
    };
    db.audit_logs.push(log);
    writeDb(db);
    return log;
  },

  // ADMIN MONITORING & METRICS
  getAllUsers(): Omit<UserRecord, 'password_hash' | 'salt'>[] {
    const db = readDb();
    return db.users.map(({ password_hash, salt, ...u }) => u);
  },

  setUserPro(userId: string, is_pro: boolean): boolean {
    const db = readDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) return false;
    user.is_pro = is_pro;
    user.updated_at = new Date().toISOString();
    writeDb(db);
    return true;
  },

  getStats() {
    const db = readDb();
    const totalUsers = db.users.length;
    const proUsers = db.users.filter((u) => u.is_pro).length;
    const totalReports = db.reports.length;
    const totalPayments = db.payments.filter((p) => p.status === 'settlement').length;
    const pendingApprovals = db.payments.filter((p) => p.status === 'pending_approval').length;
    const totalAiKeys = (db.ai_keys || []).length;
    const activeAiKeys = (db.ai_keys || []).filter((k) => k.is_active).length;
    const totalAiCalls = (db.ai_keys || []).reduce((acc, k) => acc + (k.usage_count || 0), 0);

    return {
      totalUsers,
      proUsers,
      totalReports,
      totalPayments,
      pendingApprovals,
      totalAiKeys,
      activeAiKeys,
      totalAiCalls,
    };
  },

  // POOL KUNCI API AI (MULTI-KEY ROTATION & FAILOVER)
  getAiKeys(masked = true): AiKeyRecord[] {
    const db = readDb();
    const keys = db.ai_keys || [];
    if (!masked) return keys;
    return keys.map((k) => ({
      ...k,
      api_key:
        k.api_key.length > 8
          ? `${k.api_key.slice(0, 4)}...${k.api_key.slice(-4)}`
          : '••••••••',
    }));
  },

  addAiKey(params: { name: string; provider?: 'gemini' | 'openai' | 'claude'; api_key: string }): AiKeyRecord {
    const db = readDb();
    db.ai_keys = db.ai_keys || [];
    const id = `key_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    const newKey: AiKeyRecord = {
      id,
      name: params.name.trim() || `API Key ${db.ai_keys.length + 1}`,
      provider: params.provider || 'gemini',
      api_key: params.api_key.trim(),
      is_active: true,
      usage_count: 0,
      created_at: new Date().toISOString(),
    };
    db.ai_keys.push(newKey);
    writeDb(db);
    return newKey;
  },

  toggleAiKey(id: string): boolean {
    const db = readDb();
    db.ai_keys = db.ai_keys || [];
    const key = db.ai_keys.find((k) => k.id === id);
    if (!key) return false;
    key.is_active = !key.is_active;
    writeDb(db);
    return true;
  },

  deleteAiKey(id: string): boolean {
    const db = readDb();
    db.ai_keys = db.ai_keys || [];
    const initialLen = db.ai_keys.length;
    db.ai_keys = db.ai_keys.filter((k) => k.id !== id);
    if (db.ai_keys.length < initialLen) {
      writeDb(db);
      return true;
    }
    return false;
  },

  getActiveAiKey(): { id: string; api_key: string; provider: string } | null {
    const db = readDb();
    const active = (db.ai_keys || []).filter((k) => k.is_active && k.api_key);
    if (active.length === 0) return null;

    // Load balancing: ambil kunci dengan usage_count paling rendah
    active.sort((a, b) => a.usage_count - b.usage_count);
    const selected = active[0];

    selected.usage_count = (selected.usage_count || 0) + 1;
    selected.last_used_at = new Date().toISOString();
    writeDb(db);

    return { id: selected.id, api_key: selected.api_key, provider: selected.provider };
  },
};
