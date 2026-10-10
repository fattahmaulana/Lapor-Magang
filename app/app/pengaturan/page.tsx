'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Bell,
  Send,
  Calendar,
  Smartphone,
  Trash2,
  ShieldAlert,
  QrCode,
  Check,
  ExternalLink,
  X,
  CreditCard,
  Sparkles,
  User,
  LogOut,
} from 'lucide-react';
import { generateICalContent, generateGoogleCalendarUrl } from '@/lib/reminders/calendar';
import { localDb, UserProfile } from '@/lib/local-db';
import { useAppDialog } from '@/components/ui/dialog-provider';

const PRO_TIERS = [
  { id: 'pro_1_month', label: '1 Bulan', price: 'Rp5.000', amount: 5000, image: '/qris-5k.jpeg' },
  { id: 'pro_3_months', label: '3 Bulan', price: 'Rp12.000', amount: 12000, image: '/qris-12k.jpeg' },
  { id: 'pro_6_months', label: '6 Bulan', price: 'Rp22.000', amount: 22000, image: '/qris-22k.jpeg' },
] as const;

type ProTierId = (typeof PRO_TIERS)[number]['id'];

export default function PengaturanPage() {
  const { showDialog } = useAppDialog();
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      return localDb.getCurrentUser();
    }
    return null;
  });

  const [timezone, setTimezone] = useState<'WIB' | 'WITA' | 'WIT'>(() => {
    if (typeof window !== 'undefined') {
      const u = localDb.getCurrentUser();
      return u?.timezone || 'WIB';
    }
    return 'WIB';
  });
  const [schedules] = useState<string[]>(['17:00', '20:00', '22:30']);
  const [telegramConnected, setTelegramConnected] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const u = localDb.getCurrentUser();
      return Boolean(u?.reminder_email_enabled || false);
    }
    return false;
  });
  const [webPushEnabled, setWebPushEnabled] = useState(false);
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<ProTierId>('pro_1_month');
  const [paymentOrder, setPaymentOrder] = useState<{
    orderId: string;
    amount: number;
    snapToken?: string;
    redirectUrl?: string;
  } | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleted, setIsDeleted] = useState(false);

  const currentTierInfo = PRO_TIERS.find((t) => t.id === selectedTier) || PRO_TIERS[0];

  const handleSelectTier = (tierId: ProTierId) => {
    setSelectedTier(tierId);
    const tierObj = PRO_TIERS.find((t) => t.id === tierId) || PRO_TIERS[0];
    if (paymentOrder) {
      setPaymentOrder((prev) => (prev ? { ...prev, amount: tierObj.amount } : null));
    }
  };

  const handleTimezoneChange = (tz: 'WIB' | 'WITA' | 'WIT') => {
    setTimezone(tz);
    const updated = localDb.updateProfile({ timezone: tz });
    if (updated) setUser(updated);
  };

  const handleToggleTelegram = () => {
    const next = !telegramConnected;
    setTelegramConnected(next);
    const updated = localDb.updateProfile({ reminder_email_enabled: next });
    if (updated) setUser(updated);
  };

  const handleDownloadICal = () => {
    const icsContent = generateICalContent();
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pengingat-lapormagang.ics';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenGoogleCalendar = () => {
    window.open(generateGoogleCalendarUrl(), '_blank');
  };

  const handleToggleWebPush = async () => {
    if (!('Notification' in window)) {
      showDialog({
        type: 'info',
        title: 'Tidak Didukung',
        message: 'Peramban kamu tidak mendukung fitur notifikasi web.',
      });
      return;
    }

    if (Notification.permission === 'granted') {
      setWebPushEnabled(!webPushEnabled);
    } else {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setWebPushEnabled(true);
      }
    }
  };

  const handleGeneratePayment = () => {
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
        setUser(data.user);
        localDb.setCurrentUser(data.user);
        setShowQrisModal(false);
        showDialog({
          type: 'success',
          title: '🎉 Pembayaran Terkonfirmasi!',
          message: 'Status akunmu telah resmi aktif sebagai Paket Pro!',
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

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    localDb.setCurrentUser(null);
    window.location.href = '/masuk';
  };

  const handleDeleteAllData = () => {
    if (deleteConfirmation !== 'HAPUS') {
      showDialog({
        type: 'error',
        title: 'Konfirmasi Diperlukan',
        message: 'Ketik kata HAPUS dengan huruf kapital untuk mengonfirmasi.',
      });
      return;
    }

    localStorage.clear();
    setIsDeleted(true);
    setShowDeleteModal(false);
    setTimeout(() => {
      window.location.href = '/';
    }, 1500);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-base font-bold text-white">Pengaturan & Saluran</h1>
        <p className="text-xs text-zinc-400">
          Atur zona waktu, kanal pengingat harian, dan kedaulatan datamu.
        </p>
      </div>

      {isDeleted && (
        <div className="rounded-xl bg-red-950/40 border border-red-500/40 p-4 text-xs font-semibold text-red-300">
          Seluruh data telah dihapus permanen. Mengalihkan ke halaman awal...
        </div>
      )}

      {/* Informasi Akun Peserta */}
      {user && (
        <div className="verity-card rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <User className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{user.full_name || 'Peserta Magang'}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                    user.is_pro
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-white/10 bg-white/[0.04] text-zinc-400'
                  }`}
                >
                  {user.is_pro ? '⭐ Paket Pro' : 'Gratis'}
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 block">
                {user.email} • {user.instance_name || 'Instansi Pemagangan'}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-red-400 hover:border-red-500/30 transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      )}

      {/* Zona Waktu & Jadwal Pengingat */}
      <div className="verity-card rounded-2xl p-4 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
          <Bell className="h-4 w-4 text-cyan-400" />
          <span>Jadwal Pengingat Harian (Gratis)</span>
        </h2>

        <div className="mt-3">
          <label className="text-xs font-medium text-zinc-400 block">Zona Waktu Kamu:</label>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {(['WIB', 'WITA', 'WIT'] as const).map((tz) => (
              <button
                key={tz}
                onClick={() => handleTimezoneChange(tz)}
                className={`min-h-[42px] rounded-xl text-xs font-semibold transition border ${
                  timezone === tz
                    ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                    : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white'
                }`}
              >
                {tz}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs font-medium text-zinc-400 block">
            Jadwal Bawaan (Sebelum 23.59):
          </label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {schedules.map((time) => (
              <span
                key={time}
                className="tabular-nums rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-bold text-white font-mono"
              >
                {time} {timezone}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-zinc-400">
            Pengingat otomatis berhenti begitu kamu menekan tombol &lsquo;Tandai Sudah Lapor&rsquo;.
          </p>
        </div>
      </div>

      {/* Integrasi Kanal Pengingat */}
      <div className="verity-card rounded-2xl p-4 shadow-sm space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-white">
          Saluran Pengingat Aktif
        </h2>

        {/* Telegram */}
        <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Telegram Bot</span>
              <span className="text-[11px] text-zinc-400">
                {telegramConnected ? 'Terhubung (@lapormagangbot)' : 'Belum terhubung'}
              </span>
            </div>
          </div>
          <button
            onClick={handleToggleTelegram}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white hover:bg-white/[0.08] transition"
          >
            {telegramConnected ? 'Putuskan' : 'Hubungkan'}
          </button>
        </div>

        {/* Web Push */}
        <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Notifikasi Layar Kunci (PWA)</span>
              <span className="text-[11px] text-zinc-400">
                {webPushEnabled ? 'Notifikasi browser diizinkan' : 'Belum diaktifkan'}
              </span>
            </div>
          </div>
          <button
            onClick={handleToggleWebPush}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white hover:bg-white/[0.08] transition"
          >
            {webPushEnabled ? 'Nonaktifkan' : 'Aktifkan'}
          </button>
        </div>

        {/* Kalender */}
        <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Sinkronisasi Kalender</span>
              <span className="text-[11px] text-zinc-400">Google Calendar & format .ics</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleOpenGoogleCalendar}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/[0.08] transition"
            >
              Google Cal
            </button>
            <button
              onClick={handleDownloadICal}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/[0.08] transition"
            >
              Unduh .ics
            </button>
          </div>
        </div>
      </div>

      {/* Pembayaran Paket Pro QRIS */}
      <div className="verity-card rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              Upgrade ke Paket Pro
            </h2>
          </div>
          <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
            QRIS Dinamis
          </span>
        </div>
        <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
          Buka akses draf harian tanpa batas, deteksi kemiripan Trigram Jaccard, rekap mingguan, dan slide presentasi evaluasi mentor.
        </p>

        <button
          onClick={() => setShowQrisModal(true)}
          className="mt-3 flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-white text-xs font-bold text-zinc-950 hover:bg-zinc-200 transition shadow-[0_0_20px_rgba(255,255,255,0.2)]"
        >
          <QrCode className="h-4 w-4" />
          <span>Beli Paket Pro (Mulai Rp5.000)</span>
        </button>
      </div>

      {/* Zona Privasi UU PDP: Hapus Semua Data */}
      <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-4">
        <div className="flex items-center gap-2 text-red-400">
          <ShieldAlert className="h-4 w-4" />
          <h2 className="text-xs font-bold uppercase tracking-wider">
            Kedaulatan Data (UU PDP No. 27/2022)
          </h2>
        </div>
        <p className="mt-1.5 text-xs text-zinc-300 leading-relaxed">
          Kamu memegang hak penuh atas datamu. Tekan tombol di bawah untuk menghapus seluruh draf logbook, profil, dan jadwal dari peramban & server.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="mt-3 flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Hapus Semua Data Sekarang</span>
        </button>
      </div>

      {/* Modal QRIS */}
      {showQrisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="verity-card w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Pembayaran QRIS Dinamis</h3>
              </div>
              <button
                onClick={() => setShowQrisModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-xs font-medium text-zinc-400 block">Pilih Paket:</label>
              <div className="grid grid-cols-3 gap-1.5">
                {PRO_TIERS.map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => handleSelectTier(tier.id)}
                    className={`rounded-xl p-2 text-center text-xs transition border cursor-pointer ${
                      selectedTier === tier.id
                        ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-[0_0_12px_rgba(34,211,238,0.25)] font-bold'
                        : 'border-white/10 bg-white/[0.02] text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="block text-[10px] font-semibold">{tier.label}</span>
                    <span className="block font-bold text-white mt-0.5">{tier.price}</span>
                  </button>
                ))}
              </div>
            </div>

            {paymentOrder ? (
              <div className="mt-4 text-center space-y-4">
                <div className="rounded-2xl border border-cyan-500/30 bg-white/[0.03] p-3 text-center">
                  <div className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-300 mb-1">
                    <span>Paket: {currentTierInfo.label}</span>
                  </div>
                  <span className="text-[10px] font-bold text-cyan-400 uppercase font-mono block">
                    Fattah Maulana, Service
                  </span>
                  <div className="text-2xl font-extrabold text-cyan-300 mt-0.5">
                    Rp {currentTierInfo.amount.toLocaleString('id-ID')}
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 block">
                    NMID: ID1026613383482 • {paymentOrder.orderId}
                  </span>
                </div>

                {/* Foto QRIS Resmi Sesuai Paket */}
                <div className="mx-auto max-w-[220px] overflow-hidden rounded-2xl border-2 border-white/20 bg-white p-2 shadow-2xl">
                  <Image
                    src={currentTierInfo.image}
                    alt={`QRIS Fattah Maulana, Service - ${currentTierInfo.label}`}
                    width={220}
                    height={300}
                    className="w-full h-auto rounded-xl object-contain block"
                    priority
                  />
                </div>

                <div className="space-y-2">
                  <button
                    onClick={handleConfirmQrisPayment}
                    disabled={paymentLoading}
                    className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 px-4 text-xs font-bold text-zinc-950 hover:brightness-110 transition shadow-[0_0_20px_rgba(52,211,153,0.3)] disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    <span>{paymentLoading ? 'Memproses...' : 'Saya Sudah Transfer (Konfirmasi Pro)'}</span>
                  </button>

                  <button
                    onClick={() => setPaymentOrder(null)}
                    className="text-xs text-zinc-400 hover:text-white py-1"
                  >
                    Ganti Pilihan Paket
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <button
                  onClick={handleGeneratePayment}
                  disabled={paymentLoading}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-white text-xs font-bold text-zinc-950 hover:bg-zinc-200 transition shadow-[0_0_15px_rgba(255,255,255,0.2)] disabled:opacity-50 cursor-pointer"
                >
                  <QrCode className="h-4 w-4" />
                  <span>{paymentLoading ? 'Menyiapkan...' : 'Tampilkan Kode QRIS'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Hapus Data */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="verity-card w-full max-w-sm rounded-3xl border-red-500/40 p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 text-red-400">
              <Trash2 className="h-4 w-4" />
              <span>Konfirmasi Hapus Seluruh Data</span>
            </h3>
            <p className="mt-2 text-xs text-zinc-300 leading-relaxed">
              Tindakan ini tidak dapat dibatalkan. Seluruh rekaman log harian dan setelan akun Anda akan dimusnahkan seketika.
            </p>
            <div className="mt-4">
              <label className="text-[11px] text-zinc-400 block mb-1">
                Ketik kata <strong className="text-white">HAPUS</strong> untuk mengonfirmasi:
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="HAPUS"
                className="w-full rounded-xl border border-white/10 bg-[#16161b] p-2.5 text-xs text-white focus:border-red-500 focus:outline-none"
              />
            </div>
            <div className="mt-5 flex items-center gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-2 text-xs font-medium text-white hover:bg-white/[0.08]"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteAllData}
                className="flex-1 rounded-xl bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              >
                Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
