import Link from 'next/link';

export default function KebijakanPrivasiPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] px-4 py-12 sm:px-6 verity-mesh-bg">
      <div className="verity-card mx-auto max-w-3xl space-y-6 rounded-3xl p-6 sm:p-10 shadow-2xl">
        <div>
          <Link href="/" className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition">
            ← Kembali ke Beranda
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">
            Kebijakan Privasi LaporMagang
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Terakhir diperbarui: 8 Oktober 2026 • Sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi
          </p>
        </div>

        <div className="space-y-5 text-xs leading-relaxed text-zinc-300">
          <section>
            <h2 className="text-sm font-bold text-white">1. Prinsip Minimasi Data</h2>
            <p className="mt-1 text-zinc-400">
              LaporMagang memegang teguh prinsip pengumpulan data sesedikit mungkin. Kami hanya
              mengumpulkan alamat email untuk autentikasi kode OTP, preferensi zona waktu (WIB/WITA/WIT),
              dan ID obrolan Telegram jika kamu secara sukarela mengaktifkan saluran bot pengingat.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-white">2. Larangan Keras Kata Sandi Maganghub</h2>
            <p className="mt-1 text-zinc-400">
              LaporMagang <strong>tidak pernah meminta, memproses, atau menyimpan</strong> kata sandi
              atau kredensial akun SIAP Kerja / Maganghub Kemnaker. Jangan pernah membagikan kata
              sandi akun resmi pemerintah kepada pihak manapun.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-white">3. Pengelolaan Catatan & Kecerdasan Buatan</h2>
            <p className="mt-1 text-zinc-400">
              Catatan mentah yang kamu ketikkan hanya diproses secara langsung untuk menyusun draf
              laporan 3 kolom. Catatan mentah tidak disimpan permanen di server kami. Pemrosesan AI
              menggunakan antarmuka API korporat yang tidak melatih model kecerdasan buatan dari data
              pengguna.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-white">4. Hak Subjek Data (Penghapusan Total)</h2>
            <p className="mt-1 text-zinc-400">
              Sesuai UU PDP No. 27/2022, kamu berhak meminta ekspor data atau penghapusan seluruh data
              profil, preferensi jadwal, dan riwayat laporan kapan saja melalui tombol &lsquo;Hapus Semua
              Data&rsquo; di menu Pengaturan aplikasi atau melalui email ke bantuan@lapormagang.id.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
