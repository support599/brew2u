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

function getItemImage(index: number) {
  return index % 2 === 0 ? '/coffee1.jpg' : '/coffee2.jpg'
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
      {[
        { value: 'cashapp', label: '$Breannagrigsby1' },
        { value: 'venmo', label: '@Kylee-Davis-42' },
        { value: 'in_person', label: 'Pay in Person' },
      ].map(opt => (
        <button key={opt.value} type="button"
          onClick={() => setForm(prev => ({ ...prev, payment_method: opt.value }))}
          className={`py-2 rounded-xl text-xs font-semibold border-2 transition-colors ${form.payment_method === opt.value ? 'bg-amber-800 text-white border-amber-800' : 'bg-white text-gray-700 border-gray-200'}`}
        >{opt.label}</button>
      ))}
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
            <div key={item.id} className="rounded-2xl shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col" style={{ backgroundColor: '#f5f0e8' }}>
              <div className="relative h-44 w-full" style={{ backgroundColor: '#f5f0e8' }}>
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
    <div className="hidden lg:flex min-h-screen">
      {/* Sidebar */}
      <div className="w-56 bg-amber-900 flex flex-col flex-shrink-0 sticky top-0 h-screen">
        <div className="p-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-lg">☕</div>
            <div>
              <h1 className="text-white text-xl font-black tracking-tight leading-none">brew<span className="text-amber-300">2u</span></h1>
              <p className="text-amber-400/70 text-xs mt-0.5">Cold brew · Delivered</p>
            </div>
          </div>
        </div>
        <div className="mx-4 border-t border-amber-800/60" />
        <nav className="px-3 mt-3 space-y-1 flex-1">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/10 text-white font-semibold text-sm cursor-default">
            <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Menu
          </div>
        </nav>
        <div className="p-4 border-t border-amber-800/60 space-y-2">
          <a href="tel:9033789795" className="flex items-center gap-2 text-amber-300 hover:text-white text-xs font-medium transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            903-378-9795
          </a>
          <a href="https://facebook.com/Brew2u" target="_blank" className="flex items-center gap-2 text-amber-400 hover:text-white text-xs font-medium transition-colors">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>
            facebook.com/Brew2u
          </a>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto bg-gray-50">{menuGrid}</div>

      {/* Cart sidebar */}
      <div className="w-80 bg-white border-l border-gray-100 flex flex-col sticky top-0 h-screen flex-shrink-0">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h2 className="font-bold text-gray-900">Your Cart</h2>
          </div>
          {cartCount > 0 && <span className="bg-amber-800 text-white text-xs font-bold px-2.5 py-1 rounded-full">{cartCount} item{cartCount !== 1 ? 's' : ''}</span>}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center px-4">
              <div className="relative w-28 h-28 mb-4 opacity-80">
                <Image src="/coffee1.jpg" alt="Cold brew" fill className="object-contain" sizes="112px" />
              </div>
              <p className="text-gray-800 font-bold text-base">Nothing here yet</p>
              <p className="text-gray-400 text-sm mt-1.5 leading-relaxed">Pick a flavor from the menu<br />and we'll deliver it fresh ☕</p>
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
      <main className="min-h-screen bg-gray-50 relative lg:hidden">
        <div className="absolute top-4 right-4 z-20">
          <button onClick={() => setMobileView('cart')}
            className="relative w-11 h-11 flex items-center justify-center rounded-full bg-white shadow-md">
            <svg className="w-6 h-6 text-amber-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-amber-800 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{cartCount}</span>}
          </button>
        </div>
        {menuGrid}
        {cartCount > 0 && (
          <div className="fixed bottom-6 left-4 right-4 z-20">
            <button onClick={() => setMobileView('cart')}
              className="w-full bg-amber-800 text-white py-4 rounded-2xl font-bold text-base shadow-lg flex items-center justify-between px-5">
              <span className="bg-amber-700 text-sm font-bold px-2 py-0.5 rounded-lg">{cartCount}</span>
              <span>View Cart</span>
              <span>${subtotal.toFixed(2)}</span>
            </button>
          </div>
        )}
      </main>
    </>
  )

  if (mobileView === 'cart') return (
    <>
      {desktop}
      <main className="min-h-screen bg-gray-50 lg:hidden">
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
      <main className="min-h-screen bg-gray-50 lg:hidden">
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
              {[
                { value: 'cashapp', label: '$Breannagrigsby1' },
                { value: 'venmo', label: '@Kylee-Davis-42' },
                { value: 'in_person', label: 'Pay in Person' },
              ].map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setForm(prev => ({ ...prev, payment_method: opt.value }))}
                  className={`py-3 rounded-xl font-semibold text-xs border-2 transition-colors ${form.payment_method === opt.value ? 'bg-amber-800 text-white border-amber-800' : 'bg-white text-gray-700 border-gray-200'}`}>
                  {opt.label}
                </button>
              ))}
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
