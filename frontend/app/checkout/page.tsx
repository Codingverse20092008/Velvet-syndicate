'use client'

import { useState, useEffect, Suspense, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { useAddressStore } from '@/store/addressStore'
import { useOrderStore } from '@/store/orderStore'
import { useGameStore } from '@/store/gameStore'
import { Button } from '@/components/ui/Button'
import { formatPrice } from '@/lib/utils'
import { apiFetch, syncAbandonedCart, getFullImageUrl } from '@/lib/api'
import Image from 'next/image'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { events } from '@/lib/analytics'
import { getVariant, trackABConversion } from '@/lib/ab-testing'
import { 
  MapPin, Plus, Check, Loader2, AlertCircle, Trash2, 
  CreditCard, Banknote, ShieldCheck, CheckCircle2, 
  Smartphone, Sparkles, Zap
} from 'lucide-react'
import { AddressModal } from '@/components/address/AddressModal'
import { checkoutLock } from '@/lib/checkout-lock'
import { OrderConfirmationAnimation } from '@/components/orders/OrderConfirmationAnimation'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

// Dynamic Razorpay Script Loader
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

function CheckoutPage() {
  const router = useRouter()
  const cartStore = useCartStore()
  const { items = [], clearCart, version, isProcessing: cartProcessing } = cartStore
  const { user, isLoading: authLoading } = useAuthStore()
  const addressStore = useAddressStore()
  const { addresses = [], fetchAddresses, isLoading: addressesLoading } = addressStore
  const { createOrder, isLoading: isSubmitting } = useOrderStore()
  const redeemedRewards = useGameStore((s) => s.redeemedRewards)
  
  // Pricing & Vault Credits / Discount Calculation (Min ₹60 floor preserved for digital assets)
  const hasDigitalAsset = (items || []).some(
    (item) =>
      item?.id === 'prod_digital_sem3_cs' ||
      item?.name?.toLowerCase().includes('computer application') ||
      item?.name?.toLowerCase().includes('wbchse')
  )
  const minFloor = hasDigitalAsset ? 60 : 10
  const subtotal = (items || []).reduce((sum, item) => sum + (item?.price || 0) * (item?.quantity || 0), 0)
  const maxAllowableDiscount = Math.max(0, subtotal - minFloor)
  const vaultDiscount = subtotal > 150 ? 150 : Math.min(150, maxAllowableDiscount)
  const payableTotal = Math.max(minFloor, subtotal - vaultDiscount)

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Direct shipping address form (for users with no saved address)
  const [directAddress, setDirectAddress] = useState({
    name: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
  })
  const [saveToProfile, setSaveToProfile] = useState(true)

  // Payment Selection: Razorpay vs COD
  const [paymentMethod, setPaymentMethod] = useState<'RAZORPAY' | 'COD'>('RAZORPAY')
  const [isRazorpayLoading, setIsRazorpayLoading] = useState(false)

  // Order Confirmation State
  const [confirmationState, setConfirmationState] = useState<'idle' | 'processing' | 'confirmed'>('idle')
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null)

  // Contact details & Abandoned Cart Tracking
  const [contactEmail, setContactEmail] = useState<string>('')
  const [contactPhone, setContactPhone] = useState<string>('')
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const triggerAbandonedCartSync = useCallback((emailVal: string, phoneVal: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      if ((emailVal || phoneVal) && items && items.length > 0) {
        syncAbandonedCart({
          email: emailVal ? emailVal.trim() : null,
          phone: phoneVal ? phoneVal.trim() : null,
          items,
          totalAmount: payableTotal,
          recovered: false,
        })
      }
    }, 500)
  }, [items, payableTotal])

  const handleEmailChange = (val: string) => {
    setContactEmail(val)
    triggerAbandonedCartSync(val, contactPhone)
  }

  const handlePhoneChange = (val: string) => {
    setContactPhone(val)
    setDirectAddress(prev => ({ ...prev, phone: val }))
    triggerAbandonedCartSync(contactEmail, val)
  }

  // Pre-fill contact details and direct address name/phone from profile
  useEffect(() => {
    if (user?.email && !contactEmail) {
      setContactEmail(user.email)
    }
    if (user?.phone && !contactPhone) {
      setContactPhone(user.phone)
      setDirectAddress(prev => ({ ...prev, phone: user.phone || '' }))
    }
    if (user?.name && !directAddress.name) {
      setDirectAddress(prev => ({ ...prev, name: user.name }))
    }
  }, [user, contactEmail, contactPhone, directAddress.name])
  
  // Fetch addresses when user is loaded
  useEffect(() => {
    if (user && !orderInProgressRef.current) {
      fetchAddresses()
    }
  }, [user, fetchAddresses])

  // AUTO-SYNC: If user has an address in their profile but none in addresses table, auto-create it
  const autoSyncedRef = useRef(false)
  useEffect(() => {
    if (
      user &&
      user.address &&
      !addressesLoading &&
      addresses.length === 0 &&
      !autoSyncedRef.current
    ) {
      autoSyncedRef.current = true
      const pincodeMatch = user.address.match(/\b\d{6}\b/)?.[0] || '110001'
      const cleanPhone = (user.phone || contactPhone || '9876543210').replace(/\D/g, '').slice(-10)
      const validPhone = /^[6-9]\d{9}$/.test(cleanPhone) ? cleanPhone : '9876543210'

      addressStore
        .addAddress({
          name: user.name || 'Syndicate Member',
          phone: validPhone,
          street: user.address,
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: pincodeMatch,
          isDefault: true,
        })
        .then(() => {
          fetchAddresses()
        })
        .catch((e) => console.error('Failed to auto-create address from profile', e))
    }
  }, [user, addressesLoading, addresses.length, contactPhone, addressStore, fetchAddresses])

  // Select default or first address
  useEffect(() => {
    if ((addresses || []).length > 0 && !selectedAddressId) {
      const defaultAddr = addresses.find(a => a.isDefault) || addresses[0]
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id)
        if (defaultAddr.phone) {
          setContactPhone(prev => prev || defaultAddr.phone)
          triggerAbandonedCartSync(contactEmail || user?.email || '', defaultAddr.phone)
        }
      }
    }
  }, [addresses, selectedAddressId, contactEmail, user, triggerAbandonedCartSync])

  // Route protection
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login?redirect=/checkout')
      return
    }
    if ((items || []).length === 0 && confirmationState === 'idle') {
      router.replace('/collection')
      return
    }
  }, [user, items, router, authLoading, confirmationState])

  // ENTERPRISE LOCK SYSTEM
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID())
  const [isLocked, setIsLocked] = useState(false)
  const orderInProgressRef = useRef(false)
  const isExecutingRef = useRef(false)
  const [ctaVariant] = useState(() => getVariant('checkout_cta', user?.id))

  // Direct Address Creation helper
  const resolveTargetAddressId = async (): Promise<string | null> => {
    if (selectedAddressId) return selectedAddressId

    if (addresses.length > 0) {
      return addresses[0].id
    }

    const trimmedName = directAddress.name.trim() || user?.name || 'Syndicate Member'
    const trimmedPhone = (directAddress.phone || contactPhone || user?.phone || '').replace(/\D/g, '')
    const trimmedStreet = directAddress.street.trim()
    const trimmedCity = directAddress.city.trim()
    const trimmedState = directAddress.state.trim()
    const trimmedPincode = directAddress.pincode.replace(/\D/g, '')

    if (!trimmedStreet || trimmedStreet.length < 5) {
      setErrorMessage('Please enter a valid street address (min 5 characters)')
      return null
    }
    if (!trimmedCity || trimmedCity.length < 2) {
      setErrorMessage('Please enter a valid city')
      return null
    }
    if (!trimmedState || trimmedState.length < 2) {
      setErrorMessage('Please enter a valid state')
      return null
    }
    if (!/^\d{6}$/.test(trimmedPincode)) {
      setErrorMessage('Please enter a valid 6-digit PIN code')
      return null
    }
    if (!/^[6-9]\d{9}$/.test(trimmedPhone)) {
      setErrorMessage('Please enter a valid 10-digit mobile number')
      return null
    }

    try {
      const res = await apiFetch('/user/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          phone: trimmedPhone,
          street: trimmedStreet,
          city: trimmedCity,
          state: trimmedState,
          pincode: trimmedPincode,
          isDefault: true,
        }),
      })
      const data = await res.json()
      const newAddressId = data?.data?.address?.id || data?.address?.id

      if (!newAddressId) {
        throw new Error(data.error || 'Failed to register shipping address')
      }

      if (saveToProfile) {
        const fullAddrStr = `${trimmedStreet}, ${trimmedCity}, ${trimmedState} - ${trimmedPincode}`
        await apiFetch('/users/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: trimmedName,
            phone: trimmedPhone,
            address: fullAddrStr,
          }),
        }).catch(err => console.warn('Non-critical profile sync error:', err))

        useAuthStore.getState().refreshProfile().catch(() => {})
      }

      setSelectedAddressId(newAddressId)
      return newAddressId
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save shipping address')
      return null
    }
  }

  // 1. RAZORPAY PAYMENT FLOW (UPI, Cards, Net Banking, QR)
  const handleRazorpayPayment = async () => {
    if (isRazorpayLoading || isSubmitting || isLocked || cartProcessing) {
      return
    }

    setErrorMessage(null)

    const targetAddressId = await resolveTargetAddressId()
    if (!targetAddressId) {
      return
    }

    setIsRazorpayLoading(true)

    try {
      // 1. Ensure Razorpay checkout script is loaded
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay SDK. Please check your internet connection.')
      }

      // 2. Create Razorpay Order on Backend
      const createRes = await apiFetch('/orders/razorpay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: payableTotal,
          currency: 'INR',
          receipt: `rcpt_${Date.now()}`,
        }),
      })

      const createData = await createRes.json()
      const orderPayloadData = createData?.data ?? createData

      if (!createRes.ok || (!createData.success && !orderPayloadData?.orderId)) {
        console.error('❌ Razorpay order creation failed with status:', createRes.status, {
          status: createRes.status,
          statusText: createRes.statusText,
          response: createData,
        })

        const rateLimitDetected = 
          createRes.status === 429 || 
          createData.error?.toLowerCase().includes('too many') || 
          createData.message?.toLowerCase().includes('too many')

        const errorMessageToThrow = rateLimitDetected
          ? 'Too many checkout attempts. Please wait a moment and try again.'
          : (createData.error || createData.message || 'Failed to initialize Razorpay order')

        throw new Error(errorMessageToThrow)
      }

      const razorpayOrderId = orderPayloadData.orderId

      // 3. Prepare payload for signature verification
      const currentOrderData = {
        addressId: targetAddressId,
        totalAmount: payableTotal,
        appliedVaultCredits: vaultDiscount,
        rewardId: (redeemedRewards && redeemedRewards.length > 0) ? redeemedRewards[redeemedRewards.length - 1] : undefined,
        items: items.map(item => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          size: item.size,
          variantId: item.variantId,
          image: item.image,
        })),
      }

      const activeAddress = addresses.find(a => a.id === targetAddressId)
      const prefillName = user?.name || activeAddress?.name || directAddress.name || 'Syndicate Member'
      const prefillEmail = user?.email || contactEmail || ''
      const prefillContact = user?.phone || contactPhone || activeAddress?.phone || directAddress.phone || ''

      // 4. Open Official Razorpay Checkout Modal
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_TiJnNaOV7SSj5c',
        amount: orderPayloadData.amount,
        currency: orderPayloadData.currency || 'INR',
        name: 'VELVET SYNDICATE',
        description: 'Luxury Sneaker Allocation',
        image: '/favicon.png',
        order_id: razorpayOrderId,
        prefill: {
          name: prefillName,
          email: prefillEmail,
          contact: prefillContact,
        },
        theme: {
          color: '#C9A961',
          backdrop_color: '#000000',
        },
        handler: async function (response: any) {
          try {
            checkoutLock.lock()
            setIsLocked(true)
            setConfirmationState('processing')

            // Call verify endpoint
            const verifyRes = await apiFetch('/orders/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderPayload: currentOrderData,
              }),
            })

            const verifyData = await verifyRes.json()
            const verifyPayload = verifyData?.data ?? verifyData

            if (verifyData.success || verifyPayload?.success) {
              const finalOrderId = verifyPayload.orderId || verifyData.orderId

              events.orderCreated(finalOrderId, payableTotal)
              trackABConversion('checkout_cta', ctaVariant, 'checkout_success')

              syncAbandonedCart({
                email: contactEmail || user?.email,
                phone: contactPhone || user?.phone,
                items,
                totalAmount: payableTotal,
                recovered: true,
              })

              setConfirmationState('confirmed')
              setConfirmedOrderId(finalOrderId)

              clearCart()
              useOrderStore.getState().fetchOrders().catch(() => {})

              setTimeout(() => {
                router.push(`/orders/${encodeURIComponent(finalOrderId)}`)
              }, 1400)
            } else {
              throw new Error(verifyData.message || verifyData.error || 'Payment signature verification failed')
            }
          } catch (verifyErr: any) {
            console.error('❌ Razorpay verification error:', verifyErr)
            setErrorMessage(verifyErr.message || 'Payment verification failed')
            checkoutLock.unlock()
            setIsLocked(false)
            setConfirmationState('idle')
          }
        },
        modal: {
          ondismiss: function () {
            setIsRazorpayLoading(false)
          },
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.on('payment.failed', function (resp: any) {
        setIsRazorpayLoading(false)
        setErrorMessage(resp.error?.description || 'Payment was declined or cancelled')
      })
      rzp.open()
    } catch (err: any) {
      console.error('❌ Razorpay launch error:', err)
      setIsRazorpayLoading(false)
      setIsLocked(false)
      checkoutLock.unlock()
      setConfirmationState('idle')

      const isRateLimit = err.message?.toLowerCase().includes('too many') || err.message?.toLowerCase().includes('rate limit')
      setErrorMessage(
        isRateLimit
          ? 'Too many checkout attempts. Please wait a moment before trying again.'
          : (err.message || 'Failed to launch Razorpay gateway')
      )
    }
  }

  // 2. CASH ON DELIVERY (COD) ORDER PLACEMENT FLOW
  const handlePlaceOrder = useCallback(async () => {
    if (isExecutingRef.current || isSubmitting || isLocked || cartProcessing) {
      console.log('🚫 EXECUTION BLOCKED: Request already in flight')
      return
    }

    setErrorMessage(null)

    const targetAddressId = await resolveTargetAddressId()
    if (!targetAddressId) {
      return
    }

    checkoutLock.lock()
    isExecutingRef.current = true
    setIsLocked(true)
    setConfirmationState('processing')
    cartStore.setCheckoutInProgress(true)
    
    const currentVersion = version
    const currentTotal = payableTotal

    try {
      const rewardId = (redeemedRewards && redeemedRewards.length > 0) ? redeemedRewards[redeemedRewards.length - 1] : undefined
      
      const order = await createOrder(targetAddressId, 'COD', {
        idempotencyKey: idempotencyKeyRef.current,
        expectedVersion: currentVersion,
        rewardId,
      })
      
      events.orderCreated(order.id, currentTotal)
      trackABConversion('checkout_cta', ctaVariant, 'checkout_success')

      syncAbandonedCart({
        email: contactEmail || user?.email,
        phone: contactPhone || user?.phone,
        items,
        totalAmount: currentTotal,
        recovered: true,
      })

      const selectedAddress = addresses.find(a => a.id === targetAddressId)
      if (selectedAddress && (!user?.phone || !user?.address)) {
        apiFetch('/users/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: selectedAddress.phone,
            address: `${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.state} - ${selectedAddress.pincode}`
          })
        }).catch(() => {})
      }

      setConfirmationState('confirmed')
      setConfirmedOrderId(order.id)
      
      useOrderStore.getState().fetchOrders().catch(() => {})
      clearCart()

      setTimeout(() => {
        router.push(`/orders/${encodeURIComponent(order.id)}`)
      }, 1400)
      
    } catch (error: any) {
      console.error('❌ ORDER EXECUTION FAILED:', error)
      
      checkoutLock.unlock()
      isExecutingRef.current = false
      setIsLocked(false)
      setConfirmationState('idle')
      cartStore.setCheckoutInProgress(false)
      
      let msg = 'Failed to place order. Please try again.'
      if (error.status === 409) {
        msg = 'Your cart was modified in another tab. Please refresh and try again.'
        setTimeout(() => cartStore.fetchCart(), 500)
      } else if (error.status === 400) {
        if (error.message?.includes('version') || error.message?.includes('modified')) {
          msg = 'Your cart was modified elsewhere. Please refresh and try again.'
          setTimeout(() => cartStore.fetchCart(), 500)
        } else if (error.message?.includes('stock')) {
          msg = 'Some items are out of stock. Please update your cart.'
        } else {
          msg = error.message || msg
        }
      } else if (error.status === 401) {
        msg = 'Session expired. Please login again.'
        router.push('/login?redirect=/checkout')
      } else if (error.status >= 500) {
        msg = 'Server is currently busy. Please wait a moment and try again.'
      }
      
      setErrorMessage(msg)
      events.orderFailed(msg)
    }
  }, [
    selectedAddressId, 
    directAddress,
    saveToProfile,
    isSubmitting, 
    isLocked, 
    cartProcessing, 
    items, 
    version, 
    payableTotal, 
    createOrder, 
    cartStore, 
    router, 
    addresses, 
    user, 
    ctaVariant,
    redeemedRewards,
    contactEmail,
    contactPhone
  ])

  const [showProfileSyncModal, setShowProfileSyncModal] = useState(false)

  const handleDeleteAddress = async (syncWithProfile: boolean = false) => {
    if (!addressToDelete) return
    setIsDeleting(true)
    try {
      const addr = addresses.find(a => a.id === addressToDelete)
      await addressStore.deleteAddress(addressToDelete)
      
      if (selectedAddressId === addressToDelete) {
        setSelectedAddressId(null)
      }

      if (syncWithProfile && addr) {
        await apiFetch('/users/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: null,
            address: null
          })
        })
        await useAuthStore.getState().refreshProfile()
      }
    } catch {
      setErrorMessage('Failed to delete address')
    } finally {
      setIsDeleting(false)
      setAddressToDelete(null)
      setShowProfileSyncModal(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 size={32} className="text-velvet-accent animate-spin" />
      </div>
    )
  }

  if (!user || (items.length === 0 && confirmationState === 'idle')) return null

  const hasSavedAddresses = (addresses || []).length > 0
  const hasProfileAddressOnly = !hasSavedAddresses && !!user?.address

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">
        
        {/* ======================================================== */}
        {/* LEFT COLUMN: Shipping & Payment Modules */}
        {/* ======================================================== */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3 space-y-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#C9A961] font-semibold block mb-1">
                Velvet Syndicate Checkout
              </span>
              <h1 className="font-heading text-3xl sm:text-4xl tracking-widest uppercase text-velvet-white">
                Shipping & Payment
              </h1>
            </div>
            {hasSavedAddresses && (
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(true)}
                className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-velvet-accent hover:text-velvet-white transition-colors"
              >
                <Plus size={14} /> New Address
              </button>
            )}
          </div>

          {/* 1. Contact Details */}
          <div className="p-6 bg-[#0E0E0E] border border-white/10 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Smartphone size={16} className="text-[#C9A961]" />
                <h2 className="text-xs uppercase tracking-widest font-bold text-velvet-white">
                  Contact & Dispatch Alerts
                </h2>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#C9A961]/15 text-[#C9A961] border border-[#C9A961]/30 font-medium">
                Live Courier Updates
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-1.5 font-medium">
                  Email Address
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-black/60 border border-white/15 focus:border-[#C9A961] text-xs text-white px-3.5 py-2.5 rounded-xl outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-1.5 font-medium">
                  WhatsApp / Mobile Number
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full bg-black/60 border border-white/15 focus:border-[#C9A961] text-xs text-white px-3.5 py-2.5 rounded-xl outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* 2. Shipping Address Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MapPin size={16} className="text-[#C9A961]" />
                <h2 className="text-xs uppercase tracking-widest font-bold text-velvet-white">
                  Shipping Address
                </h2>
              </div>
            </div>

            {/* State A: Loading */}
            {addressesLoading && addresses.length === 0 && !user?.address && (
              <div className="flex items-center gap-3 p-6 bg-[#0E0E0E] rounded-2xl border border-white/5 text-velvet-muted text-xs italic">
                <Loader2 size={16} className="animate-spin text-[#C9A961]" />
                Locating saved delivery addresses...
              </div>
            )}

            {/* State B: User has saved addresses in DB */}
            {hasSavedAddresses && (
              <div className="space-y-3">
                {addresses.map((address) => {
                  const isSelected = selectedAddressId === address.id
                  return (
                    <div
                      key={address.id}
                      onClick={() => setSelectedAddressId(address.id)}
                      className={`group relative p-5 bg-[#0E0E0E] border rounded-2xl cursor-pointer transition-all duration-300 ${
                        isSelected 
                          ? 'border-[#C9A961] bg-[#C9A961]/5 shadow-[0_0_25px_rgba(201,169,97,0.08)]' 
                          : 'border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 pr-6">
                          <div className="flex items-center gap-3">
                            <span className="font-heading text-sm text-velvet-white tracking-wide">
                              {address.name}
                            </span>
                            {address.isDefault && (
                              <span className="text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 bg-[#C9A961]/15 text-[#C9A961] border border-[#C9A961]/30 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-300 leading-relaxed">
                            {address.street}, {address.city}, {address.state} - {address.pincode}
                          </p>
                          <p className="text-[11px] text-neutral-400 pt-0.5">{address.phone}</p>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setAddressToDelete(address.id)
                            }}
                            className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                            title="Delete Address"
                          >
                            <Trash2 size={15} />
                          </button>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-[#C9A961] flex items-center justify-center">
                              <Check size={12} className="text-black stroke-[3]" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* State C: User has profile address */}
            {hasProfileAddressOnly && (
              <div className="p-5 bg-[#0E0E0E] border border-[#C9A961] bg-[#C9A961]/5 rounded-2xl shadow-[0_0_25px_rgba(201,169,97,0.08)]">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-sm text-velvet-white tracking-wide">
                        {user.name || 'Syndicate Member'}
                      </span>
                      <span className="text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 bg-[#C9A961]/20 text-[#C9A961] border border-[#C9A961]/40 rounded">
                        Profile Address (Auto-Selected)
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      {user.address}
                    </p>
                    {user.phone && <p className="text-[11px] text-neutral-400 pt-0.5">{user.phone}</p>}
                  </div>
                  <div className="w-5 h-5 rounded-full bg-[#C9A961] flex items-center justify-center">
                    <Check size={12} className="text-black stroke-[3]" />
                  </div>
                </div>
              </div>
            )}

            {/* State D: Direct Address Form */}
            {!hasSavedAddresses && !user?.address && (
              <div className="p-6 bg-[#0E0E0E] border border-white/10 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="text-xs uppercase tracking-widest text-neutral-300 font-semibold">
                    Enter Shipping Address
                  </span>
                  <span className="text-[10px] text-neutral-400">Step 1 of 2</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-1">
                      Recipient Full Name *
                    </label>
                    <input
                      type="text"
                      value={directAddress.name}
                      onChange={(e) => setDirectAddress({ ...directAddress, name: e.target.value })}
                      placeholder="Receiver name"
                      className="w-full bg-black/60 border border-white/15 focus:border-[#C9A961] text-xs text-white px-3.5 py-2.5 rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-1">
                      Delivery Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={directAddress.phone}
                      onChange={(e) => setDirectAddress({ ...directAddress, phone: e.target.value })}
                      placeholder="10-digit mobile number"
                      className="w-full bg-black/60 border border-white/15 focus:border-[#C9A961] text-xs text-white px-3.5 py-2.5 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-1">
                    Street Address, Flat, Building, Landmark *
                  </label>
                  <textarea
                    rows={2}
                    value={directAddress.street}
                    onChange={(e) => setDirectAddress({ ...directAddress, street: e.target.value })}
                    placeholder="e.g. Penthouse 4B, Skyview Towers, Linking Road"
                    className="w-full bg-black/60 border border-white/15 focus:border-[#C9A961] text-xs text-white px-3.5 py-2.5 rounded-xl outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={directAddress.city}
                      onChange={(e) => setDirectAddress({ ...directAddress, city: e.target.value })}
                      placeholder="City"
                      className="w-full bg-black/60 border border-white/15 focus:border-[#C9A961] text-xs text-white px-3.5 py-2.5 rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      value={directAddress.state}
                      onChange={(e) => setDirectAddress({ ...directAddress, state: e.target.value })}
                      placeholder="State"
                      className="w-full bg-black/60 border border-white/15 focus:border-[#C9A961] text-xs text-white px-3.5 py-2.5 rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-1">
                      PIN Code *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={directAddress.pincode}
                      onChange={(e) => setDirectAddress({ ...directAddress, pincode: e.target.value })}
                      placeholder="6 digits"
                      className="w-full bg-black/60 border border-white/15 focus:border-[#C9A961] text-xs text-white px-3.5 py-2.5 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3 pt-2 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={saveToProfile}
                    onChange={(e) => setSaveToProfile(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-black/60 text-[#C9A961] accent-[#C9A961] focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs text-neutral-300 group-hover:text-white transition-colors">
                    Save this address to my Syndicate Profile for future orders
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* 3. Luxury Payment Method Selector */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CreditCard size={16} className="text-[#C9A961]" />
                <h2 className="text-xs uppercase tracking-widest font-bold text-velvet-white">
                  Payment Method
                </h2>
              </div>
              <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-400" /> Razorpay Secured 256-Bit
              </span>
            </div>

            {/* Payment Method Tabs */}
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-[#0E0E0E] border border-white/10 rounded-2xl">
              <button
                type="button"
                onClick={() => setPaymentMethod('RAZORPAY')}
                className={`py-3.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 ${
                  paymentMethod === 'RAZORPAY'
                    ? 'bg-[#181818] text-[#C9A961] border border-[#C9A961]/50 shadow-[0_0_20px_rgba(201,169,97,0.12)]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Zap size={16} className={paymentMethod === 'RAZORPAY' ? 'text-[#C9A961]' : 'text-neutral-500'} />
                <span className="text-[11px] font-bold">Online Payment (Razorpay)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('COD')}
                className={`py-3.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 ${
                  paymentMethod === 'COD'
                    ? 'bg-[#181818] text-[#C9A961] border border-[#C9A961]/50 shadow-[0_0_20px_rgba(201,169,97,0.12)]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Banknote size={16} className={paymentMethod === 'COD' ? 'text-[#C9A961]' : 'text-neutral-500'} />
                <span className="text-[11px] font-bold">Cash on Delivery</span>
              </button>
            </div>

            {/* Content for RAZORPAY */}
            {paymentMethod === 'RAZORPAY' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-[#0E0E0E] border border-[#C9A961]/40 rounded-2xl space-y-4 relative overflow-hidden shadow-2xl"
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-[#C9A961]/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      Razorpay Official Gateway
                    </span>
                  </div>
                  <span className="text-[10px] text-[#C9A961] font-mono font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    256-Bit Encrypted Live Gateway
                  </span>
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] uppercase tracking-widest text-neutral-400 block font-semibold">
                    Supported Payment Instruments
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'UPI / Dynamic QR',
                      'Google Pay',
                      'PhonePe',
                      'Paytm',
                      'BHIM / CRED',
                      'Credit & Debit Cards',
                      'Net Banking (50+ Banks)',
                      'Wallets'
                    ].map((item) => (
                      <span
                        key={item}
                        className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] text-neutral-200 font-medium tracking-wide flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C9A961]" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed pt-2 border-t border-white/5 flex items-center gap-2">
                  <ShieldCheck size={15} className="text-[#C9A961] flex-shrink-0" />
                  <span>
                    Clicking <strong>PAY {formatPrice(payableTotal)}</strong> below launches the official Razorpay test modal with full simulated UPI, Card, and Net Banking checkout.
                  </span>
                </p>
              </motion.div>
            )}

            {/* Content for COD */}
            {paymentMethod === 'COD' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-[#0E0E0E] border border-white/10 rounded-2xl space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#C9A961]/15 border border-[#C9A961]/30 flex items-center justify-center text-[#C9A961]">
                    <Banknote size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-heading uppercase tracking-widest text-velvet-white">
                      Syndicate White-Glove Dispatch
                    </h3>
                    <p className="text-[10px] text-neutral-400">Doorstep Settlement via Cash or QR</p>
                  </div>
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed pt-2 border-t border-white/5">
                  Pay securely upon arrival. Our courier partner allows verified parcel inspection prior to acceptance. 
                  Digital QR payment at doorstep is also accepted by the delivery associate.
                </p>
              </motion.div>
            )}
          </div>

          {/* Place Order / Pay CTA Button */}
          <div className="pt-4">
            <Button 
              onClick={paymentMethod === 'RAZORPAY' ? handleRazorpayPayment : handlePlaceOrder}
              disabled={
                (!selectedAddressId && !hasProfileAddressOnly && !directAddress.street) || 
                isSubmitting || 
                isRazorpayLoading ||
                isLocked || 
                orderInProgressRef.current ||
                cartProcessing
              }
              className="w-full h-14 bg-[#C9A961] hover:bg-[#d8b972] text-black font-bold uppercase tracking-widest text-xs transition-all shadow-xl" 
              size="lg" 
              isLoading={isSubmitting || isRazorpayLoading || isLocked || cartProcessing}
            >
              {(isSubmitting || isRazorpayLoading || isLocked || cartProcessing) 
                ? (paymentMethod === 'RAZORPAY' ? 'Connecting Razorpay...' : 'Securing Order...') 
                : paymentMethod === 'RAZORPAY'
                  ? `PAY ${formatPrice(payableTotal)} • Razorpay`
                  : `Place Order (COD) • ${formatPrice(payableTotal)}`}
            </Button>
            
            <p className="text-center text-xs text-neutral-400 mt-4 flex items-center justify-center gap-1.5">
              <ShieldCheck size={14} className="text-[#C9A961]" /> 
              Instant confirmation • Direct routing to live shipment tracking
            </p>

            {errorMessage && (
              <p className="text-center text-xs text-red-400 mt-4 flex items-center justify-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle size={14} /> {errorMessage}
              </p>
            )}
          </div>
        </motion.div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: Order Summary & Vault Deduction */}
        {/* ======================================================== */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >
          <div className="bg-[#0A0A0A] p-8 border border-white/10 rounded-2xl sticky top-32 shadow-2xl">
            <h2 className="font-heading text-xl tracking-widest mb-6 uppercase text-velvet-white border-b border-white/10 pb-4">
              Order Summary
            </h2>
            
            {/* Items List */}
            <div className="space-y-5 mb-8 max-h-[38vh] overflow-y-auto pr-2 custom-scrollbar">
              {(items || []).filter(item => item && item.id).map((item) => (
                <div key={`${item.id}-${item.variantId}-${item.size}`} className="flex gap-4">
                  <div className="relative w-16 h-20 bg-neutral-900 border border-white/10 overflow-hidden flex-shrink-0 rounded-xl">
                    <Image
                      src={getFullImageUrl(item.image)}
                      alt={item.name || 'Product'}
                      fill
                      sizes="64px"
                      className="object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = '/images/placeholder-product.png'
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading text-xs text-velvet-white truncate">{item.name || 'Unknown Product'}</h3>
                    <p className="text-[10px] text-neutral-400 uppercase tracking-widest mt-1">
                      {item.variantName || 'Standard'} • Size {item.size || 'N/A'}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] text-neutral-400">{item.quantity || 0} units</span>
                      <span className="text-xs font-semibold text-white">
                        {formatPrice((item.price || 0) * (item.quantity || 0))}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Price Calculations */}
            <div className="space-y-3.5 pt-6 border-t border-white/10">
              <div className="flex justify-between text-neutral-400 uppercase tracking-widest text-[11px]">
                <span>Cart Subtotal</span>
                <span className="text-white font-medium">{formatPrice(subtotal)}</span>
              </div>

              {/* Vault Credits / Discount deduction */}
              {vaultDiscount > 0 && (
                <div className="flex justify-between items-center text-[11px] uppercase tracking-widest p-2 bg-[#C9A961]/10 border border-[#C9A961]/25 rounded-lg text-[#C9A961]">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Sparkles size={12} /> Vault Credits Perk
                  </span>
                  <span className="font-bold">-{formatPrice(vaultDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between text-neutral-400 uppercase tracking-widest text-[11px]">
                <span>White-Glove Shipping</span>
                <span className="text-emerald-400 font-medium">Complimentary</span>
              </div>

              <div className="flex justify-between items-center pt-5 border-t border-white/10">
                <div>
                  <span className="font-heading text-lg text-velvet-white tracking-widest uppercase block">
                    Total Payable
                  </span>
                  <span className="text-[10px] text-neutral-400">All duties & taxes included</span>
                </div>
                <span className="font-heading text-2xl text-[#C9A961] font-bold">
                  {formatPrice(payableTotal)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Address Modal */}
      <AddressModal 
        isOpen={isAddressModalOpen} 
        onClose={() => setIsAddressModalOpen(false)} 
      />

      {/* Luxury Order Confirmation / Processing Overlay */}
      <AnimatePresence>
        {(confirmationState !== 'idle' || isLocked || isSubmitting) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 px-6 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md border border-[#C9A961]/40 bg-[#0E0E0E] px-8 py-10 rounded-2xl text-center shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(201,169,97,0.15)] relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#C9A961] to-transparent" />
              
              <OrderConfirmationAnimation 
                state={confirmationState === 'confirmed' ? 'confirmed' : 'processing'} 
              />
              
              <h2 className="mt-8 font-heading text-2xl uppercase tracking-widest text-velvet-white">
                {confirmationState === 'confirmed' ? 'Order Confirmed' : 'Processing Payment'}
              </h2>
              
              <p className="mx-auto mt-3 max-w-xs text-xs leading-relaxed text-neutral-400">
                {confirmationState === 'confirmed'
                  ? 'Your syndicate allocation is confirmed. Redirecting to live tracking...'
                  : 'Securing your pair and synchronizing dispatch allocation...'}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Address Modals */}
      <ConfirmModal
        isOpen={!!addressToDelete && !showProfileSyncModal}
        onClose={() => setAddressToDelete(null)}
        onConfirm={() => setShowProfileSyncModal(true)}
        title="Delete Address?"
        message="Are you sure you want to remove this address from your shipping list?"
        confirmText="Delete"
        variant="danger"
      />

      <ConfirmModal
        isOpen={showProfileSyncModal}
        onClose={() => handleDeleteAddress(false)}
        onConfirm={() => handleDeleteAddress(true)}
        title="Sync with Profile?"
        message="Would you also like to remove this phone and address from your main profile information?"
        confirmText="Yes, Remove Both"
        cancelText="No, Just Address"
        variant="danger"
      />
    </div>
  )
}

export default function Checkout() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border border-[#C9A961]/40 border-t-[#C9A961] animate-spin mx-auto mb-4" />
          <span className="uppercase tracking-widest text-xs text-neutral-400 font-mono">
            Entering Secure Vault...
          </span>
        </div>
      </div>
    }>
      <ErrorBoundary>
        <CheckoutPage />
      </ErrorBoundary>
    </Suspense>
  )
}
