'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface OrderItem { item_name: string; qty: number; price: number }
interface Order {
  id: number
  customer_name: string
  payment_method: string
  total: number
  delivery_date: string
  address: string
  status: string
  items: OrderItem[]
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  pending: { text: 'Pending payment', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { text: 'Confirmed ✓', color: 'bg-green-100 text-green-800' },
  cancelled: { text: 'Cancelled', color: 'bg-red-100 text-red-800' },
}

export default function PaymentPage() {
  const { id } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [status, setStatus] = useState('pending')

  useEffect(() => {
    fetch(`/api/orders/${id}`).then(r => r.json()).then(o => {
      setOrder(o)
      setStatus(o.status)
    })
  }, [id])

  // Poll for status changes every 30s
  useEffect(() => {
    if (status === 'confirmed' || status === 'cancelled') return
    const interval = setInterval(() => {
      fetch(`/api/orders/${id}/status`)
        .then(r => r.json())
        .then(d => setStatus(d.status))
    }, 30000)
    return () => clearInterval(interval)
  }, [id, status])

  if (!order) return (
    <main className="min-h-screen bg-amber-50 flex items-center justify-center">
      <p className="text-amber-800">Loading your order...</p>
    </main>
  )

  const cashHandle = process.env.NEXT_PUBLIC_CASHAPP_HANDLE || '$Breannagrigsby1'
  const venmoHandle = process.env.NEXT_PUBLIC_VENMO_HANDLE || 'Kylee-Davis-42'

  return (
    <main className="min-h-screen bg-amber-50">
      <div className="bg-amber-900 text-white text-center py-6 px-4">
        <h1 className="text-3xl font-bold tracking-tight">brew2u</h1>
        <p className="text-amber-200 text-sm mt-1">Order #{order.id}</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Status badge */}
        <div className="flex items-center justify-center">
          <span className={`px-5 py-2 rounded-full font-semibold text-sm ${STATUS_LABEL[status]?.color || STATUS_LABEL.pending.color}`}>
            {STATUS_LABEL[status]?.text || status}
          </span>
        </div>

        {status === 'confirmed' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <p className="text-green-800 font-semibold text-lg">Your order is confirmed! 🎉</p>
            <p className="text-green-700 text-sm mt-1">Delivery on {formatDate(order.delivery_date)} to {order.address}</p>
            <p className="text-green-600 text-sm mt-1">Check your email for confirmation details.</p>
          </div>
        )}

        {status === 'cancelled' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
            <p className="text-red-800 font-semibold">We couldn&apos;t confirm your order.</p>
            <p className="text-red-700 text-sm mt-1">Please text us at <a href="tel:9033789795" className="font-bold">903-378-9795</a> and we&apos;ll sort it out.</p>
          </div>
        )}

        {/* Payment instructions */}
        {status === 'pending' && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-amber-100">
            <h2 className="font-bold text-amber-900 text-lg mb-3">
              {order.payment_method === 'in_person' ? 'Pay at delivery' : 'Complete your payment'}
            </h2>
            {order.payment_method === 'cashapp' && (
              <div className="space-y-2">
                <p className="text-amber-800">Send <strong>${parseFloat(String(order.total)).toFixed(2)}</strong> to:</p>
                <div className="bg-green-50 rounded-xl px-4 py-3 text-center">
                  <span className="text-2xl font-bold text-green-700">{cashHandle}</span>
                  <p className="text-green-600 text-xs mt-1">CashApp</p>
                </div>
                <p className="text-amber-700 text-sm">Include your name <strong>{order.customer_name}</strong> in the memo.</p>
              </div>
            )}
            {order.payment_method === 'venmo' && (
              <div className="space-y-2">
                <p className="text-amber-800">Send <strong>${parseFloat(String(order.total)).toFixed(2)}</strong> to:</p>
                <div className="bg-blue-50 rounded-xl px-4 py-3 text-center">
                  <span className="text-2xl font-bold text-blue-700">@{venmoHandle}</span>
                  <p className="text-blue-600 text-xs mt-1">Venmo</p>
                </div>
                <p className="text-amber-700 text-sm">Include your name <strong>{order.customer_name}</strong> in the memo.</p>
              </div>
            )}
            {order.payment_method === 'in_person' && (
              <p className="text-amber-800">No payment needed now — pay when your order arrives.</p>
            )}
            <div className="mt-4 pt-4 border-t border-amber-100 text-amber-700 text-sm text-center">
              Once we receive your payment, we&apos;ll confirm your order and send you a confirmation email.
            </div>
          </div>
        )}

        {/* Order summary */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100">
          <h2 className="font-bold text-amber-900 mb-3">Order summary</h2>
          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-amber-800">
                <span>{item.item_name} <span className="text-amber-500">x{item.qty}</span></span>
                <span>${(parseFloat(String(item.price)) * item.qty).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-amber-100 pt-2 flex justify-between font-bold text-amber-900">
              <span>Total</span>
              <span>${parseFloat(String(order.total)).toFixed(2)}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-100 text-sm text-amber-700 space-y-1">
            <p>📅 {formatDate(order.delivery_date)}</p>
            <p>📍 {order.address}</p>
          </div>
        </div>

        <p className="text-center text-amber-600 text-sm">
          Questions? Text <a href="tel:9033789795" className="font-semibold">903-378-9795</a>
        </p>
      </div>
    </main>
  )
}
