'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Home, Phone, MapPin, Hash } from 'lucide-react'
import { useAddressStore, Address } from '@/store/addressStore'

interface AddressModalProps {
  isOpen: boolean
  onClose: () => void
  address?: Address | null
}

export function AddressModal({ isOpen, onClose, address }: AddressModalProps) {
  const { addAddress, updateAddress } = useAddressStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      street: formData.get('street') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      pincode: formData.get('pincode') as string,
      isDefault: formData.get('isDefault') === 'on',
    }

    try {
      if (address) {
        await updateAddress(address.id, data)
      } else {
        await addAddress(data)
      }
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-velvet-dark border border-white/10 rounded-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-heading text-velvet-white tracking-wide">
                {address ? 'Edit Address' : 'Add New Address'}
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X size={20} className="text-velvet-muted" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-velvet-muted flex items-center gap-2">
                    <Home size={12} /> Full Name
                  </label>
                  <input
                    name="name"
                    required
                    defaultValue={address?.name}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-velvet-white focus:border-velvet-accent transition-colors"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-velvet-muted flex items-center gap-2">
                    <Phone size={12} /> Phone Number
                  </label>
                  <input
                    name="phone"
                    required
                    pattern="[6-9]\d{9}"
                    defaultValue={address?.phone}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-velvet-white focus:border-velvet-accent transition-colors"
                    placeholder="9876543210"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-velvet-muted flex items-center gap-2">
                  <MapPin size={12} /> Street Address
                </label>
                <textarea
                  name="street"
                  required
                  defaultValue={address?.street}
                  rows={3}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-velvet-white focus:border-velvet-accent transition-colors resize-none"
                  placeholder="House No, Street, Locality"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-velvet-muted">City</label>
                  <input
                    name="city"
                    required
                    defaultValue={address?.city}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-velvet-white focus:border-velvet-accent transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-velvet-muted">State</label>
                  <input
                    name="state"
                    required
                    defaultValue={address?.state}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-velvet-white focus:border-velvet-accent transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-velvet-muted flex items-center gap-2">
                    <Hash size={12} /> Pincode
                  </label>
                  <input
                    name="pincode"
                    required
                    pattern="\d{6}"
                    defaultValue={address?.pincode}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-velvet-white focus:border-velvet-accent transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  name="isDefault"
                  defaultChecked={address?.isDefault}
                  className="w-4 h-4 rounded border-white/10 bg-black/40 text-velvet-accent focus:ring-velvet-accent"
                />
                <label htmlFor="isDefault" className="text-sm text-velvet-muted">
                  Set as default address
                </label>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-white text-black h-12 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-white/90 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  {address ? 'Save Changes' : 'Add Address'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
