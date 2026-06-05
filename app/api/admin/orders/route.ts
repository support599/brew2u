import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  if (cookieStore.get('admin_auth')?.value !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { rows: orders } = await pool.query(
    'SELECT * FROM orders ORDER BY delivery_date ASC, created_at ASC'
  )
  const { rows: items } = await pool.query('SELECT * FROM order_items')

  const ordersWithItems = orders.map(o => ({
    ...o,
    items: items.filter(i => i.order_id === o.id),
  }))

  return NextResponse.json(ordersWithItems)
}
