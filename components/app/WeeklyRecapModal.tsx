'use client';

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Calendar,
  Sparkles,
  Award,
  BookOpen,
  AlertTriangle,
  ArrowRight,
  FileText,
} from 'lucide-react';
import type { WeeklyRecap } from '@/types/report';
import { localDb } from '@/lib/local-db';

interface WeeklyRecapModalProps {
  recap: WeeklyRecap;
  onClose: () => void;
  onOpenPresentation?: () => void;
}

export function WeeklyRecapModal({ recap, onClose, onOpenPresentation }: WeeklyRecapModalProps) {
  const [copied, setCopied] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);

  const handleCopy = () => {
    const text = `=== REKAP LAPORAN MINGGUAN MAGANG (${recap.week_label}) ===
Periode: ${recap.period} (${recap.total_days} hari laporan)

[RANGKUMAN MINGGUAN]
${recap.summary}

[PENCAPAIAN UTAMA MINGGU INI]
${recap.key_achievements.map((a) => `• ${a}`).join('\n')}

[PEMBELAJARAN KUNCI]
${recap.key_learnings.map((l) => `• ${l}`).join('\n')}

[EVALUASI KENDALA & SOLUSI]
${recap.obstacles_and_solutions.map((o) => `• ${o}`).join('\n')}

[RENCANA MINGGU DEPAN]
${recap.next_week_plan.map((p) => `• ${p}`).join('\n')}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDocx = async () => {
    setDownloadingDocx(true);
    try {
      const user = localDb.getCurrentUser();
      const author = user?.full_name || 'Peserta Pemagangan Nasional';
      const instance = user?.instance_name || 'Instansi Pemagangan';

      const res = await fetch('/api/reports/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recap, author, instance }),
      });

      if (!res.ok) throw new Error('Gagal mengunduh file Word');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Laporan-Mingguan-Magang-${Date.now()}.docx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating DOCX:', err);
      alert('Gagal mengekspor file Word. Silakan coba lagi.');
    } finally {
      setDownloadingDocx(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-4">
      <div className="verity-card relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-3xl overflow-hidden shadow-2xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#14141a] p-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-teal-500 text-zinc-950 font-bold shadow-md">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Rekap Mingguan Otomatis AI</h2>
              <span className="text-[11px] text-zinc-400">
                {recap.week_label} • {recap.total_days} Hari Laporan
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-xs font-medium text-white hover:bg-white/[0.08]"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-cyan-400" />}
              <span>{copied ? 'Tersalin' : 'Salin'}</span>
            </button>
            <button
              onClick={handleDownloadDocx}
              disabled={downloadingDocx}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-cyan-400 px-3 text-xs font-bold text-zinc-950 hover:bg-cyan-300 transition shadow-[0_0_12px_rgba(34,211,238,0.3)] disabled:opacity-50 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{downloadingDocx ? 'Membuat DOCX...' : 'Unduh .DOCX'}</span>
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Isi Rekap */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs text-zinc-300">
          {/* Ringkasan Eksekutif */}
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4">
            <span className="font-bold text-cyan-300 block mb-1">
              Rangkuman Mingguan:
            </span>
            <p className="leading-relaxed text-zinc-200">{recap.summary}</p>
          </div>

          {/* Pencapaian Utama */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="flex items-center gap-1.5 font-bold text-white mb-2">
              <Award className="h-4 w-4 text-cyan-400" />
              <span>Pencapaian Utama Minggu Ini:</span>
            </div>
            <ul className="space-y-1.5">
              {recap.key_achievements.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <span className="leading-relaxed text-zinc-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pembelajaran Kunci */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="flex items-center gap-1.5 font-bold text-white mb-2">
              <BookOpen className="h-4 w-4 text-cyan-400" />
              <span>Pembelajaran & Keterampilan Baru:</span>
            </div>
            <ul className="space-y-1.5">
              {recap.key_learnings.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <span className="leading-relaxed text-zinc-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Kendala & Solusi */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="flex items-center gap-1.5 font-bold text-white mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span>Evaluasi Kendala & Solusi:</span>
            </div>
            <ul className="space-y-1.5">
              {recap.obstacles_and_solutions.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span className="leading-relaxed text-zinc-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Rencana Kerja */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="flex items-center gap-1.5 font-bold text-white mb-2">
              <ArrowRight className="h-4 w-4 text-emerald-400" />
              <span>Rencana Kerja Minggu Depan:</span>
            </div>
            <ul className="space-y-1.5">
              {recap.next_week_plan.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span className="leading-relaxed text-zinc-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
