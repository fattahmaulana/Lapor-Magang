import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { CapabilitiesBento } from '@/components/landing/CapabilitiesBento';
import { PricingTable } from '@/components/landing/PricingTable';
import { FAQSection } from '@/components/landing/FAQSection';
import { Footer } from '@/components/landing/Footer';

export default function LandingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://lapormagang.id/#organization',
        name: 'LaporMagang',
        url: 'https://lapormagang.id',
        description:
          'Pengingat harian gratis dan draf laporan harian Maganghub Kemnaker sebelum 23.59.',
        contactPoint: {
          '@type': 'ContactPoint',
          email: 'bantuan@lapormagang.id',
          contactType: 'customer support',
        },
      },
      {
        '@type': 'WebSite',
        '@id': 'https://lapormagang.id/#website',
        url: 'https://lapormagang.id',
        name: 'LaporMagang',
        publisher: { '@id': 'https://lapormagang.id/#organization' },
        inLanguage: 'id-ID',
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://lapormagang.id/#faq',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Apakah aplikasi ini resmi dari Kementerian Ketenagakerjaan (Kemnaker)?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Tidak. LaporMagang adalah alat bantu independen buatan pihak ketiga dan sama sekali tidak terafiliasi dengan Kemnaker maupun Maganghub.',
            },
          },
          {
            '@type': 'Question',
            name: 'Apakah aman memberikan email di sini?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Aman. Data kontak hanya digunakan untuk kode OTP masuk dan pengingat yang kamu aktifkan.',
            },
          },
          {
            '@type': 'Question',
            name: 'Apakah AI menuliskan laporan atau kegiatan fiktif?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Sama sekali tidak. AI kami hanya merapikan catatan kerja nyata yang kamu masukkan ke dalam 3 kolom Maganghub (minimal 100 karakter).',
            },
          },
        ],
      },
    ],
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#09090b] text-[#f4f4f5]">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Header />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <CapabilitiesBento />
        <PricingTable />
        <FAQSection />
      </main>
      <Footer />
    </div>
  );
}
