'use client';

import { motion } from 'motion/react';
import { LetterRevealHeading } from '@/components/ui/LetterRevealHeading';

export function ProblemSection() {
  const points = [
    {
      code: '01',
      tag: 'TENGGAT',
      title: 'Batas Kunci 23.59',
      desc: 'Formulir Maganghub tertutup tepat tengah malam. Lewat tenggat, hari tersebut dihitung alfa.',
    },
    {
      code: '02',
      tag: 'RISIKO',
      title: 'Uang Saku Terpotong',
      desc: 'Kehadiran harian adalah dasar verifikasi pencairan bantuan biaya hidup pemagangan.',
    },
    {
      code: '03',
      tag: 'FORMAT',
      title: 'Minimal 100 Karakter',
      desc: 'Setiap kolom (Aktivitas, Pelajaran, Kendala) ditolak sistem jika catatan terlalu singkat.',
    },
  ];

  return (
    <section id="aturan" className="relative border-t border-white/[0.06] bg-[#0c0c0e] py-16 sm:py-20">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto">
          <LetterRevealHeading
            as="h3"
            text="Tiga Aturan Kritis Maganghub"
            className="text-2xl sm:text-3xl"
          />
          <p className="mt-2 text-xs sm:text-sm text-zinc-400">
            Hal mendasar yang sering terlewatkan saat lelah setelah jam kerja magang.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {points.map((p, idx) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="verity-card rounded-2xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <span className="font-mono text-xs font-bold text-cyan-400">
                    {p.code}
                  </span>
                  <span className="font-mono text-[10px] tracking-wider text-zinc-500">
                    {p.tag}
                  </span>
                </div>
                <h4 className="mt-4 text-sm font-bold text-white font-display">
                  {p.title}
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                  {p.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
