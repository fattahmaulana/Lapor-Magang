'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, CheckCircle2, AlertCircle, Info, X, ArrowRight } from 'lucide-react';

export type DialogType = 'pro' | 'success' | 'error' | 'info';

export interface DialogOptions {
  type?: DialogType;
  title: string;
  message: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
}

interface DialogContextType {
  showDialog: (options: DialogOptions) => void;
  showProModal: (featureName: string, description?: string) => void;
  closeDialog: () => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [activeDialog, setActiveDialog] = useState<DialogOptions | null>(null);

  const showDialog = (options: DialogOptions) => {
    setActiveDialog(options);
  };

  const showProModal = (featureName: string, description?: string) => {
    setActiveDialog({
      type: 'pro',
      title: 'Fitur Eksklusif Paket Pro',
      message:
        description ||
        `Fitur "${featureName}" tersedia khusus untuk pengguna Paket Pro. Mulai dari Rp5.000/bulan tanpa biaya langganan berulang.`,
      primaryActionLabel: 'Lihat Paket Pro',
      onPrimaryAction: () => {
        router.push('/app/profil');
      },
      secondaryActionLabel: 'Nanti Saja',
    });
  };

  const closeDialog = () => {
    setActiveDialog(null);
  };

  return (
    <DialogContext.Provider value={{ showDialog, showProModal, closeDialog }}>
      {children}

      {/* Modal Dialog UI Terpadu */}
      {activeDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="verity-card w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-white/10 space-y-4 animate-in zoom-in-95 duration-200">
            {/* Header Dialog */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {activeDialog.type === 'pro' ? (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.25)]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                ) : activeDialog.type === 'success' ? (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.25)]">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                ) : activeDialog.type === 'error' ? (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 shadow-[0_0_15px_rgba(248,113,113,0.25)]">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                    <Info className="h-5 w-5" />
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {activeDialog.title}
                  </h3>
                  {activeDialog.type === 'pro' && (
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 font-mono">
                      Upgrade Akses
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={closeDialog}
                className="text-zinc-400 hover:text-white p-1 transition cursor-pointer"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Konten Pesan */}
            <p className="text-xs text-zinc-300 leading-relaxed">
              {activeDialog.message}
            </p>

            {/* Tombol Aksi */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              {activeDialog.type === 'pro' ? (
                <>
                  <button
                    onClick={() => {
                      if (activeDialog.onPrimaryAction) activeDialog.onPrimaryAction();
                      closeDialog();
                    }}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 text-xs font-bold text-zinc-950 hover:bg-cyan-300 transition shadow-[0_0_15px_rgba(34,211,238,0.25)] cursor-pointer"
                  >
                    <span>{activeDialog.primaryActionLabel || 'Buka Halaman Pro'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={closeDialog}
                    className="flex h-10 w-full sm:w-auto items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
                  >
                    {activeDialog.secondaryActionLabel || 'Tutup'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    if (activeDialog.onPrimaryAction) activeDialog.onPrimaryAction();
                    closeDialog();
                  }}
                  className="flex h-10 w-full items-center justify-center rounded-xl bg-white px-4 text-xs font-bold text-zinc-950 hover:bg-zinc-200 transition shadow-sm cursor-pointer"
                >
                  {activeDialog.primaryActionLabel || 'Mengerti'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useAppDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useAppDialog harus digunakan di dalam DialogProvider');
  }
  return context;
}
