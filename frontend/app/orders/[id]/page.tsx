'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { format } from 'date-fns'
import { 
  ChevronLeft, Loader2, MapPin, 
  Calendar, CreditCard, Hash, Package, RefreshCcw, WifiOff, XCircle, RotateCcw, ArrowLeftRight,
  Download, Lock, FileText, CheckCircle2
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useOrderStore } from '@/store/orderStore'
import { useAuthStore } from '@/store/authStore'
import { formatPrice } from '@/lib/utils'
import { OrderItemsTable } from '@/components/orders/OrderDetails'
import { OrderTimeline } from '@/components/orders/OrderTimeline'
import { StatusMessage } from '@/components/orders/StatusMessage'
import { apiFetch } from '@/lib/api'

interface OrderDetailsPageProps {
  params: { id: string }
}

function safeParseAddress(raw?: string) {
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

const CANCEL_REASONS = [
  'Changed my mind',
  'Ordered by mistake',
  'Found a better price',
  'Need to change size',
  'Need to change address',
  'Delivery will take too long',
  'Payment issue',
  'Duplicate order',
  'Product no longer needed',
  'Other reason',
]

const RETURN_EXCHANGE_REASONS = [
  'Wrong size received',
  'Product is defective or damaged',
  'Product does not match description',
  'Wrong product delivered',
  'Sizing issue - too small',
  'Sizing issue - too large',
  'Quality not as expected',
  'Changed my mind',
  'Found a better price elsewhere',
  'Other reason',
]

export default function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  const { id } = params
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const { currentOrder, fetchOrderById, isLoading: orderLoading, error } = useOrderStore()
  const router = useRouter()
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0])
  const [cancelMessage, setCancelMessage] = useState<string | null>(null)
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false)

  const [returnExchangeOpen, setReturnExchangeOpen] = useState<'RETURN' | 'EXCHANGE' | null>(null)
  const [returnExchangeReason, setReturnExchangeReason] = useState(RETURN_EXCHANGE_REASONS[0])
  const [returnExchangeMessage, setReturnExchangeMessage] = useState<string | null>(null)
  const [isReturnExchangeSubmitting, setIsReturnExchangeSubmitting] = useState(false)

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
  const canRequestCancel = currentOrder.status === 'PENDING' || currentOrder.status === 'CONFIRMED'
  const canReturnExchange = currentOrder.status === 'DELIVERED' && (currentOrder as any).returnStatus === 'NONE'
  const existingReturnStatus = (currentOrder as any).returnStatus
  const hasDigitalAsset = Boolean(
    currentOrder.items?.some(
      (item: any) =>
        item.productId === 'prod_digital_sem3_cs' ||
        item.productName?.toLowerCase().includes('computer application') ||
        item.productName?.toLowerCase().includes('wbchse')
    )
  )
  const isPaid =
    currentOrder.paymentStatus === 'PAID' ||
    (currentOrder.status === 'CONFIRMED' && currentOrder.paymentMethod === 'RAZORPAY')

  const submitReturnExchange = async (type: 'RETURN' | 'EXCHANGE') => {
    setIsReturnExchangeSubmitting(true)
    setReturnExchangeMessage(null)
    try {
      const res = await apiFetch(`/orders/${currentOrder.id}/return-exchange-request`, {
        method: 'POST',
        body: JSON.stringify({ type, reason: returnExchangeReason }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Could not submit request')
      setReturnExchangeMessage(data.data?.message || `${type === 'RETURN' ? 'Return' : 'Exchange'} request submitted.`)
      setReturnExchangeOpen(null)
      await fetchOrderById(currentOrder.id)
    } catch (err) {
      setReturnExchangeMessage((err as Error).message)
    } finally {
      setIsReturnExchangeSubmitting(false)
    }
  }

  const submitCancelRequest = async () => {
    setIsCancelSubmitting(true)
    setCancelMessage(null)

    try {
      const res = await apiFetch(`/orders/${currentOrder.id}/cancel-request`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancelReason }),
      })
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Could not submit cancellation request')
      }

      setCancelMessage('Cancellation request submitted.')
      setIsCancelOpen(false)
      await fetchOrderById(currentOrder.id)
    } catch (err) {
      setCancelMessage((err as Error).message)
    } finally {
      setIsCancelSubmitting(false)
    }
  }

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

              {/* Digital E-Book Asset Download Card */}
              {hasDigitalAsset && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-8 p-6 sm:p-8 rounded-2xl border relative overflow-hidden shadow-2xl transition-all ${
                    isPaid
                      ? 'bg-gradient-to-br from-[#181308] via-[#0E0E0E] to-[#0A0A0A] border-[#C9A961]/50 shadow-[0_0_50px_rgba(201,169,97,0.15)]'
                      : 'bg-[#0E0E0E] border-white/10'
                  }`}
                >
                  {isPaid && (
                    <div className="absolute top-0 right-0 w-48 h-48 bg-[#C9A961]/15 rounded-full blur-3xl pointer-events-none" />
                  )}

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {isPaid ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[11px] uppercase tracking-widest text-[#C9A961] font-mono font-bold">
                              Digital Asset Unlocked // Ready for Download
                            </span>
                          </>
                        ) : (
                          <>
                            <Lock size={13} className="text-amber-400" />
                            <span className="text-[11px] uppercase tracking-widest text-neutral-400 font-mono font-bold">
                              Locked • Complete Payment to Unlock
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="font-heading text-xl text-white font-semibold tracking-wide">
                        WBCHSE Class 12 Computer Application (Sem 3) E-Book
                      </h3>
                      <p className="text-xs text-neutral-400 max-w-md leading-relaxed">
                        {isPaid
                          ? 'Your official semester 3 syllabus guide and question bank are decrypted and ready for offline reading.'
                          : 'Access to this verified question bank unlocks immediately upon payment confirmation.'}
                      </p>
                    </div>

                    {isPaid ? (
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/orders/${currentOrder.id}/download-pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        download="EduTips-HS-Sem3-Computer.pdf"
                        className="inline-flex items-center justify-center gap-2.5 px-6 py-4 bg-[#C9A961] hover:bg-[#D4B872] text-black font-heading font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_4px_20px_rgba(201,169,97,0.3)] hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto flex-shrink-0"
                      >
                        <Download size={16} /> DOWNLOAD E-BOOK (PDF)
                      </a>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl border border-white/10 bg-white/5 text-neutral-400 text-xs font-mono flex-shrink-0">
                        <Lock size={14} /> Locked Asset
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {canRequestCancel && (
              <div className="bg-velvet-dark border border-white/10 rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-heading text-velvet-white tracking-wide uppercase">Need to cancel?</h2>
                    <p className="mt-2 text-sm text-velvet-muted">
                      You can request cancellation before the order is shipped.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCancelOpen((value) => !value)}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-300/35 px-4 py-3 text-[10px] uppercase tracking-widest text-rose-100 transition-colors hover:bg-rose-400/10"
                  >
                    <XCircle size={14} /> Cancel Request
                  </button>
                </div>

                {cancelMessage && (
                  <p className="mt-4 text-sm text-amber-100">{cancelMessage}</p>
                )}

                <AnimatePresence>
                  {isCancelOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="mt-6 border-t border-white/10 pt-6"
                    >
                      <label htmlFor="cancel-reason" className="text-[10px] uppercase tracking-widest text-velvet-muted">
                        Select Reason
                      </label>
                      <select
                        id="cancel-reason"
                        value={cancelReason}
                        onChange={(event) => setCancelReason(event.target.value)}
                        className="mt-3 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-velvet-white outline-none focus:border-rose-300/50"
                      >
                        {CANCEL_REASONS.map((reason) => (
                          <option key={reason} value={reason}>
                            {reason}
                          </option>
                        ))}
                      </select>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          onClick={submitCancelRequest}
                          disabled={isCancelSubmitting}
                          className="rounded-xl bg-rose-300 px-4 py-3 text-[10px] uppercase tracking-widest text-black disabled:opacity-60"
                        >
                          {isCancelSubmitting ? 'Submitting...' : 'Submit Request'}
                        </button>
                        <button
                          onClick={() => setIsCancelOpen(false)}
                          className="rounded-xl border border-white/10 px-4 py-3 text-[10px] uppercase tracking-widest text-velvet-muted hover:text-white"
                        >
                          Keep Order
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Return / Exchange Panel */}
            {(canReturnExchange || (existingReturnStatus && existingReturnStatus !== 'NONE')) && (
              <div className="bg-velvet-dark border border-white/10 rounded-2xl p-6">
                <h2 className="text-sm font-heading text-velvet-white tracking-wide uppercase mb-1">Return or Exchange</h2>
                <p className="text-sm text-velvet-muted mb-5">
                  {existingReturnStatus && existingReturnStatus !== 'NONE'
                    ? `Status: ${existingReturnStatus.replace(/_/g, ' ')}`
                    : 'Not happy? Request a return or exchange within 7 days of delivery.'}
                </p>

                {returnExchangeMessage && (
                  <p className="mb-4 text-sm text-amber-100">{returnExchangeMessage}</p>
                )}

                {canReturnExchange && (
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setReturnExchangeOpen(returnExchangeOpen === 'RETURN' ? null : 'RETURN')}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-300/30 px-4 py-3 text-[10px] uppercase tracking-widest text-amber-200 hover:bg-amber-400/10 transition-colors"
                    >
                      <RotateCcw size={14} /> Return Request
                    </button>
                    <button
                      onClick={() => setReturnExchangeOpen(returnExchangeOpen === 'EXCHANGE' ? null : 'EXCHANGE')}
                      className="inline-flex items-center gap-2 rounded-xl border border-blue-300/30 px-4 py-3 text-[10px] uppercase tracking-widest text-blue-200 hover:bg-blue-400/10 transition-colors"
                    >
                      <ArrowLeftRight size={14} /> Exchange Request
                    </button>
                  </div>
                )}

                <AnimatePresence>
                  {returnExchangeOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="mt-6 border-t border-white/10 pt-6"
                    >
                      <label className="text-[10px] uppercase tracking-widest text-velvet-muted">
                        Reason for {returnExchangeOpen === 'RETURN' ? 'Return' : 'Exchange'}
                      </label>
                      <select
                        value={returnExchangeReason}
                        onChange={(e) => setReturnExchangeReason(e.target.value)}
                        className="mt-3 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-velvet-white outline-none focus:border-amber-300/50"
                      >
                        {RETURN_EXCHANGE_REASONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          onClick={() => submitReturnExchange(returnExchangeOpen)}
                          disabled={isReturnExchangeSubmitting}
                          className="rounded-xl bg-velvet-white px-4 py-3 text-[10px] uppercase tracking-widest text-black disabled:opacity-60 hover:bg-velvet-accent transition-colors"
                        >
                          {isReturnExchangeSubmitting ? 'Submitting...' : `Submit ${returnExchangeOpen === 'RETURN' ? 'Return' : 'Exchange'}`}
                        </button>
                        <button
                          onClick={() => setReturnExchangeOpen(null)}
                          className="rounded-xl border border-white/10 px-4 py-3 text-[10px] uppercase tracking-widest text-velvet-muted hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

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
