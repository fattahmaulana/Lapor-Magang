import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LaporMagang — Maganghub Daily Assistant',
  description: 'Draf 3 kolom laporan harian dan pengingat 23.59 untuk peserta Pemagangan Nasional.',
  openGraph: {
    title: 'LaporMagang — Maganghub Daily Assistant',
    description: 'Draf 3 kolom laporan harian dan pengingat 23.59 untuk peserta Pemagangan Nasional.',
    type: 'website',
    locale: 'id_ID',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LaporMagang — Maganghub Daily Assistant',
    description: 'Draf 3 kolom laporan harian dan pengingat 23.59 untuk peserta Pemagangan Nasional.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`dark scroll-smooth ${plusJakarta.variable} ${spaceGrotesk.variable}`}>
      <body suppressHydrationWarning className="min-h-screen bg-[#09090b] text-[#f4f4f5] antialiased selection:bg-cyan-500/20 selection:text-cyan-200 font-sans">
        {children}
      </body>
    </html>
  );
}
