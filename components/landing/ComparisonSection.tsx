'use client';

import { motion } from 'motion/react';
import { LetterRevealHeading } from '@/components/ui/LetterRevealHeading';

export function ComparisonSection() {
  const comparisonItems = [
    {
      feature: 'Panjang Karakter',
      manual: 'Sering ditolak formulir karena terlalu pendek',
      lapormagang: 'Otomatis di atas 100 karakter per kolom',
    },
    {
      feature: 'Fakta Kegiatan',
      manual: 'AI generik sering mengarang tugas fiktif',
      lapormagang: 'Hanya merapikan fakta catatan Anda',
    },
    {
      feature: 'Deteksi Repetisi',
      manual: 'Laporan monoton berisiko teguran mentor',
      lapormagang: 'Analisis kemiripan dengan laporan lalu',
    },
    {
      feature: 'Pengingat Waktu',
      manual: 'Sering terlewat saat lelah malam hari',
      lapormagang: 'Notifikasi Telegram & Web Push terarah',
    },
    {
      feature: 'Keamanan Akun',
      manual: 'Ekstensi ilegal meminta password pemerintah',
      lapormagang: 'Nol akses password, submit tetap mandiri',
    },
  ];

  return (
    <section id="perbandingan" className="relative border-t border-white/[0.06] bg-[#09090b] py-16 sm:py-20">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto">
          <LetterRevealHeading
            as="h3"
            text="Perbandingan Solusi"
            className="text-2xl sm:text-3xl"
          />
          <p className="mt-2 text-xs sm:text-sm text-zinc-400">
            Mengapa menggunakan generator terstandar lebih aman dibanding cara konvensional.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-10 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121216]/80 backdrop-blur-xl"
        >
          <div className="grid grid-cols-12 border-b border-white/[0.08] bg-[#16161b] p-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
            <div className="col-span-5">Aspek</div>
            <div className="col-span-3 text-zinc-500">Manual / Biasa</div>
            <div className="col-span-4 text-cyan-400 font-bold">LaporMagang</div>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {comparisonItems.map((item) => (
              <div
                key={item.feature}
                className="grid grid-cols-12 p-3 text-xs items-center hover:bg-white/[0.01] transition"
              >
                <div className="col-span-5 font-medium text-white">
                  {item.feature}
                </div>

                <div className="col-span-3 flex items-start gap-1.5 text-zinc-500">
                  <span className="text-red-400/80 font-mono text-[11px]">✕</span>
                  <span className="text-[11px]">{item.manual}</span>
                </div>

                <div className="col-span-4 flex items-start gap-1.5 text-zinc-200">
                  <span className="text-cyan-400 font-mono text-[11px]">✓</span>
                  <span className="text-[11px] text-white font-medium">{item.lapormagang}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
