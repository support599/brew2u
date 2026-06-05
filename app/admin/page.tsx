'use client'

import { useEffect, useState } from 'react'

interface OrderItem { item_name: string; qty: number; price: number }
interface Order {
  id: number
  customer_name: string
  customer_email: string
  phone: string
  address: string
  delivery_date: string
  status: string
  payment_method: string
  total: number
  created_at: string
  items: OrderItem[]
}
interface MenuItem { id: number; name: string; description: string; price: number; available: boolean }

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const PAYMENT_LABEL: Record<string, string> = { cashapp: 'CashApp', venmo: 'Venmo', in_person: 'In Person' }

function OrderCard({ order, onConfirm, onDeny }: { order: Order; onConfirm?: () => void; onDeny?: () => void }) {
  const [loading, setLoading] = useState<'confirm' | 'deny' | null>(null)

  async function handle(action: 'confirm' | 'deny') {
    setLoading(action)
    await fetch(`/api/admin/orders/${order.id}/${action}`, { method: 'POST' })
    setLoading(null)
    action === 'confirm' ? onConfirm?.() : onDeny?.()
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-amber-900">{order.customer_name}</p>
          <p className="text-sm text-amber-700">{order.phone}</p>
          {order.customer_email && <p className="text-sm text-amber-600">{order.customer_email}</p>}
        </div>
        <span className="text-sm bg-amber-100 text-amber-800 px-2 py-1 rounded-lg font-medium">{PAYMENT_LABEL[order.payment_method]}</span>
      </div>
      <div className="text-sm text-amber-700 space-y-1">
        <p>📅 {formatDate(order.delivery_date)}</p>
        <p>📍 {order.address}</p>
      </div>
      <div className="border-t border-amber-50 pt-2 space-y-1">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm text-amber-800">
            <span>{item.item_name} x{item.qty}</span>
            <span>${(item.price * item.qty).toFixed(2)}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold text-amber-900 pt-1 border-t border-amber-50">
          <span>Total</span>
          <span>${parseFloat(String(order.total)).toFixed(2)}</span>
        </div>
      </div>
      {onConfirm && onDeny && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => handle('confirm')}
            disabled={!!loading}
            className="bg-green-600 text-white rounded-xl py-3 font-semibold disabled:opacity-50"
          >
            {loading === 'confirm' ? '...' : '✅ Confirm'}
          </button>
          <button
            onClick={() => handle('deny')}
            disabled={!!loading}
            className="bg-red-500 text-white rounded-xl py-3 font-semibold disabled:opacity-50"
          >
            {loading === 'deny' ? '...' : '❌ Deny'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [tab, setTab] = useState<'pending' | 'confirmed' | 'schedule' | 'menu' | 'settings'>('pending')
  const [orders, setOrders] = useState<Order[]>([])
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '' })
  const [editItem, setEditItem] = useState<MenuItem | null>(null)
  const [minDays, setMinDays] = useState('')

  async function login(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) { setAuthed(true); loadData() }
    else setLoginError('Wrong password')
  }

  async function loadData() {
    const [ordersRes, menuRes, settingsRes] = await Promise.all([
      fetch('/api/admin/orders').then(r => r.json()),
      fetch('/api/admin/menu').then(r => r.json()),
      fetch('/api/admin/settings').then(r => r.json()),
    ])
    setOrders(ordersRes)
    setMenu(menuRes)
    setSettings(settingsRes)
    setMinDays(settingsRes.min_delivery_days || '2')
  }

  useEffect(() => {
    fetch('/api/admin/orders').then(r => {
      if (r.ok) { setAuthed(true); loadData() }
    })
  }, [])

  async function saveSettings() {
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ min_delivery_days: minDays }),
    })
    setSettings(s => ({ ...s, min_delivery_days: minDays }))
  }

  async function addMenuItem() {
    if (!newItem.name || !newItem.price) return
    await fetch('/api/admin/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newItem, price: parseFloat(newItem.price) }),
    })
    setNewItem({ name: '', description: '', price: '' })
    loadData()
  }

  async function saveMenuItem() {
    if (!editItem) return
    await fetch('/api/admin/menu', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editItem),
    })
    setEditItem(null)
    loadData()
  }

  async function toggleAvailable(item: MenuItem) {
    await fetch('/api/admin/menu', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, available: !item.available }),
    })
    loadData()
  }

  const pending = orders.filter(o => o.status === 'pending')
  const confirmed = orders.filter(o => o.status === 'confirmed')

  const byDate = confirmed.concat(pending).reduce((acc, o) => {
    const d = o.delivery_date.split('T')[0]
    acc[d] = acc[d] || []
    acc[d].push(o)
    return acc
  }, {} as Record<string, Order[]>)

  const TABS = [
    { key: 'pending', label: `Pending${pending.length ? ` (${pending.length})` : ''}` },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'schedule', label: 'Schedule' },
    { key: 'menu', label: 'Menu' },
    { key: 'settings', label: 'Settings' },
  ] as const

  if (!authed) return (
    <main className="min-h-screen bg-amber-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-amber-100 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-amber-900 text-center mb-6">brew2u Admin</h1>
        <form onSubmit={login} className="space-y-4">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-amber-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
          <button type="submit" className="w-full bg-amber-800 text-white py-3 rounded-xl font-bold">
            Sign In
          </button>
        </form>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen bg-amber-50">
      <div className="bg-amber-900 text-white text-center py-4 px-4">
        <h1 className="text-xl font-bold">brew2u Admin</h1>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-amber-100 overflow-x-auto">
        <div className="flex min-w-max">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                tab === t.key ? 'border-amber-800 text-amber-900' : 'border-transparent text-amber-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {tab === 'pending' && (
          pending.length === 0
            ? <p className="text-center text-amber-600 py-8">No pending orders</p>
            : pending.map(o => (
              <OrderCard key={o.id} order={o}
                onConfirm={loadData} onDeny={loadData}
              />
            ))
        )}

        {tab === 'confirmed' && (
          confirmed.length === 0
            ? <p className="text-center text-amber-600 py-8">No confirmed orders yet</p>
            : confirmed.map(o => <OrderCard key={o.id} order={o} />)
        )}

        {tab === 'schedule' && (
          Object.keys(byDate).sort().length === 0
            ? <p className="text-center text-amber-600 py-8">No orders scheduled</p>
            : Object.keys(byDate).sort().map(date => (
              <div key={date}>
                <h3 className="font-bold text-amber-900 mb-2">{formatDate(date)}</h3>
                <div className="space-y-3">
                  {byDate[date].map(o => <OrderCard key={o.id} order={o} />)}
                </div>
              </div>
            ))
        )}

        {tab === 'menu' && (
          <div className="space-y-4">
            {menu.map(item => (
              <div key={item.id} className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm">
                {editItem?.id === item.id ? (
                  <div className="space-y-2">
                    <input value={editItem.name} onChange={e => setEditItem({...editItem, name: e.target.value})} className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm" placeholder="Name" />
                    <input value={editItem.description} onChange={e => setEditItem({...editItem, description: e.target.value})} className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm" placeholder="Description" />
                    <input value={editItem.price} onChange={e => setEditItem({...editItem, price: parseFloat(e.target.value)})} className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm" type="number" step="0.01" placeholder="Price" />
                    <div className="flex gap-2">
                      <button onClick={saveMenuItem} className="flex-1 bg-amber-800 text-white rounded-lg py-2 text-sm font-semibold">Save</button>
                      <button onClick={() => setEditItem(null)} className="flex-1 bg-amber-100 text-amber-800 rounded-lg py-2 text-sm font-semibold">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <p className={`font-bold ${item.available ? 'text-amber-900' : 'text-amber-400 line-through'}`}>{item.name}</p>
                      <p className="text-sm text-amber-600">{item.description}</p>
                      <p className="text-amber-800 font-semibold text-sm">${parseFloat(String(item.price)).toFixed(2)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => toggleAvailable(item)} className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${item.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {item.available ? 'On' : 'Off'}
                      </button>
                      <button onClick={() => setEditItem(item)} className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-amber-100 text-amber-800">Edit</button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="bg-white rounded-2xl p-4 border border-dashed border-amber-300">
              <h3 className="font-bold text-amber-900 mb-3">Add item</h3>
              <div className="space-y-2">
                <input value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm" placeholder="Name" />
                <input value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm" placeholder="Description" />
                <input value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm" type="number" step="0.01" placeholder="Price (e.g. 6.00)" />
                <button onClick={addMenuItem} className="w-full bg-amber-800 text-white rounded-lg py-2 font-semibold text-sm">Add Item</button>
              </div>
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm space-y-4">
            <h2 className="font-bold text-amber-900">Delivery Settings</h2>
            <div>
              <label className="block text-sm font-semibold text-amber-800 mb-1">
                Minimum days ahead for delivery
              </label>
              <p className="text-xs text-amber-600 mb-2">Customers can only pick dates this many weekdays in advance. Currently: {settings.min_delivery_days} days.</p>
              <input
                type="number"
                min="1"
                max="30"
                value={minDays}
                onChange={e => setMinDays(e.target.value)}
                className="w-full border border-amber-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <button onClick={saveSettings} className="w-full bg-amber-800 text-white py-3 rounded-xl font-bold">
              Save Settings
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
