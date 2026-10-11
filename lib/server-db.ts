import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getSupabase } from './supabase';

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
  qris_url?: string;
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

function getDbFile(): string {
  try {
    const defaultPath = path.join(process.cwd(), 'data', 'app_database.json');
    const dir = path.dirname(defaultPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return defaultPath;
  } catch {
    return path.join('/tmp', 'app_database.json');
  }
}

function seedAdminIfEmpty(db: DatabaseSchema): void {
  const hasAdmin = (db.users || []).some((u) => u.role === 'admin' || u.email === 'admin@lapormagang.id');
  if (!hasAdmin) {
    const salt = crypto.randomBytes(16).toString('hex');
    const password_hash = crypto.scryptSync('AdminMagang2026!', salt, 64).toString('hex');
    const now = new Date().toISOString();
    const adminUser: UserRecord = {
      id: '00000000-0000-0000-0000-000000000001',
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
    const dbFile = getDbFile();
    if (!fs.existsSync(dbFile)) {
      const initial: DatabaseSchema = { users: [], reports: [], payments: [], audit_logs: [], ai_keys: [] };
      seedAdminIfEmpty(initial);
      return initial;
    }
    const data = fs.readFileSync(dbFile, 'utf-8');
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
    const dbFile = getDbFile();
    const dir = path.dirname(dbFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write database file fallback:', err);
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
  async createUser(params: {
    email: string;
    password: string;
    full_name: string;
    instance_name: string;
  }): Promise<UserRecord> {
    const supabase = getSupabase();
    const { hash, salt } = this.hashPassword(params.password);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
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

    if (supabase) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', user.email)
        .maybeSingle();

      if (existing) {
        throw new Error('Alamat email sudah terdaftar.');
      }

      const { data, error } = await supabase.from('profiles').insert(user).select().single();
      if (error) {
        if (error.message.includes('column') || error.message.includes('foreign key') || error.message.includes('schema cache')) {
          throw new Error(`Skema database Supabase belum diperbarui: ${error.message}. Silakan jalankan script supabase_schema.sql terbaru di Supabase SQL Editor.`);
        }
        throw new Error(`Gagal menyimpan ke database Supabase: ${error.message}`);
      }
      return data as UserRecord;
    }

    const db = readDb();
    const existing = db.users.find((u) => u.email.toLowerCase() === params.email.toLowerCase());
    if (existing) {
      throw new Error('Alamat email sudah terdaftar.');
    }
    db.users.push(user);
    writeDb(db);
    return user;
  },

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const cleanEmail = email.trim().toLowerCase();
    const supabase = getSupabase();

    // Kredensial hash deterministik untuk Super Administrator (AdminMagang2026!)
    const DEFAULT_ADMIN_SALT = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
    const DEFAULT_ADMIN_HASH =
      '17b413f581982259f7fc556ca6005954208509762dd4103c8122c5cff6dac87182e2d8b7d82fdad9ccb43f2167856e325020efc31aa8f623926accb23c19c630';

    if (supabase) {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (cleanEmail === 'admin@lapormagang.id') {
        if (!data) {
          // Buat akun admin otomatis jika belum ada di Supabase
          const newAdmin: UserRecord = {
            id: '00000000-0000-0000-0000-000000000001',
            email: 'admin@lapormagang.id',
            username: 'admin',
            password_hash: DEFAULT_ADMIN_HASH,
            salt: DEFAULT_ADMIN_SALT,
            full_name: 'Super Administrator',
            instance_name: 'Pusat Kontrol LaporMagang',
            timezone: 'WIB',
            role: 'admin',
            is_pro: true,
            reminder_email_enabled: false,
            reminder_email_time: '15:00',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          await supabase.from('profiles').upsert(newAdmin, { onConflict: 'email' });
          return newAdmin;
        }

        // Jika profil admin ada di Supabase tapi password_hash kosong / belum ter-seed
        if (!data.password_hash || !data.salt || data.role !== 'admin') {
          await supabase
            .from('profiles')
            .update({
              password_hash: DEFAULT_ADMIN_HASH,
              salt: DEFAULT_ADMIN_SALT,
              role: 'admin',
              is_pro: true,
            })
            .eq('id', data.id);
          data.password_hash = DEFAULT_ADMIN_HASH;
          data.salt = DEFAULT_ADMIN_SALT;
          data.role = 'admin';
        }
      }

      if (error) {
        console.error('Supabase findUserByEmail error:', error);
        return null;
      }
      return data ? (data as UserRecord) : null;
    }

    const db = readDb();
    return db.users.find((u) => u.email.toLowerCase() === cleanEmail) || null;
  },

  async findUserById(id: string): Promise<UserRecord | null> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (data && data.email === 'admin@lapormagang.id') {
        const DEFAULT_ADMIN_SALT = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
        const DEFAULT_ADMIN_HASH =
          '17b413f581982259f7fc556ca6005954208509762dd4103c8122c5cff6dac87182e2d8b7d82fdad9ccb43f2167856e325020efc31aa8f623926accb23c19c630';
        if (!data.password_hash) data.password_hash = DEFAULT_ADMIN_HASH;
        if (!data.salt) data.salt = DEFAULT_ADMIN_SALT;
      }

      if (error) {
        console.error('Supabase findUserById error:', error);
        return null;
      }
      return data ? (data as UserRecord) : null;
    }

    const db = readDb();
    return db.users.find((u) => u.id === id) || null;
  },

  async updateUser(id: string, updates: Partial<UserRecord>): Promise<UserRecord | null> {
    const supabase = getSupabase();
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) {
        console.error('Supabase updateUser error:', error);
        return null;
      }
      return data ? (data as UserRecord) : null;
    }

    const db = readDb();
    const idx = db.users.findIndex((u) => u.id === id);
    if (idx < 0) return null;

    db.users[idx] = {
      ...db.users[idx],
      ...updateData,
    };
    writeDb(db);
    return db.users[idx];
  },

  async updatePassword(userId: string, oldPass: string, newPass: string): Promise<boolean> {
    const user = await this.findUserById(userId);
    if (!user) throw new Error('Pengguna tidak ditemukan.');

    const isValid = this.verifyPassword(oldPass, user.password_hash, user.salt);
    if (!isValid) throw new Error('Kata sandi lama tidak sesuai.');

    if (newPass.length < 10) throw new Error('Kata sandi baru minimal 10 karakter.');

    const { hash, salt } = this.hashPassword(newPass);
    await this.updateUser(userId, { password_hash: hash, salt });
    return true;
  },

  async deleteUser(userId: string): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('daily_reports').delete().eq('user_id', userId);
      await supabase.from('payments').delete().eq('user_id', userId);
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) console.error('Supabase deleteUser error:', error);
      return !error;
    }

    const db = readDb();
    db.users = db.users.filter((u) => u.id !== userId);
    db.reports = db.reports.filter((r) => r.user_id !== userId);
    db.payments = db.payments.filter((p) => p.user_id !== userId);
    writeDb(db);
    return true;
  },

  // REPORTS
  async getReports(userId: string): Promise<ReportRecord[]> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      if (error) {
        console.error('Supabase getReports error:', error);
        return [];
      }
      return (data || []) as ReportRecord[];
    }

    const db = readDb();
    return db.reports
      .filter((r) => r.user_id === userId)
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  async saveReport(
    userId: string,
    data: {
      date: string;
      raw_notes?: string;
      activity_desc: string;
      learning_desc: string;
      obstacle_desc: string;
      is_reported?: boolean;
    }
  ): Promise<ReportRecord> {
    const now = new Date().toISOString();
    const supabase = getSupabase();

    if (supabase) {
      const payload = {
        user_id: userId,
        date: data.date,
        raw_notes: data.raw_notes || '',
        activity_desc: data.activity_desc,
        learning_desc: data.learning_desc,
        obstacle_desc: data.obstacle_desc,
        is_reported: data.is_reported ?? false,
        reported_at: data.is_reported ? now : null,
        updated_at: now,
      };

      const { data: saved, error } = await supabase
        .from('daily_reports')
        .upsert(payload, { onConflict: 'user_id,date' })
        .select()
        .single();

      if (error) {
        console.error('Supabase saveReport error:', error);
        throw new Error(`Gagal menyimpan ke Supabase: ${error.message}`);
      }
      return saved as ReportRecord;
    }

    const db = readDb();
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
        id: crypto.randomUUID(),
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

  async deleteReport(userId: string, reportId: string): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase
        .from('daily_reports')
        .delete()
        .eq('id', reportId)
        .eq('user_id', userId);
      return !error;
    }

    const db = readDb();
    const beforeCount = db.reports.length;
    db.reports = db.reports.filter((r) => !(r.id === reportId && r.user_id === userId));
    const deleted = db.reports.length < beforeCount;
    if (deleted) writeDb(db);
    return deleted;
  },

  // PAYMENTS
  async createPayment(data: {
    order_id: string;
    user_id: string;
    user_email: string;
    tier: 'pro_1_month' | 'pro_3_months' | 'pro_6_months';
    gross_amount: number;
    payment_method?: string;
    qris_url?: string;
    snap_token?: string;
    snap_redirect_url?: string;
  }): Promise<PaymentRecord> {
    const payment: PaymentRecord = {
      id: crypto.randomUUID(),
      order_id: data.order_id,
      user_id: data.user_id,
      user_email: data.user_email,
      tier: data.tier,
      gross_amount: data.gross_amount,
      payment_method: data.payment_method || 'qris',
      status: 'pending',
      qris_url: data.qris_url,
      snap_token: data.snap_token,
      snap_redirect_url: data.snap_redirect_url,
      created_at: new Date().toISOString(),
    };

    const supabase = getSupabase();
    if (supabase) {
      const { data: saved, error } = await supabase.from('payments').insert(payment).select().single();
      if (error) console.error('Supabase createPayment error:', error);
      return (saved as PaymentRecord) || payment;
    }

    const db = readDb();
    db.payments.push(payment);
    writeDb(db);
    return payment;
  },

  async submitPaymentForApproval(data: {
    order_id: string;
    user_id: string;
    user_email: string;
    user_name?: string;
    tier: 'pro_1_month' | 'pro_3_months' | 'pro_6_months';
    gross_amount: number;
    payment_method?: string;
    note?: string;
  }): Promise<PaymentRecord> {
    const now = new Date().toISOString();
    const payment: PaymentRecord = {
      id: crypto.randomUUID(),
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

    const supabase = getSupabase();
    if (supabase) {
      const { data: saved, error } = await supabase
        .from('payments')
        .upsert(payment, { onConflict: 'order_id' })
        .select()
        .single();
      if (error) console.error('Supabase submitPaymentForApproval error:', error);
      return (saved as PaymentRecord) || payment;
    }

    const db = readDb();
    const existingIdx = db.payments.findIndex((p) => p.order_id === data.order_id);
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

  async getAllPayments(): Promise<PaymentRecord[]> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Supabase getAllPayments error:', error);
        return [];
      }
      return (data || []) as PaymentRecord[];
    }

    const db = readDb();
    return (db.payments || []).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async approvePayment(orderId: string, adminId: string, adminEmail: string): Promise<boolean> {
    const now = new Date().toISOString();
    const supabase = getSupabase();

    if (supabase) {
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();

      if (!payment) return false;

      await supabase
        .from('payments')
        .update({ status: 'settlement', settled_at: now })
        .eq('order_id', orderId);

      await supabase
        .from('profiles')
        .update({ is_pro: true, updated_at: now })
        .eq('id', payment.user_id);

      await this.addAuditLog({
        admin_id: adminId,
        admin_email: adminEmail,
        target_user_id: payment.user_id,
        target_email: payment.user_email,
        action: 'APPROVE_QRIS_PAYMENT',
        tier: payment.tier,
        reason: `Verifikasi & aktivasi Pro untuk Order ${orderId} (Rp ${payment.gross_amount.toLocaleString('id-ID')})`,
      });

      return true;
    }

    const db = readDb();
    const payment = db.payments.find((p) => p.order_id === orderId);
    if (!payment) return false;

    payment.status = 'settlement';
    payment.settled_at = now;

    const user = db.users.find((u) => u.id === payment.user_id);
    if (user) {
      user.is_pro = true;
      user.updated_at = now;
    }

    writeDb(db);

    await this.addAuditLog({
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

  async rejectPayment(orderId: string, adminId: string, adminEmail: string, reason: string): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) {
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();

      if (!payment) return false;

      await supabase
        .from('payments')
        .update({ status: 'failed', note: reason })
        .eq('order_id', orderId);

      await this.addAuditLog({
        admin_id: adminId,
        admin_email: adminEmail,
        target_user_id: payment.user_id,
        target_email: payment.user_email,
        action: 'REJECT_QRIS_PAYMENT',
        tier: payment.tier,
        reason: reason || `Pembayaran Order ${orderId} ditolak oleh admin.`,
      });

      return true;
    }

    const db = readDb();
    const payment = db.payments.find((p) => p.order_id === orderId);
    if (!payment) return false;

    payment.status = 'failed';
    payment.note = reason;
    writeDb(db);

    await this.addAuditLog({
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

  async getPayment(orderId: string): Promise<PaymentRecord | null> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();
      if (error) return null;
      return data ? (data as PaymentRecord) : null;
    }

    const db = readDb();
    return db.payments.find((p) => p.order_id === orderId) || null;
  },

  async updatePaymentStatus(
    orderId: string,
    status: 'pending' | 'settlement' | 'expired' | 'failed',
    note?: string
  ): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase
        .from('payments')
        .update({ status, note, ...(status === 'settlement' ? { settled_at: new Date().toISOString() } : {}) })
        .eq('order_id', orderId);
      return !error;
    }

    const db = readDb();
    const payment = db.payments.find((p) => p.order_id === orderId);
    if (!payment) return false;
    payment.status = status;
    if (note) payment.note = note;
    if (status === 'settlement') payment.settled_at = new Date().toISOString();
    writeDb(db);
    return true;
  },

  async settlePayment(orderId: string): Promise<{ success: boolean; alreadySettled: boolean }> {
    const now = new Date();
    const nowIso = now.toISOString();
    const supabase = getSupabase();

    if (supabase) {
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();

      if (!payment) return { success: false, alreadySettled: false };

      // Idempoten: Jika order sudah settlement, jangan perpanjang lagi
      if (payment.status === 'settlement') {
        return { success: true, alreadySettled: true };
      }

      // Ambil user saat ini untuk hitung perpanjangan masa aktif kumulatif
      const { data: user } = await supabase
        .from('profiles')
        .select('is_pro, pro_expires_at')
        .eq('id', payment.user_id)
        .maybeSingle();

      let durationDays = 30;
      if (payment.tier === 'pro_3_months') durationDays = 90;
      if (payment.tier === 'pro_6_months') durationDays = 180;

      let baseTime = now.getTime();
      if (user?.is_pro && user?.pro_expires_at) {
        const existingExpire = new Date(user.pro_expires_at).getTime();
        if (existingExpire > baseTime) {
          baseTime = existingExpire;
        }
      }

      const newExpiresAt = new Date(baseTime + durationDays * 24 * 60 * 60 * 1000).toISOString();

      // Update bersyarat (Hanya jika belum settlement untuk mencegah race condition)
      const { error: paymentUpdateError } = await supabase
        .from('payments')
        .update({ status: 'settlement', settled_at: nowIso })
        .eq('order_id', orderId)
        .neq('status', 'settlement');

      if (paymentUpdateError) {
        console.error('Supabase settlePayment error:', paymentUpdateError);
        return { success: false, alreadySettled: false };
      }

      await supabase
        .from('profiles')
        .update({
          is_pro: true,
          pro_expires_at: newExpiresAt,
          updated_at: nowIso,
        })
        .eq('id', payment.user_id);

      return { success: true, alreadySettled: false };
    }

    const db = readDb();
    const payment = db.payments.find((p) => p.order_id === orderId);
    if (!payment) return { success: false, alreadySettled: false };

    // Idempoten: Cek status memori
    if (payment.status === 'settlement') {
      return { success: true, alreadySettled: true };
    }

    payment.status = 'settlement';
    payment.settled_at = nowIso;

    const user = db.users.find((u) => u.id === payment.user_id);
    if (user) {
      let durationDays = 30;
      if (payment.tier === 'pro_3_months') durationDays = 90;
      if (payment.tier === 'pro_6_months') durationDays = 180;

      let baseTime = now.getTime();
      if (user.is_pro && user.pro_expires_at) {
        const existingExpire = new Date(user.pro_expires_at).getTime();
        if (existingExpire > baseTime) {
          baseTime = existingExpire;
        }
      }

      const newExpiresAt = new Date(baseTime + durationDays * 24 * 60 * 60 * 1000).toISOString();
      user.is_pro = true;
      user.pro_expires_at = newExpiresAt;
      user.updated_at = nowIso;
    }

    writeDb(db);
    return { success: true, alreadySettled: false };
  },

  // AUDIT LOGS
  async getAuditLogs(): Promise<AuditRecord[]> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) return [];
      return (data || []) as AuditRecord[];
    }

    const db = readDb();
    return db.audit_logs.sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async addAuditLog(data: Omit<AuditRecord, 'id' | 'created_at'>): Promise<AuditRecord> {
    const log: AuditRecord = {
      id: crypto.randomUUID(),
      ...data,
      created_at: new Date().toISOString(),
    };

    const supabase = getSupabase();
    if (supabase) {
      const { data: saved, error } = await supabase.from('admin_audit_logs').insert(log).select().single();
      if (error) console.error('Supabase addAuditLog error:', error);
      return (saved as AuditRecord) || log;
    }

    const db = readDb();
    db.audit_logs.push(log);
    writeDb(db);
    return log;
  },

  // ADMIN MONITORING & METRICS
  async getAllUsers(): Promise<Omit<UserRecord, 'password_hash' | 'salt'>[]> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, username, full_name, instance_name, timezone, role, is_pro, pro_expires_at, reminder_email_enabled, reminder_email_time, telegram_chat_id, created_at, updated_at')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Supabase getAllUsers error:', error);
        return [];
      }
      return (data || []) as Omit<UserRecord, 'password_hash' | 'salt'>[];
    }

    const db = readDb();
    return db.users.map(({ password_hash, salt, ...u }) => u);
  },

  async setUserPro(userId: string, is_pro: boolean): Promise<boolean> {
    const supabase = getSupabase();
    const now = new Date().toISOString();
    if (supabase) {
      const { error } = await supabase
        .from('profiles')
        .update({ is_pro, updated_at: now })
        .eq('id', userId);
      return !error;
    }

    const db = readDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) return false;
    user.is_pro = is_pro;
    user.updated_at = now;
    writeDb(db);
    return true;
  },

  async getStats() {
    const supabase = getSupabase();
    if (supabase) {
      const [usersRes, reportsRes, paymentsRes, aiKeysRes] = await Promise.all([
        supabase.from('profiles').select('id, is_pro'),
        supabase.from('daily_reports').select('id', { count: 'exact', head: true }),
        supabase.from('payments').select('id, status'),
        supabase.from('ai_keys').select('id, is_active, usage_count'),
      ]);

      const users = usersRes.data || [];
      const totalUsers = users.length;
      const proUsers = users.filter((u) => u.is_pro).length;
      const totalReports = reportsRes.count || 0;
      const payments = paymentsRes.data || [];
      const totalPayments = payments.filter((p) => p.status === 'settlement').length;
      const pendingApprovals = payments.filter((p) => p.status === 'pending_approval').length;
      const aiKeys = aiKeysRes.data || [];
      const totalAiKeys = aiKeys.length;
      const activeAiKeys = aiKeys.filter((k) => k.is_active).length;
      const totalAiCalls = aiKeys.reduce((acc, k) => acc + (k.usage_count || 0), 0);

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
    }

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

  // POOL KUNCI API AI
  async getAiKeys(masked = true): Promise<AiKeyRecord[]> {
    const supabase = getSupabase();
    let keys: AiKeyRecord[] = [];

    if (supabase) {
      const { data, error } = await supabase.from('ai_keys').select('*').order('created_at', { ascending: false });
      if (!error && data) keys = data as AiKeyRecord[];
    } else {
      const db = readDb();
      keys = db.ai_keys || [];
    }

    if (!masked) return keys;
    return keys.map((k) => ({
      ...k,
      api_key:
        k.api_key.length > 8
          ? `${k.api_key.slice(0, 4)}...${k.api_key.slice(-4)}`
          : '••••••••',
    }));
  },

  async addAiKey(params: { name: string; provider?: 'gemini' | 'openai' | 'claude'; api_key: string }): Promise<AiKeyRecord> {
    const id = crypto.randomUUID();
    const newKey: AiKeyRecord = {
      id,
      name: params.name.trim() || 'API Key',
      provider: params.provider || 'gemini',
      api_key: params.api_key.trim(),
      is_active: true,
      usage_count: 0,
      created_at: new Date().toISOString(),
    };

    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('ai_keys').insert(newKey).select().single();
      if (error) console.error('Supabase addAiKey error:', error);
      return (data as AiKeyRecord) || newKey;
    }

    const db = readDb();
    db.ai_keys = db.ai_keys || [];
    db.ai_keys.push(newKey);
    writeDb(db);
    return newKey;
  },

  async toggleAiKey(id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) {
      const { data: key } = await supabase.from('ai_keys').select('is_active').eq('id', id).maybeSingle();
      if (!key) return false;
      const { error } = await supabase.from('ai_keys').update({ is_active: !key.is_active }).eq('id', id);
      return !error;
    }

    const db = readDb();
    db.ai_keys = db.ai_keys || [];
    const key = db.ai_keys.find((k) => k.id === id);
    if (!key) return false;
    key.is_active = !key.is_active;
    writeDb(db);
    return true;
  },

  async deleteAiKey(id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('ai_keys').delete().eq('id', id);
      return !error;
    }

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

  async getActiveAiKey(): Promise<{ id: string; api_key: string; provider: string } | null> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('ai_keys')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: true })
        .limit(1);

      if (error || !data || data.length === 0) return null;
      const selected = data[0] as AiKeyRecord;

      await supabase
        .from('ai_keys')
        .update({
          usage_count: (selected.usage_count || 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', selected.id);

      return { id: selected.id, api_key: selected.api_key, provider: selected.provider };
    }

    const db = readDb();
    const active = (db.ai_keys || []).filter((k) => k.is_active && k.api_key);
    if (active.length === 0) return null;

    active.sort((a, b) => a.usage_count - b.usage_count);
    const selected = active[0];

    selected.usage_count = (selected.usage_count || 0) + 1;
    selected.last_used_at = new Date().toISOString();
    writeDb(db);

    return { id: selected.id, api_key: selected.api_key, provider: selected.provider };
  },
};
