'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Download,
  X,
  Volume2,
  FileUp,
  Mic,
  MicOff,
} from 'lucide-react';
import type { ReportDraft } from '@/types/report';
import { localDb, type UserProfile } from '@/lib/local-db';
import { useAppDialog } from '@/components/ui/dialog-provider';

function getLocalTodayStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function HariIniPage() {
  const { showProModal, showDialog } = useAppDialog();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      return localDb.getCurrentUser();
    }
    return null;
  });
  const [isPro, setIsPro] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return Boolean(localDb.getCurrentUser()?.is_pro);
    }
    return false;
  });
  const [notes, setNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [selectedTone, setSelectedTone] = useState<'standar' | 'formal' | 'santai'>('formal');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsMoreInfo, setNeedsMoreInfo] = useState<{ question: string; reason: string } | null>(null);

  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [similarityScore, setSimilarityScore] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isReported, setIsReported] = useState<boolean>(false);
  const [showPwaPrompt, setShowPwaPrompt] = useState<boolean>(false);

  useEffect(() => {
    // 1. Bersihkan legacy key global yang tidak scoped agar tidak membocorkan draf antar-user
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('lm_today_draft');
      } catch {}
    }

    const todayStr = getLocalTodayStr();

    // 2. Muat sesi akun aktif
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then(async (data) => {
        let activeUser = data?.status === 'success' && data.user ? data.user : null;
        if (!activeUser) {
          activeUser = localDb.getCurrentUser();
        }

        if (activeUser) {
          setCurrentUser(activeUser);
          setIsPro(Boolean(activeUser.is_pro));
          localDb.setCurrentUser(activeUser);

          // 3. Periksa status laporan hari ini milik pengguna aktif di server
          try {
            const resReports = await fetch('/api/reports');
            const dataReports = await resReports.json();
            if (dataReports.status === 'success' && Array.isArray(dataReports.data)) {
              const todayReport = dataReports.data.find((r: { date: string }) => r.date === todayStr);
              if (todayReport) {
                if (todayReport.is_reported) {
                  // Sudah lapor -> draf dihilangkan dari layar, status tanda lapor aktif
                  setIsReported(true);
                  setDraft(null);
                  setNotes('');
                  localStorage.removeItem(`lm_draft_${activeUser.id}_${todayStr}`);
                  return;
                } else {
                  // Tersimpan tapi belum ditandai lapor
                  setIsReported(false);
                  setDraft({
                    activity_desc: todayReport.activity_desc,
                    learning_desc: todayReport.learning_desc,
                    obstacle_desc: todayReport.obstacle_desc,
                  });
                  setNotes(todayReport.raw_notes || '');
                  return;
                }
              }
            }
          } catch {
            const past = localDb.getUserReports(activeUser.id);
            const todayReport = past.find((r) => r.date === todayStr);
            if (todayReport) {
              if (todayReport.is_reported) {
                setIsReported(true);
                setDraft(null);
                setNotes('');
                localStorage.removeItem(`lm_draft_${activeUser.id}_${todayStr}`);
                return;
              } else {
                setIsReported(false);
                setDraft({
                  activity_desc: todayReport.activity_desc,
                  learning_desc: todayReport.learning_desc,
                  obstacle_desc: todayReport.obstacle_desc,
                });
                setNotes(todayReport.raw_notes || '');
                return;
              }
            }
          }

          // 4. Jika belum ada laporan di DB, cek draf lokal terisolasi khusus ID pengguna ini
          const userDraftKey = `lm_draft_${activeUser.id}_${todayStr}`;
          const savedScoped = localStorage.getItem(userDraftKey);
          if (savedScoped) {
            try {
              const parsed = JSON.parse(savedScoped);
              if (parsed.isReported) {
                setIsReported(true);
                setDraft(null);
              } else {
                setDraft(parsed.draft || null);
                if (parsed.notes) setNotes(parsed.notes);
              }
            } catch {}
          } else {
            // User baru / belum generate hari ini -> kosong bersih
            setDraft(null);
            setIsReported(false);
          }
        }
      })
      .catch(() => {
        const u = localDb.getCurrentUser();
        if (u) {
          setCurrentUser(u);
          setIsPro(Boolean(u.is_pro));
        }
      });
  }, []);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; isUrgent: 'normal' | 'warning' | 'danger' }>({
    hours: 5,
    minutes: 7,
    seconds: 41,
    isUrgent: 'normal',
  });

  // Hitung mundur dinamis ke 23.59 waktu lokal
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const diffMs = endOfDay.getTime() - now.getTime();
      if (diffMs <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isUrgent: 'danger' });
        return;
      }

      const totalSec = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      let urgency: 'normal' | 'warning' | 'danger' = 'normal';
      if (hours < 1) {
        urgency = 'danger';
      } else if (hours < 3) {
        urgency = 'warning';
      }

      setTimeLeft({ hours, minutes, seconds, isUrgent: urgency });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleGenerate = async () => {
    if (!notes.trim()) {
      setErrorMsg('Tuliskan catatan kerja harian terlebih dahulu.');
      return;
    }

    if (notes.trim().length < 20) {
      setErrorMsg('Catatan terlalu singkat. Tuliskan minimal 1–2 kalimat kegiatan kerjamu.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setNeedsMoreInfo(null);

    try {
      let historyTexts: string[] = [];
      try {
        const resReports = await fetch('/api/reports');
        const dataReports = await resReports.json();
        if (dataReports.status === 'success' && Array.isArray(dataReports.data)) {
          historyTexts = dataReports.data.slice(0, 7).map((r: { activity_desc: string }) => r.activity_desc);
        }
      } catch {
        const past = localDb.getUserReports();
        historyTexts = past.slice(0, 7).map((r) => r.activity_desc);
      }

      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes,
          history: historyTexts,
          tone: selectedTone,
        }),
      });

      const data = await res.json();

      if (data.status === 'needs_more_info') {
        setNeedsMoreInfo({
          question: data.question,
          reason: data.reason,
        });
      } else if (data.status === 'success') {
        setDraft(data.data);
        if (typeof data.similarity_score === 'number') {
          setSimilarityScore(data.similarity_score);
        }
        setShowPwaPrompt(true);

        const todayStr = getLocalTodayStr();
        const uid = currentUser?.id || localDb.getCurrentUser()?.id;
        if (uid) {
          localStorage.setItem(
            `lm_draft_${uid}_${todayStr}`,
            JSON.stringify({
              draft: data.data,
              notes,
              isReported: false,
              date: todayStr,
            })
          );
        }

        // Simpan ke database server & localDb
        fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: todayStr,
            raw_notes: notes,
            activity_desc: data.data.activity_desc,
            learning_desc: data.data.learning_desc,
            obstacle_desc: data.data.obstacle_desc,
            is_reported: isReported,
          }),
        }).catch(() => {});

        localDb.saveUserReport({
          date: todayStr,
          raw_notes: notes,
          activity_desc: data.data.activity_desc,
          learning_desc: data.data.learning_desc,
          obstacle_desc: data.data.obstacle_desc,
          is_reported: isReported,
        });
      } else {
        setErrorMsg(data.message || 'Gagal menyusun laporan.');
      }
    } catch {
      setErrorMsg('Terjadi kendala koneksi. Silakan periksa jaringan internet kamu.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySingle = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyAll = () => {
    if (!draft) return;
    const combined = `[Uraian Aktivitas]\n${draft.activity_desc}\n\n[Pelajaran yang Diperoleh]\n${draft.learning_desc}\n\n[Kendala yang Dialami]\n${draft.obstacle_desc}`;
    navigator.clipboard.writeText(combined);
    setCopiedKey('all');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleReported = () => {
    const nextState = !isReported;
    const todayStr = getLocalTodayStr();
    const uid = currentUser?.id || localDb.getCurrentUser()?.id;

    if (nextState) {
      // 1. Pengguna menandai sudah lapor ke Maganghub
      setIsReported(true);

      const activeDraft = draft;
      const reportData = {
        date: todayStr,
        raw_notes: notes || 'Laporan harian magang',
        activity_desc:
          activeDraft?.activity_desc ||
          notes ||
          'Kegiatan pemagangan harian telah diselesaikan dan dilaporkan ke portal resmi.',
        learning_desc:
          activeDraft?.learning_desc ||
          'Mengasah pemahaman teknis kerja profesional dan alur kerja tim pemagangan.',
        obstacle_desc:
          activeDraft?.obstacle_desc ||
          'Tidak ada kendala kritis yang menghambat pelaksanaan kegiatan hari ini.',
        is_reported: true,
      };

      // Simpan permanen ke database server & localDb untuk rekap & PPT
      localDb.saveUserReport(reportData);
      fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      }).catch(() => {});

      // 2. Hilangkan draf dari layar dan bersihkan input catatan
      setDraft(null);
      setNotes('');
      if (uid) {
        localStorage.removeItem(`lm_draft_${uid}_${todayStr}`);
      }

      showDialog({
        type: 'success',
        title: 'Berhasil Ditandai Lapor',
        message:
          'Laporan hari ini telah ditandai lapor dan tersimpan aman di database akun Anda. Hasil draf telah dibersihkan dari layar dan siap digunakan kapan saja untuk Rekap Mingguan atau Pembuatan PPT.',
      });
    } else {
      // Batal tandai lapor
      setIsReported(false);
      const reportData = {
        date: todayStr,
        raw_notes: notes,
        activity_desc: draft?.activity_desc || 'Kegiatan pemagangan harian',
        learning_desc: draft?.learning_desc || 'Pelajaran pemagangan harian',
        obstacle_desc: draft?.obstacle_desc || 'Tidak ada kendala',
        is_reported: false,
      };

      localDb.saveUserReport(reportData);
      fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      }).catch(() => {});

      if (uid) {
        localStorage.removeItem(`lm_draft_${uid}_${todayStr}`);
      }
    }
  };

  const handleVoiceInput = async () => {
    if (!isPro) {
      showProModal(
        'Input Suara (Speech-to-Text)',
        'Rekam suara kegiatan kerjamu, sistem AI otomatis mentranskripsi menjadi draf logbook resmi tanpa mengetik panjang.'
      );
      return;
    }

    // Jika sedang merekam -> hentikan dan proses
    if (isRecording) {
      setIsRecording(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      return;
    }

    setErrorMsg(null);
    audioChunksRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showDialog({
        type: 'error',
        title: 'Peramban Tidak Mendukung',
        message: 'Peramban Anda tidak mengizinkan akses perekaman mikrofon.',
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 1000) {
          setIsTranscribing(true);
          try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'voice-recording.webm');
            const res = await fetch('/api/ai/transcribe', {
              method: 'POST',
              body: formData,
            });
            const data = await res.json();
            if (res.ok && data.status === 'success' && data.transcript) {
              setNotes((prev) => (prev ? `${prev} ${data.transcript}` : data.transcript));
            }
          } catch {
            // ignore
          } finally {
            setIsTranscribing(false);
          }
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);

      // Coba SpeechRecognition bawaan jika ada untuk live feedback real-time
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognitionRef.current = recognition;
          recognition.lang = 'id-ID';
          recognition.continuous = true;
          recognition.interimResults = false;

          recognition.onresult = (event: any) => {
            const last = event.results?.[event.results.length - 1];
            if (last && last[0] && last[0].transcript) {
              const text = last[0].transcript.trim();
              setNotes((prev) => (prev ? `${prev} ${text}` : text));
            }
          };

          recognition.onerror = () => {};
          recognition.start();
        } catch {}
      }
    } catch {
      setIsRecording(false);
      showDialog({
        type: 'error',
        title: 'Izin Mikrofon Diperlukan',
        message: 'Gagal mengakses mikrofon. Pastikan Anda telah mengizinkan akses mikrofon di pengaturan peramban.',
      });
    }
  };

  const handleFileUploadClick = () => {
    if (!isPro) {
      showProModal(
        'Unggah Dokumen & Foto (PDF, DOCX, OCR)',
        'Unggah berkas dokumen atau catatan harian, sistem AI mengekstrak teks menjadi draf logbook otomatis.'
      );
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran file maksimal 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        const clean = text.replace(/[\x00-\x09\x0B-\x1F\x7F]/g, ' ').slice(0, 3000).trim();
        if (clean) {
          setNotes((prev) => (prev ? `${prev}\n\n[Dari Dokumen ${file.name}]:\n${clean}` : clean));
        } else {
          setNotes((prev) => (prev ? `${prev}\n\nDokumen: ${file.name}` : `Dokumen: ${file.name}`));
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Kartu Status & Hitung Mundur Urgensi (Verity Style) */}
      <div
        className={`verity-card rounded-2xl p-4 transition ${
          isReported
            ? 'border-emerald-500/30 bg-emerald-950/20'
            : timeLeft.isUrgent === 'danger'
            ? 'border-red-500/40 bg-red-950/20'
            : timeLeft.isUrgent === 'warning'
            ? 'border-amber-500/40 bg-amber-950/20'
            : 'border-white/[0.08] bg-[#121216]/90'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {isReported ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : timeLeft.isUrgent === 'danger' ? (
              <AlertCircle className="h-5 w-5 text-red-400 animate-pulse" />
            ) : timeLeft.isUrgent === 'warning' ? (
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            ) : (
              <Clock className="h-5 w-5 text-cyan-400" />
            )}

            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Status Hari Ini
              </span>
              <h2 className="text-sm font-bold text-white">
                {isReported
                  ? 'Sudah Dilaporkan ke Maganghub'
                  : timeLeft.isUrgent === 'danger'
                  ? 'Kritis! Waktu Hampir Habis'
                  : timeLeft.isUrgent === 'warning'
                  ? 'Perhatian: Segera Selesaikan Laporan'
                  : 'Belum Dilaporkan'}
              </h2>
            </div>
          </div>

          {/* Hitung Mundur Tabular */}
          <div className="text-right">
            <span className="text-[10px] text-zinc-400 block">Sisa Waktu ke 23.59</span>
            <span
              className={`tabular-nums text-base font-extrabold font-mono ${
                isReported
                  ? 'text-emerald-400'
                  : timeLeft.isUrgent === 'danger'
                  ? 'text-red-400'
                  : timeLeft.isUrgent === 'warning'
                  ? 'text-amber-400'
                  : 'text-white'
              }`}
            >
              {String(timeLeft.hours).padStart(2, '0')}:
              {String(timeLeft.minutes).padStart(2, '0')}:
              {String(timeLeft.seconds).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Tombol Cepat Tandai Sudah Lapor */}
        <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
          <p className="text-[11px] text-zinc-400">
            {isReported
              ? 'Pengingat malam dinonaktifkan untuk hari ini.'
              : 'Tandai selesai jika sudah mengisi di portal Kemnaker.'}
          </p>
          <button
            onClick={handleToggleReported}
            className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold transition ${
              isReported
                ? 'bg-white/[0.05] border border-emerald-500/40 text-emerald-400 hover:bg-white/[0.08]'
                : 'bg-emerald-500 text-zinc-950 font-bold hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
            }`}
          >
            {isReported ? '✓ Batal Tandai' : 'Tandai Sudah Lapor'}
          </button>
        </div>
      </div>

      {/* Banner Konfirmasi Selesai Lapor & Aman di Database */}
      {isReported && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-xs text-emerald-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white text-sm">Laporan Hari Ini Telah Selesai Dilaporkan</p>
              <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
                Data tersimpan aman di database privat akun Anda. Hasil draf di layar telah dibersihkan agar tidak menumpuk. Anda dapat mengakses riwayat atau membuat Dek Slide PPT kapan saja di menu Riwayat.
              </p>
            </div>
          </div>
          <Link
            href="/app/riwayat"
            className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-400 transition shrink-0 shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Riwayat & Buat PPT</span>
          </Link>
        </div>
      )}

      {/* Formulir Input Catatan Kasar */}
      <div className="verity-card rounded-2xl p-4 shadow-sm">
        {/* Hidden File Input for Pro Document Upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".txt,.pdf,.docx,.doc,image/*"
          className="hidden"
        />

        {/* Header Catatan & Pro Tone Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-2.5">
          <div className="flex items-center gap-2">
            <label htmlFor="user-notes" className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              Catatan Kasar Hari Ini
            </label>
            {isPro && (
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-extrabold text-emerald-300">
                PRO AKTIF
              </span>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            {isPro ? (
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-[10px] text-zinc-500">Gaya:</span>
                {(['formal', 'standar', 'santai'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTone(t)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold capitalize transition cursor-pointer ${
                      selectedTone === t
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-[10px] text-zinc-500 font-mono">{notes.length}/4.000 kar.</span>
            )}
          </div>
        </div>

        <textarea
          id="user-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Contoh: tadi siang bantu install printer jaringan di divisi umum, cek kabel LAN ruangan 3, terus belajar bikin rekap surat jalan..."
          className="w-full rounded-xl border border-white/[0.08] bg-[#16161b] p-3 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
        />

        {/* Quick Tools */}
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-zinc-400">
          <div className="flex items-center gap-2.5 flex-wrap">
            {isRecording ? (
              <button
                type="button"
                onClick={handleVoiceInput}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-950/40 px-2.5 py-1 text-xs font-bold text-red-400 animate-pulse cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              >
                <Mic className="h-3.5 w-3.5 text-red-400" />
                <span>● Sedang Merekam Suara (Klik Berhenti)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleVoiceInput}
                className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-cyan-300 transition py-1 cursor-pointer"
              >
                <Volume2 className="h-3.5 w-3.5 text-cyan-400" />
                <span>Input Suara {isPro ? '(Pro Aktif)' : ''}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleFileUploadClick}
              className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-cyan-300 transition py-1 cursor-pointer"
            >
              <FileUp className="h-3.5 w-3.5 text-cyan-400" />
              <span>Unggah File {isPro ? '(Pro Aktif)' : ''}</span>
            </button>

            {isTranscribing && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 animate-pulse">
                <Sparkles className="h-3 w-3 animate-spin" />
                <span>Mentranskripsi suara dengan AI...</span>
              </span>
            )}
          </div>
          <span className="text-[10px] text-zinc-500">Hanya fakta nyata • Zero data leak</span>
        </div>

        {/* Notifikasi Galat */}
        {errorMsg && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-950/30 border border-red-500/30 p-2.5 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Pertanyaan Klarifikasi AI */}
        {needsMoreInfo && (
          <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <AlertTriangle className="h-4 w-4" />
              <span>Butuh Informasi Tambahan:</span>
            </div>
            <p className="mt-1 text-xs text-zinc-300">{needsMoreInfo.question}</p>
            <p className="mt-1 text-[11px] text-amber-400/80 italic">{needsMoreInfo.reason}</p>
          </div>
        )}

        {/* Tombol Utama Buat Laporan */}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="mt-3 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-white text-xs sm:text-sm font-bold text-zinc-950 shadow-[0_0_20px_rgba(255,255,255,0.2)] transition hover:bg-zinc-200 disabled:opacity-50 active:scale-[0.99]"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
              <span>Menyusun draf 3 kolom...</span>
            </div>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-cyan-600" />
              <span>Buat Draf Laporan 3 Kolom</span>
            </>
          )}
        </button>
      </div>

      {/* Peringatan Kemiripan Jaccard jika > 0.6 */}
      {similarityScore !== null && similarityScore > 0.6 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <span className="font-bold">Peringatan Kemiripan Tinggi ({Math.round(similarityScore * 100)}%):</span>
            <p className="mt-0.5 text-[11px] text-zinc-300">
              Draf ini memiliki kemiripan tinggi dengan laporan beberapa hari terakhir. Disarankan menambahkan rincian spesifik kegiatan hari ini agar tidak terkesan monoton.
            </p>
          </div>
        </div>
      )}

      {/* Kartu Hasil Draf 3 Kolom */}
      {draft ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Draf Laporan Maganghub
            </h3>
            <button
              onClick={handleCopyAll}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-white hover:bg-white/[0.08] transition"
            >
              {copiedKey === 'all' ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Semua Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Salin Semua Kolom</span>
                </>
              )}
            </button>
          </div>

          {/* Kolom 1: Uraian Aktivitas */}
          <div className="verity-card rounded-2xl p-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 mb-2">
              <span className="text-xs font-bold text-white">1. Uraian Aktivitas</span>
              <span
                className={`tabular-nums text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  draft.activity_desc.length >= 100
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                }`}
              >
                {draft.activity_desc.length} Karakter
              </span>
            </div>
            <p className="text-xs leading-relaxed text-zinc-200 whitespace-pre-wrap">
              {draft.activity_desc}
            </p>
            <button
              onClick={() => handleCopySingle(draft.activity_desc, 'act')}
              className="mt-3 flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] text-xs font-medium text-zinc-300 hover:bg-white/[0.06] hover:text-white transition"
            >
              {copiedKey === 'act' ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Salin Uraian Aktivitas</span>
                </>
              )}
            </button>
          </div>

          {/* Kolom 2: Pelajaran yang Diperoleh */}
          <div className="verity-card rounded-2xl p-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 mb-2">
              <span className="text-xs font-bold text-white">2. Pelajaran Diperoleh</span>
              <span
                className={`tabular-nums text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  draft.learning_desc.length >= 100
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                }`}
              >
                {draft.learning_desc.length} Karakter
              </span>
            </div>
            <p className="text-xs leading-relaxed text-zinc-200 whitespace-pre-wrap">
              {draft.learning_desc}
            </p>
            <button
              onClick={() => handleCopySingle(draft.learning_desc, 'learn')}
              className="mt-3 flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] text-xs font-medium text-zinc-300 hover:bg-white/[0.06] hover:text-white transition"
            >
              {copiedKey === 'learn' ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Salin Pelajaran Diperoleh</span>
                </>
              )}
            </button>
          </div>

          {/* Kolom 3: Kendala yang Dialami */}
          <div className="verity-card rounded-2xl p-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 mb-2">
              <span className="text-xs font-bold text-white">3. Kendala Dialami</span>
              <span
                className={`tabular-nums text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  draft.obstacle_desc.length >= 100
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                }`}
              >
                {draft.obstacle_desc.length} Karakter
              </span>
            </div>
            <p className="text-xs leading-relaxed text-zinc-200 whitespace-pre-wrap">
              {draft.obstacle_desc}
            </p>
            <button
              onClick={() => handleCopySingle(draft.obstacle_desc, 'obs')}
              className="mt-3 flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] text-xs font-medium text-zinc-300 hover:bg-white/[0.06] hover:text-white transition"
            >
              {copiedKey === 'obs' ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Salin Kendala Dialami</span>
                </>
              )}
            </button>
          </div>

          {/* Tombol Tautan Buka Maganghub Resmi */}
          <div className="pt-2">
            <a
              href="https://maganghub.kemnaker.go.id"
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-xs sm:text-sm font-semibold text-cyan-300 hover:bg-cyan-500/20 transition shadow-[0_0_20px_rgba(34,211,238,0.1)]"
            >
              <span>Buka Maganghub & Tempelkan Laporan</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      ) : (
        /* Keadaan Kosong (Empty State) */
        <div className="verity-card rounded-2xl border-dashed p-8 text-center">
          <Sparkles className="h-8 w-8 text-cyan-400/50 mx-auto mb-2" />
          <p className="text-xs text-zinc-400">
            Belum ada draf laporan hari ini. Ketikkan catatan kegiatan kerjamu di atas lalu tekan
            tombol &lsquo;Buat Draf Laporan 3 Kolom&rsquo;.
          </p>
        </div>
      )}

      {/* Prompt Pasang PWA */}
      {showPwaPrompt && (
        <div className="relative rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 text-xs text-cyan-200">
          <button
            type="button"
            onClick={() => setShowPwaPrompt(false)}
            className="absolute top-3 right-3 text-cyan-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="pr-6">
            <span className="font-bold text-white block mb-1">Pasang di Layar Utama HP</span>
            <p className="text-zinc-300 text-[11px] leading-relaxed">
              Buka menu browser dan pilih &lsquo;Tambahkan ke Layar Utama&rsquo; agar kamu bisa mengakses LaporMagang lebih cepat setiap sore layaknya aplikasi bawaan.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
