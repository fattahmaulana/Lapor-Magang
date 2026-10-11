import crypto from 'crypto';

export type ProPackageCode = '1m' | '3m' | '6m';

export interface PackageDetails {
  code: ProPackageCode;
  tierId: 'pro_1_month' | 'pro_3_months' | 'pro_6_months';
  label: string;
  price: number;
  durationDays: number;
}

export const PRO_PACKAGES: Record<ProPackageCode, PackageDetails> = {
  '1m': {
    code: '1m',
    tierId: 'pro_1_month',
    label: 'Paket Pro 1 Bulan',
    price: 5000,
    durationDays: 30,
  },
  '3m': {
    code: '3m',
    tierId: 'pro_3_months',
    label: 'Paket Pro 3 Bulan',
    price: 12000,
    durationDays: 90,
  },
  '6m': {
    code: '6m',
    tierId: 'pro_6_months',
    label: 'Paket Pro 6 Bulan',
    price: 22000,
    durationDays: 180,
  },
};

export function getPackageDetails(code: string): PackageDetails | null {
  if (code in PRO_PACKAGES) {
    return PRO_PACKAGES[code as ProPackageCode];
  }
  // Fallback untuk backward compatibility nama tier lama
  if (code === 'pro_1_month') return PRO_PACKAGES['1m'];
  if (code === 'pro_3_months') return PRO_PACKAGES['3m'];
  if (code === 'pro_6_months') return PRO_PACKAGES['6m'];
  return null;
}

export function isMidtransProduction(): boolean {
  return process.env.MIDTRANS_IS_PRODUCTION === 'true';
}

export function getMidtransBaseUrl(type: 'charge' | 'snap' = 'charge'): string {
  const isProd = isMidtransProduction();
  if (type === 'snap') {
    return isProd
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
  }
  return isProd
    ? 'https://api.midtrans.com/v2/charge'
    : 'https://api.sandbox.midtrans.com/v2/charge';
}

export function generateMidtransOrderId(): string {
  const prefix = 'LM';
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${randomStr}`;
}

export function verifyMidtransSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  serverKey: string;
  receivedSignature: string;
}): boolean {
  const { orderId, statusCode, grossAmount, serverKey, receivedSignature } = params;
  if (!orderId || !statusCode || !grossAmount || !serverKey || !receivedSignature) {
    return false;
  }

  const cleanServerKey = serverKey.replace(/^["']|["']$/g, '').trim();

  const expectedHash = crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${cleanServerKey}`)
    .digest('hex');

  try {
    const a = Buffer.from(expectedHash.toLowerCase(), 'utf8');
    const b = Buffer.from(receivedSignature.toLowerCase(), 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export interface CreateQrisTransactionParams {
  orderId: string;
  packageDetails: PackageDetails;
  userEmail: string;
  userName: string;
}

export interface QrisTransactionResult {
  orderId: string;
  grossAmount: number;
  qrString: string;
  qrImageUrl: string;
  expiresAt: string;
  isMock: boolean;
  midtransError?: string;
}

/**
 * Memanggil Midtrans Core API (/v2/charge) untuk membuat transaksi QRIS dinamis
 */
export async function createMidtransQrisCharge(
  params: CreateQrisTransactionParams
): Promise<QrisTransactionResult> {
  const rawKey = process.env.MIDTRANS_SERVER_KEY || '';
  const serverKey = rawKey.replace(/^["']|["']$/g, '').trim();
  const { orderId, packageDetails, userEmail, userName } = params;

  // Waktu kedaluwarsa QRIS: 15 menit dari sekarang
  const expireDate = new Date(Date.now() + 15 * 60 * 1000);
  const expiresAt = expireDate.toISOString();

  if (serverKey && !serverKey.startsWith('mock_') && serverKey !== 'test_server_key') {
    const chargeUrl = getMidtransBaseUrl('charge');
    const authHeader = Buffer.from(`${serverKey}:`).toString('base64');

    try {
      const response = await fetch(chargeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Basic ${authHeader}`,
        },
        body: JSON.stringify({
          payment_type: 'qris',
          transaction_details: {
            order_id: orderId,
            gross_amount: packageDetails.price,
          },
          item_details: [
            {
              id: packageDetails.code,
              price: packageDetails.price,
              quantity: 1,
              name: `${packageDetails.label} - LaporMagang`,
            },
          ],
          customer_details: {
            email: userEmail,
            first_name: userName || 'Peserta Magang',
          },
          qris: {
            acquirer: 'gopay',
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const qrString = data.qr_string || '';

        // Gambar QR Code yang 100% bisa dibuka di browser publik tanpa auth header
        const reliableQrImageUrl = qrString
          ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
              qrString
            )}`
          : (data.actions || []).find((a: any) => a.name === 'generate-qr-code')?.url || '';

        return {
          orderId,
          grossAmount: packageDetails.price,
          qrString,
          qrImageUrl: reliableQrImageUrl,
          expiresAt: data.expiry_time || expiresAt,
          isMock: false,
        };
      } else {
        const errText = await response.text();
        console.error('Midtrans Core API charge error:', errText);
      }
    } catch (fetchErr) {
      console.error('Midtrans fetch network error:', fetchErr);
    }
  }

  // Mock / Simulasi saat kredensial Sandbox belum terkonfigurasi di Vercel
  const mockQrString = `00020101021226670014ID.LINKAJA.WWW01189360091100216091010215${orderId}520458125303360540${packageDetails.price}.005802ID5911LaporMagang6007Jakarta62170113${orderId}6304ABCD`;
  const mockQrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
    mockQrString
  )}`;

  return {
    orderId,
    grossAmount: packageDetails.price,
    qrString: mockQrString,
    qrImageUrl: mockQrImageUrl,
    expiresAt,
    isMock: true,
  };
}
