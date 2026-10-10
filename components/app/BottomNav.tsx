'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, History, User } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();

  const links = [
    {
      href: '/app/hari-ini',
      label: 'Hari Ini',
      icon: Calendar,
      isActive: pathname.startsWith('/app/hari-ini'),
    },
    {
      href: '/app/riwayat',
      label: 'Riwayat',
      icon: History,
      isActive: pathname.startsWith('/app/riwayat'),
    },
    {
      href: '/app/profil',
      label: 'Profil',
      icon: User,
      isActive: pathname.startsWith('/app/profil'),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08] bg-[#0e0e12]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[640px] items-center justify-around px-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center min-w-[72px] min-h-[48px] py-1 transition-all ${
                link.isActive
                  ? 'font-semibold text-cyan-400'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <div
                className={`flex h-8 w-12 items-center justify-center rounded-full transition-all ${
                  link.isActive
                    ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                    : ''
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
