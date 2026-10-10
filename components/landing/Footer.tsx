'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { LetterRevealHeading } from '@/components/ui/LetterRevealHeading';

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-[#09090b] pt-16 pb-12">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
        {/* Banner CTA Penutup */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative mb-12 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#121217] to-[#0a0a0d] p-8 sm:p-12 text-center"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-gradient-to-b from-cyan-500/15 to-transparent blur-[90px] pointer-events-none" />

          <div className="relative z-10 max-w-md mx-auto">
            <LetterRevealHeading
              as="h3"
              text="Laporan Magang Siap Tepat Waktu"
              className="text-2xl sm:text-3xl"
            />
            <p className="mt-2 text-xs sm:text-sm text-zinc-400">
              Mulai gratis hari ini. Dapatkan pengingat harian dan susun draf sebelum 23.59.
            </p>
            <div className="mt-6 flex justify-center">
              <Link
                href="/app/hari-ini"
                className="inline-flex h-11 items-center justify-center rounded-full bg-white px-7 text-xs sm:text-sm font-semibold text-zinc-950 shadow-[0_0_25px_rgba(255,255,255,0.2)] transition hover:bg-zinc-200 active:scale-95"
              >
                <span>Buka Aplikasi Sekarang →</span>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Disclaimer Minimal */}
        <p className="text-center text-[11px] text-zinc-500 leading-relaxed max-w-xl mx-auto">
          Bukan aplikasi resmi Kementerian Ketenagakerjaan RI. Alat bantu mandiri pihak ketiga untuk peserta Pemagangan Nasional Maganghub.
        </p>

        {/* Tautan Navigasi Footer */}
        <div className="mt-6 flex flex-wrap justify-center gap-5 border-t border-white/[0.04] pt-6 text-xs text-zinc-400 font-mono text-[11px]">
          <Link href="/kebijakan-privasi" className="hover:text-white transition">
            Privasi
          </Link>
          <Link href="/syarat-layanan" className="hover:text-white transition">
            Syarat Layanan
          </Link>
          <Link href="/kebijakan-refund" className="hover:text-white transition">
            Refund
          </Link>
          <a href="mailto:bantuan@lapormagang.id" className="hover:text-white transition">
            Kontak
          </a>
          <Link href="/admin" className="text-zinc-500 hover:text-cyan-400 transition">
            Portal Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
