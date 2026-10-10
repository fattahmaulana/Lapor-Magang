'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, Check } from 'lucide-react';

interface DemoScenario {
  id: string;
  category: string;
  shortNote: string;
  draft: {
    activity_desc: string;
    learning_desc: string;
    obstacle_desc: string;
  };
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'it',
    category: 'IT & Software',
    shortNote: 'tadi pagi benerin bug filter tanggal di modul absen, siang bantu deploy ke server dev tapi sempet bentrok branch git',
    draft: {
      activity_desc:
        'Melakukan penelusuran dan perbaikan bug pada fungsi penyaringan tanggal di modul absensi, kemudian mempersiapkan draf rilis serta sinkronisasi kode ke server pengujian staging bersama tim pengembang.',
      learning_desc:
        'Memahami pentingnya isolasi dependensi branch git sebelum proses deployment berlangsung guna menghindari konflik kode yang menghambat pengujian integrasi berkelanjutan antar tim pengembang.',
      obstacle_desc:
        'Sempat terjadi tabrakan konfigurasi branch saat merge kode karena ada pembaruan berkas bersamaan, namun berhasil diatasi setelah melakukan rebase bertahap dan verifikasi ulang commit.',
    },
  },
  {
    id: 'admin',
    category: 'Administrasi',
    shortNote: 'merapikan berkas arsip surat masuk bulan september, input nomor resi ke spreadsheet, sama cetak tanda terima berkas',
    draft: {
      activity_desc:
        'Melakukan klasifikasi dan penataan berkas arsip surat masuk periode September, dilanjutkan dengan pencatatan nomor resi dokumen ke dalam spreadsheet logistik serta mencetak lembar tanda terima berkas kantor.',
      learning_desc:
        'Mempelajari tata kelola pengarsipan surat resmi instansi dan standar penomoran registrasi dokumen agar pencarian berkas fisik dapat dilakukan secara cepat dan akurat saat audit berkala.',
      obstacle_desc:
        'Terdapat beberapa lembar surat masuk dengan nomor referensi yang buram, sehingga membutuhkan verifikasi ulang secara manual ke unit pengirim sebelum disimpan ke sistem pencatatan arsip.',
    },
  },
  {
    id: 'field',
    category: 'Operasional',
    shortNote: 'cek kondisi fisik stok barang masuk di gudang b, cocokin surat jalan sama isi kardus, ada 2 box rusak kardusnya',
    draft: {
      activity_desc:
        'Melakukan pemeriksaan fisik dan verifikasi kuantitas muatan barang masuk di area Gudang B, mencocokkan dokumen surat jalan dengan isi kemasan box logistik, serta mendokumentasikan serah terima barang.',
      learning_desc:
        'Memahami standar operasional prosedur penerimaan muatan gudang, teknik pencocokan barcode barang, dan alur pelaporan segera ketika ditemukan anomali kondisi barang saat inspeksi kedatangan.',
      obstacle_desc:
        'Ditemukan dua kemasan kardus dalam kondisi robek akibat penanganan ekspedisi, sehingga perlu dibuatkan berita acara pemeriksaan kondisi fisik dan dipisahkan sementara sebelum masuk rak utama.',
    },
  },
  {
    id: 'creative',
    category: 'Desain & Media',
    shortNote: 'bikin 3 draf infografis edukasi keselamatan kerja di canva, revisi tone warna sesuai brand guidelines kemnaker',
    draft: {
      activity_desc:
        'Menyusun tiga rancangan aset infografis bertema edukasi keselamatan dan kesehatan kerja (K3) menggunakan perangkat desain digital, serta mengadaptasi palet warna agar selaras dengan pedoman visual resmi lembaga.',
      learning_desc:
        'Mendalami prinsip hierarki visual pada materi edukasi publik instansi pemerintah dan pentingnya konsistensi tata letak untuk meningkatkan daya tangkap audiens umum.',
      obstacle_desc:
        'Sempat membutuhkan beberapa kali penyesuaian kontras warna tipografi agar tetap memenuhi standar aksesibilitas keterbacaan pada media layar ponsel.',
    },
  },
];

export function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState<string>('it');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const scenario = DEMO_SCENARIOS.find((s) => s.id === activeTab) || DEMO_SCENARIOS[0];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="relative rounded-2xl border border-white/[0.08] bg-[#0d0d11]/85 p-4 sm:p-5 backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.7)]">
      {/* Top Rim Glow */}
      <div className="absolute -top-px left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

      {/* Mockup Bar */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-white/20" />
            <span className="h-2 w-2 rounded-full bg-white/20" />
            <span className="h-2 w-2 rounded-full bg-white/20" />
          </div>
          <span className="ml-2 font-mono text-[11px] text-zinc-500">
            maganghub / generator
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px] text-amber-400">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>Batas 23.59</span>
        </div>
      </div>

      {/* Role Navigation with Sliding Pill */}
      <div className="mt-3 flex gap-1 border-b border-white/[0.04] pb-2.5 overflow-x-auto">
        {DEMO_SCENARIOS.map((s) => {
          const isActive = s.id === activeTab;
          return (
            <button
              key={s.id}
              onClick={() => setActiveTab(s.id)}
              className="relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shrink-0"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabPill"
                  className="absolute inset-0 rounded-lg bg-white shadow-sm"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span
                className={`relative z-10 ${
                  isActive ? 'text-zinc-950 font-semibold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {s.category}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content with Animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={scenario.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="mt-4 grid gap-3 lg:grid-cols-12"
        >
          {/* Input Catatan */}
          <div className="lg:col-span-4 rounded-xl border border-white/[0.06] bg-[#09090c] p-3.5 flex flex-col justify-between">
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
                Catatan Kasar
              </span>
              <p className="mt-2 text-xs leading-relaxed text-zinc-300 font-mono italic">
                &ldquo;{scenario.shortNote}&rdquo;
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-white/[0.04] text-[10px] text-zinc-500 font-mono">
              {scenario.shortNote.length} karakter
            </div>
          </div>

          {/* 3 Kolom Draf */}
          <div className="lg:col-span-8 space-y-2">
            {/* Kolom 1 */}
            <div className="rounded-xl border border-white/[0.06] bg-[#09090c] p-3 transition hover:border-white/10">
              <div className="flex items-center justify-between pb-1">
                <span className="font-mono text-xs font-semibold text-white">1. Uraian Aktivitas</span>
                <button
                  type="button"
                  onClick={() => handleCopy(scenario.draft.activity_desc, 'act')}
                  className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-zinc-400 hover:text-white transition"
                >
                  {copiedKey === 'act' ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  <span>{copiedKey === 'act' ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
              <p className="text-xs leading-relaxed text-zinc-300">
                {scenario.draft.activity_desc}
              </p>
            </div>

            {/* Kolom 2 */}
            <div className="rounded-xl border border-white/[0.06] bg-[#09090c] p-3 transition hover:border-white/10">
              <div className="flex items-center justify-between pb-1">
                <span className="font-mono text-xs font-semibold text-white">2. Pelajaran Diperoleh</span>
                <button
                  type="button"
                  onClick={() => handleCopy(scenario.draft.learning_desc, 'learn')}
                  className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-zinc-400 hover:text-white transition"
                >
                  {copiedKey === 'learn' ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  <span>{copiedKey === 'learn' ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
              <p className="text-xs leading-relaxed text-zinc-300">
                {scenario.draft.learning_desc}
              </p>
            </div>

            {/* Kolom 3 */}
            <div className="rounded-xl border border-white/[0.06] bg-[#09090c] p-3 transition hover:border-white/10">
              <div className="flex items-center justify-between pb-1">
                <span className="font-mono text-xs font-semibold text-white">3. Kendala & Solusi</span>
                <button
                  type="button"
                  onClick={() => handleCopy(scenario.draft.obstacle_desc, 'obs')}
                  className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-zinc-400 hover:text-white transition"
                >
                  {copiedKey === 'obs' ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  <span>{copiedKey === 'obs' ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
              <p className="text-xs leading-relaxed text-zinc-300">
                {scenario.draft.obstacle_desc}
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
