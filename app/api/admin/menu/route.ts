import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { cookies } from 'next/headers'

async function checkAuth() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_auth')?.value === 'true'
}

export async function GET() {
  if (!await checkAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { rows } = await pool.query('SELECT * FROM menu_items ORDER BY id')
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, description, price, available } = await req.json()
  const { rows } = await pool.query(
    'INSERT INTO menu_items (name, description, price, available) VALUES ($1,$2,$3,$4) RETURNING *',
    [name, description, price, available ?? true]
  )
  return NextResponse.json(rows[0])
}

export async function PUT(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, name, description, price, available } = await req.json()
  const { rows } = await pool.query(
    'UPDATE menu_items SET name=$1, description=$2, price=$3, available=$4 WHERE id=$5 RETURNING *',
    [name, description, price, available, id]
  )
  return NextResponse.json(rows[0])
}
