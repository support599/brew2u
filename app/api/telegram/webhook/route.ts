import { NextRequest, NextResponse } from 'next/server'
import { confirmOrder, denyOrder } from '@/lib/orders'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const callbackQuery = body.callback_query
    if (!callbackQuery) return NextResponse.json({ ok: true })

    const { id: callbackQueryId, data, message, from } = callbackQuery
    const chatId = String(from.id)
    const messageId = message?.message_id

    if (!data) return NextResponse.json({ ok: true })

    const [action, orderIdStr] = data.split(':')
    const orderId = parseInt(orderIdStr)

    if (action === 'confirm') {
      await confirmOrder(orderId, callbackQueryId, chatId, messageId)
    } else if (action === 'deny') {
      await denyOrder(orderId, callbackQueryId, chatId, messageId)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Telegram webhook error:', e)
    return NextResponse.json({ ok: true })
  }
}
