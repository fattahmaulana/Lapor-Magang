'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, Sparkles } from 'lucide-react';
import { localDb, UserProfile } from '@/lib/local-db';

export function NavbarProfileButton() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') return localDb.getCurrentUser();
    return null;
  });

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.status === 'success' && data.user) {
          setUser(data.user);
          localDb.setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const isPro = user?.is_pro ?? false;
  const initial = user?.full_name ? user.full_name.trim().charAt(0).toUpperCase() : 'P';

  return (
    <Link
      href="/app/profil"
      title="Profil & Pengaturan Akun"
      className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] p-1 pr-2.5 transition-all hover:border-white/20 hover:bg-white/[0.08] active:scale-95 cursor-pointer"
    >
      {/* Avatar Icon / Inisial */}
      <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 font-bold text-zinc-950 text-xs shadow-sm shrink-0">
        {user?.full_name ? initial : <User className="h-3.5 w-3.5" />}
        {isPro && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-400 ring-2 ring-[#0e0e12]" />
        )}
      </div>

      {/* Info Profil & Status Pro */}
      <div className="flex items-center gap-1.5">
        <span className="hidden sm:inline-block max-w-[90px] truncate text-xs font-semibold text-zinc-200 group-hover:text-white">
          {user?.full_name || 'Profil'}
        </span>

        {isPro ? (
          <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.3)] tracking-wider">
            <Sparkles className="h-2.5 w-2.5" />
            <span>PRO</span>
          </span>
        ) : (
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-medium text-zinc-400">
            Gratis
          </span>
        )}
      </div>
    </Link>
  );
}
