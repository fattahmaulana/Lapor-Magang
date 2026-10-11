import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSanitizedSupabaseConfig(): { url: string; key: string } | null {
  const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const rawKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();

  // Bersihkan kutip ganda/tunggal jika ter-paste di Vercel
  let url = rawUrl.replace(/^["']|["']$/g, '').trim();
  const key = rawKey.replace(/^["']|["']$/g, '').trim();

  if (!url || !key || url.includes('your-project') || key.includes('your-anon-key')) {
    return null;
  }

  // Jika pengguna menyalin URL Web Dashboard (https://supabase.com/dashboard/project/xyz)
  // Ekstrak project-ref dan ubah menjadi URL REST API resmi: https://xyz.supabase.co
  const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    url = `https://${dashboardMatch[1]}.supabase.co`;
  }

  // Hapus path /rest/v1 jika tidak sengaja disertakan
  url = url.replace(/\/rest\/v1\/?$/i, '');

  // Hapus trailing slash di akhir
  url = url.replace(/\/+$/, '');

  // Pastikan protokol https://
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  return { url, key };
}

export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const config = getSanitizedSupabaseConfig();
  if (!config) return null;

  try {
    supabaseInstance = createClient(config.url, config.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return supabaseInstance;
  } catch (err) {
    console.error('Inisialisasi Supabase gagal:', err);
    return null;
  }
}
