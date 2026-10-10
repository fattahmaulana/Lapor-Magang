'use client';

import React, { useState, useEffect } from 'react';
import { localDb } from '@/lib/local-db';

export function UserStatusBadge() {
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.status === 'success' && data.user) {
          setIsPro(Boolean(data.user.is_pro));
        }
      })
      .catch(() => {
        const user = localDb.getCurrentUser();
        setIsPro(Boolean(user?.is_pro));
      });
  }, []);

  return isPro ? (
    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
      ⭐ Pro Aktif
    </span>
  ) : (
    <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-300">
      Gratis (10 Kuota/Bln)
    </span>
  );
}
