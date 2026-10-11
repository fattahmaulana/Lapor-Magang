'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield,
  Key,
  Users,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Clock,
  Plus,
  Trash2,
  Sparkles,
  Lock,
  Search,
  Check,
  RefreshCw,
  LogOut,
  Cpu,
  Layers,
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  proUsers: number;
  totalReports: number;
  totalPayments: number;
  pendingApprovals?: number;
  totalAiKeys: number;
  activeAiKeys: number;
  totalAiCalls: number;
}

interface PaymentItem {
  id: string;
  order_id: string;
  user_id: string;
  user_email: string;
  user_name?: string;
  tier: string;
  gross_amount: number;
  payment_method: string;
  status: 'pending' | 'pending_approval' | 'settlement' | 'expired' | 'failed';
  note?: string;
  created_at: string;
}

interface UserItem {
  id: string;
  email: string;
  username?: string;
  full_name: string;
  instance_name: string;
  role: 'user' | 'admin';
  is_pro: boolean;
  created_at: string;
}

interface AiKeyItem {
  id: string;
  name: string;
  provider: 'gemini' | 'openai' | 'claude';
  api_key: string;
  is_active: boolean;
  usage_count: number;
  last_used_at?: string;
  created_at: string;
}

interface AuditLogItem {
  id: string;
  admin_email: string;
  target_email: string;
  action: string;
  reason: string;
  created_at: string;
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Login Admin State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Dashboard Data State
  const [activeTab, setActiveTab] = useState<'stats' | 'payments' | 'keys' | 'users' | 'audit'>('stats');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [aiKeys, setAiKeys] = useState<AiKeyItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Filter User
  const [userSearch, setUserSearch] = useState('');

  // Form Tambah Kunci AI
  const [keyName, setKeyName] = useState('');
  const [keyProvider, setKeyProvider] = useState<'gemini' | 'openai' | 'claude'>('gemini');
  const [keyVal, setKeyVal] = useState('');
  const [keySubmitting, setKeySubmitting] = useState(false);

  // Notifikasi
  const [notification, setNotification] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setDataLoading(true);
    try {
      const [resStats, resUsers, resKeys, resPayments] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
        fetch('/api/admin/ai-keys'),
        fetch('/api/admin/payments'),
      ]);

      if (resStats.ok) {
        const d = await resStats.json();
        setStats(d.data.stats);
        setAuditLogs(d.data.recentAuditLogs || []);
      }
      if (resUsers.ok) {
        const d = await resUsers.json();
        setUsers(d.data || []);
      }
      if (resKeys.ok) {
        const d = await resKeys.json();
        setAiKeys(d.data || []);
      }
      if (resPayments.ok) {
        const d = await resPayments.json();
        setPayments(d.data || []);
      }
    } catch {
      // ignore
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Unauthorized');
      })
      .then((data) => {
        if (data.status === 'success' && data.user?.role === 'admin') {
          setIsAdmin(true);
          loadDashboardData();
        } else {
          setIsAdmin(false);
        }
      })
      .catch(() => {
        setIsAdmin(false);
      })
      .finally(() => {
        setCheckingAuth(false);
      });
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();

      if (res.ok && data.status === 'success') {
        if (data.user.role === 'admin') {
          setIsAdmin(true);
          loadDashboardData();
        } else {
          setLoginError('Akun ini tidak memiliki hak akses administrator.');
        }
      } else {
        setLoginError(data.message || 'Kredensial login tidak valid.');
      }
    } catch {
      setLoginError('Terjadi kendala jaringan.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAddAiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyVal.trim()) {
      setErrorMessage('Kunci API tidak boleh kosong.');
      return;
    }

    setKeySubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/admin/ai-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: keyName,
          provider: keyProvider,
          api_key: keyVal,
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setNotification('Kunci API AI baru berhasil ditambahkan ke pool.');
        setKeyName('');
        setKeyVal('');
        loadDashboardData();
        setTimeout(() => setNotification(null), 3000);
      } else {
        setErrorMessage(data.message || 'Gagal menambahkan kunci.');
      }
    } catch {
      setErrorMessage('Terjadi kendala jaringan.');
    } finally {
      setKeySubmitting(false);
    }
  };

  const handleToggleAiKey = async (id: string) => {
    try {
      const res = await fetch('/api/admin/ai-keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setAiKeys((prev) =>
          prev.map((k) => (k.id === id ? { ...k, is_active: !k.is_active } : k))
        );
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteAiKey = async (id: string) => {
    if (!confirm('Hapus kunci API ini dari pool?')) return;
    try {
      const res = await fetch(`/api/admin/ai-keys?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAiKeys((prev) => prev.filter((k) => k.id !== id));
        loadDashboardData();
      }
    } catch {
      // ignore
    }
  };

  const handleToggleUserPro = async (userId: string, currentPro: boolean) => {
    const nextPro = !currentPro;
    const reason = prompt(
      `Alasan ${nextPro ? 'mengaktifkan' : 'mencabut'} Pro (untuk audit trail):`,
      'Penyesuaian manual admin'
    );
    if (reason === null) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          is_pro: nextPro,
          reason,
        }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_pro: nextPro } : u))
        );
        loadDashboardData();
        setNotification(`Status Pro berhasil diubah.`);
        setTimeout(() => setNotification(null), 3000);
      }
    } catch {
      // ignore
    }
  };

  const handleApprovePayment = async (orderId: string) => {
    if (!confirm(`Setujui pembayaran ${orderId} dan aktifkan status Pro pengguna?`)) return;

    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action: 'approve' }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setNotification(data.message);
        loadDashboardData();
        setTimeout(() => setNotification(null), 4000);
      } else {
        setErrorMessage(data.message || 'Gagal menyetujui pembayaran.');
      }
    } catch {
      setErrorMessage('Terjadi kendala jaringan.');
    }
  };

  const handleRejectPayment = async (orderId: string) => {
    const reason = prompt('Masukkan alasan penolakan pembayaran:', 'Bukti transfer mutasi tidak ditemukan');
    if (reason === null) return;

    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action: 'reject', reason }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setNotification(data.message);
        loadDashboardData();
        setTimeout(() => setNotification(null), 4000);
      } else {
        setErrorMessage(data.message || 'Gagal menolak pembayaran.');
      }
    } catch {
      setErrorMessage('Terjadi kendala jaringan.');
    }
  };

  const handleAdminLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsAdmin(false);
  };

  // Jika masih memeriksa status sesi
  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] text-zinc-400 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <span>Memeriksa izin akses administrator...</span>
        </div>
      </div>
    );
  }

  // TAMPILAN LOGIN ADMIN JIKA BELUM TERAUTENTIKASI
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col justify-center bg-[#09090b] text-[#f4f4f5] px-4 py-12 sm:px-6 verity-mesh-bg">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.25)]">
              <Shield className="h-6 w-6" />
            </div>
          </div>
          <h2 className="mt-4 text-center text-xl font-bold tracking-tight text-white">
            Portal Administrator LaporMagang
          </h2>
          <p className="mt-1 text-center text-xs text-zinc-400">
            Hanya dapat diakses oleh akun pengelola berwenang.
          </p>
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="verity-card rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
            {loginError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-950/40 border border-red-500/30 p-3 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white">Email Admin</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@lapormagang.id"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#16161c] p-3 text-xs text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white">Kata Sandi</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#16161c] p-3 text-xs text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-xs font-bold text-zinc-950 hover:bg-zinc-200 transition shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50 cursor-pointer"
              >
                <Lock className="h-4 w-4" />
                <span>{loginLoading ? 'Memverifikasi...' : 'Masuk Panel Admin'}</span>
              </button>
            </form>

            <div className="border-t border-white/[0.06] pt-4 text-center">
              <Link href="/" className="text-xs text-zinc-400 hover:text-white transition">
                ← Kembali ke Beranda
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TAMPILAN DASHBOARD ADMINISTRATOR
  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.username && u.username.toLowerCase().includes(userSearch.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header Admin Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 text-zinc-950 font-bold shadow-md">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white">Panel Administrator LaporMagang</h1>
                <span className="rounded-full bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-extrabold text-cyan-300">
                  SUPERADMIN
                </span>
              </div>
              <span className="text-xs text-zinc-400">
                Kelola pengguna, metrik logbook, dan pool kunci AI dinamis.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadDashboardData}
              title="Perbarui Data"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 hover:text-white transition"
            >
              <RefreshCw className={`h-4 w-4 ${dataLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleAdminLogout}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-xs font-semibold text-zinc-300 hover:text-red-400 hover:border-red-500/30 transition cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Keluar</span>
            </button>
            <Link
              href="/"
              className="inline-flex h-9 items-center rounded-xl bg-white/[0.04] px-3 text-xs font-medium text-zinc-300 hover:text-white transition"
            >
              Beranda
            </Link>
          </div>
        </div>

        {/* Notifikasi Global */}
        {notification && (
          <div className="flex items-center gap-2 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 p-3.5 text-xs text-cyan-300">
            <CheckCircle className="h-4 w-4 text-cyan-400 shrink-0" />
            <span>{notification}</span>
          </div>
        )}
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-2xl bg-red-950/40 border border-red-500/40 p-3.5 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab Navigasi */}
        <div className="flex flex-wrap gap-2 border-b border-white/[0.06] pb-2">
          {[
            { id: 'stats', label: 'Metrik & Ringkasan', icon: BarChart3 },
            {
              id: 'payments',
              label: 'Persetujuan Pembayaran QRIS',
              icon: CheckCircle,
              badge: stats?.pendingApprovals || 0,
            },
            { id: 'keys', label: 'Pool Kunci API AI', icon: Key },
            { id: 'users', label: 'Manajemen Pengguna', icon: Users },
            { id: 'audit', label: 'Audit Trail', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-white text-zinc-950 shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                    : 'border border-white/10 bg-white/[0.02] text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 text-zinc-950 text-[10px] font-extrabold px-1 animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: METRIK & RINGKASAN */}
        {activeTab === 'stats' && stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="verity-card rounded-2xl p-4">
                <span className="text-[11px] font-medium text-zinc-400 block">Total Pengguna</span>
                <span className="text-2xl font-extrabold text-white mt-1 block">{stats.totalUsers}</span>
                <span className="text-[10px] text-zinc-500">{stats.proUsers} akun Pro</span>
              </div>
              <div className="verity-card rounded-2xl p-4 border border-amber-500/30 bg-amber-950/15">
                <span className="text-[11px] font-medium text-amber-300 block">Menunggu Persetujuan</span>
                <span className="text-2xl font-extrabold text-amber-400 mt-1 block">{stats.pendingApprovals || 0}</span>
                <span className="text-[10px] text-zinc-400">Verifikasi QRIS</span>
              </div>
              <div className="verity-card rounded-2xl p-4">
                <span className="text-[11px] font-medium text-zinc-400 block">Total Logbook</span>
                <span className="text-2xl font-extrabold text-white mt-1 block">{stats.totalReports}</span>
                <span className="text-[10px] text-zinc-500">Tersimpan di DB</span>
              </div>
              <div className="verity-card rounded-2xl p-4">
                <span className="text-[11px] font-medium text-zinc-400 block">Transaksi Disetujui</span>
                <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">{stats.totalPayments}</span>
                <span className="text-[10px] text-zinc-500">Settlement sukses</span>
              </div>
              <div className="verity-card rounded-2xl p-4">
                <span className="text-[11px] font-medium text-zinc-400 block">Total Panggilan AI</span>
                <span className="text-2xl font-extrabold text-cyan-400 mt-1 block">{stats.totalAiCalls}</span>
                <span className="text-[10px] text-zinc-500">{stats.activeAiKeys} kunci aktif</span>
              </div>
            </div>

            {/* Banner Menunggu Verifikasi */}
            {(stats.pendingApprovals || 0) > 0 && (
              <div className="verity-card rounded-2xl p-4 border border-amber-500/40 bg-gradient-to-r from-amber-950/30 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Ada {stats.pendingApprovals} Pembayaran QRIS Menunggu Verifikasi</h3>
                    <p className="text-xs text-zinc-300">
                      Pengguna telah mentransfer dana dan menunggu persetujuan Anda agar status Pro mereka aktif.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('payments')}
                  className="rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-300 transition shrink-0"
                >
                  Tinjau Pembayaran →
                </button>
              </div>
            )}

            {/* Quick Status AI Pool */}
            <div className="verity-card rounded-2xl p-5 border border-cyan-500/20 bg-gradient-to-r from-cyan-950/20 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Status AI Engine Pool</h3>
                  <p className="text-xs text-zinc-400">
                    {stats.activeAiKeys > 0
                      ? `Sistem beroperasi dengan ${stats.activeAiKeys} kunci API aktif (Load balancing round-robin)`
                      : 'Belum ada kunci API aktif di pool. Sistem menggunakan kunci default environment.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('keys')}
                className="rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-zinc-950 hover:bg-zinc-200 transition"
              >
                Atur Kunci AI →
              </button>
            </div>
          </div>
        )}

        {/* TAB PERSETUJUAN PEMBAYARAN QRIS */}
        {activeTab === 'payments' && (
          <div className="verity-card rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">
                  Persetujuan Pembayaran QRIS ({payments.length} Transaksi)
                </h2>
              </div>
              <span className="text-xs font-medium text-amber-400">
                {payments.filter((p) => p.status === 'pending_approval').length} Menunggu Verifikasi
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Daftar transfer QRIS manual Fattah Maulana, Service. Periksa mutasi rekening/QRIS Anda.
              Klik <strong>Setujui</strong> untuk mengaktifkan status Pro pengguna secara instan, atau <strong>Tolak</strong> jika dana belum masuk.
            </p>

            {payments.length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-500">
                Belum ada transaksi pembayaran yang diajukan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/[0.08] text-zinc-400">
                    <tr>
                      <th className="py-2.5 px-3">Order ID & Waktu</th>
                      <th className="py-2.5 px-3">Pengguna</th>
                      <th className="py-2.5 px-3">Paket</th>
                      <th className="py-2.5 px-3">Nominal</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Aksi Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] text-zinc-300">
                    {payments.map((p) => (
                      <tr
                        key={p.id}
                        className={`hover:bg-white/[0.02] ${
                          p.status === 'pending_approval' ? 'bg-amber-950/10' : ''
                        }`}
                      >
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-cyan-300 block">{p.order_id}</span>
                          <span className="text-[10px] text-zinc-500">
                            {new Date(p.created_at).toLocaleString('id-ID')}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-white block">{p.user_name || 'Peserta'}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">{p.user_email}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                            {p.tier}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-white">
                          Rp {p.gross_amount.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3">
                          {p.status === 'pending_approval' ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 animate-pulse">
                              ⏳ Verifikasi Admin
                            </span>
                          ) : p.status === 'settlement' ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                              ✓ Disetujui (Pro Aktif)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-red-400">
                              ✕ Ditolak
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {p.status === 'pending_approval' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleApprovePayment(p.order_id)}
                                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-zinc-950 hover:bg-emerald-400 transition cursor-pointer shadow-sm"
                              >
                                Setujui (Aktifkan Pro)
                              </button>
                              <button
                                onClick={() => handleRejectPayment(p.order_id)}
                                className="rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-red-400 hover:bg-red-500/20 transition cursor-pointer"
                              >
                                Tolak
                              </button>
                            </div>
                          ) : p.status === 'settlement' ? (
                            <span className="text-[11px] text-zinc-500">Selesai</span>
                          ) : (
                            <span className="text-[11px] text-zinc-500">{p.note || 'Ditolak'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: POOL KUNCI API AI (MULTI-KEY DYNAMIC ROTATION) */}
        {activeTab === 'keys' && (
          <div className="space-y-5">
            {/* Form Tambah Kunci AI Baru */}
            <div className="verity-card rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
                <Key className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">Tambah Kunci API AI ke Pool</h2>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Kamu bisa memasukkan banyak kunci API AI sekaligus (contoh: beberapa Google AI Studio / Gemini keys).
                Sistem LaporMagang akan menggabungkannya menjadi 1 pool dan merotasi penggunaannya secara otomatis
                untuk pembuatan logbook, rekap mingguan, dan presentasi PPT.
              </p>

              <form onSubmit={handleAddAiKey} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300">Nama / Label Kunci</label>
                    <input
                      type="text"
                      required
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      placeholder="Contoh: Gemini Primary Key 1"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-[#16161c] p-2.5 text-xs text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300">Provider AI</label>
                    <select
                      value={keyProvider}
                      onChange={(e) => setKeyProvider(e.target.value as any)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-[#16161c] p-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="gemini">Google Gemini / AI Studio</option>
                      <option value="openai">OpenAI (GPT)</option>
                      <option value="claude">Anthropic Claude</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300">API Key Secret</label>
                    <input
                      type="password"
                      required
                      value={keyVal}
                      onChange={(e) => setKeyVal(e.target.value)}
                      placeholder="AIzaSy..."
                      className="mt-1 w-full rounded-xl border border-white/10 bg-[#16161c] p-2.5 text-xs text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={keySubmitting}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-white px-5 text-xs font-bold text-zinc-950 hover:bg-zinc-200 transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>{keySubmitting ? 'Menyimpan...' : 'Tambahkan Kunci ke Pool'}</span>
                </button>
              </form>
            </div>

            {/* Tabel Daftar Kunci AI Aktif */}
            <div className="verity-card rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">Pool Kunci AI ({aiKeys.length} Kunci)</h3>
                </div>
                <span className="text-xs text-zinc-400">
                  {aiKeys.filter((k) => k.is_active).length} Aktif
                </span>
              </div>

              {aiKeys.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-500">
                  Belum ada kunci API di pool. Masukkan kunci API di formulir atas untuk memulai rotasi.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/[0.08] text-zinc-400">
                      <tr>
                        <th className="py-2.5 px-3">Nama Kunci</th>
                        <th className="py-2.5 px-3">Provider</th>
                        <th className="py-2.5 px-3">Kunci (Masked)</th>
                        <th className="py-2.5 px-3">Total Panggilan</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06] text-zinc-300">
                      {aiKeys.map((k) => (
                        <tr key={k.id} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3 font-semibold text-white">{k.name}</td>
                          <td className="py-2.5 px-3">
                            <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-mono text-cyan-300 uppercase">
                              {k.provider}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-zinc-400">{k.api_key}</td>
                          <td className="py-2.5 px-3 font-mono text-cyan-400">{k.usage_count} kali</td>
                          <td className="py-2.5 px-3">
                            <button
                              onClick={() => handleToggleAiKey(k.id)}
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition cursor-pointer ${
                                k.is_active
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                  : 'border-zinc-700 bg-zinc-800 text-zinc-500'
                              }`}
                            >
                              {k.is_active ? '● Aktif' : '○ Nonaktif'}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleDeleteAiKey(k.id)}
                              title="Hapus Kunci"
                              className="text-zinc-500 hover:text-red-400 p-1 transition cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MANAJEMEN PENGGUNA */}
        {activeTab === 'users' && (
          <div className="verity-card rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">Daftar Pengguna ({users.length} Akun)</h2>
              </div>

              {/* Input Pencarian */}
              <div className="relative w-full sm:w-64">
                <Search className="h-3.5 w-3.5 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Cari nama, email, username..."
                  className="w-full rounded-xl border border-white/10 bg-[#16161c] p-2 pl-8 text-xs text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.08] text-zinc-400">
                  <tr>
                    <th className="py-2.5 px-3">Nama & Handle</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Instansi</th>
                    <th className="py-2.5 px-3">Status Pro</th>
                    <th className="py-2.5 px-3 text-right">Aksi Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-zinc-300">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-white block">{u.full_name}</span>
                        <span className="text-[10px] text-cyan-400 font-mono">@{u.username || 'user'}</span>
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400 font-mono">{u.email}</td>
                      <td className="py-2.5 px-3 text-zinc-400">{u.instance_name || '-'}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                            u.is_pro
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : 'border-white/10 bg-white/[0.03] text-zinc-400'
                          }`}
                        >
                          {u.is_pro ? 'PRO' : 'Gratis'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleToggleUserPro(u.id, u.is_pro)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition cursor-pointer ${
                            u.is_pro
                              ? 'border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20'
                              : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'
                          }`}
                        >
                          {u.is_pro ? 'Cabut Pro' : 'Beri Pro'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="verity-card rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
              <Clock className="h-4 w-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Log Audit Aktivitas Administrator</h2>
            </div>
            <p className="text-xs text-zinc-400">
              Setiap tindakan admin (pemberian Pro manual, perubahan kunci AI) tercatat secara permanen sesuai regulasi UU PDP.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.08] text-zinc-400">
                  <tr>
                    <th className="py-2.5 px-3">Waktu</th>
                    <th className="py-2.5 px-3">Admin</th>
                    <th className="py-2.5 px-3">Aksi</th>
                    <th className="py-2.5 px-3">Target</th>
                    <th className="py-2.5 px-3">Alasan / Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-zinc-300 font-mono text-[11px]">
                  {auditLogs.map((l) => (
                    <tr key={l.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 text-zinc-500 whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 text-cyan-400">{l.admin_email}</td>
                      <td className="py-2.5 px-3 font-bold text-white">{l.action}</td>
                      <td className="py-2.5 px-3 text-zinc-400">{l.target_email}</td>
                      <td className="py-2.5 px-3 font-sans text-xs text-zinc-400">{l.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
