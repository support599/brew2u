import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface OrderItem {
  item_name: string
  qty: number
  price: number
}

interface Order {
  id: number
  customer_name: string
  phone: string
  address: string
  delivery_date: string
  payment_method: string
  total: number
  items: OrderItem[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

export async function sendConfirmationEmail(customerEmail: string, order: Order) {
  const date = formatDate(order.delivery_date)
  const itemRows = order.items.map(i =>
    `<tr><td style="padding:4px 8px">${i.item_name}</td><td style="padding:4px 8px">x${i.qty}</td><td style="padding:4px 8px">$${(i.price * i.qty).toFixed(2)}</td></tr>`
  ).join('')

  await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to: customerEmail,
    subject: 'Your Brew2u order is confirmed! ☕',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#3b2a1a">
        <div style="background:#6b3f1f;padding:24px;text-align:center;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:24px">brew2u</h1>
          <p style="color:#f5e6d3;margin:4px 0 0">Freshly bottled. Perfectly brewed. Delivered to you.</p>
        </div>
        <div style="background:#fdf6ee;padding:24px;border-radius:0 0 12px 12px">
          <h2 style="color:#6b3f1f">Your order is confirmed! 🎉</h2>
          <p>Hey ${order.customer_name}, we've got your order locked in.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            ${itemRows}
            <tr style="border-top:2px solid #d4a87a">
              <td colspan="2" style="padding:8px;font-weight:bold">Total</td>
              <td style="padding:8px;font-weight:bold">$${order.total.toFixed(2)}</td>
            </tr>
          </table>
          <p><strong>📅 Delivery:</strong> ${date}</p>
          <p><strong>📍 Address:</strong> ${order.address}</p>
          <p style="margin-top:24px;color:#6b3f1f;font-weight:bold">See you on ${date}! ☕</p>
          <hr style="border:none;border-top:1px solid #d4a87a;margin:24px 0">
          <p style="font-size:12px;color:#999">Questions? Text us at 903-378-9795</p>
        </div>
      </div>
    `,
  })
}

export async function sendDenialEmail(customerEmail: string, order: Order) {
  await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to: customerEmail,
    subject: 'About your Brew2u order',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#3b2a1a">
        <div style="background:#6b3f1f;padding:24px;text-align:center;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:24px">brew2u</h1>
        </div>
        <div style="background:#fdf6ee;padding:24px;border-radius:0 0 12px 12px">
          <h2>About your order</h2>
          <p>Hey ${order.customer_name}, we weren't able to confirm your order at this time.</p>
          <p>Please reach out and we'll sort it out:</p>
          <p><strong>📱 Text: 903-378-9795</strong></p>
          <p>Sorry for the inconvenience!</p>
        </div>
      </div>
    `,
  })
}
