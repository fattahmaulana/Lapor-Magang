import React from 'react';
import Link from 'next/link';
import { BottomNav } from '@/components/app/BottomNav';
import { NavbarProfileButton } from '@/components/app/NavbarProfileButton';
import { AuthGuard } from '@/components/app/AuthGuard';
import { DialogProvider } from '@/components/ui/dialog-provider';

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <DialogProvider>
      <div className="min-h-screen bg-[#09090b] text-[#f4f4f5]">
        {/* Header Aplikasi Mobile Shell */}
        <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#0e0e12]/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[640px] items-center justify-between px-4">
            <Link href="/" className="flex items-center group">
              <span className="font-bold tracking-tight text-white text-base transition-colors group-hover:text-zinc-200">
                LaporMagang<span className="text-cyan-400">.</span>
              </span>
            </Link>

            {/* Tombol Profil & Indikator PRO */}
            <NavbarProfileButton />
          </div>
        </header>

        {/* Main Content (Max 640px on Desktop, Mobile-First) */}
        <main className="mx-auto max-w-[640px] px-4 pt-4 pb-24">
          <AuthGuard>{children}</AuthGuard>
        </main>

        {/* Navigasi Bawah */}
        <BottomNav />
      </div>
    </DialogProvider>
  );
}
