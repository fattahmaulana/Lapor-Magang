"use client";
import React, { useState } from "react";
import { motion } from "motion/react";
import { PenLine, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export interface FolderCard {
  step: string;
  tag: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}

interface FolderInteractionProps {
  cards?: FolderCard[];
  isOpen?: boolean;
  onToggle?: () => void;
}

const DEFAULT_CARDS: FolderCard[] = [
  {
    step: "01",
    tag: "Input Bebas",
    title: "1. Tulis Catatan",
    desc: "Ketik ringkasan kegiatan kerja harian sore hari tanpa format kaku.",
    icon: <PenLine className="size-3.5 sm:size-4 text-cyan-400 stroke-[2.2]" />,
  },
  {
    step: "02",
    tag: "Format Maganghub",
    title: "2. Draf 3 Kolom",
    desc: "Sistem merapikan Aktivitas, Pelajaran, dan Kendala otomatis terstandar.",
    icon: <FileSpreadsheet className="size-3.5 sm:size-4 text-cyan-400 stroke-[2.2]" />,
  },
  {
    step: "03",
    tag: "Kedaulatan Akun",
    title: "3. Salin & Submit",
    desc: "Salin 1-klik dan tempel mandiri ke portal resmi tanpa password akun.",
    icon: <ShieldCheck className="size-3.5 sm:size-4 text-cyan-400 stroke-[2.2]" />,
  },
];

export function FolderInteraction({
  cards = DEFAULT_CARDS,
  isOpen: controlledIsOpen,
  onToggle,
}: FolderInteractionProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [focusedCard, setFocusedCard] = useState<number | null>(null);
  const isMobile = useIsMobile();

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

  const toggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalOpen((prev) => !prev);
    }
  };

  const getPageTransform = (index: number) => {
    if (!isOpen) {
      // Kondisi map tertutup: kartu tersimpan rapi di dalam saku
      const spreadX = isMobile ? 22 : 36;
      if (index === 0) return { rotate: -4, x: -spreadX, y: 0, scale: 0.94, zIndex: 10 };
      if (index === 1) return { rotate: 0, x: 0, y: -4, scale: 0.96, zIndex: 20 };
      return { rotate: 4, x: spreadX, y: 0, scale: 0.94, zIndex: 10 };
    }

    // Kondisi map terbuka
    const isThisFocused = focusedCard === index;
    const baseZ = isThisFocused ? 40 : index === 1 ? 25 : 20;

    if (isMobile) {
      // Mobile: rentang pergeseran seimbang tanpa memotong batas atas container
      if (index === 0) {
        return {
          rotate: isThisFocused ? -2 : -8,
          x: -56,
          y: isThisFocused ? -52 : -38,
          scale: isThisFocused ? 1.04 : 0.98,
          zIndex: baseZ,
        };
      }
      if (index === 1) {
        return {
          rotate: 0,
          x: 0,
          y: isThisFocused ? -62 : -48,
          scale: isThisFocused ? 1.06 : 1.01,
          zIndex: baseZ,
        };
      }
      return {
        rotate: isThisFocused ? 2 : 8,
        x: 56,
        y: isThisFocused ? -52 : -38,
        scale: isThisFocused ? 1.04 : 0.98,
        zIndex: baseZ,
      };
    }

    // Desktop / Tablet (>=768px)
    if (index === 0) {
      return {
        rotate: isThisFocused ? -3 : -12,
        x: -120,
        y: isThisFocused ? -78 : -60,
        scale: isThisFocused ? 1.06 : 1.01,
        zIndex: baseZ,
      };
    }
    if (index === 1) {
      return {
        rotate: 0,
        x: 0,
        y: isThisFocused ? -92 : -74,
        scale: isThisFocused ? 1.08 : 1.03,
        zIndex: baseZ,
      };
    }
    return {
      rotate: isThisFocused ? 3 : 12,
      x: 120,
      y: isThisFocused ? -78 : -60,
      scale: isThisFocused ? 1.06 : 1.01,
      zIndex: baseZ,
    };
  };

  return (
    <div className="w-full flex flex-col justify-center items-center select-none pt-12 sm:pt-16 pb-4 px-3">
      {/* Outer wrapper dengan ruang atas yang cukup agar kartu tidak terpotong saat mekar */}
      <div className="relative w-full max-w-[320px] sm:max-w-md h-64 sm:h-72 flex justify-center items-end">
        {/* Container Map Utama */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Klik untuk melihat dokumen alur kerja"
          aria-expanded={isOpen}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggle();
            }
          }}
          className="w-full h-44 sm:h-52 relative cursor-pointer outline-none group"
        >
          {/* Back folder body */}
          <div
            className="folder relative w-[88%] mx-auto items-center h-full flex justify-center border border-white/10"
            style={{
              background: "#121217",
              boxShadow:
                "0px 0px 24px 8px rgba(34, 211, 238, 0.05) inset, 0 24px 48px -15px rgba(0,0,0,0.85)",
              borderRadius: 18,
            }}
          >
            {/* 3 Lembar Dokumen Langkah */}
            {cards.map((card, i) => {
              const transform = getPageTransform(i);
              return (
                <motion.div
                  key={card.step}
                  initial={false}
                  animate={{
                    rotate: transform.rotate,
                    x: transform.x,
                    y: transform.y,
                    scale: transform.scale,
                    zIndex: transform.zIndex,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 280,
                    damping: 24,
                    mass: 0.85,
                  }}
                  onClick={(e) => {
                    if (isOpen) {
                      e.stopPropagation();
                      setFocusedCard((prev) => (prev === i ? null : i));
                    }
                  }}
                  className="absolute bottom-6 w-[156px] sm:w-52 cursor-pointer"
                  style={{ transformOrigin: "bottom center" }}
                >
                  <div
                    className={`w-full rounded-xl sm:rounded-2xl border p-2.5 sm:p-4 backdrop-blur-md transition-all duration-200 ${
                      focusedCard === i
                        ? "border-cyan-400/50 bg-[#191924] shadow-[0_20px_40px_-10px_rgba(34,211,238,0.25)] ring-1 ring-cyan-400/30"
                        : "border-white/[0.12] bg-[#16161e] shadow-xl hover:border-white/25 hover:bg-[#1a1a24]"
                    }`}
                  >
                    {/* Header Dokumen */}
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5 sm:pb-2">
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <div className="p-0.5 sm:p-1 rounded-md bg-cyan-400/10 border border-cyan-400/20">
                          {card.icon}
                        </div>
                        <span className="font-mono text-[9px] sm:text-[10px] font-bold text-cyan-400">
                          STEP {card.step}
                        </span>
                      </div>
                      <span className="font-mono text-[8px] sm:text-[9px] text-zinc-400">
                        {card.tag}
                      </span>
                    </div>

                    {/* Judul & Isi */}
                    <div className="mt-1.5 sm:mt-2.5">
                      <h4 className="text-[11px] sm:text-[13px] font-bold text-white font-display leading-tight">
                        {card.title}
                      </h4>
                      <p className="mt-1 text-[9px] sm:text-[11px] text-zinc-300/90 leading-relaxed line-clamp-3 sm:line-clamp-none">
                        {card.desc}
                      </p>
                    </div>

                    {/* Footer Dokumen */}
                    <div className="mt-2 sm:mt-3 pt-1 sm:pt-2 border-t border-white/[0.04] flex items-center justify-between text-[8px] sm:text-[9px] font-mono text-zinc-500">
                      <span>lapormagang.id</span>
                      <span className="text-cyan-400/70">✓ Terstandar</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Front flap (Figma SVG) */}
          <motion.div
            animate={{ rotateX: isOpen ? -46 : 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="absolute -left-[1px] -right-[1px] -bottom-[1px] z-30 h-36 sm:h-44 rounded-3xl origin-bottom flex justify-center items-center overflow-visible pointer-events-none"
          >
            <svg
              className="w-full h-full overflow-visible drop-shadow-[0_-6px_16px_rgba(0,0,0,0.6)]"
              viewBox="0 0 235 121"
              fill="none"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                id="Vector"
                d="M104.615 0.350494L33.1297 0.838776C32.7542 0.841362 32.3825 0.881463 32.032 0.918854C31.6754 0.956907 31.3392 0.992086 31.0057 0.992096H31.0047C30.6871 0.99235 30.3673 0.962051 30.0272 0.929596C29.6927 0.897686 29.3384 0.863802 28.9803 0.866119L13.2693 0.967682H13.2527L13.2352 0.969635C13.1239 0.981406 13.0121 0.986674 12.9002 0.986237H9.91388C8.33299 0.958599 6.76052 1.22345 5.27423 1.76651H5.27325C4.33579 2.11246 3.48761 2.66213 2.7879 3.37393L2.49689 3.68839L2.492 3.69424C1.62667 4.73882 1.00023 5.96217 0.656067 7.27725C0.653324 7.28773 0.654065 7.29886 0.652161 7.30948C0.3098 8.62705 0.257231 10.0048 0.499817 11.3446L12.2147 114.399L12.2156 114.411L12.2176 114.423C12.6046 116.568 13.7287 118.508 15.3934 119.902C17.058 121.297 19.1572 122.056 21.3231 122.049V122.05H215.379C217.76 122.02 220.064 121.192 221.926 119.698V119.697C223.657 118.384 224.857 116.485 225.305 114.35L225.307 114.339L235.914 53.3798L235.968 53.1093L235.97 53.0985L235.971 53.0888C236.134 51.8978 236.044 50.685 235.705 49.5321C235.307 48.1669 234.63 46.9005 233.717 45.8144L233.383 45.4296C232.58 44.5553 231.614 43.8449 230.539 43.3398C229.311 42.7628 227.971 42.4685 226.616 42.4774H146.746C144.063 42.4705 141.423 41.8004 139.056 40.5263C136.691 39.2522 134.671 37.4127 133.175 35.1689L113.548 5.05948L113.544 5.05362L113.539 5.04776C112.545 3.65165 111.238 2.51062 109.722 1.72061C108.266 0.886502 106.627 0.422235 104.952 0.365143V0.364166L104.633 0.350494H104.615Z"
                fill="url(#folder_linear_body)"
                fillOpacity="0.88"
                stroke="url(#folder_linear_stroke)"
                strokeWidth="0.8"
              />
              <defs>
                <linearGradient
                  id="folder_linear_body"
                  x1="114.7"
                  y1="0.7"
                  x2="114.7"
                  y2="121.7"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#1e1e26" />
                  <stop offset="1" stopColor="#141418" />
                </linearGradient>
                <linearGradient
                  id="folder_linear_stroke"
                  x1="114.7"
                  y1="0.7"
                  x2="114.7"
                  y2="121.7"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="rgba(255,255,255,0.22)" />
                  <stop offset="1" stopColor="rgba(255,255,255,0.06)" />
                </linearGradient>
              </defs>
            </svg>
          </motion.div>
        </div>
      </div>

      {/* Petunjuk Aksi Interaktif */}
      <div className="mt-6 flex items-center gap-2 text-[11px] sm:text-xs font-mono text-zinc-500 text-center px-4">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
        <span>
          {isOpen
            ? "Pilih dokumen untuk detail · Klik map untuk menutup"
            : "Klik map untuk membuka 3 berkas langkah"}
        </span>
      </div>
    </div>
  );
}

export default FolderInteraction;
