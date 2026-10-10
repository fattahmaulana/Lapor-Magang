'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { LetterRevealHeading } from '@/components/ui/LetterRevealHeading';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: 'Apakah aplikasi ini resmi dari Kemnaker?',
    answer:
      'Bukan. LaporMagang adalah alat bantu independen pihak ketiga untuk membantu peserta pemagangan mengingat jadwal dan menyusun draf laporan harian.',
  },
  {
    question: 'Apakah aman masuk menggunakan email?',
    answer:
      'Aman. Email hanya digunakan untuk menerima kode OTP masuk dan pengingat jika diaktifkan. Kami tidak meminta kata sandi pemerintah Anda.',
  },
  {
    question: 'Apakah draf laporan mengarang kegiatan fiktif?',
    answer:
      'Tidak. Generator hanya merapikan kata-kata dari catatan nyata yang Anda tulis ke dalam 3 kolom resmi (Aktivitas, Pelajaran, Kendala).',
  },
  {
    question: 'Bagaimana cara membayar paket Pro?',
    answer:
      'Pembayaran bersifat sekali bayar (pre-paid) via QRIS tanpa auto-debit kartu. Tidak ada pemotongan saldo berulang secara otomatis.',
  },
  {
    question: 'Bagaimana cara menghapus seluruh data saya?',
    answer:
      'Tersedia tombol "Hapus Semua Data" di menu Pengaturan aplikasi untuk menghapus bersih profil dan catatan dari sistem kapan saja.',
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative border-t border-white/[0.06] bg-[#0c0c0e] py-16 sm:py-20">
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <LetterRevealHeading
            as="h3"
            text="Pertanyaan yang Sering Diajukan"
            className="text-2xl sm:text-3xl"
          />
          <p className="mt-2 text-xs sm:text-sm text-zinc-400">
            Hal yang sering ditanyakan mengenai alur dan privasi.
          </p>
        </div>

        <div className="mt-8 space-y-2.5">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className={`verity-card rounded-2xl overflow-hidden transition-all ${
                  isOpen ? 'border-cyan-500/30' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-4 text-left transition hover:bg-white/[0.02]"
                >
                  <span className="text-xs sm:text-sm font-semibold text-white pr-4">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-cyan-400' : ''
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="border-t border-white/[0.04] bg-white/[0.01] px-4 pb-4 pt-2 text-xs text-zinc-400 leading-relaxed"
                    >
                      {faq.answer}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
