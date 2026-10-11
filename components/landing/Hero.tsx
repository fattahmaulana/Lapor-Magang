'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { LetterRevealHeading } from '@/components/ui/LetterRevealHeading';
import { InteractiveDemo } from './InteractiveDemo';
import { localDb } from '@/lib/local-db';

export function Hero() {
  const router = useRouter();

  const handleStartDraft = (e: React.MouseEvent) => {
    e.preventDefault();
    const user = localDb.getCurrentUser();
    if (user) {
      router.push('/app/hari-ini');
    } else {
      router.push('/masuk?redirect=/app/hari-ini');
    }
  };
  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24 verity-mesh-bg">
      {/* Background Grid Pattern & Ambient Glows */}
      <div className="absolute inset-0 verity-grid-pattern opacity-30 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[300px] bg-cyan-500/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
        <div className="text-center">
          {/* Aesthetic Modern Kinetic Display Headings */}
          <div className="space-y-1">
            <LetterRevealHeading
              as="h1"
              text="Pelaporan Magang,"
              className="text-4xl sm:text-6xl md:text-7xl block leading-[1.05]"
              delay={0.08}
              stagger={0.02}
            />
            <LetterRevealHeading
              as="span"
              text="Lebih Efisien."
              className="text-4xl sm:text-6xl md:text-7xl block leading-[1.05] text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.2)]"
              delay={0.35}
              stagger={0.02}
            />
          </div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base"
          >
            Dokumentasikan progres harian dan susun laporan sesuai format resmi Maganghub tanpa proses yang berbelit.
          </motion.p>

          {/* Action Buttons (Clean, without tacky icons) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <button
              onClick={handleStartDraft}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-6 text-xs sm:text-sm font-semibold text-zinc-950 shadow-[0_0_25px_rgba(255,255,255,0.2)] transition hover:bg-zinc-200 active:scale-95 cursor-pointer"
            >
              <span>Mulai Buat Draf</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            <a
              href="#demo"
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-5 text-xs sm:text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/[0.08] hover:border-white/20 active:scale-95"
            >
              <span>Lihat Contoh Draf</span>
            </a>
          </motion.div>
        </div>

        {/* Interactive Product Mockup */}
        <motion.div
          id="demo"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}
          className="mt-14"
        >
          <InteractiveDemo />
        </motion.div>
      </div>
    </section>
  );
}
