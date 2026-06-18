'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface MenuItem {
  id: number
  name: string
  description: string
  price: number
}

interface CartItem extends MenuItem {
  qty: number
}

function getItemImage(_index: number) {
  return '/bottle.png'
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'Morning'
  if (h < 17) return 'Afternoon'
  return 'Evening'
}

function getNextWeekdays(minDays: number): string[] {
  const dates: string[] = []
  const today = new Date()
  let d = new Date(today)
  let added = 0
  while (added < minDays) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) added++
  }
  for (let i = 0; dates.length < 10; i++) {
    const candidate = new Date(d)
    candidate.setDate(d.getDate() + i)
    if (candidate.getDay() !== 0 && candidate.getDay() !== 6) {
      dates.push(candidate.toISOString().split('T')[0])
    }
  }
  return dates
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  })
}

const INPUT_CLASS = "w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
const INPUT_SM = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"

type MobileView = 'menu' | 'cart' | 'checkout'

export default function OrderPage() {
  const router = useRouter()
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [dates, setDates] = useState<string[]>([])
  const [mobileView, setMobileView] = useState<MobileView>('menu')
  const [form, setForm] = useState({
    customer_name: '', customer_email: '', phone: '', address: '',
    delivery_date: '', payment_method: 'cashapp',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/menu').then(r => r.json()).then(setMenu)
    fetch('/api/settings').then(r => r.json()).then((s: Record<string, string>) => {
      const days = parseInt(s.min_delivery_days || '2')
      const d = getNextWeekdays(days)
      setDates(d)
      setForm(f => ({ ...f, delivery_date: d[0] }))
    })
  }, [])

  function addToCart(item: MenuItem) {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id)
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { ...item, qty: 1 }]
    })
  }

  function updateQty(id: number, delta: number) {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0))
  }

  function removeItem(id: number) {
    setCart(prev => prev.filter(c => c.id !== id))
  }

  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0)
  const subtotal = cart.reduce((sum, c) => sum + parseFloat(String(c.price)) * c.qty, 0)
  const total = subtotal

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cart.length) { setError('Add at least one item.'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: cart.map(c => ({ item_name: c.name, qty: c.qty, price: parseFloat(String(c.price)) })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/payment/${data.orderId}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  // Cart items — shared JSX, not a component
  const cartItems = (
    <>
      {cart.map((item, idx) => (
        <div key={item.id} className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-amber-50">
            <Image src={getItemImage(idx)} alt={item.name} fill className="object-contain p-1" sizes="48px" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
            <p className="text-gray-500 text-xs">${(parseFloat(String(item.price)) * item.qty).toFixed(2)}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 font-bold flex items-center justify-center text-sm">−</button>
            <span className="w-4 text-center text-sm font-semibold text-gray-900">{item.qty}</span>
            <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-sm">+</button>
          </div>
          <button onClick={() => removeItem(item.id)} className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center ml-1">
            <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </>
  )

  const totalsBlock = (
    <div className="bg-white rounded-xl p-3 shadow-sm space-y-2">
      <div className="flex justify-between text-gray-500 text-sm"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
      <div className="flex justify-between text-gray-500 text-sm"><span>Delivery fee</span><span>$0.00</span></div>
      <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100"><span>Total</span><span>${total.toFixed(2)}</span></div>
    </div>
  )

  const paymentButtons = (
    <div className="grid grid-cols-3 gap-1.5">
      {/* CashApp */}
      <button type="button" onClick={() => setForm(prev => ({ ...prev, payment_method: 'cashapp' }))}
        className={`py-2.5 rounded-xl border-2 transition-all flex items-center justify-center ${form.payment_method === 'cashapp' ? 'border-black scale-95' : 'border-gray-200'}`}
        style={{ backgroundColor: '#000' }}>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-sm flex items-center justify-center text-xs font-black" style={{ backgroundColor: '#00D632', color: '#000' }}>$</span>
          <span className="text-white text-xs font-semibold">Cash App</span>
        </span>
      </button>
      {/* Venmo */}
      <button type="button" onClick={() => setForm(prev => ({ ...prev, payment_method: 'venmo' }))}
        className={`py-2.5 rounded-xl border-2 transition-all flex items-center justify-center ${form.payment_method === 'venmo' ? 'border-blue-400 scale-95' : 'border-gray-200'}`}
        style={{ backgroundColor: '#008CFF' }}>
        <span className="text-white text-xs font-black italic">venmo</span>
      </button>
      {/* In Person */}
      <button type="button" onClick={() => setForm(prev => ({ ...prev, payment_method: 'in_person' }))}
        className={`py-2.5 rounded-xl border-2 transition-all text-xs font-semibold ${form.payment_method === 'in_person' ? 'bg-amber-800 text-white border-amber-800' : 'bg-white text-gray-700 border-gray-200'}`}>
        In Person
      </button>
    </div>
  )

  const menuGrid = (
    <div className="pb-28 lg:pb-8">
      <div className="w-full">
        <Image src="/banner.png" alt="Brew2u" width={940} height={564} className="w-full h-auto" priority />
      </div>
      <div className="px-4 lg:px-6 mt-4 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Our Flavors</h2>
          <span className="text-xs text-gray-400 font-medium">{menu.length} items · 12oz bottles</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {menu.map((item, index) => (
            <div key={item.id} className="bg-white rounded-2xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
              <div className="relative h-44 w-full bg-white">
                <Image src={getItemImage(index)} alt={item.name} fill className="object-contain p-3" sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw" />
              </div>
              <div className="p-4 flex flex-col flex-1 bg-white">
                <p className="font-bold text-gray-900 text-sm leading-tight">{item.name}</p>
                <p className="text-gray-400 text-xs mt-1 leading-relaxed flex-1">{item.description}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div>
                    <span className="text-gray-900 font-bold text-base">${parseFloat(String(item.price)).toFixed(2)}</span>
                    <span className="text-gray-400 text-xs ml-1">/ 12oz</span>
                  </div>
                  <button onClick={() => addToCart(item)}
                    className="w-9 h-9 bg-amber-800 rounded-full flex items-center justify-center text-white font-bold text-xl active:scale-95 hover:bg-amber-700 transition-all shadow-md">
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ── DESKTOP ───────────────────────────────────────────────────────────────
  const desktop = (
    <div className="hidden lg:flex min-h-screen" style={{ backgroundColor: '#ffffff' }}>
      {/* Main content */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-10 pt-8 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Good {getTimeOfDay()}</h1>
            <p className="text-gray-500 text-sm mt-0.5">It&apos;s time for cold brew ☕</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          </div>
        </div>

        {/* Promo banner */}
        <div className="mx-10 mb-8 rounded-3xl overflow-hidden relative h-44" style={{ backgroundColor: '#1a0f07' }}>
          <div className="absolute inset-0 z-10 flex flex-col justify-center pl-10 pr-72">
            <p className="text-white font-bold text-2xl leading-snug">Fresh Cold Brew<br/>Delivered to You</p>
            <p className="text-amber-200 text-sm mt-1">Order today, delivered in 2 days</p>
            <button className="mt-3 bg-white text-amber-900 text-sm font-bold px-6 py-2 rounded-full w-fit hover:bg-amber-50 transition-colors">
              order now
            </button>
          </div>
          <div className="absolute right-0 top-0 h-full w-72 z-0">
            <Image src="/splash.png" alt="Brew2u" fill className="object-contain object-right" sizes="288px" />
          </div>
        </div>

        {/* Products grid */}
        <div className="px-10 pb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900">Our Flavors</h2>
            <span className="text-sm text-gray-400 font-medium">{menu.length} items · 12oz bottles</span>
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
            {menu.map((item, index) => (
              <div key={item.id} className="rounded-2xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200" style={{ border: '1px solid rgba(0,0,0,0.08)', backgroundColor: '#fff' }}>
                <div className="relative h-44 w-full" style={{ backgroundColor: '#f5f5f0' }}>
                  <Image src={getItemImage(index)} alt={item.name} fill className="object-contain p-4" sizes="(min-width:1280px) 25vw, 50vw" />
                </div>
                <div className="p-4">
                  <p className="font-bold text-gray-900 text-sm leading-tight">{item.name}</p>
                  <p className="text-gray-400 text-xs mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-gray-700 font-semibold">${parseFloat(String(item.price)).toFixed(2)}</span>
                    <button onClick={() => addToCart(item)}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xl active:scale-95 transition-all shadow-sm"
                      style={{ backgroundColor: '#3a8c3f' }}>
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart panel */}
      <div className="w-96 bg-white flex flex-col sticky top-0 h-screen flex-shrink-0 shadow-xl">
        <div className="px-6 pt-8 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Your Cart</h2>
            {cartCount > 0 && <span className="bg-amber-800 text-white text-xs font-bold px-3 py-1 rounded-full">{cartCount} item{cartCount !== 1 ? 's' : ''}</span>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center px-4">
              <div className="relative w-24 h-24 mb-4 opacity-60">
                <Image src="/coffee1.jpg" alt="Cold brew" fill className="object-contain" sizes="96px" />
              </div>
              <p className="text-gray-800 font-bold">Nothing here yet</p>
              <p className="text-gray-400 text-sm mt-1.5 leading-relaxed">Pick a flavor and we&apos;ll deliver it fresh ☕</p>
            </div>
          ) : (
            <>
              {cartItems}
              {totalsBlock}
              <div>
                <h3 className="font-bold text-gray-800 mb-3 text-sm">Your details</h3>
                <form onSubmit={handleSubmit} className="space-y-2">
                  {[
                    { label: 'Full name', key: 'customer_name', type: 'text', placeholder: 'Jane Smith', required: true },
                    { label: 'Email', key: 'customer_email', type: 'email', placeholder: 'jane@example.com', required: false },
                    { label: 'Phone', key: 'phone', type: 'tel', placeholder: '(555) 000-0000', required: true },
                    { label: 'Address', key: 'address', type: 'text', placeholder: '123 Main St', required: true },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
                      <input type={f.type} placeholder={f.placeholder}
                        value={form[f.key as keyof typeof form]}
                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        required={f.required} className={INPUT_SM} />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Delivery date</label>
                    <select value={form.delivery_date}
                      onChange={e => setForm(prev => ({ ...prev, delivery_date: e.target.value }))}
                      className={INPUT_SM}>
                      {dates.map(d => <option key={d} value={d}>{formatDate(d)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-2">Payment</label>
                    {paymentButtons}
                  </div>
                  {error && <p className="text-red-600 text-xs bg-red-50 rounded-xl px-3 py-2">{error}</p>}
                  <button type="submit" disabled={submitting}
                    className="w-full bg-amber-800 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-amber-700 transition-colors">
                    {submitting ? 'Placing order...' : `Place Order · $${total.toFixed(2)}`}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )

  // ── MOBILE ────────────────────────────────────────────────────────────────
  if (mobileView === 'menu') return (
    <>
      {desktop}
      <main className="min-h-screen lg:hidden pb-24" style={{ backgroundColor: '#ffffff' }}>
        {/* Top bar */}
        <div className="flex items-center justify-end px-5 pt-12 pb-2">
          <button onClick={() => setMobileView('cart')} className="relative w-10 h-10 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-amber-800 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{cartCount}</span>
            )}
          </button>
        </div>

        {/* Heading */}
        <div className="px-5 mb-5 mt-1">
          <h1 className="text-2xl font-bold text-gray-900 leading-snug">FRESHLY BOTTLED.<br/>PERFECTLY BREWED.<br/>DELIVERED TO YOU.</h1>
        </div>

        {/* Promo banner */}
        <div className="mx-5 mb-6 rounded-3xl overflow-hidden relative h-36" style={{ backgroundColor: '#1a0f07' }}>
          <div className="absolute inset-0 z-10 flex flex-col justify-center pl-5 pr-36">
            <p className="text-white font-bold text-lg leading-snug">Fresh Cold Brew<br/>Delivered to You</p>
            <button onClick={() => {}} className="mt-2 bg-white text-amber-900 text-xs font-bold px-4 py-1.5 rounded-full w-fit">
              order now
            </button>
          </div>
          <div className="absolute right-0 top-0 h-full w-40 z-0" style={{ transform: 'rotate(20deg) translateX(8px)' }}>
            <Image src="/splash.png" alt="Brew2u" fill className="object-contain object-right" sizes="160px" />
          </div>
        </div>

        {/* Products */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Our Flavors</h2>
            <span className="text-xs text-gray-400 font-medium">{menu.length} items · 12oz</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {menu.map((item, index) => (
              <div key={item.id} className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.08)', backgroundColor: '#fff' }}>
                <div className="p-3">
                  <div className="relative h-32 w-full rounded-xl" style={{ backgroundColor: '#f5f5f0' }}>
                    <Image src={getItemImage(index)} alt={item.name} fill className="object-contain p-1" sizes="50vw" />
                  </div>
                </div>
                </div>
                <div className="p-3">
                  <p className="font-bold text-gray-900 text-sm leading-tight">{item.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-700 font-semibold text-sm">${parseFloat(String(item.price)).toFixed(2)}</span>
                    <button onClick={() => addToCart(item)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xl active:scale-95 transition-transform shadow-sm"
                      style={{ backgroundColor: '#3a8c3f' }}>
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom nav */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pt-3 pb-6 flex items-center justify-center z-20">
          <button className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#7c4f2a' }}>
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
            </div>
            <span className="text-xs font-semibold" style={{ color: '#7c4f2a' }}>Home</span>
          </button>
        </div>
      </main>
    </>
  )

  if (mobileView === 'cart') return (
    <>
      {desktop}
      <main className="min-h-screen lg:hidden" style={{ backgroundColor: '#ffffff' }}>
        <div className="bg-white px-5 pt-12 pb-4 flex items-center gap-3 shadow-sm sticky top-0 z-10">
          <button onClick={() => setMobileView('menu')} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">Shopping Cart</h1>
        </div>
        <div className="px-4 py-4 pb-32 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-5xl mb-4">🛒</p>
              <p className="text-gray-500 font-medium">Your cart is empty</p>
              <button onClick={() => setMobileView('menu')} className="mt-4 text-amber-800 font-semibold underline">Browse menu</button>
            </div>
          ) : (
            <>
              {cartItems}
              {totalsBlock}
            </>
          )}
        </div>
        {cart.length > 0 && (
          <div className="fixed bottom-6 left-4 right-4 z-20">
            <button onClick={() => setMobileView('checkout')}
              className="w-full bg-amber-800 text-white py-4 rounded-2xl font-bold text-base shadow-lg">
              Checkout · ${total.toFixed(2)}
            </button>
          </div>
        )}
      </main>
    </>
  )

  // checkout
  return (
    <>
      {desktop}
      <main className="min-h-screen lg:hidden" style={{ backgroundColor: '#ffffff' }}>
        <div className="bg-white px-5 pt-12 pb-4 flex items-center gap-3 shadow-sm sticky top-0 z-10">
          <button onClick={() => setMobileView('cart')} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">Your Details</h1>
        </div>
        <form onSubmit={handleSubmit} className="px-4 py-4 pb-40 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            {[
              { label: 'Full name', key: 'customer_name', type: 'text', placeholder: 'Jane Smith', required: true },
              { label: 'Email (for confirmation)', key: 'customer_email', type: 'email', placeholder: 'jane@example.com', required: false },
              { label: 'Phone', key: 'phone', type: 'tel', placeholder: '(555) 000-0000', required: true },
              { label: 'Delivery address', key: 'address', type: 'text', placeholder: '123 Main St, City, TX', required: true },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{f.label}</label>
                <input type={f.type} placeholder={f.placeholder}
                  value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  required={f.required} className={INPUT_CLASS} />
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Delivery date</label>
            <select value={form.delivery_date}
              onChange={e => setForm(prev => ({ ...prev, delivery_date: e.target.value }))}
              className={INPUT_CLASS}>
              {dates.map(d => <option key={d} value={d}>{formatDate(d)}</option>)}
            </select>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Payment method</label>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => setForm(prev => ({ ...prev, payment_method: 'cashapp' }))}
                className={`py-3 rounded-xl border-2 transition-all flex items-center justify-center ${form.payment_method === 'cashapp' ? 'border-black scale-95' : 'border-gray-200'}`}
                style={{ backgroundColor: '#000' }}>
                <span className="flex items-center gap-1">
                  <span className="w-4 h-4 rounded-sm flex items-center justify-center text-xs font-black" style={{ backgroundColor: '#00D632', color: '#000' }}>$</span>
                  <span className="text-white text-xs font-semibold">Cash App</span>
                </span>
              </button>
              <button type="button" onClick={() => setForm(prev => ({ ...prev, payment_method: 'venmo' }))}
                className={`py-3 rounded-xl border-2 transition-all flex items-center justify-center ${form.payment_method === 'venmo' ? 'border-blue-400 scale-95' : 'border-gray-200'}`}
                style={{ backgroundColor: '#008CFF' }}>
                <span className="text-white text-xs font-black italic">venmo</span>
              </button>
              <button type="button" onClick={() => setForm(prev => ({ ...prev, payment_method: 'in_person' }))}
                className={`py-3 rounded-xl border-2 transition-all text-xs font-semibold ${form.payment_method === 'in_person' ? 'bg-amber-800 text-white border-amber-800' : 'bg-white text-gray-700 border-gray-200'}`}>
                In Person
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
            <div className="flex justify-between text-gray-500 text-sm"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-gray-500 text-sm"><span>Delivery fee</span><span>$0.00</span></div>
            <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100"><span>Total</span><span>${total.toFixed(2)}</span></div>
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">{error}</p>}
        </form>
        <div className="fixed bottom-6 left-4 right-4 z-20">
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full bg-amber-800 text-white py-4 rounded-2xl font-bold text-base shadow-lg disabled:opacity-50">
            {submitting ? 'Placing order...' : `Place Order · $${total.toFixed(2)}`}
          </button>
        </div>
      </main>
    </>
  )
}
