import Link from 'next/link';

export default function SyaratLayananPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] px-4 py-12 sm:px-6 verity-mesh-bg">
      <div className="verity-card mx-auto max-w-3xl space-y-6 rounded-3xl p-6 sm:p-10 shadow-2xl">
        <div>
          <Link href="/" className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition">
            ← Kembali ke Beranda
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">
            Syarat & Ketentuan Layanan
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Terakhir diperbarui: 8 Oktober 2026
          </p>
        </div>

        <div className="space-y-5 text-xs leading-relaxed text-zinc-300">
          <section>
            <h2 className="text-sm font-bold text-white">1. Batasan Status Produk</h2>
            <p className="mt-1 text-zinc-400">
              LaporMagang adalah alat bantu pihak ketiga mandiri yang tidak terafiliasi dengan
              Kementerian Ketenagakerjaan Republik Indonesia (Kemnaker). Aplikasi ini tidak menjamin
              kelulusan program magang atau pencairan uang saku, melainkan bertindak sebagai asisten
              disiplin pengingat dan penyusun draf.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-white">2. Tanggung Jawab Isi Laporan</h2>
            <p className="mt-1 text-zinc-400">
              Pengguna bertanggung jawab penuh atas kebenaran faktual laporan harian yang disalin ke
              portal Maganghub Kemnaker. Pengguna wajib memeriksa dan merevisi draf sebelum
              mengirimkannya ke sistem resmi pemerintah.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-white">3. Penggunaan Wajar</h2>
            <p className="mt-1 text-zinc-400">
              Dilarang memanfaatkan layanan ini untuk injeksi perintah otomatis, spamming endpoint
              sistem, atau upaya penetrasi yang mengganggu keandalan sistem bagi peserta magang
              lainnya.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
