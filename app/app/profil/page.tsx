'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  User,
  Mail,
  Building,
  Clock,
  Lock,
  Sparkles,
  Check,
  AlertCircle,
  QrCode,
  ExternalLink,
  Trash2,
  LogOut,
  ShieldCheck,
  AtSign,
  Bell,
  Calendar,
  Download,
} from 'lucide-react';
import { localDb, UserProfile } from '@/lib/local-db';
import { useAppDialog } from '@/components/ui/dialog-provider';
import { generateGoogleCalendarUrl, generateICalContent } from '@/lib/reminders/calendar';

const PRO_TIERS = [
  { id: 'pro_1_month', label: '1 Bulan', price: 'Rp5.000', amount: 5000, image: '/qris-5k.jpeg' },
  { id: 'pro_3_months', label: '3 Bulan', price: 'Rp12.000', amount: 12000, image: '/qris-12k.jpeg' },
  { id: 'pro_6_months', label: '6 Bulan', price: 'Rp22.000', amount: 22000, image: '/qris-22k.jpeg' },
] as const;

type ProTierId = (typeof PRO_TIERS)[number]['id'];

export default function ProfilPage() {
  const { showDialog } = useAppDialog();
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') return localDb.getCurrentUser();
    return null;
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Edit Info
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [instanceName, setInstanceName] = useState('');
  const [timezone, setTimezone] = useState<'WIB' | 'WITA' | 'WIT'>('WIB');

  // Pengingat State
  const [reminderEmailEnabled, setReminderEmailEnabled] = useState(false);
  const [reminderEmailTime, setReminderEmailTime] = useState('15:00');

  // Form Ganti Password
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Upgrade Pro state
  const [selectedTier, setSelectedTier] = useState<ProTierId>('pro_1_month');
  const [paymentOrder, setPaymentOrder] = useState<{
    orderId: string;
    amount: number;
    redirectUrl?: string;
  } | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  const currentTierInfo = PRO_TIERS.find((t) => t.id === selectedTier) || PRO_TIERS[0];

  const handleSelectTier = (tierId: ProTierId) => {
    setSelectedTier(tierId);
    const tierObj = PRO_TIERS.find((t) => t.id === tierId) || PRO_TIERS[0];
    if (paymentOrder) {
      setPaymentOrder((prev) => (prev ? { ...prev, amount: tierObj.amount } : null));
    }
  };

  // Hapus Akun Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success' && data.user) {
          setUser(data.user);
          localDb.setCurrentUser(data.user);
          setFullName(data.user.full_name || '');
          setUsername(data.user.username || data.user.email.split('@')[0]);
          setInstanceName(data.user.instance_name || '');
          setTimezone(data.user.timezone || 'WIB');
          setReminderEmailEnabled(Boolean(data.user.reminder_email_enabled));
          setReminderEmailTime(data.user.reminder_email_time || '15:00');
        }
      })
      .catch(() => {});
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          username,
          instance_name: instanceName,
          timezone,
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setUser(data.user);
        localDb.setCurrentUser(data.user);
        setSuccessMsg('Informasi profil berhasil diperbarui.');
      } else {
        setErrorMsg(data.message || 'Gagal memperbarui profil.');
      }
    } catch {
      setErrorMsg('Terjadi kendala jaringan.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmailReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminder_email_enabled: reminderEmailEnabled,
          reminder_email_time: reminderEmailTime,
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setUser(data.user);
        localDb.setCurrentUser(data.user);
        setSuccessMsg('Pengaturan pengingat email otomatis pukul 15.00 berhasil disimpan.');
      } else {
        setErrorMsg(data.message || 'Gagal menyimpan pengaturan pengingat.');
      }
    } catch {
      setErrorMsg('Terjadi kendala jaringan.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadICal = () => {
    const icsContent = generateICalContent();
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pengingat-lapormagang-1500.ics';
    link.click();
    URL.revokeObjectURL(url);
    showDialog({
      type: 'success',
      title: 'Jadwal .ics Diunduh',
      message: 'File pengingat-lapormagang-1500.ics siap dipasang ke kalender perangkat Anda.',
    });
  };

  const handleOpenGoogleCalendar = () => {
    window.open(generateGoogleCalendarUrl(), '_blank');
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }
    if (newPassword.length < 10) {
      setErrorMsg('Kata sandi baru minimal 10 karakter.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setSuccessMsg('Kata sandi berhasil diubah.');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMsg(data.message || 'Gagal mengganti kata sandi.');
      }
    } catch {
      setErrorMsg('Terjadi kendala jaringan.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayment = () => {
    const shortId = Date.now().toString(36).slice(-5).toUpperCase();
    const orderId = `LM-QRIS-${shortId}`;

    setPaymentOrder({
      orderId,
      amount: currentTierInfo.amount,
    });
  };

  const handleConfirmQrisPayment = async () => {
    if (!paymentOrder) return;
    setPaymentLoading(true);

    try {
      const res = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: paymentOrder.orderId,
          tier: selectedTier,
          amount: currentTierInfo.amount,
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setIsPendingApproval(true);
        showDialog({
          type: 'info',
          title: '⏳ Menunggu Persetujuan Admin',
          message:
            'Konfirmasi transfer berhasil dikirim ke antrean admin! Admin akan memverifikasi mutasi dan mengaktifkan akun Pro Anda dalam 5–15 menit.',
        });
      } else {
        showDialog({
          type: 'error',
          title: 'Gagal Konfirmasi',
          message: data.message || 'Gagal memproses konfirmasi pembayaran.',
        });
      }
    } catch {
      showDialog({
        type: 'error',
        title: 'Kendala Jaringan',
        message: 'Gagal menghubungi server.',
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCheckProStatus = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.user?.is_pro) {
        setUser(data.user);
        localDb.setCurrentUser(data.user);
        setPaymentOrder(null);
        setIsPendingApproval(false);
        showDialog({
          type: 'success',
          title: '🎉 Pembayaran Telah Disetujui!',
          message: 'Selamat! Akun Anda kini resmi aktif sebagai Paket Pro. Semua fitur AI & ekspor sudah terbuka.',
        });
      } else {
        showDialog({
          type: 'info',
          title: 'Masih Diverifikasi',
          message: 'Pembayaran Anda masih dalam antrean verifikasi admin. Mohon tunggu beberapa saat.',
        });
      }
    } catch {
      showDialog({
        type: 'error',
        title: 'Kendala Jaringan',
        message: 'Gagal memeriksa status persetujuan.',
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'HAPUS') {
      showDialog({
        type: 'error',
        title: 'Konfirmasi Diperlukan',
        message: 'Ketik kata HAPUS dengan huruf kapital untuk konfirmasi pemusnahan akun.',
      });
      return;
    }

    try {
      const res = await fetch('/api/auth/profile', { method: 'DELETE' });
      if (res.ok) {
        localDb.setCurrentUser(null);
        localStorage.clear();
        window.location.href = '/';
      } else {
        showDialog({
          type: 'error',
          title: 'Gagal Menghapus Akun',
          message: 'Terjadi kendala saat memproses penghapusan akun Anda di server.',
        });
      }
    } catch {
      showDialog({
        type: 'error',
        title: 'Kendala Jaringan',
        message: 'Gagal terhubung ke server.',
      });
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    localDb.setCurrentUser(null);
    window.location.href = '/masuk';
  };

  const isPro = user?.is_pro ?? false;
  const initial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'P';

  return (
    <div className="space-y-5">
      {/* 1. Header Profil & Kartu Identitas */}
      <div className="verity-card rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 font-extrabold text-zinc-950 text-xl shadow-md shrink-0">
              {initial}
              {isPro && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 ring-2 ring-[#0e0e12]" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {user?.full_name || 'Peserta Magang'}
                </h1>
                {isPro ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.3)] tracking-wider">
                    <Sparkles className="h-3 w-3" />
                    <span>PRO</span>
                  </span>
                ) : (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                    Gratis
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 font-mono flex items-center gap-1">
                <AtSign className="h-3 w-3 text-cyan-400" />
                <span>{user?.username || user?.email.split('@')[0]}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400">{user?.email}</span>
              </p>
              <span className="text-[11px] text-zinc-500 block mt-0.5">
                {user?.instance_name || 'Instansi Pemagangan'}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-xs font-semibold text-zinc-300 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition cursor-pointer w-fit"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </div>

      {/* Notifikasi Status */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 p-3.5 text-xs text-emerald-300">
          <Check className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-2xl bg-red-950/40 border border-red-500/30 p-3.5 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. Upgrade ke PRO Section */}
      {!isPro ? (
        <div className="verity-card rounded-2xl p-5 border border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 to-transparent space-y-3.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Upgrade ke Paket Pro</h2>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            Dapatkan draf laporan harian tanpa batas, rekap mingguan AI, slide presentasi PPT otomatis, dan deteksi kemiripan Jaccard.
          </p>

          <div className="grid grid-cols-3 gap-2">
            {PRO_TIERS.map((tier) => (
              <button
                key={tier.id}
                onClick={() => handleSelectTier(tier.id)}
                className={`rounded-xl p-2.5 text-center transition border cursor-pointer ${
                  selectedTier === tier.id
                    ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-[0_0_15px_rgba(34,211,238,0.3)] ring-1 ring-cyan-400/40'
                    : 'border-white/10 bg-white/[0.02] text-zinc-400 hover:text-white'
                }`}
              >
                <span className="block text-[10px] font-semibold">{tier.label}</span>
                <span className="block text-xs font-extrabold text-white mt-0.5">{tier.price}</span>
              </button>
            ))}
          </div>

          {paymentOrder ? (
            <div className="rounded-2xl border border-cyan-500/40 bg-[#14141a] p-4 sm:p-5 text-center space-y-4 mt-2 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block font-mono">
                    Pembayaran QRIS Nasional
                  </span>
                  <h3 className="text-sm font-bold text-white">Fattah Maulana, Service</h3>
                </div>
                <button
                  onClick={() => setPaymentOrder(null)}
                  className="text-xs text-zinc-400 hover:text-white cursor-pointer px-2 py-1"
                >
                  Batal
                </button>
              </div>

              {/* Tampilan Gambar QRIS Resmi Sesuai Paket */}
              <div className="mx-auto max-w-[280px] overflow-hidden rounded-2xl border-2 border-white/20 bg-white p-2 shadow-2xl">
                <Image
                  src={currentTierInfo.image}
                  alt={`QRIS Fattah Maulana, Service - ${currentTierInfo.label} (${currentTierInfo.price})`}
                  width={280}
                  height={380}
                  className="w-full h-auto rounded-xl object-contain block"
                  priority
                />
              </div>

              {/* Rincian Tagihan Akurat Real-time */}
              <div className="rounded-xl border border-cyan-500/20 bg-white/[0.03] p-3.5 text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-0.5 text-[11px] font-semibold text-cyan-300 mb-1">
                  <span>Paket: {currentTierInfo.label}</span>
                </div>
                <span className="text-[11px] text-zinc-400 block">Total Nominal Transfer:</span>
                <div className="text-3xl font-extrabold text-cyan-300 tracking-tight">
                  Rp {currentTierInfo.amount.toLocaleString('id-ID')}
                </div>
                <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-400 font-mono pt-1">
                  <span>NMID: ID1026613383482</span>
                  <span>•</span>
                  <span>Order: {paymentOrder.orderId}</span>
                </div>
              </div>

              {isPendingApproval ? (
                <div className="rounded-2xl border border-amber-500/40 bg-amber-950/30 p-4 text-center space-y-2">
                  <Clock className="h-6 w-6 text-amber-400 mx-auto animate-pulse" />
                  <h4 className="text-xs font-bold text-amber-300">Konfirmasi Sedang Diverifikasi Admin</h4>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    Bukti transfer Anda telah masuk antrean admin. Admin sedang mencocokkan mutasi QRIS untuk mengaktifkan status Pro.
                  </p>
                  <button
                    onClick={handleCheckProStatus}
                    className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Cek Status Persetujuan</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="rounded-xl bg-cyan-950/20 border border-cyan-500/20 p-2.5 text-[11px] text-cyan-200 text-left">
                    <p className="leading-relaxed">
                      <strong>Cara Bayar:</strong> Buka m-Banking atau E-Wallet apa saja (BCA, Mandiri, BRI, BNI, GoPay, OVO, DANA, ShopeePay), scan gambar QRIS di atas, transfer tepat <strong>Rp {currentTierInfo.amount.toLocaleString('id-ID')}</strong>, lalu klik tombol di bawah untuk meminta persetujuan admin.
                    </p>
                  </div>

                  {/* Tombol Konfirmasi Pembayaran */}
                  <div className="space-y-2 pt-1">
                    <button
                      onClick={handleConfirmQrisPayment}
                      disabled={paymentLoading}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-xs font-bold text-zinc-950 hover:brightness-110 transition shadow-[0_0_20px_rgba(52,211,153,0.3)] disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="h-4 w-4" />
                      <span>{paymentLoading ? 'Mengirim...' : 'Kirim Bukti Transfer (Verifikasi Admin)'}</span>
                    </button>

                    <button
                      onClick={() => setPaymentOrder(null)}
                      className="w-full text-center text-xs text-zinc-400 hover:text-white py-1 cursor-pointer"
                    >
                      Ganti Pilihan Paket
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={handleCreatePayment}
              disabled={paymentLoading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-xs font-bold text-zinc-950 hover:bg-zinc-200 transition shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50 cursor-pointer"
            >
              <QrCode className="h-4 w-4" />
              <span>{paymentLoading ? 'Menyiapkan Tagihan...' : 'Tampilkan Kode QRIS'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="verity-card rounded-2xl p-4 border border-emerald-500/30 bg-emerald-950/15 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-300 block">Akun Pro Aktif</span>
              <span className="text-[11px] text-zinc-400">Seluruh fitur draf AI dan ekspor presentasi tidak dibatasi.</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Pengaturan Pengingat Harian (Pukul 15.00) */}
      <div className="verity-card rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Jadwal Pengingat Logbook (15.00 WIB)</h2>
              <span className="text-[11px] text-zinc-400">
                Pengingat jam 3 sore setiap hari kerja sebelum batas 23.59
              </span>
            </div>
          </div>

          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border w-fit ${
              isPro
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-white/10 bg-white/[0.04] text-zinc-400'
            }`}
          >
            {isPro ? 'Mode Pro (Email Otomatis)' : 'Mode Gratis (Kalender)'}
          </span>
        </div>

        {isPro ? (
          /* TAMPILAN PRO: EMAIL OTOMATIS */
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-white">
                  Pengingat Email Otomatis Server
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Server kami otomatis mengirimkan email pengingat setiap pukul <strong>15.00 WIB</strong> ke inbox <strong className="text-white">{user?.email}</strong> HANYA jika Anda belum mengisi logbook pada hari itu.
              </p>
            </div>

            <form onSubmit={handleSaveEmailReminder} className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#16161c] p-3.5">
                <div>
                  <span className="text-xs font-bold text-white block">Kirim Email Pengingat</span>
                  <span className="text-[11px] text-zinc-400">
                    Otomatis berhenti begitu Anda menandai sudah lapor.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setReminderEmailEnabled(!reminderEmailEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    reminderEmailEnabled ? 'bg-cyan-400' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-zinc-950 transition-transform ${
                      reminderEmailEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Waktu Pengiriman Email:
                  </label>
                  <select
                    value={reminderEmailTime}
                    onChange={(e) => setReminderEmailTime(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#16161c] p-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="15:00">15.00 (3 Sore - Rekomendasi)</option>
                    <option value="16:00">16.00 (4 Sore)</option>
                    <option value="17:00">17.00 (5 Sore - Selesai Kerja)</option>
                    <option value="19:00">19.00 (Malam)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-white px-4 text-xs font-bold text-zinc-950 hover:bg-zinc-200 transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Simpan Pengingat Email</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          /* TAMPILAN GRATIS: GOOGLE CALENDAR & .ICS (JAM 3 SORE) */
          <div className="space-y-3.5">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-1.5">
              <span className="text-xs font-bold text-white block">
                Pengingat Kalender di Perangkat Anda (Mulai 15.00 / 3 Sore)
              </span>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Pengguna Gratis menggunakan pengingat kalender lokal di HP atau laptop. Kalender berulang otomatis setiap hari kerja (Senin–Jumat) pukul 15.00 dengan alarm dan tautan langsung ke logbook harian.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleOpenGoogleCalendar}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-bold text-zinc-950 hover:bg-zinc-200 transition shadow-[0_0_15px_rgba(255,255,255,0.2)] cursor-pointer active:scale-[0.99]"
              >
                <Calendar className="h-4 w-4 text-cyan-600" />
                <span>Tambah ke Google Calendar (15.00)</span>
                <ExternalLink className="h-3 w-3 text-zinc-500" />
              </button>

              <button
                type="button"
                onClick={handleDownloadICal}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-semibold text-white hover:bg-white/[0.08] transition cursor-pointer active:scale-[0.99]"
              >
                <Download className="h-4 w-4 text-cyan-400" />
                <span>Unduh File Kalender (.ics)</span>
              </button>
            </div>

            {/* Teaser Pro Upgrade */}
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/15 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-400 shrink-0" />
                <span className="text-[11px] text-cyan-200 leading-relaxed">
                  Ingin pengingat dikirim <strong>otomatis ke email</strong> jam 3 sore tanpa kalender manual?
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  window.scrollTo({ top: 120, behavior: 'smooth' });
                }}
                className="shrink-0 text-xs font-bold text-cyan-400 hover:underline w-fit cursor-pointer"
              >
                Pilih Paket Pro →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. CRUD Edit Informasi Profil */}
      <div className="verity-card rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
          <User className="h-4 w-4 text-cyan-400" />
          <span>Informasi Akun (Edit Profil)</span>
        </h2>

        <form onSubmit={handleUpdateProfile} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="full_name" className="block text-xs font-medium text-zinc-300">
                Nama Lengkap
              </label>
              <input
                id="full_name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#16161c] p-2.5 text-xs text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-xs font-medium text-zinc-300">
                Username
              </label>
              <div className="mt-1 relative flex items-center">
                <span className="absolute left-3 text-xs text-zinc-500">@</span>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#16161c] p-2.5 pl-7 text-xs text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="email_ro" className="block text-xs font-medium text-zinc-300">
                Alamat Email
              </label>
              <input
                id="email_ro"
                type="email"
                disabled
                value={user?.email || ''}
                className="mt-1 w-full rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-xs text-zinc-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="instansi" className="block text-xs font-medium text-zinc-300">
                Instansi / Perusahaan Magang
              </label>
              <input
                id="instansi"
                type="text"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#16161c] p-2.5 text-xs text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-white px-5 text-xs font-bold text-zinc-950 hover:bg-zinc-200 transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Simpan Perubahan Profil</span>
          </button>
        </form>
      </div>

      {/* 4. CRUD Ganti Kata Sandi */}
      <div className="verity-card rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
          <Lock className="h-4 w-4 text-cyan-400" />
          <span>Keamanan (Ubah Kata Sandi)</span>
        </h2>

        <form onSubmit={handleUpdatePassword} className="space-y-3.5">
          <div>
            <label htmlFor="old_pwd" className="block text-xs font-medium text-zinc-300">
              Kata Sandi Saat Ini
            </label>
            <input
              id="old_pwd"
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="••••••••••"
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#16161c] p-2.5 text-xs text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="new_pwd" className="block text-xs font-medium text-zinc-300">
                Kata Sandi Baru (Min. 10 Karakter)
              </label>
              <input
                id="new_pwd"
                type="password"
                required
                minLength={10}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••"
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#16161c] p-2.5 text-xs text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="cfm_pwd" className="block text-xs font-medium text-zinc-300">
                Ulangi Kata Sandi Baru
              </label>
              <input
                id="cfm_pwd"
                type="password"
                required
                minLength={10}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••"
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#16161c] p-2.5 text-xs text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-5 text-xs font-bold text-white hover:bg-white/[0.08] transition disabled:opacity-50 cursor-pointer"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Perbarui Kata Sandi</span>
          </button>
        </form>
      </div>

      {/* 5. Kedaulatan Data & Hapus Akun (UU PDP) */}
      <div className="rounded-2xl border border-red-500/30 bg-red-950/15 p-5 space-y-3">
        <div className="flex items-center gap-2 text-red-400">
          <Trash2 className="h-4 w-4" />
          <h2 className="text-xs font-bold uppercase tracking-wider">Hapus Akun & Data (Kedaulatan UU PDP)</h2>
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed">
          Tindakan ini akan memusnahkan seluruh rekaman akun Anda beserta riwayat laporan logbook secara permanen dari server.
        </p>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Hapus Akun Saya</span>
        </button>
      </div>

      {/* Modal Hapus Akun */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="verity-card w-full max-w-sm rounded-3xl border border-red-500/40 p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              <span>Konfirmasi Pemusnahan Akun</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Ketik kata <strong className="text-white font-mono">HAPUS</strong> di bawah untuk mengonfirmasi penghapusan akun Anda secara permanen.
            </p>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="Ketik HAPUS"
              className="w-full text-center rounded-xl border border-red-500/40 bg-[#16161c] p-2.5 text-xs text-white focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-zinc-300 hover:text-white"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteAccount}
                className="h-10 w-full rounded-xl bg-red-600 text-xs font-bold text-white hover:bg-red-500"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
