import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/server-db';
import {
  getSociaBuzzConfig,
  verifySociaBuzzWebhookSignature,
} from '@/lib/payments/sociabuzz';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const config = getSociaBuzzConfig();

    let payload: Record<string, any> = {};
    if (rawBody.trim()) {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        // Fallback form url-encoded
        const params = new URLSearchParams(rawBody);
        params.forEach((v, k) => {
          payload[k] = v;
        });
      }
    }

    // 1. Validasi Webhook Token / Secret
    const receivedToken =
      req.headers.get('x-sociabuzz-token') ||
      req.headers.get('x-webhook-token') ||
      req.headers.get('token') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      req.nextUrl.searchParams.get('token') ||
      payload.webhook_token ||
      (typeof payload.token === 'string' && payload.token.startsWith('sbwhook-')
        ? payload.token
        : '');

    const receivedSig = req.headers.get('x-webhook-signature') || '';
    const secretHeader = req.headers.get('x-webhook-secret') || '';

    // Cek kecocokan jika token dikonfigurasi
    const isTokenMatch = receivedToken && receivedToken === config.webhookToken;
    const isSecretMatch = secretHeader && secretHeader === config.webhookSecret;
    const isSigValid =
      Boolean(receivedSig) &&
      verifySociaBuzzWebhookSignature(rawBody, receivedSig, config.webhookSecret || '');

    // Jika SociaBuzz melakukan "Test Notifikasi" dari dashboard
    const isTestNotification =
      payload.type === 'test' ||
      payload.event === 'test' ||
      payload.action === 'test' ||
      (Object.keys(payload).length === 0 && rawBody.toLowerCase().includes('test'));

    if (isTestNotification) {
      return NextResponse.json({
        status: 'ok',
        message: 'webhook received successfully',
      });
    }

    // Tolak hanya jika ada token dikirim tapi tidak cocok
    if (receivedToken && !isTokenMatch && !isSecretMatch && !isSigValid) {
      return NextResponse.json({ message: 'Webhook token tidak valid.' }, { status: 403 });
    }

    const token =
      payload.session_token ||
      (typeof payload.token === 'string' && !payload.token.startsWith('sbwhook-')
        ? payload.token
        : '');

    const invId =
      payload.inv_id ||
      payload.order_id ||
      payload.invoice_id ||
      payload.transaction_id ||
      payload.id;

    // Ekstrak Order ID dari kolom pesan/catatan donasi (contoh: "... (LM-12345) ...")
    const noteText =
      (payload.message || payload.note || payload.description || payload.text || '') + '';
    const orderMatch = noteText.match(/LM-[A-Za-z0-9-]+/i);
    const extractedOrderId = orderMatch ? orderMatch[0] : null;

    // Cari order di database
    let order = null;
    if (token) {
      order = await serverDb.getPaymentByToken(token);
    }
    if (!order && extractedOrderId) {
      order = await serverDb.getPayment(extractedOrderId);
    }
    if (!order && invId) {
      order = await serverDb.getPayment(invId);
    }

    const status = (payload.status || payload.event || 'paid').toString().toLowerCase();
    const isPaid =
      status === 'paid' ||
      status === 'payment.paid' ||
      status === 'settlement' ||
      status === 'success' ||
      status === 'completed' ||
      status === 'donated';

    if (order && isPaid) {
      const result = await serverDb.settlePayment(order.order_id);
      return NextResponse.json({
        status: 'ok',
        message: 'webhook received successfully',
        order_id: order.order_id,
        alreadySettled: result.alreadySettled,
      });
    }

    if (order && (status === 'expired' || status === 'payment.expired')) {
      await serverDb.updatePaymentStatus(order.order_id, 'expired', 'SociaBuzz payment expired');
      return NextResponse.json({
        status: 'ok',
        message: 'webhook received successfully',
        order_id: order.order_id,
        paymentStatus: 'expired',
      });
    }

    if (order && (status === 'failed' || status === 'payment.failed')) {
      await serverDb.updatePaymentStatus(order.order_id, 'failed', 'SociaBuzz payment failed');
      return NextResponse.json({
        status: 'ok',
        message: 'webhook received successfully',
        order_id: order.order_id,
        paymentStatus: 'failed',
      });
    }

    // Default response standar SociaBuzz
    return NextResponse.json({
      status: 'ok',
      message: 'webhook received successfully',
      matched: Boolean(order),
    });
  } catch (error) {
    console.error('SociaBuzz webhook error:', error);
    return NextResponse.json({ message: 'Gagal memproses webhook.' }, { status: 500 });
  }
}

// Support GET dan HEAD ping test dari dashboard SociaBuzz
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'webhook received successfully',
  });
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
