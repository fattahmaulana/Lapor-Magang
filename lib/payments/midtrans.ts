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

/**
 * Menghitung checksum CRC-16/CCITT-FALSE (Polynomial 0x1021, Initial 0xFFFF)
 * Standar resmi spesifikasi EMVCo QRIS Bank Indonesia
 */
export function calculateEmvcoCrc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Menyusun string QRIS dinamis berstandar EMVCo yang 100% valid
 * Dapat diparsing oleh Midtrans Simulator maupun scan m-Banking
 */
export function buildValidEmvcoQrisString(orderId: string, amount: number): string {
  const tlv = (tag: string, val: string) => {
    const len = String(val.length).padStart(2, '0');
    return `${tag}${len}${val}`;
  };

  const merchantAccountInfo =
    tlv('00', 'ID.LINKAJA.WWW') +
    tlv('01', '936009110021609101') +
    tlv('02', orderId);

  const additionalData = tlv('01', orderId);

  const rawWithoutCrc =
    tlv('00', '01') + // Format indicator
    tlv('01', '12') + // 12 = Dynamic QR
    tlv('26', merchantAccountInfo) + // Merchant Account Info
    tlv('52', '0000') + // Merchant Category Code
    tlv('53', '360') + // Currency: IDR (360)
    tlv('54', String(amount)) + // Amount
    tlv('58', 'ID') + // Country code
    tlv('59', 'LaporMagang') + // Merchant name
    tlv('60', 'Jakarta') + // City
    tlv('62', additionalData) + // Additional data (Ref/Order ID)
    '6304'; // CRC Tag + Length

  const crc = calculateEmvcoCrc16(rawWithoutCrc);
  return `${rawWithoutCrc}${crc}`;
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
  gatewayMessage?: string;
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

  let midtransErrorNotice: string | undefined;

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
          gatewayMessage: 'Midtrans Sandbox QRIS Aktif',
        };
      } else {
        const errText = await response.text();
        console.error('Midtrans Core API charge error:', errText);
        midtransErrorNotice = `Midtrans HTTP ${response.status}: ${errText.slice(0, 150)}`;
      }
    } catch (fetchErr) {
      console.error('Midtrans fetch network error:', fetchErr);
      midtransErrorNotice = 'Gagal menghubungi server Midtrans';
    }
  }

  // Gunakan generator EMVCo QRIS valid dengan CRC16 CCITT asli
  const validQrString = buildValidEmvcoQrisString(orderId, packageDetails.price);
  const reliableQrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
    validQrString
  )}`;

  return {
    orderId,
    grossAmount: packageDetails.price,
    qrString: validQrString,
    qrImageUrl: reliableQrImageUrl,
    expiresAt,
    isMock: true,
    gatewayMessage: midtransErrorNotice,
  };
}
