'use client';

import React, { useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Copy,
  Check,
  Presentation,
  User,
  Calendar,
  Sparkles,
} from 'lucide-react';
import type { PresentationDeck } from '@/types/report';

interface PresentationModalProps {
  deck: PresentationDeck;
  onClose: () => void;
}

export function PresentationModal({ deck, onClose }: PresentationModalProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [downloadingPptx, setDownloadingPptx] = useState(false);

  const slide = deck.slides[currentSlideIndex] || deck.slides[0];
  const totalSlides = deck.slides.length;

  const handlePrev = () => {
    setCurrentSlideIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = () => {
    setCurrentSlideIndex((prev) => (prev < totalSlides - 1 ? prev + 1 : prev));
  };

  const handleCopyText = () => {
    const text = deck.slides
      .map(
        (s, idx) =>
          `=== SLIDE ${idx + 1}: ${s.title} ===\n${s.subtitle ? s.subtitle + '\n' : ''}\n${s.bullets
            .map((b) => `• ${b}`)
            .join('\n')}\n\n[Speaker Notes]: ${s.speaker_notes || '-'}\n`
      )
      .join('\n----------------------------------------\n\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPptx = async () => {
    setDownloadingPptx(true);
    try {
      const res = await fetch('/api/reports/export-pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deck }),
      });

      if (!res.ok) throw new Error('Gagal mengunduh file presentasi');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Laporan-Presentasi-Magang-${Date.now()}.pptx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating PPTX:', err);
      alert('Gagal mengekspor file PowerPoint. Silakan coba lagi.');
    } finally {
      setDownloadingPptx(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md sm:p-4">
      <div className="verity-card relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl overflow-hidden shadow-2xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#14141a] p-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-teal-500 text-zinc-950 font-bold shadow-md">
              <Presentation className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Slide Presentasi Mingguan (AI)</h2>
              <span className="text-[11px] text-zinc-400">
                Slide {currentSlideIndex + 1} dari {totalSlides} • Siap Tampil
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyText}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-xs font-medium text-white hover:bg-white/[0.08]"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-cyan-400" />}
              <span>{copied ? 'Tersalin' : 'Salin'}</span>
            </button>
            <button
              onClick={handleDownloadPptx}
              disabled={downloadingPptx}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-cyan-400 px-3 text-xs font-bold text-zinc-950 hover:bg-cyan-300 transition shadow-[0_0_12px_rgba(34,211,238,0.3)] disabled:opacity-50 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{downloadingPptx ? 'Membuat PPTX...' : 'Unduh .PPTX'}</span>
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Kanvas Slide Interaktif */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[#16161c] p-6 shadow-inner min-h-[300px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-cyan-500/15 border border-cyan-500/30 px-3 py-1 text-xs font-bold text-cyan-300">
                  {slide.tag}
                </span>
                <span className="text-xs font-mono text-zinc-500">
                  Slide {slide.id} / {totalSlides}
                </span>
              </div>

              <h1 className="mt-4 text-xl sm:text-2xl font-extrabold text-white">
                {slide.title}
              </h1>
              {slide.subtitle && (
                <p className="text-xs text-zinc-400 mt-1">{slide.subtitle}</p>
              )}

              <ul className="mt-5 space-y-2.5 text-xs">
                {slide.bullets.map((bullet, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 text-zinc-200"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Catatan Pembicara */}
            {slide.speaker_notes && (
              <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200">
                <span className="font-bold text-amber-300 block mb-0.5">Catatan Pembicara:</span>
                <p className="italic text-zinc-300">{slide.speaker_notes}</p>
              </div>
            )}
          </div>

          {/* Navigasi Slide Bawah */}
          <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
            <button
              onClick={handlePrev}
              disabled={currentSlideIndex === 0}
              className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-white hover:bg-white/[0.08] disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Sebelumnya</span>
            </button>

            {/* Dot Indicators */}
            <div className="flex items-center gap-1.5">
              {deck.slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentSlideIndex
                      ? 'w-6 bg-cyan-400'
                      : 'w-2 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              disabled={currentSlideIndex === totalSlides - 1}
              className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-white hover:bg-white/[0.08] disabled:opacity-30"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
