import { NextRequest, NextResponse } from 'next/server'
import { getOrder } from '@/lib/orders'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await getOrder(parseInt(id))
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ status: order.status })
}
