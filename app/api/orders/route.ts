import { NextRequest, NextResponse } from 'next/server'
import { createOrder } from '@/lib/orders'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { customer_name, customer_email, phone, address, delivery_date, payment_method, items } = body

    if (!customer_name || !phone || !address || !delivery_date || !payment_method || !items?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const order = await createOrder({ customer_name, customer_email, phone, address, delivery_date, payment_method, items })
    return NextResponse.json({ orderId: order.id })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
