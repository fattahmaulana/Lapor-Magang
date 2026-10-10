import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const secretHeader = req.headers.get('x-telegram-bot-api-secret-token');
    const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (configuredSecret && secretHeader !== configuredSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();

    // Callback query handling (Tombol 'Sudah lapor' & 'Ingatkan 30 menit lagi')
    if (body.callback_query) {
      const data = body.callback_query.data;
      const callbackQueryId = body.callback_query.id;

      if (data === 'action_mark_reported') {
        return NextResponse.json({
          method: 'answerCallbackQuery',
          callback_query_id: callbackQueryId,
          text: '✅ Mantap! Laporan hari ini sudah ditandai selesai. Pengingat malam ini dihentikan.',
          show_alert: true,
        });
      }

      if (data === 'action_snooze_30') {
        return NextResponse.json({
          method: 'answerCallbackQuery',
          callback_query_id: callbackQueryId,
          text: '⏰ Siap, kami akan ingatkan kembali 30 menit lagi.',
          show_alert: false,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
