'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { localDb } from '@/lib/local-db';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Unauthorized');
      })
      .then((data) => {
        if (data.status === 'success' && data.user) {
          localDb.setCurrentUser(data.user);
          setAuthorized(true);
        } else {
          localDb.setCurrentUser(null);
          router.replace(`/masuk?redirect=${encodeURIComponent(pathname)}`);
        }
      })
      .catch(() => {
        localDb.setCurrentUser(null);
        router.replace(`/masuk?redirect=${encodeURIComponent(pathname)}`);
      })
      .finally(() => {
        setChecking(false);
      });
  }, [router, pathname]);

  if (checking || !authorized) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        <p className="text-xs text-zinc-400 font-medium">Memeriksa sesi akun pengguna...</p>
      </div>
    );
  }

  return <>{children}</>;
}
