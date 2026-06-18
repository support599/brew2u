'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'

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
  if (!d) return ''
  const date = new Date(d.includes('T') ? d : d + 'T12:00:00')
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
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

  useEffect(() => {
    if (status === 'confirmed' || status === 'cancelled') return
    const interval = setInterval(() => {
      fetch(`/api/orders/${id}/status`).then(r => r.json()).then(d => setStatus(d.status))
    }, 30000)
    return () => clearInterval(interval)
  }, [id, status])

  if (!order) return (
    <main className="min-h-screen flex items-center justify-center bg-white">
      <p className="text-gray-400 text-sm">Loading your order...</p>
    </main>
  )

  const cashHandle = process.env.NEXT_PUBLIC_CASHAPP_HANDLE || '$Breannagrigsby1'
  const venmoHandle = process.env.NEXT_PUBLIC_VENMO_HANDLE || 'Kylee-Davis-42'
  const orderTotal = parseFloat(String(order.total)).toFixed(2)

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <div className="text-center py-6 px-4" style={{ backgroundColor: '#f5f0e8' }}>
        <div className="relative w-28 h-28 mx-auto">
          <Image src="/logo.png" alt="brew2u" fill className="object-contain" sizes="112px" priority />
        </div>
        <p className="text-sm font-semibold mt-1" style={{ color: '#7c4f2a' }}>Order #{order.id}</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Status */}
        <div className="flex justify-center">
          {status === 'pending' && (
            <span className="px-5 py-2 rounded-full text-sm font-semibold" style={{ backgroundColor: '#f5f0e8', color: '#7c4f2a' }}>
              Awaiting Confirmation
            </span>
          )}
          {status === 'confirmed' && (
            <span className="px-5 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-800">
              Confirmed ✓
            </span>
          )}
          {status === 'cancelled' && (
            <span className="px-5 py-2 rounded-full text-sm font-semibold bg-red-100 text-red-800">
              Cancelled
            </span>
          )}
        </div>

        {/* Confirmed state */}
        {status === 'confirmed' && (
          <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: '#f5f0e8', border: '1px solid rgba(0,0,0,0.06)' }}>
            <p className="text-2xl mb-2">🎉</p>
            <p className="font-bold text-gray-900 text-lg">Your order is confirmed!</p>
            <p className="text-gray-500 text-sm mt-1">Delivery on {formatDate(order.delivery_date)}</p>
            <p className="text-gray-400 text-xs mt-1">Check your email for details.</p>
          </div>
        )}

        {/* Cancelled state */}
        {status === 'cancelled' && (
          <div className="rounded-2xl p-5 text-center border border-red-100 bg-red-50">
            <p className="font-bold text-red-800">We couldn&apos;t confirm your order.</p>
            <p className="text-red-600 text-sm mt-1">Text us at <a href="tel:9033789795" className="font-bold underline">903-378-9795</a> and we&apos;ll sort it out.</p>
          </div>
        )}

        {/* Payment instructions */}
        {status === 'pending' && (
          <div className="rounded-2xl p-5" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
            <h2 className="font-bold text-gray-900 text-base mb-4">
              {order.payment_method === 'in_person' ? 'Pay At Delivery' : 'Complete Your Payment'}
            </h2>

            {order.payment_method === 'cashapp' && (
              <div className="space-y-3">
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#000' }}>
                  <p className="text-gray-400 text-xs mb-1">Send <span className="text-white font-bold">${orderTotal}</span> to</p>
                  <p className="text-2xl font-black text-white">{cashHandle}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <span className="w-4 h-4 rounded-sm flex items-center justify-center text-xs font-black" style={{ backgroundColor: '#00D632', color: '#000' }}>$</span>
                    <span className="text-gray-400 text-xs">Cash App</span>
                  </div>
                </div>
                <p className="text-gray-500 text-xs text-center">Include your name <span className="font-bold text-gray-700">{order.customer_name}</span> in the memo</p>
              </div>
            )}

            {order.payment_method === 'venmo' && (
              <div className="space-y-3">
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#008CFF' }}>
                  <p className="text-blue-100 text-xs mb-1">Send <span className="text-white font-bold">${orderTotal}</span> to</p>
                  <p className="text-2xl font-black italic text-white">@{venmoHandle}</p>
                  <p className="text-blue-100 text-xs mt-1">Venmo</p>
                </div>
                <p className="text-gray-500 text-xs text-center">Include your name <span className="font-bold text-gray-700">{order.customer_name}</span> in the memo</p>
              </div>
            )}

            {order.payment_method === 'in_person' && (
              <p className="text-gray-600 text-sm">No payment needed now — pay when your order arrives.</p>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 text-gray-400 text-xs text-center">
              Once we receive your payment, we&apos;ll confirm your order and send a confirmation email.
            </div>
          </div>
        )}

        {/* Order summary */}
        <div className="rounded-2xl p-4" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
          <h2 className="font-bold text-gray-900 mb-3">Order Summary</h2>
          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.item_name} <span className="text-gray-400">×{item.qty}</span></span>
                <span className="font-semibold text-gray-900">${(parseFloat(String(item.price)) * item.qty).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900">
              <span>Total</span>
              <span>${orderTotal}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-500 space-y-1.5">
            {formatDate(order.delivery_date) && (
              <p className="flex items-center gap-2">
                <span>📅</span> {formatDate(order.delivery_date)}
              </p>
            )}
            <p className="flex items-center gap-2">
              <span>📍</span> {order.address}
            </p>
          </div>
        </div>

        <p className="text-center text-gray-400 text-sm pb-6">
          Questions? Text <a href="tel:9033789795" className="font-bold text-gray-600">903-378-9795</a>
        </p>
      </div>
    </main>
  )
}
