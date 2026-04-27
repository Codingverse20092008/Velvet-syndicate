'use client'

import { useEffect, use } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { format } from 'date-fns'
import { 
  ChevronLeft, Loader2, MapPin, 
  Calendar, CreditCard, Hash, Package, RefreshCcw, WifiOff
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useOrderStore } from '@/store/orderStore'
import { useAuthStore } from '@/store/authStore'
import { formatPrice } from '@/lib/utils'
import { OrderItemsTable } from '@/components/orders/OrderDetails'
import { OrderTimeline } from '@/components/orders/OrderTimeline'
import { StatusMessage } from '@/components/orders/StatusMessage'

interface OrderDetailsPageProps {
  params: Promise<{ id: string }>
}

function safeParseAddress(raw?: string) {
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export default function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  const { id } = use(params)
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const { currentOrder, fetchOrderById, isLoading: orderLoading, error } = useOrderStore()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=/orders/${id}`)
    }
  }, [isAuthenticated, authLoading, router, id])

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrderById(id)
    }
  }, [isAuthenticated, fetchOrderById, id])

  useEffect(() => {
    if (!isAuthenticated) return
    const intervalId = window.setInterval(() => {
      fetchOrderById(id, { background: true })
    }, 20000)

    return () => window.clearInterval(intervalId)
  }, [isAuthenticated, fetchOrderById, id])

  if (authLoading || (orderLoading && !currentOrder)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 size={32} className="text-velvet-accent animate-spin" />
      </div>
    )
  }

  if (error && !currentOrder) {
    const notFound = /not found/i.test(error)
    return (
      <div className="min-h-screen bg-black pt-28 px-6">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-velvet-muted hover:text-velvet-white transition-colors mb-8"
          >
            <ChevronLeft size={16} /> Back to Orders
          </Link>
          <div className="rounded-2xl border border-white/10 bg-velvet-dark p-8">
            <h1 className="text-2xl font-heading text-velvet-white mb-3">{notFound ? 'Order not found' : 'Unable to load order'}</h1>
            <p className="text-sm text-velvet-muted mb-6">
              {notFound
                ? 'The order you are trying to view does not exist or does not belong to your account.'
                : 'There was a network issue while fetching order tracking details. Please retry.'}
            </p>
            <button
              onClick={() => fetchOrderById(id)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest rounded-xl border border-white/15 text-velvet-white hover:bg-white/5"
            >
              <RefreshCcw size={14} /> Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!currentOrder) {
    return null
  }

  const address = currentOrder.addressSnapshot ?? safeParseAddress(currentOrder.shippingAddress)
  const totalAmount = Number(currentOrder.total ?? currentOrder.totalAmount ?? 0)
  const isNetworkWarningVisible = Boolean(error)

  return (
    <div className="min-h-screen bg-black pt-32 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-velvet-muted hover:text-velvet-white transition-colors mb-8"
        >
          <ChevronLeft size={16} /> Back to Orders
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-12">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <h1 className="text-3xl font-heading text-velvet-white tracking-wide">
                  Order Tracking
                </h1>
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-widest font-bold text-velvet-muted">
                  <Hash size={12} /> {currentOrder.id.toUpperCase()}
                </div>
              </div>

              <AnimatePresence>
                {isNetworkWarningVisible && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="mb-4 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 flex items-center gap-2 text-amber-100 text-sm"
                  >
                    <WifiOff size={15} />
                    Live tracking was interrupted. Retrying in the background.
                  </motion.div>
                )}
              </AnimatePresence>

              <StatusMessage status={currentOrder.status} />
              <OrderTimeline status={currentOrder.status} />
            </div>

            <div className="bg-velvet-dark border border-white/10 rounded-2xl p-6">
              <h2 className="text-sm font-heading text-velvet-white tracking-wide uppercase mb-6">Order Summary</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-velvet-muted mb-1">Order ID</div>
                  <div className="text-sm text-velvet-white break-all">{currentOrder.id}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-velvet-muted mb-1">Placed on</div>
                  <div className="text-sm text-velvet-white">{format(new Date(currentOrder.createdAt), 'PPP p')}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-velvet-muted mb-1">Payment</div>
                  <div className="text-sm text-velvet-white">{currentOrder.paymentMethod} (Cash on Delivery)</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-velvet-muted mb-1">Total</div>
                  <div className="text-sm text-velvet-white">{formatPrice(totalAmount)}</div>
                </div>
              </div>
            </div>

            <div className="bg-velvet-dark border border-white/10 rounded-2xl p-8">
              <h2 className="text-lg font-heading text-velvet-white tracking-wide mb-8 border-b border-white/5 pb-4">
                Order Items
              </h2>
              <OrderItemsTable items={currentOrder.items} />
              
              <div className="mt-8 flex justify-end">
                <div className="space-y-2 w-full max-w-[200px]">
                  <div className="flex justify-between text-sm text-velvet-muted">
                    <span>Subtotal</span>
                    <span>{formatPrice(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-velvet-muted">
                    <span>Shipping</span>
                    <span className="text-emerald-400">FREE</span>
                  </div>
                  <div className="flex justify-between text-lg font-heading text-velvet-white pt-4 border-t border-white/5">
                    <span>Total</span>
                    <span>{formatPrice(totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <div className="bg-velvet-dark border border-white/10 rounded-2xl p-6">
              <h3 className="text-sm font-heading text-velvet-white tracking-wide uppercase mb-6 flex items-center gap-2">
                <MapPin size={16} className="text-velvet-accent" /> Shipping Address
              </h3>
              <div className="space-y-2">
                <p className="text-sm font-medium text-velvet-white">{address.name}</p>
                <p className="text-sm text-velvet-muted leading-relaxed">
                  {address.street}<br />
                  {address.city}, {address.state}<br />
                  {address.pincode}
                </p>
                <p className="text-sm text-velvet-muted pt-2 border-t border-white/5 mt-4">
                  {address.phone}
                </p>
              </div>
            </div>

            <div className="bg-velvet-dark border border-white/10 rounded-2xl p-6">
              <h3 className="text-sm font-heading text-velvet-white tracking-wide uppercase mb-6 flex items-center gap-2">
                <CreditCard size={16} className="text-velvet-accent" /> Payment Details
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-velvet-muted mb-1">Method</div>
                  <div className="text-sm text-velvet-white">{currentOrder.paymentMethod}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-velvet-muted mb-1">Status</div>
                  <div className="text-sm text-velvet-white">{currentOrder.paymentStatus}</div>
                </div>
              </div>
            </div>

            <div className="bg-velvet-dark border border-white/10 rounded-2xl p-6">
              <h3 className="text-sm font-heading text-velvet-white tracking-wide uppercase mb-6 flex items-center gap-2">
                <Calendar size={16} className="text-velvet-accent" /> Important Dates
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-velvet-muted mb-1">Placed On</div>
                  <div className="text-sm text-velvet-white">{format(new Date(currentOrder.createdAt), 'PPP p')}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-velvet-muted mb-1">Estimated Delivery</div>
                  <div className="text-sm text-velvet-white">Within 3-5 business days from dispatch</div>
                </div>
                {currentOrder.status === 'DELIVERED' && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                    <Package size={20} className="text-emerald-500" />
                    <span className="text-xs text-emerald-500 font-bold uppercase tracking-widest">Delivered</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
