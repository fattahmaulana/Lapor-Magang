'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  Copy,
  Check,
  Download,
  Sparkles,
  Presentation,
  Trash2,
  BookOpen,
  Plus,
  RotateCcw,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import type { DailyLogItem, WeeklyRecap, PresentationDeck } from '@/types/report';
import { WeeklyRecapModal } from '@/components/app/WeeklyRecapModal';
import { PresentationModal } from '@/components/app/PresentationModal';
import { LogbookCalendar } from '@/components/app/LogbookCalendar';
import { useAppDialog } from '@/components/ui/dialog-provider';

export default function RiwayatPage() {
  const { showDialog } = useAppDialog();
  const [logs, setLogs] = useState<DailyLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // State Rekap Mingguan & Slide Presentasi
  const [recapData, setRecapData] = useState<WeeklyRecap | null>(null);
  const [deckData, setDeckData] = useState<PresentationDeck | null>(null);
  const [isRecapLoading, setIsRecapLoading] = useState(false);
  const [isDeckLoading, setIsDeckLoading] = useState(false);

  useEffect(() => {
    fetch('/api/reports')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success' && Array.isArray(data.data)) {
          setLogs(
            data.data.map((r: {
              id: string;
              date: string;
              activity_desc: string;
              learning_desc: string;
              obstacle_desc: string;
              is_reported: boolean;
              reported_at?: string;
              created_at: string;
            }) => ({
              id: r.id,
              date: r.date,
              activity_desc: r.activity_desc,
              learning_desc: r.learning_desc,
              obstacle_desc: r.obstacle_desc,
              is_reported_to_maganghub: r.is_reported,
              reported_at: r.reported_at,
              created_at: r.created_at,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleCopyLog = (item: DailyLogItem) => {
    const text = `[Tanggal: ${item.date}]\n\n[1. Uraian Aktivitas]\n${item.activity_desc}\n\n[2. Pelajaran Diperoleh]\n${item.learning_desc}\n\n[3. Kendala Dialami]\n${item.obstacle_desc}`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm('Hapus catatan logbook ini secara permanen?')) return;
    try {
      const res = await fetch(`/api/reports?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setLogs((prev) => prev.filter((item) => item.id !== id));
      } else {
        showDialog({
          type: 'error',
          title: 'Gagal Menghapus Logbook',
          message: 'Terjadi kendala saat menghapus logbook dari server.',
        });
      }
    } catch {
      showDialog({
        type: 'error',
        title: 'Kendala Jaringan',
        message: 'Gagal menghubungi server.',
      });
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      showDialog({
        type: 'info',
        title: 'Tidak Ada Data',
        message: 'Belum ada logbook yang tersimpan untuk diekspor.',
      });
      return;
    }
    const headers = 'Tanggal,Uraian Aktivitas,Pelajaran Diperoleh,Kendala Dialami,Status Lapor\n';
    const rows = (selectedDate ? displayedLogs : logs)
      .map(
        (l) =>
          `"${l.date}","${l.activity_desc.replace(/"/g, '""')}","${l.learning_desc.replace(
            /"/g,
            '""'
          )}","${l.obstacle_desc.replace(/"/g, '""')}","${
            l.is_reported_to_maganghub ? 'Sudah Lapor' : 'Belum Lapor'
          }"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'riwayat-laporan-magang.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateWeeklyRecap = async () => {
    if (logs.length === 0) {
      showDialog({
        type: 'info',
        title: 'Data Masih Kosong',
        message: 'Kamu belum memiliki catatan logbook yang tersimpan untuk dirangkum mingguan.',
      });
      return;
    }
    setIsRecapLoading(true);
    try {
      const res = await fetch('/api/reports/weekly-recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_label: 'Rekap Logbook Mingguan',
          weekLabel: 'Rekap Logbook Mingguan',
          logs: logs.map((l) => ({
            id: l.id,
            date: l.date,
            activity_desc: l.activity_desc,
            learning_desc: l.learning_desc,
            obstacle_desc: l.obstacle_desc,
          })),
        }),
      });

      const data = await res.json();
      const recapResult = data.data || data.recap;
      if (res.ok && data.status === 'success' && recapResult) {
        setRecapData(recapResult);
      } else {
        showDialog({
          type: 'error',
          title: 'Gagal Menyusun Rekap',
          message: data.message || 'Gagal membuat rekap mingguan.',
        });
      }
    } catch {
      showDialog({
        type: 'error',
        title: 'Kendala Jaringan',
        message: 'Terjadi kesalahan jaringan saat membuat rekap.',
      });
    } finally {
      setIsRecapLoading(false);
    }
  };

  const handleGeneratePresentation = async () => {
    if (logs.length === 0) {
      showDialog({
        type: 'info',
        title: 'Data Masih Kosong',
        message: 'Kamu belum memiliki catatan logbook untuk dibuatkan dek slide PPT.',
      });
      return;
    }
    setIsDeckLoading(true);
    try {
      const res = await fetch('/api/reports/presentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period: 'Rekap Periode Berjalan',
          weekTitle: 'Evaluasi Perkembangan Magang',
          institution: 'Instansi Pemagangan',
          author: 'Peserta Pemagangan Nasional',
          logs: logs.map((l) => ({
            id: l.id,
            date: l.date,
            activity_desc: l.activity_desc,
            learning_desc: l.learning_desc,
            obstacle_desc: l.obstacle_desc,
          })),
        }),
      });

      const data = await res.json();
      const deckResult = data.data || data.deck;
      if (res.ok && data.status === 'success' && deckResult) {
        setDeckData(deckResult);
      } else {
        showDialog({
          type: 'error',
          title: 'Gagal Merancang PPT',
          message: data.message || 'Gagal menyusun slide presentasi.',
        });
      }
    } catch {
      showDialog({
        type: 'error',
        title: 'Kendala Jaringan',
        message: 'Terjadi kesalahan jaringan saat merancang slide.',
      });
    } finally {
      setIsDeckLoading(false);
    }
  };

  // Tanggal yang sudah memiliki logbook
  const filledDates = Array.from(new Set(logs.map((l) => l.date)));

  // Filter berdasarkan tanggal yang dipilih di kalender (jika ada)
  const displayedLogs = selectedDate
    ? logs.filter((l) => l.date === selectedDate)
    : logs;

  return (
    <div className="space-y-5">
      {/* 1. Header Halaman & Tombol Aksi Cepat */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">Riwayat & Kalender Magang</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Pantau konsistensi logbook harian dan ekspor laporan ke berbagai format.
          </p>
        </div>

        <Link
          href="/app/hari-ini"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-white px-3.5 text-xs font-bold text-zinc-950 hover:bg-zinc-200 transition shadow-[0_0_15px_rgba(255,255,255,0.2)] active:scale-95 cursor-pointer w-fit"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Isi Logbook Hari Ini</span>
        </Link>
      </div>

      {/* 2. Banner Fitur Ekspor AI (Rekap Mingguan & PPT) */}
      <div className="verity-card rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              Fitur Ekspor AI
            </span>
            <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
              AI Powered
            </span>
          </div>
          <h2 className="text-sm sm:text-base font-bold text-white">
            Rekap Evaluasi & Slide Presentasi Mentor
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Rangkum logbook tersimpan menjadi laporan mingguan formal atau dek slide 5 halaman siap tayang.
          </p>
        </div>

        {/* Tombol Aksi Responsif Presisi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-white/[0.06]">
          <button
            onClick={handleGenerateWeeklyRecap}
            disabled={isRecapLoading || logs.length === 0}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-semibold text-white hover:bg-white/[0.08] hover:border-white/20 transition disabled:opacity-40 cursor-pointer active:scale-[0.99]"
          >
            <Sparkles className="h-4 w-4 text-cyan-400 shrink-0" />
            <span className="truncate">{isRecapLoading ? 'Menyusun Rekap...' : 'Rekap Mingguan'}</span>
          </button>

          <button
            onClick={handleGeneratePresentation}
            disabled={isDeckLoading || logs.length === 0}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 text-xs font-bold text-zinc-950 hover:bg-cyan-300 transition shadow-[0_0_15px_rgba(34,211,238,0.25)] disabled:opacity-40 cursor-pointer active:scale-[0.99]"
          >
            <Presentation className="h-4 w-4 shrink-0" />
            <span className="truncate">{isDeckLoading ? 'Merancang PPT...' : 'Buat Slide PPT'}</span>
          </button>
        </div>
      </div>

      {/* 3. Kalender Hari Terisi vs Kosong */}
      <LogbookCalendar
        filledDates={filledDates}
        selectedDate={selectedDate}
        onSelectDate={(d) => setSelectedDate(d)}
      />

      {/* 4. Bagian Daftar Logbook */}
      <div className="space-y-3">
        {/* Bar Filter & Aksi Ekspor */}
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">
              Daftar Logbook ({displayedLogs.length} Entri)
            </span>
            {selectedDate && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                Filter: {selectedDate}
                <button
                  onClick={() => setSelectedDate(null)}
                  className="hover:text-white ml-0.5 cursor-pointer"
                >
                  ×
                </button>
              </span>
            )}
          </div>

          {displayedLogs.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 text-xs font-medium text-zinc-300 hover:bg-white/[0.06] hover:text-white transition cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Ekspor CSV</span>
            </button>
          )}
        </div>

        {/* List / Empty State */}
        {loading ? (
          <div className="verity-card rounded-2xl p-8 text-center text-xs text-zinc-400">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent mb-2" />
            Memuat riwayat logbook...
          </div>
        ) : displayedLogs.length === 0 ? (
          <div className="verity-card rounded-3xl p-8 text-center border-dashed border-white/10">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.03] text-zinc-400 mb-3 border border-white/[0.06]">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-white">
              {selectedDate ? `Tidak Ada Logbook pada ${selectedDate}` : 'Belum Ada Riwayat Logbook'}
            </h3>
            <p className="mt-1 max-w-sm mx-auto text-xs text-zinc-400 leading-relaxed">
              {selectedDate
                ? 'Tanggal ini belum diisi catatan kerja. Klik tombol di bawah untuk menulis logbook baru.'
                : 'Mulai isi logbook harianmu di menu "Hari Ini" untuk memantau perkembangan magang secara otomatis.'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate(null)}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-medium text-white hover:bg-white/[0.08] transition cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Lihat Semua Tanggal</span>
                </button>
              )}
              <Link
                href="/app/hari-ini"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-white px-4 text-xs font-bold text-zinc-950 hover:bg-zinc-200 transition shadow-[0_0_15px_rgba(255,255,255,0.2)] cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tulis Logbook</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedLogs.map((item) => (
              <div key={item.id} className="verity-card rounded-2xl p-4 sm:p-5 space-y-3">
                {/* Header Kartu: Tanggal & Status */}
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <CalendarIcon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="font-mono text-xs font-bold text-white block">
                        {item.date}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                      item.is_reported_to_maganghub
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                    }`}
                  >
                    {item.is_reported_to_maganghub ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Sudah Dilaporkan</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3" />
                        <span>Draf Tersimpan</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Konten 3 Kolom Standar Maganghub */}
                <div className="space-y-2.5 text-xs">
                  <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-1">
                      1. Uraian Aktivitas
                    </span>
                    <p className="text-zinc-300 leading-relaxed">{item.activity_desc}</p>
                  </div>

                  <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                      2. Pelajaran yang Diperoleh
                    </span>
                    <p className="text-zinc-300 leading-relaxed">{item.learning_desc}</p>
                  </div>

                  <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                      3. Kendala & Solusi yang Dialami
                    </span>
                    <p className="text-zinc-300 leading-relaxed">{item.obstacle_desc}</p>
                  </div>
                </div>

                {/* Footer Kartu: Ergonomi Tombol Aksi */}
                <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <button
                    onClick={() => handleCopyLog(item)}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-xs font-semibold text-white hover:bg-white/[0.08] hover:border-white/20 transition cursor-pointer"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400">3 Kolom Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Salin 3 Kolom untuk Maganghub</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDeleteLog(item.id)}
                    title="Hapus catatan ini"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-zinc-400 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 transition cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Rekap Mingguan */}
      {recapData && (
        <WeeklyRecapModal
          recap={recapData}
          onClose={() => setRecapData(null)}
          onOpenPresentation={() => {
            setRecapData(null);
            handleGeneratePresentation();
          }}
        />
      )}

      {/* Modal Slide Presentasi */}
      {deckData && (
        <PresentationModal deck={deckData} onClose={() => setDeckData(null)} />
      )}
    </div>
  );
}
