import { NextRequest, NextResponse } from 'next/server'
import { denyOrder } from '@/lib/orders'
import { cookies } from 'next/headers'

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  if (cookieStore.get('admin_auth')?.value !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const order = await denyOrder(parseInt(id))
  if (!order) return NextResponse.json({ error: 'Order not found or already processed' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
