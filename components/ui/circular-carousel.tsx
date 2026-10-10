"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CarouselItem {
  id: string;
  title: string;
  description: string;
  tag?: string;
}

export interface CircularCarouselProps {
  items: CarouselItem[];
  activeIndex?: number;
  onActiveChange?: (index: number) => void;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  className?: string;
}

const RADIUS_X = 240;
const RADIUS_Y = 100;

function getItemPosition(index: number, activeIndex: number, total: number) {
  let offset = (index - activeIndex) % total;
  if (offset > total / 2) offset -= total;
  if (offset < -total / 2) offset += total;

  // Hanya render 5 kartu terdekat
  if (Math.abs(offset) > 2) return null;

  const angle = (offset / 5) * Math.PI;
  const x = Math.sin(angle) * RADIUS_X;
  const y = -Math.cos(angle) * RADIUS_Y;

  const distance = Math.abs(offset);
  const scale = Math.max(0.7, 1 - distance * 0.12);
  const opacity = distance === 0 ? 1 : distance === 1 ? 0.75 : 0.35;
  const zIndex = 10 - distance;

  return { x, y, scale, opacity, zIndex };
}

export function CircularCarousel({
  items,
  activeIndex: controlledIndex,
  onActiveChange,
  autoPlay = true,
  autoPlayInterval = 4000,
  className,
}: CircularCarouselProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeIndex = controlledIndex ?? internalIndex;
  const total = items.length;

  const goTo = useCallback(
    (index: number) => {
      const newIndex = ((index % total) + total) % total;
      if (controlledIndex === undefined) {
        setInternalIndex(newIndex);
      }
      onActiveChange?.(newIndex);
    },
    [total, controlledIndex, onActiveChange],
  );

  const next = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const prev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

  useEffect(() => {
    if (!autoPlay || isHovered || isFocused) return;
    intervalRef.current = setInterval(next, autoPlayInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoPlay, autoPlayInterval, isHovered, isFocused, next]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    const el = containerRef.current;
    el?.addEventListener("keydown", handler);
    return () => el?.removeEventListener("keydown", handler);
  }, [next, prev]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-label="Circular carousel"
      aria-roledescription="carousel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className={cn(
        "relative flex flex-col items-center justify-center gap-8 outline-none w-full max-w-4xl",
        className,
      )}
    >
      {/* Circular track */}
      <div className="relative h-[340px] sm:h-[360px] w-full max-w-2xl flex items-center justify-center">
        {items.map((item, i) => {
          const pos = getItemPosition(i, activeIndex, total);
          if (!pos) return null;

          const isActive = i === activeIndex;

          return (
            <motion.button
              key={item.id}
              animate={{
                x: pos.x,
                y: pos.y,
                scale: pos.scale,
                opacity: pos.opacity,
                zIndex: pos.zIndex,
              }}
              transition={{
                type: "spring",
                stiffness: 450,
                damping: 38,
                mass: 0.8,
              }}
              onClick={() => goTo(i)}
              aria-label={item.title}
              aria-selected={isActive}
              role="option"
              className={cn(
                "group absolute left-1/2 top-1/2 flex min-h-[168px] w-64 sm:w-72 -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center justify-center text-center overflow-hidden rounded-2xl border bg-[#121217] p-5.5 backdrop-blur-md will-change-transform",
                isActive
                  ? "border-white/20 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.85)]"
                  : "border-white/[0.08] shadow-[0_8px_24px_-4px_rgba(0,0,0,0.5)] hover:border-white/15",
              )}
              style={{ transformOrigin: "center center" }}
            >
              {/* Subtle top rim highlight & siluet gradient */}
              <div
                className={cn(
                  "pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/[0.08] to-transparent transition-opacity duration-200",
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                )}
              />
              <div
                className={cn(
                  "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent transition-opacity duration-200",
                  isActive ? "opacity-100" : "opacity-40 group-hover:opacity-80",
                )}
              />

              {item.tag && (
                <span className="relative z-10 mb-2 inline-block rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-300 border border-white/10">
                  {item.tag}
                </span>
              )}
              <h4
                className={cn(
                  "relative z-10 w-full font-display font-bold leading-snug transition-colors duration-200",
                  isActive
                    ? "text-white text-base sm:text-lg"
                    : "text-zinc-200 text-sm sm:text-base group-hover:text-white",
                )}
              >
                {item.title}
              </h4>
              <p
                className={cn(
                  "relative z-10 mt-2 w-full text-xs sm:text-[13px] leading-relaxed transition-colors duration-200",
                  isActive ? "text-zinc-300" : "text-zinc-400/90 group-hover:text-zinc-300",
                )}
              >
                {item.description}
              </p>
            </motion.button>
          );
        })}
      </div>

      {/* Controls: Pure navigation controls without numbers */}
      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={prev}
          aria-label="Item sebelumnya"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/30"
        >
          <ChevronLeft className="size-4" />
        </motion.button>

        {/* Dot indicators */}
        <div className="flex items-center gap-1.5 px-1" role="tablist">
          {items.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === activeIndex}
              onClick={() => goTo(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-200",
                i === activeIndex
                  ? "w-6 bg-white shadow-[0_0_10px_rgba(255,255,255,0.4)]"
                  : "w-1.5 bg-white/20 hover:bg-white/40",
              )}
              aria-label={`Pilih item ${i + 1}`}
            />
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={next}
          aria-label="Item berikutnya"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/30"
        >
          <ChevronRight className="size-4" />
        </motion.button>
      </div>
    </div>
  );
}

export default CircularCarousel;
