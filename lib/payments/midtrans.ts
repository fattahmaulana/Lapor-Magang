import crypto from 'crypto';

export interface CreateOrderParams {
  userId: string;
  userEmail: string;
  userName: string;
  tier: 'pro_1_month' | 'pro_3_months' | 'pro_6_months';
  amount: number;
}

export interface MidtransOrderResponse {
  orderId: string;
  grossAmount: number;
  snapToken?: string;
  redirectUrl?: string;
  tier: string;
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
  const hash = crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');

  try {
    const a = Buffer.from(hash, 'utf8');
    const b = Buffer.from(receivedSignature, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Panggil API Resmi Midtrans Snap untuk membuat transaksi pembayaran
 */
export async function createMidtransSnapTransaction(
  params: CreateOrderParams
): Promise<MidtransOrderResponse> {
  const orderId = generateMidtransOrderId();
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

  const baseUrl = isProduction
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

  let snapToken: string | undefined;
  let redirectUrl: string | undefined;

  if (serverKey) {
    const authHeader = Buffer.from(`${serverKey}:`).toString('base64');
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: orderId,
          gross_amount: params.amount,
        },
        customer_details: {
          email: params.userEmail,
          first_name: params.userName,
        },
        item_details: [
          {
            id: params.tier,
            price: params.amount,
            quantity: 1,
            name: `Langganan LaporMagang (${params.tier})`,
          },
        ],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      snapToken = data.token;
      redirectUrl = data.redirect_url;
    }
  }

  // Jika serverKey belum diisi di environment, arahkan ke URL instruksi setup
  if (!redirectUrl) {
    redirectUrl = `https://simulator.sandbox.midtrans.com/qris/index?order_id=${orderId}`;
  }

  return {
    orderId,
    grossAmount: params.amount,
    snapToken,
    redirectUrl,
    tier: params.tier,
  };
}
