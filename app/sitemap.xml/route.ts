import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = 'https://lapormagang.id';
  const pages = [
    { url: `${baseUrl}/`, changefreq: 'daily', priority: '1.0' },
    { url: `${baseUrl}/masuk`, changefreq: 'monthly', priority: '0.8' },
    { url: `${baseUrl}/kebijakan-privasi`, changefreq: 'monthly', priority: '0.5' },
    { url: `${baseUrl}/syarat-layanan`, changefreq: 'monthly', priority: '0.5' },
    { url: `${baseUrl}/kebijakan-refund`, changefreq: 'monthly', priority: '0.5' },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages
    .map(
      (p) => `
    <url>
      <loc>${p.url}</loc>
      <changefreq>${p.changefreq}</changefreq>
      <priority>${p.priority}</priority>
    </url>`
    )
    .join('')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
