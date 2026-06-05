import pool from './db'
import { sendTelegramMessage, buildOrderMessage, buildConfirmKeyboard, answerCallbackQuery, editMessageReplyMarkup } from './telegram'
import { sendConfirmationEmail, sendDenialEmail } from './email'

export async function getMenuItems() {
  const { rows } = await pool.query(
    'SELECT * FROM menu_items WHERE available = true ORDER BY id'
  )
  return rows
}

export async function getMinDeliveryDays(): Promise<number> {
  const { rows } = await pool.query(
    "SELECT value FROM settings WHERE key = 'min_delivery_days'"
  )
  return rows.length ? parseInt(rows[0].value) : 2
}

export async function createOrder(data: {
  customer_name: string
  customer_email: string
  phone: string
  address: string
  delivery_date: string
  payment_method: string
  items: { item_name: string; qty: number; price: number }[]
}) {
  const total = data.items.reduce((sum, i) => sum + i.price * i.qty, 0)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `INSERT INTO orders (customer_name, customer_email, phone, address, delivery_date, payment_method, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [data.customer_name, data.customer_email, data.phone, data.address, data.delivery_date, data.payment_method, total]
    )
    const order = rows[0]
    for (const item of data.items) {
      await client.query(
        'INSERT INTO order_items (order_id, item_name, qty, price) VALUES ($1,$2,$3,$4)',
        [order.id, item.item_name, item.qty, item.price]
      )
    }
    await client.query('COMMIT')

    // Notify Breanna via Telegram
    try {
      const msg = buildOrderMessage({ ...order, items: data.items })
      const keyboard = buildConfirmKeyboard(order.id)
      const tgRes = await sendTelegramMessage(process.env.BREANNA_TELEGRAM_CHAT_ID!, msg, keyboard)
      if (tgRes.ok) {
        await client.query('UPDATE orders SET telegram_message_id=$1 WHERE id=$2', [tgRes.result.message_id, order.id])
      }
    } catch (e) {
      console.error('Telegram notify failed:', e)
    }

    return order
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function getOrder(id: number) {
  const { rows } = await pool.query('SELECT * FROM orders WHERE id=$1', [id])
  if (!rows.length) return null
  const order = rows[0]
  const { rows: items } = await pool.query('SELECT * FROM order_items WHERE order_id=$1', [id])
  return { ...order, items }
}

export async function confirmOrder(orderId: number, callbackQueryId?: string, chatId?: string, messageId?: number) {
  const { rows } = await pool.query(
    "UPDATE orders SET status='confirmed', confirmed_at=NOW() WHERE id=$1 AND status='pending' RETURNING *",
    [orderId]
  )
  if (!rows.length) return null
  const order = rows[0]
  const { rows: items } = await pool.query('SELECT * FROM order_items WHERE order_id=$1', [orderId])
  order.items = items

  // Send customer email
  if (order.customer_email) {
    try { await sendConfirmationEmail(order.customer_email, order) } catch (e) { console.error('Email failed:', e) }
  }

  // Reply in Telegram
  if (callbackQueryId) {
    try {
      await answerCallbackQuery(callbackQueryId, '✅ Order confirmed!')
      if (chatId && messageId) await editMessageReplyMarkup(chatId, messageId)
      await sendTelegramMessage(chatId!, `✅ Order #${orderId} confirmed! Customer has been notified.`)
    } catch (e) { console.error('Telegram reply failed:', e) }
  }

  return order
}

export async function denyOrder(orderId: number, callbackQueryId?: string, chatId?: string, messageId?: number) {
  const { rows } = await pool.query(
    "UPDATE orders SET status='cancelled' WHERE id=$1 AND status='pending' RETURNING *",
    [orderId]
  )
  if (!rows.length) return null
  const order = rows[0]
  const { rows: items } = await pool.query('SELECT * FROM order_items WHERE order_id=$1', [orderId])
  order.items = items

  if (order.customer_email) {
    try { await sendDenialEmail(order.customer_email, order) } catch (e) { console.error('Email failed:', e) }
  }

  if (callbackQueryId) {
    try {
      await answerCallbackQuery(callbackQueryId, '❌ Order denied.')
      if (chatId && messageId) await editMessageReplyMarkup(chatId, messageId)
      await sendTelegramMessage(chatId!, `❌ Order #${orderId} denied. Customer has been notified.`)
    } catch (e) { console.error('Telegram reply failed:', e) }
  }

  return order
}
