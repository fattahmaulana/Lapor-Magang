import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-zinc-400">Halaman tidak ditemukan.</p>
      <Link href="/" className="mt-4 text-cyan-400 hover:underline">
        Kembali ke Beranda
      </Link>
    </div>
  );
}
