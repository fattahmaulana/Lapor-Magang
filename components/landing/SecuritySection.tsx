'use client';

import { motion } from 'motion/react';
import { LetterRevealHeading } from '@/components/ui/LetterRevealHeading';

export function SecuritySection() {
  const securityItems = [
    {
      code: '01',
      tag: 'KREDENSIAL',
      title: 'Tanpa Password Pemerintah',
      desc: 'Tidak pernah meminta atau menyimpan kata sandi akun SIAP Kerja / Maganghub.',
    },
    {
      code: '02',
      tag: 'MANDIRI',
      title: 'Submit Mandiri Pengguna',
      desc: 'Tidak ada scraping atau kirim otomatis. Anda yang memeriksa dan mengirimkan sendiri.',
    },
    {
      code: '03',
      tag: 'TEMPORER',
      title: 'Catatan Mentah Tidak Disimpan',
      desc: 'Teks kasar hanya diproses sesaat untuk menyusun draf lalu segera dibersihkan.',
    },
    {
      code: '04',
      tag: 'HAK HAPUS',
      title: 'Hapus Semua Data Seketika',
      desc: 'Tersedia tombol satu klik untuk menghapus seluruh rekaman dari sistem kapan saja.',
    },
  ];

  return (
    <section className="relative border-t border-white/[0.06] bg-[#09090b] py-16 sm:py-20">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto">
          <LetterRevealHeading
            as="h3"
            text="Privasi & Keamanan"
            className="text-2xl sm:text-3xl"
          />
          <p className="mt-2 text-xs sm:text-sm text-zinc-400">
            Arsitektur minimasi data untuk kenyamanan peserta magang.
          </p>
        </div>

        <div className="mt-10 grid gap-3.5 sm:grid-cols-2">
          {securityItems.map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              className="verity-card rounded-2xl p-4.5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                  <span className="font-mono text-xs font-bold text-cyan-400">
                    {item.code}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500">
                    {item.tag}
                  </span>
                </div>
                <h4 className="mt-3.5 text-sm font-bold text-white font-display">
                  {item.title}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
