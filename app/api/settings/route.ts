import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET() {
  const { rows } = await pool.query('SELECT * FROM settings')
  const settings: Record<string, string> = {}
  rows.forEach(r => { settings[r.key] = r.value })
  return NextResponse.json(settings)
}
