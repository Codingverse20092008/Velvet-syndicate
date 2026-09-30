'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, AlertCircle, Loader2, ShieldCheck, MapPin, User, Phone, Mail } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { apiFetch } from '@/lib/api'

interface FormData {
  name: string
  phone: string
  address: string
}

interface FormErrors {
  name?: string
  phone?: string
  address?: string
}

export function ProfileForm() {
  const { user, setUser } = useAuthStore()

  const [formData, setFormData] = useState<FormData>({
    name: user?.name || '',
    phone: (user as any)?.phone || '',
    address: (user as any)?.address || '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)

  // Validation functions
  const validateName = (name: string): string | undefined => {
    if (!name.trim()) return 'Full name is required'
    if (name.trim().length < 2) return 'Name must be at least 2 characters'
    return undefined
  }

  const validatePhone = (phone: string): string | undefined => {
    if (!phone.trim()) return undefined // Optional until entered
    const cleanPhone = phone.replace(/[\s-]/g, '')
    const phoneRegex = /^[6-9]\d{9}$/ // 10-digit Indian mobile format
    if (!phoneRegex.test(cleanPhone)) {
      return 'Please enter a valid 10-digit mobile number'
    }
    return undefined
  }

  const validateAddress = (address: string): string | undefined => {
    if (!address.trim()) return undefined // Optional
    if (address.trim().length < 10) return 'Please enter complete address details (min 10 characters)'
    return undefined
  }

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setGeneralError(null)

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }

    let validationError: string | undefined
    if (field === 'name') validationError = validateName(value)
    if (field === 'phone') validationError = validatePhone(value)
    if (field === 'address') validationError = validateAddress(value)

    if (validationError) {
      setErrors((prev) => ({ ...prev, [field]: validationError }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const nameErr = validateName(formData.name)
    const phoneErr = validatePhone(formData.phone)
    const addressErr = validateAddress(formData.address)

    const newErrors: FormErrors = {}
    if (nameErr) newErrors.name = nameErr
    if (phoneErr) newErrors.phone = phoneErr
    if (addressErr) newErrors.address = addressErr

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSaving(true)
    setGeneralError(null)

    try {
      const res = await apiFetch('/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
          avatar: (user as any)?.avatar || null,
        }),
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to update profile')
      }

      // Update auth store
      if (user) {
        setUser({
          ...user,
          name: formData.name.trim(),
          phone: formData.phone.trim() || undefined,
          address: formData.address.trim() || undefined,
        })
      }

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3500)
    } catch (err: any) {
      const msg = err?.message || 'Failed to save changes'
      if (msg.includes('already registered') || msg.includes('unique')) {
        setErrors((prev) => ({ ...prev, phone: 'This mobile number is already registered to another account' }))
      } else {
        setGeneralError(msg)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const isGoogleUser = Boolean((user as any)?.googleId)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2.5 px-4 py-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-400 text-xs tracking-wide"
          >
            <Check size={16} className="shrink-0" />
            <span className="font-medium">Profile and delivery preferences saved to Velvet Syndicate archive.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* General Error Notification */}
      {generalError && (
        <div className="flex items-center gap-2.5 px-4 py-3.5 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs">
          <AlertCircle size={16} className="shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      {/* 1. Personal Details Section Card */}
      <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
        <div className="border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <User size={16} className="text-[#C9A961]" />
            <h2 className="font-heading text-xl text-white tracking-wide">Personal Details</h2>
          </div>
          <p className="text-xs text-white/50 mt-1">
            Update your identity credentials and contact information.
          </p>
        </div>

        {/* 2-Column Input Row on Desktop: Full Name & Mobile Number */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Full Name */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-white/70 flex items-center justify-between">
              <span>Full Name</span>
              <span className="text-[10px] text-white/30 uppercase tracking-widest">Required</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Your full name"
                required
                className={`w-full bg-[#121212] border rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-[#C9A961] focus:ring-1 focus:ring-[#C9A961]/40 transition-all placeholder:text-white/20 ${
                  errors.name ? 'border-red-500/50' : 'border-white/10'
                }`}
              />
            </div>
            {errors.name && (
              <p className="text-[11px] text-red-400 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Mobile Number */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-white/70 flex items-center justify-between">
              <span>Mobile Number</span>
              <span className="text-[10px] text-white/30 uppercase tracking-widest">For delivery updates</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="10-digit mobile number"
                maxLength={10}
                className={`w-full bg-[#121212] border rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-[#C9A961] focus:ring-1 focus:ring-[#C9A961]/40 transition-all placeholder:text-white/20 font-mono tracking-wider ${
                  errors.phone ? 'border-red-500/50' : 'border-white/10'
                }`}
              />
            </div>
            {errors.phone && (
              <p className="text-[11px] text-red-400 mt-1">{errors.phone}</p>
            )}
          </div>
        </div>

        {/* Read-Only Email with Verified Micro-Badge */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-white/70 flex items-center justify-between">
            <span>Email Address</span>
            <span className="text-[10px] text-white/40 uppercase tracking-widest">Primary Login</span>
          </label>
          <div className="relative flex items-center">
            <input
              type="email"
              value={user?.email || ''}
              readOnly
              disabled
              className="w-full bg-[#161616]/70 border border-white/5 rounded-xl px-4 py-3.5 text-white/60 text-sm cursor-not-allowed select-all pr-36"
            />
            {/* Subtle Verified Micro-Badge */}
            <div className="absolute right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] uppercase tracking-wider font-medium">
              <ShieldCheck size={12} className="shrink-0" />
              <span>{isGoogleUser ? 'Verified via Google' : 'Secured Member'}</span>
            </div>
          </div>
          <p className="text-[11px] text-white/40 mt-1">
            Email address is tied to your Syndicate identity and cannot be altered directly.
          </p>
        </div>
      </div>

      {/* 2. Saved Delivery Address Section */}
      <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
        <div className="border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-[#C9A961]" />
            <h2 className="font-heading text-xl text-white tracking-wide">Saved Delivery Address</h2>
          </div>
          <p className="text-xs text-white/50 mt-1">
            Default destination for high-heat drops and deadstock deliveries.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-white/70 flex items-center justify-between">
            <span>Shipping Destination</span>
            <span className="text-[10px] text-white/30 uppercase tracking-widest">House / Street / City / Pincode</span>
          </label>
          <textarea
            rows={4}
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="Flat / House No., Street, Landmark, City, State, Pincode"
            className={`w-full bg-[#121212] border rounded-xl p-4 text-white text-sm focus:outline-none focus:border-[#C9A961] focus:ring-1 focus:ring-[#C9A961]/40 transition-all placeholder:text-white/20 leading-relaxed resize-none ${
              errors.address ? 'border-red-500/50' : 'border-white/10'
            }`}
          />
          {errors.address && (
            <p className="text-[11px] text-red-400 mt-1">{errors.address}</p>
          )}
        </div>
      </div>

      {/* 3. Luxury High-Contrast Save Changes Button */}
      <div className="flex items-center justify-end pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="w-full sm:w-auto bg-[#C9A961] hover:bg-[#D4AF37] text-black font-semibold tracking-wider uppercase py-3.5 px-8 rounded-xl transition-all shadow-lg shadow-[#C9A961]/10 flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 cursor-pointer text-xs"
        >
          {isSaving ? (
            <>
              <Loader2 size={16} className="animate-spin text-black" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <span>Save Changes</span>
          )}
        </button>
      </div>
    </form>
  )
}
