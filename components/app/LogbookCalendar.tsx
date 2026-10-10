'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, RotateCcw } from 'lucide-react';

interface LogbookCalendarProps {
  filledDates: string[]; // ['2026-10-01', '2026-10-02', ...]
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export function LogbookCalendar({
  filledDates,
  selectedDate,
  onSelectDate,
}: LogbookCalendarProps) {
  const [viewDate, setViewDate] = useState(() => new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleResetMonth = () => {
    setViewDate(new Date());
  };

  // Hitung jumlah hari dalam bulan ini & hari pertama (0 = Minggu, konversi ke Sen = 0)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Sen = 0, Min = 6

  // Format tanggal YYYY-MM-DD
  const formatDateStr = (d: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  // Hari ini
  const todayStr = new Date().toISOString().split('T')[0];

  // Hitung hari terisi di bulan yang sedang ditampilkan
  const filledCountInMonth = Array.from({ length: daysInMonth }, (_, i) => formatDateStr(i + 1)).filter(
    (d) => filledDates.includes(d)
  ).length;

  return (
    <div className="verity-card rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header Kalender */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <CalendarIcon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              {MONTH_NAMES[month]} {year}
            </h2>
            <span className="text-[11px] text-zinc-400">
              {filledCountInMonth} dari {daysInMonth} hari terisi logbook
            </span>
          </div>
        </div>

        {/* Navigasi Bulan */}
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            aria-label="Bulan Sebelumnya"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.08] hover:text-white transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleResetMonth}
            className="px-2 h-8 text-[11px] font-semibold rounded-lg border border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition"
          >
            Hari Ini
          </button>
          <button
            onClick={handleNextMonth}
            aria-label="Bulan Berikutnya"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.08] hover:text-white transition"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Grid Nama Hari */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {DAY_LABELS.map((label, idx) => (
          <span
            key={label}
            className={`text-[11px] font-semibold py-1 ${
              idx >= 5 ? 'text-zinc-500' : 'text-zinc-400'
            }`}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Grid Tanggal */}
      <div className="grid grid-cols-7 gap-1">
        {/* Slot kosong sebelum tanggal 1 */}
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="h-9 w-full" />
        ))}

        {/* Tanggal 1 s/d hari terakhir */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dateStr = formatDateStr(dayNum);
          const isFilled = filledDates.includes(dateStr);
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === todayStr;

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(isSelected ? null : dateStr)}
              className={`relative flex h-10 w-full flex-col items-center justify-center rounded-xl text-xs font-semibold transition cursor-pointer ${
                isSelected
                  ? 'border-2 border-cyan-400 bg-cyan-500/20 text-white shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                  : isFilled
                  ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                  : isToday
                  ? 'border border-white/20 bg-white/[0.06] text-white'
                  : 'border border-transparent bg-white/[0.02] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200'
              }`}
            >
              <span>{dayNum}</span>

              {/* Titik Indikator Terisi */}
              {isFilled && (
                <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda & Status Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] pt-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[11px]">Terisi Logbook</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-500">
            <span className="h-2 w-2 rounded-full bg-zinc-600" />
            <span className="text-[11px]">Belum Diisi</span>
          </div>
        </div>

        {selectedDate && (
          <button
            onClick={() => onSelectDate(null)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:underline"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Tampilkan Semua ({selectedDate})</span>
          </button>
        )}
      </div>
    </div>
  );
}
