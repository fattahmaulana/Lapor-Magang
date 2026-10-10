'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { LetterRevealHeading } from '@/components/ui/LetterRevealHeading';

export function PricingTable() {
  const [period, setPeriod] = useState<'month' | 'quarter'>('quarter');

  return (
    <section id="harga" className="relative border-t border-white/[0.06] bg-[#0c0c0e] py-16 sm:py-20">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto">
          <LetterRevealHeading
            as="h3"
            text="Pilihan Paket Transparan"
            className="text-2xl sm:text-3xl"
          />
          <p className="mt-2 text-xs sm:text-sm text-zinc-400">
            Pengingat selalu gratis. Paket Pro untuk fleksibilitas penuh selama magang.
          </p>

          {/* Toggle */}
          <div className="mt-6 inline-flex items-center rounded-full border border-white/10 bg-[#16161b] p-1">
            <button
              type="button"
              onClick={() => setPeriod('month')}
              className={`rounded-full px-4 py-1 text-xs font-medium transition-all ${
                period === 'month'
                  ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              1 Bulan
            </button>
            <button
              type="button"
              onClick={() => setPeriod('quarter')}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1 text-xs font-medium transition-all ${
                period === 'quarter'
                  ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>3 Bulan</span>
              <span className="rounded-full bg-cyan-500/20 px-1.5 py-0.2 text-[10px] font-bold text-cyan-400">
                Hemat 20%
              </span>
            </button>
          </div>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {/* Card Gratis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="verity-card rounded-2xl p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-white font-display">Gratis</h4>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-xs text-zinc-400 font-mono">
                  Rp0
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                Untuk peserta yang butuh pengingat harian.
              </p>

              <div className="mt-5 border-t border-white/[0.06] pt-5">
                <div className="text-2xl font-extrabold text-white font-display">Rp 0</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">Gratis selamanya</div>
              </div>

              <ul className="mt-6 space-y-2.5 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
                  <span>Pengingat harian Telegram & Web</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
                  <span>10 draf laporan per bulan</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
                  <span>Riwayat 7 hari terakhir</span>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Link
                href="/app/hari-ini"
                className="flex h-10 w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-white hover:bg-white/[0.08] transition"
              >
                Gunakan Gratis
              </Link>
            </div>
          </motion.div>

          {/* Card Pro */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative rounded-2xl border border-cyan-400/40 bg-[#14141a]/90 p-6 flex flex-col justify-between shadow-[0_0_30px_rgba(34,211,238,0.1)]"
          >
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-white font-display">Pro</h4>
                <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs font-semibold text-cyan-300 font-mono">
                  POPULER
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                Akses penuh tanpa batas revisi dan slide PPT.
              </p>

              <div className="mt-5 border-t border-white/[0.06] pt-5">
                <div className="text-2xl font-extrabold text-white font-display">
                  {period === 'quarter' ? 'Rp 12.000' : 'Rp 5.000'}
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  {period === 'quarter' ? 'Untuk 3 bulan (Rp4.000/bln)' : 'Untuk 1 bulan'}
                </div>
              </div>

              <ul className="mt-6 space-y-2.5 text-xs text-zinc-200">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
                  <span>Draf tak terbatas (bebas revisi)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
                  <span>Deteksi kemiripan laporan lalu</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
                  <span>Rekap mingguan & 5 slide presentasi</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
                  <span>Input suara & unggah dokumen</span>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Link
                href="/app/hari-ini"
                className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-white text-xs font-bold text-zinc-950 hover:bg-zinc-200 transition shadow-[0_0_15px_rgba(255,255,255,0.2)]"
              >
                <span>Pilih Paket Pro →</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
