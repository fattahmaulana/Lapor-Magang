'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { localDb } from '@/lib/local-db';

export function Header() {
  const router = useRouter();

  const handleOpenApp = (e: React.MouseEvent) => {
    e.preventDefault();
    const user = localDb.getCurrentUser();
    if (user) {
      router.push('/app/hari-ini');
    } else {
      router.push('/masuk?redirect=/app/hari-ini');
    }
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-4 inset-x-0 z-50 mx-auto max-w-3xl px-4"
    >
      <div className="flex h-12 items-center justify-between rounded-full border border-white/10 bg-[#0e0e12]/80 px-4 sm:px-5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
        {/* Brand */}
        <Link href="/" className="flex items-center group">
          <span className="font-bold tracking-tight text-white text-sm sm:text-base transition-colors group-hover:text-zinc-200">
            LaporMagang<span className="text-cyan-400">.</span>
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden sm:flex items-center gap-5 text-xs font-medium text-zinc-400">
          <a href="#cara-kerja" className="transition hover:text-white">
            Alur
          </a>
          <a href="#fitur" className="transition hover:text-white">
            Fitur
          </a>
          <a href="#harga" className="transition hover:text-white">
            Harga
          </a>
          <a href="#faq" className="transition hover:text-white">
            FAQ
          </a>
        </nav>

        {/* CTA: Alur Buka App dengan Autentikasi */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenApp}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-950 transition-all hover:bg-zinc-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.25)] active:scale-95 cursor-pointer"
          >
            <span>Buka App</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </motion.header>
  );
}
