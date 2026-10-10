'use client';

import { LetterRevealHeading } from '@/components/ui/LetterRevealHeading';
import { CircularCarousel, type CarouselItem } from '@/components/ui/circular-carousel';

const CAPABILITY_ITEMS: CarouselItem[] = [
  {
    id: 'regulasi',
    tag: 'Regulasi',
    title: 'Validasi 100+ Karakter',
    description: 'Setiap draf dijamin memenuhi batas minimum karakter portal resmi Maganghub.',
  },
  {
    id: 'keamanan',
    tag: 'Keamanan',
    title: 'Zero Password Akses',
    description: 'Tidak pernah meminta atau menyimpan kata sandi akun pemerintah Anda.',
  },
  {
    id: 'pengingat',
    tag: 'Pengingat',
    title: 'Telegram & Layar Kunci',
    description: 'Notifikasi terjadwal sore dan malam hari dengan tombol aksi cepat.',
  },
  {
    id: 'kualitas',
    tag: 'Kualitas',
    title: 'Deteksi Repetisi Trigram',
    description: 'Analisis kemiripan dengan laporan sebelumnya agar bahasa tidak monoton.',
  },
  {
    id: 'produktivitas',
    tag: 'Produktivitas',
    title: 'Rekap Mingguan & PPT',
    description: 'Rangkum aktivitas 5 hari kerja menjadi slide presentasi evaluasi pembimbing.',
  },
  {
    id: 'kedaulatan',
    tag: 'Kedaulatan',
    title: 'Hapus Data 1-Klik',
    description: 'Hapus seluruh catatan dan profil seketika dari peramban dan server kapan saja.',
  },
];

export function CapabilitiesBento() {
  return (
    <section id="fitur" className="relative border-t border-white/[0.06] bg-[#0c0c0e] py-16 sm:py-20 overflow-hidden">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto">
          <LetterRevealHeading
            as="h3"
            text="Fitur Unggulan Pemagangan"
            className="text-2xl sm:text-3xl"
          />
          <p className="mt-2 text-xs sm:text-sm text-zinc-400">
            Fokus pada disiplin pelaporan, efisiensi waktu, dan keamanan akun.
          </p>
        </div>

        <div className="mt-12 flex justify-center">
          <CircularCarousel items={CAPABILITY_ITEMS} />
        </div>
      </div>
    </section>
  );
}
