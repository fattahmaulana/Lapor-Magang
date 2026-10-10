'use client';

import { LetterRevealHeading } from '@/components/ui/LetterRevealHeading';
import { FolderInteraction } from '@/components/ui/folder-interaction';

export function HowItWorks() {
  return (
    <section id="cara-kerja" className="relative border-t border-white/[0.06] bg-[#09090b] py-16 sm:py-24">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto">
          <LetterRevealHeading
            as="h3"
            text="Alur Kerja Pelaporan"
            className="text-2xl sm:text-3xl"
          />
          <p className="mt-2 text-xs sm:text-sm text-zinc-400">
            Proses terstruktur dalam tiga langkah tanpa integrasi kredensial langsung.
          </p>
        </div>

        {/* Interactive Folder Presentation */}
        <div className="mt-6 sm:mt-10 flex justify-center">
          <FolderInteraction />
        </div>
      </div>
    </section>
  );
}
