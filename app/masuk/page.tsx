'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ShieldCheck, Lock, Mail, User, Building, AlertCircle } from 'lucide-react';
import { localDb } from '@/lib/local-db';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/app/hari-ini';

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [instanceName, setInstanceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 10) {
      setErrorMessage('Kata sandi wajib minimal 10 karakter.');
      return;
    }

    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        mode === 'login'
          ? { email, password }
          : { email, password, full_name: fullName, instance_name: instanceName };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.status === 'success') {
        // Sinkronisasi data user aktif ke client local state
        localDb.setCurrentUser(data.user);
        router.push(redirectUrl);
      } else {
        setErrorMessage(data.message || 'Gagal memproses autentikasi.');
      }
    } catch {
      setErrorMessage('Terjadi kendala jaringan. Coba beberapa saat lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verity-card rounded-3xl p-6 sm:p-8 shadow-2xl">
      {/* Tab Switcher: Masuk vs Daftar */}
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#16161c] p-1 border border-white/[0.08] mb-6">
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setErrorMessage(null);
          }}
          className={`rounded-xl py-2 text-xs font-bold transition ${
            mode === 'login'
              ? 'bg-white text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Masuk Akun
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('register');
            setErrorMessage(null);
          }}
          className={`rounded-xl py-2 text-xs font-bold transition ${
            mode === 'register'
              ? 'bg-white text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Daftar Baru
        </button>
      </div>

      {errorMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-950/40 border border-red-500/30 p-3 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' && (
          <>
            <div>
              <label htmlFor="fullname" className="block text-xs font-semibold text-white">
                Nama Lengkap Peserta <span className="text-cyan-400">*</span>
              </label>
              <div className="mt-1 relative">
                <input
                  id="fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Rian Pratama"
                  className="w-full rounded-xl border border-white/10 bg-[#16161c] p-3 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="instance" className="block text-xs font-semibold text-white">
                Instansi / Tempat Magang <span className="text-cyan-400">*</span>
              </label>
              <div className="mt-1 relative">
                <input
                  id="instance"
                  type="text"
                  required
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  placeholder="Contoh: Dinas Kominfo / PT Teknologi Bangsa"
                  className="w-full rounded-xl border border-white/10 bg-[#16161c] p-3 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
                />
              </div>
            </div>
          </>
        )}

        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-white">
            Alamat Email <span className="text-cyan-400">*</span>
          </label>
          <div className="mt-1 relative">
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full rounded-xl border border-white/10 bg-[#16161c] p-3 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-xs font-semibold text-white">
              Kata Sandi <span className="text-cyan-400">*</span>
            </label>
            <span className="text-[10px] text-zinc-500">Minimal 10 karakter</span>
          </div>
          <div className="mt-1 relative">
            <input
              id="password"
              type="password"
              required
              minLength={10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              className="w-full rounded-xl border border-white/10 bg-[#16161c] p-3 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
            />
          </div>
        </div>

        {/* Peringatan Standar Keamanan Maganghub */}
        <div className="flex items-start gap-2 rounded-xl bg-cyan-950/20 p-3 text-[11px] text-cyan-200 border border-cyan-800/30">
          <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-400 mt-0.5" />
          <span>
            <strong>Bukan akun SIAP Kerja Kemnaker.</strong> Gunakan kata sandi baru khusus untuk LaporMagang. Kami tidak pernah meminta password portal resmi pemerintah Anda.
          </span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-white text-xs font-bold text-zinc-950 hover:bg-zinc-200 transition shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <span>Memproses...</span>
          ) : (
            <>
              <span>{mode === 'login' ? 'Masuk ke Akun' : 'Daftar Akun Baru'}</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 border-t border-white/[0.06] pt-4 text-center">
        <Link href="/" className="text-xs text-zinc-400 hover:text-white transition">
          ← Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}

export default function MasukPage() {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#09090b] text-[#f4f4f5] px-4 py-12 sm:px-6 verity-mesh-bg">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex items-center justify-center group">
          <span className="text-xl font-bold tracking-tight text-white transition-colors group-hover:text-zinc-200">
            LaporMagang<span className="text-cyan-400">.</span>
          </span>
        </Link>
        <h2 className="mt-4 text-center text-xl font-bold tracking-tight text-white">
          Autentikasi Akun Peserta
        </h2>
        <p className="mt-1 text-center text-xs text-zinc-400">
          Masuk atau daftar untuk menyimpan riwayat logbook ke database Anda secara aman.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense fallback={<div className="text-center text-xs text-zinc-400">Memuat...</div>}>
          <AuthContent />
        </Suspense>
      </div>
    </div>
  );
}
