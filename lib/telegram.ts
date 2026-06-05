const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

export async function sendTelegramMessage(chatId: string, text: string, replyMarkup?: object) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  }
  if (replyMarkup) body.reply_markup = replyMarkup

  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

export async function answerCallbackQuery(callbackQueryId: string, text: string) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  })
}

export async function editMessageReplyMarkup(chatId: string, messageId: number) {
  await fetch(`${TELEGRAM_API}/editMessageReplyMarkup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } }),
  })
}

export function buildOrderMessage(order: {
  id: number
  customer_name: string
  phone: string
  address: string
  delivery_date: string
  payment_method: string
  total: number
  items: { item_name: string; qty: number; price: number }[]
}) {
  const paymentLabel: Record<string, string> = {
    cashapp: 'CashApp',
    venmo: 'Venmo',
    in_person: 'Pay in Person',
  }
  const itemLines = order.items.map(i => `  ${i.item_name} x${i.qty}`).join('\n')
  const date = new Date(order.delivery_date).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return `🆕 <b>New Brew2u Order!</b>

👤 ${order.customer_name}
📞 ${order.phone}
📍 ${order.address}
📅 Deliver: ${date}
💳 ${paymentLabel[order.payment_method] || order.payment_method}

🛒 <b>Order:</b>
${itemLines}
─────────────
<b>Total: $${order.total.toFixed(2)}</b>`
}

export function buildConfirmKeyboard(orderId: number) {
  return {
    inline_keyboard: [[
      { text: '✅ Confirm', callback_data: `confirm:${orderId}` },
      { text: '❌ Deny', callback_data: `deny:${orderId}` },
    ]],
  }
}
