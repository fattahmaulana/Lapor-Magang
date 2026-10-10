'use client';

import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import React, { useState } from 'react';
import { LetterRevealHeading } from '@/components/ui/LetterRevealHeading';

export function TelegramPreview() {
  const [markedDone, setMarkedDone] = useState(false);

  return (
    <section className="relative border-t border-white/[0.06] bg-[#0c0c0e] py-16 sm:py-20">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          {/* Sisi Kiri */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <LetterRevealHeading
              as="h3"
              text="Pengingat di Ponselmu"
              className="text-2xl sm:text-3xl"
            />
            <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Notifikasi terjadwal pukul 17.00, 20.00, dan 22.30. Begitu laporan ditandai selesai, pengingat otomatis berhenti.
            </p>

            <div className="mt-6 space-y-2.5">
              <div className="verity-card rounded-xl p-3 flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white font-display">Bot Telegram</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Tombol &lsquo;Sudah Lapor&rsquo; & &lsquo;Ingatkan Nanti&rsquo;</p>
                </div>
                <span className="font-mono text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">
                  GRATIS
                </span>
              </div>

              <div className="verity-card rounded-xl p-3 flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white font-display">Web Push Layar Kunci</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Muncul di layar ponsel tanpa membuka browser</p>
                </div>
                <span className="font-mono text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">
                  PWA
                </span>
              </div>

              <div className="verity-card rounded-xl p-3 flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white font-display">Sinkronisasi Kalender</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Integrasi Google Calendar & file .ics</p>
                </div>
                <span className="font-mono text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">
                  SYNC
                </span>
              </div>
            </div>
          </motion.div>

          {/* Sisi Kanan: Mockup Telegram Dark */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative mx-auto w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#121217] p-3.5 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5 px-1">
              <div>
                <span className="text-xs font-bold text-white block font-display">LaporMagang Bot</span>
                <span className="text-[10px] text-emerald-400 font-mono">online • aktif</span>
              </div>
              <span className="font-mono text-[10px] text-zinc-500">20:00</span>
            </div>

            <div className="mt-3 space-y-2">
              <div className="rounded-xl rounded-tl-xs bg-[#1a1a22] border border-white/[0.04] p-3 text-xs">
                <p className="font-semibold text-cyan-300 font-mono text-[11px]">
                  PENGINGAT LAPORAN HARIAN
                </p>
                <p className="mt-1 text-[11px] text-zinc-300">
                  Sudah pukul <strong>20.00 WIB</strong>. Laporan harianmu belum ditandai selesai.
                </p>
                <div className="mt-2 text-[10px] font-mono text-amber-400 border-t border-white/[0.04] pt-1.5">
                  Sisa 3 jam 59 menit sebelum 23.59
                </div>
              </div>

              {/* Tombol Aksi */}
              <div className="space-y-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setMarkedDone(!markedDone)}
                  className={`flex h-8 w-full items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition ${
                    markedDone
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-emerald-500 text-zinc-950 font-bold hover:bg-emerald-400'
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{markedDone ? 'Laporan Ditandai Selesai' : 'Sudah Lapor'}</span>
                </button>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    className="h-7 rounded-lg border border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]"
                  >
                    Ingatkan 30 mnt
                  </button>
                  <a
                    href="/app/hari-ini"
                    className="flex h-7 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20"
                  >
                    Buka App
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
