import Link from 'next/link';

export default function KebijakanRefundPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] px-4 py-12 sm:px-6 verity-mesh-bg">
      <div className="verity-card mx-auto max-w-3xl space-y-6 rounded-3xl p-6 sm:p-10 shadow-2xl">
        <div>
          <Link href="/" className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition">
            ← Kembali ke Beranda
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">
            Kebijakan Pengembalian Dana (Refund)
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Terakhir diperbarui: 8 Oktober 2026
          </p>
        </div>

        <div className="space-y-5 text-xs leading-relaxed text-zinc-300">
          <section>
            <h2 className="text-sm font-bold text-white">1. Skema Pembayaran Sekali Bayar</h2>
            <p className="mt-1 text-zinc-400">
              Seluruh paket Pro (Rp5.000 / Rp12.000 / Rp22.000) menggunakan transaksi QRIS dinamis
              sekali bayar (*pre-paid*) tanpa auto-debit. Saldo dompet digital atau rekening bank
              kamu tidak akan pernah terpotong berulang secara otomatis.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-white">2. Syarat Pengajuan Pengembalian Dana</h2>
            <p className="mt-1 text-zinc-400">
              Pengembalian dana dapat diajukan dalam waktu 7 (tujuh) hari kerja setelah pembayaran
              apabila terjadi kendala sistem fatal, seperti status Pro gagal aktif setelah verifikasi
              pembayaran berhasil dan tim bantuan kami tidak dapat menyelesaikannya dalam 1x24 jam.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-white">3. Prosedur Klaim</h2>
            <p className="mt-1 text-zinc-400">
              Kirimkan bukti transaksi QRIS dan Order ID ke alamat email{' '}
              <strong className="text-white">bantuan@lapormagang.id</strong>. Tim verifikasi kami akan meninjau dan
              memproses pengembalian dana melalui transfer bank/e-wallet dalam 3–5 hari kerja.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
