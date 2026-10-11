import crypto from 'crypto';
import { PackageDetails, QrisTransactionResult } from './midtrans';

export interface SociaBuzzConfig {
  username: string;
  apiKey: string;
  gatewayUrl?: string;
  webhookSecret?: string;
  webhookToken: string;
}

export function getSociaBuzzConfig(): SociaBuzzConfig {
  return {
    username: process.env.SOCIABUZZ_USERNAME || 'fxrrel',
    apiKey: process.env.SOCIABUZZ_API_KEY || 'laporanmagangasu',
    gatewayUrl: process.env.SOCIABUZZ_GATEWAY_URL || 'http://localhost:8000',
    webhookSecret: process.env.SOCIABUZZ_WEBHOOK_SECRET || 'laporanmagangasu',
    webhookToken: process.env.SOCIABUZZ_WEBHOOK_TOKEN || 'sbwhook-ojimaktaykmx2wh104h6qf7p',
  };
}

export function isSociaBuzzEnabled(): boolean {
  const provider = (process.env.PAYMENT_GATEWAY || 'sociabuzz').toLowerCase();
  if (provider === 'midtrans') return false;
  return true;
}

export interface CreateSociaBuzzParams {
  orderId: string;
  packageDetails: PackageDetails;
  userEmail: string;
  userName: string;
}

export interface SociaBuzzChargeResult extends QrisTransactionResult {
  token: string;
  invId?: string;
  paymentUrl?: string;
}

const COMMON_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
};

/**
 * 100% Native Serverless SociaBuzz Client (Vercel & Supabase Ready)
 * Tidak memerlukan daemon Go atau SQLite terpisah.
 */
export async function createSociaBuzzQrisCharge(
  params: CreateSociaBuzzParams
): Promise<SociaBuzzChargeResult> {
  const config = getSociaBuzzConfig();
  const { orderId, packageDetails, userEmail, userName } = params;

  // Jika user menyetel external gateway URL (scbz-server), gunakan itu terlebih dahulu
  if (config.gatewayUrl && config.gatewayUrl.startsWith('http')) {
    try {
      return await createViaExternalGateway(config.gatewayUrl, config.apiKey, params);
    } catch (err) {
      console.warn('External gateway failed, falling back to direct native SociaBuzz API:', err);
    }
  }

  // --- NATIVE DIRECT FLOW ---
  const username = config.username;

  // Step 1: Inisialisasi sesi untuk cookie & CSRF awal
  const initRes = await fetch(`https://sociabuzz.com/${encodeURIComponent(username)}/tribe`, {
    headers: {
      ...COMMON_HEADERS,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!initRes.ok) {
    throw new Error(`Gagal membuka profil SociaBuzz @${username} (HTTP ${initRes.status})`);
  }

  const rawInitCookies = initRes.headers.getSetCookie
    ? initRes.headers.getSetCookie()
    : [initRes.headers.get('set-cookie') || ''];

  const cookieMap: Record<string, string> = {};
  for (const c of rawInitCookies) {
    if (!c) continue;
    const [part] = c.split(';');
    const eqIdx = part.indexOf('=');
    if (eqIdx > 0) {
      cookieMap[part.slice(0, eqIdx).trim()] = part.slice(eqIdx + 1).trim();
    }
  }

  let csrfToken = cookieMap['sociabuzz_sb_cookie_csrf'] || cookieMap['csrf_cookie_name'] || '';
  let cookieHeader = Object.entries(cookieMap)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

  // Step 2: Kirim formulir donasi untuk mendapatkan token pembayaran
  const form = new URLSearchParams({
    sb_token_csrf: csrfToken,
    currency: 'IDR',
    amount: String(packageDetails.price),
    qty: '1',
    support_duration: '30',
    note: `LaporMagang ${packageDetails.label} (${orderId})`,
    fullname: userName || 'Peserta Magang',
    email: userEmail,
    is_agree: '1',
    years18: '1',
    is_vote: '0',
    is_voice: '0',
    is_mediashare: '0',
    is_gif: '0',
    is_sound: '0',
    vote_id: '',
    ms_maxtime: '',
    start_from: '0',
    ms_starthour: '0',
    ms_startminute: '0',
    ms_startsecond: '0',
    spin_check: '0',
    prev_url: `https://sociabuzz.com/${username}/tribe?`,
    hide_email: '0',
    is_tiktok: '0',
    tiktok_duration: '0',
    is_instagram: '0',
    instagram_duration: '0',
    wishlist_id: '',
    quickpay: '0',
  });

  const donateRes = await fetch(
    `https://sociabuzz.com/${encodeURIComponent(username)}/donate/get-form-queue`,
    {
      method: 'POST',
      headers: {
        ...COMMON_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        Origin: 'https://sociabuzz.com',
        Referer: `https://sociabuzz.com/${username}/tribe?`,
        Cookie: cookieHeader,
      },
      body: form.toString(),
    }
  );

  if (!donateRes.ok) {
    const errText = await donateRes.text();
    throw new Error(`SociaBuzz donate error (HTTP ${donateRes.status}): ${errText.slice(0, 100)}`);
  }

  const donateData = await donateRes.json();
  const redirectUrl = donateData?.content?.redirect || '';
  const token = redirectUrl.split('/').filter(Boolean).pop();
  if (!token) {
    throw new Error('SociaBuzz tidak mengembalikan payment token');
  }

  // Update cookies dari respon donasi
  const donateCookies = donateRes.headers.getSetCookie
    ? donateRes.headers.getSetCookie()
    : [donateRes.headers.get('set-cookie') || ''];
  for (const c of donateCookies) {
    if (!c) continue;
    const [part] = c.split(';');
    const eqIdx = part.indexOf('=');
    if (eqIdx > 0) {
      cookieMap[part.slice(0, eqIdx).trim()] = part.slice(eqIdx + 1).trim();
    }
  }
  cookieHeader = Object.entries(cookieMap)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

  // Step 3: Buka halaman pembayaran untuk memperbarui token CSRF halaman pay
  const payPageRes = await fetch(`https://sociabuzz.com/payment/x/${encodeURIComponent(token)}`, {
    headers: {
      ...COMMON_HEADERS,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Cookie: cookieHeader,
    },
  });

  const payPageCookies = payPageRes.headers.getSetCookie
    ? payPageRes.headers.getSetCookie()
    : [payPageRes.headers.get('set-cookie') || ''];
  for (const c of payPageCookies) {
    if (!c) continue;
    const [part] = c.split(';');
    const eqIdx = part.indexOf('=');
    if (eqIdx > 0) {
      cookieMap[part.slice(0, eqIdx).trim()] = part.slice(eqIdx + 1).trim();
    }
  }
  cookieHeader = Object.entries(cookieMap)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

  const payPageHtml = await payPageRes.text();
  const csrfMatch = payPageHtml.match(/name=["']sb_token_csrf["']\s+value=["']([^"']*)["']/i);
  if (csrfMatch && csrfMatch[1]) {
    csrfToken = csrfMatch[1];
  } else if (cookieMap['sociabuzz_sb_cookie_csrf']) {
    csrfToken = cookieMap['sociabuzz_sb_cookie_csrf'];
  }

  // Step 4: Buat tagihan QRIS dinamis via Xendit gateway di SociaBuzz
  const createPayRes = await fetch('https://sociabuzz.com/payment/send/create', {
    method: 'POST',
    headers: {
      ...COMMON_HEADERS,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      Origin: 'https://sociabuzz.com',
      Referer: `https://sociabuzz.com/payment/x/${token}`,
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      sb_token_csrf: csrfToken,
      order_id: token,
      final_currency: 'IDR',
      currency_def: 'IDR',
      payment_method: 'qris',
      type_payment: 'qris',
      source_payment: 'xendit',
      country: 'ID',
      country_pay: 'Indonesia',
    }),
  });

  if (!createPayRes.ok) {
    const errText = await createPayRes.text();
    throw new Error(`SociaBuzz create payment gagal (HTTP ${createPayRes.status}): ${errText.slice(0, 100)}`);
  }

  const payData = await createPayRes.json();
  const invId = payData?.inv_id || payData?.data?.id || token;
  const paymentUrl =
    payData?.data?.payment_link ||
    `https://sociabuzz.com/payment/pending?type=qris&inv_id=${encodeURIComponent(invId)}`;

  // Step 5: Ambil QR String resmi dari respon SociaBuzz
  let qrString = payData?.data?.qr_string || payData?.qr_string || '';
  if (!qrString && invId) {
    try {
      const pendingRes = await fetch(paymentUrl, {
        headers: {
          ...COMMON_HEADERS,
          Cookie: cookieHeader,
        },
      });
      if (pendingRes.ok) {
        const pendingHtml = await pendingRes.text();
        const qrMatch = pendingHtml.match(/(000201[0-9A-Za-z.=+_-]{50,})/);
        if (qrMatch && qrMatch[1]) {
          qrString = qrMatch[1];
        }
      }
    } catch {
      // Abaikan jika gagal
    }
  }

  const qrImageUrl = qrString
    ? `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(qrString)}`
    : `https://sociabuzz.com/payment/pending?type=qris&inv_id=${encodeURIComponent(invId)}`;

  // QRIS SociaBuzz expire dalam 3 menit (180 detik)
  const expiresAt = new Date(Date.now() + 180 * 1000).toISOString();

  return {
    orderId,
    grossAmount: packageDetails.price,
    qrString,
    qrImageUrl,
    expiresAt,
    isMock: false,
    gatewayMessage: 'SociaBuzz QRIS Aktif (180 detik)',
    token,
    invId,
    paymentUrl,
  };
}

/**
 * Pengecekan status pembayaran langsung (Vercel Serverless Ready)
 */
export async function checkSociaBuzzPaymentStatus(
  token: string,
  invId?: string
): Promise<'paid' | 'pending' | 'expired' | 'failed'> {
  const targetId = invId || token;
  const config = getSociaBuzzConfig();

  // 1. Jika scbz-server aktif (misal di localhost:8000), tanyakan status ke server Go terlebih dahulu
  if (config.gatewayUrl && config.gatewayUrl.startsWith('http')) {
    try {
      const gRes = await fetch(`${config.gatewayUrl}/api/payment/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { 'X-API-Key': config.apiKey } : {}),
        },
        body: JSON.stringify({
          token,
          inv_id: invId || undefined,
          payment_method: 'qris',
        }),
      });
      if (gRes.ok) {
        const gData = await gRes.json();
        const st = (gData?.status || '').toLowerCase();
        if (st === 'paid') return 'paid';
        if (st === 'expired') return 'expired';
        if (st === 'failed') return 'failed';
      }
    } catch {
      // Gateway offline / tidak running, lanjut ke native fetch
    }
  }

  // 2. Native Direct Status Check ke SociaBuzz
  if (!targetId) return 'pending';

  try {
    const res = await fetch(
      `https://sociabuzz.com/payment/pending?type=qris&inv_id=${encodeURIComponent(targetId)}`,
      {
        headers: {
          ...COMMON_HEADERS,
        },
      }
    );

    if (res.ok) {
      const html = await res.text();
      const parsed = parseHTMLStatus(html);
      if (parsed !== 'pending') return parsed;
    }

    // Cek juga fallback /payment/x/{token}
    if (token) {
      const tokenRes = await fetch(`https://sociabuzz.com/payment/x/${encodeURIComponent(token)}`, {
        headers: COMMON_HEADERS,
      });
      if (tokenRes.ok) {
        const tokenHtml = await tokenRes.text();
        return parseHTMLStatus(tokenHtml);
      }
    }

    return 'pending';
  } catch (error) {
    console.error('checkSociaBuzzPaymentStatus error:', error);
    return 'pending';
  }
}

function parseHTMLStatus(html: string): 'paid' | 'expired' | 'failed' | 'pending' {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const combined = ((titleMatch?.[1] || '') + ' ' + (h1Match?.[1] || '')).toLowerCase();

  if (
    combined.includes('payment successful') ||
    combined.includes('pembayaran berhasil') ||
    html.includes('Pembayaran Berhasil')
  ) {
    return 'paid';
  }
  if (
    combined.includes('link expired') ||
    combined.includes('payment expired') ||
    combined.includes('kadaluarsa') ||
    combined.includes('kedaluwarsa')
  ) {
    return 'expired';
  }
  if (combined.includes('payment failed') || combined.includes('pembayaran gagal')) {
    return 'failed';
  }
  return 'pending';
}

/**
 * Helper jika memanggil scbz-server eksternal
 */
async function createViaExternalGateway(
  gatewayUrl: string,
  apiKey: string,
  params: CreateSociaBuzzParams
): Promise<SociaBuzzChargeResult> {
  const url = gatewayUrl.replace(/\/+$/, '');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-API-Key'] = apiKey;

  const donateRes = await fetch(`${url}/api/donate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      username: getSociaBuzzConfig().username,
      amount: params.packageDetails.price,
      country: 'Indonesia',
      fullname: params.userName || 'Peserta Magang',
      email: params.userEmail,
      note: `LaporMagang ${params.packageDetails.label} (${params.orderId})`,
    }),
  });

  if (!donateRes.ok) throw new Error(`Gateway donate error: ${await donateRes.text()}`);
  const donateData = await donateRes.json();
  const token = donateData.token;

  const payRes = await fetch(`${url}/api/payment/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ token, payment_method: 'qris' }),
  });

  if (!payRes.ok) throw new Error(`Gateway pay error: ${await payRes.text()}`);
  const payData = await payRes.json();

  const invId = payData.inv_id || '';
  const qrString = payData.qr_string || '';
  const qrImageUrl =
    payData.qr_image_url ||
    (qrString
      ? `https://api.qrserver.com/v1/create-qr-code/?size=350x350&margin=10&data=${encodeURIComponent(
          qrString
        )}`
      : '');

  return {
    orderId: params.orderId,
    grossAmount: params.packageDetails.price,
    qrString,
    qrImageUrl,
    expiresAt: new Date(Date.now() + 180 * 1000).toISOString(),
    isMock: false,
    gatewayMessage: 'SociaBuzz QRIS Aktif via Gateway',
    token,
    invId,
    paymentUrl: payData.payment_url,
  };
}

export function verifySociaBuzzWebhookSignature(
  rawBody: string,
  receivedSignature: string,
  secret: string
): boolean {
  if (!secret) return true;
  if (!receivedSignature) return false;

  try {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(expected.toLowerCase(), 'utf8');
    const b = Buffer.from(receivedSignature.toLowerCase(), 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
