'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, MapPin, Phone, User, Star, Trash2, Edit3, Loader2 } from 'lucide-react'
import { useAddressStore, Address } from '@/store/addressStore'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { AddressModal } from '@/components/address/AddressModal'

export default function AddressesPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore()
  const { addresses, fetchAddresses, deleteAddress, setDefault, isLoading: addressesLoading } = useAddressStore()
  const router = useRouter()
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/addresses')
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchAddresses()
    }
  }, [isAuthenticated, fetchAddresses])

  const handleEdit = (address: Address) => {
    setSelectedAddress(address)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setSelectedAddress(null)
    setIsModalOpen(true)
  }

  if (authLoading || (isAuthenticated && addressesLoading && addresses.length === 0)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 size={32} className="text-velvet-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black pt-32 pb-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-heading text-velvet-white tracking-wide mb-4">
              Saved Addresses
            </h1>
            <p className="text-velvet-muted max-w-lg">
              Manage your shipping addresses for a faster checkout experience.
            </p>
          </div>
          
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-6 py-3 bg-velvet-white text-velvet-black rounded-full text-xs uppercase tracking-widest font-bold hover:bg-opacity-90 transition-all duration-300 transform hover:scale-105 active:scale-95"
          >
            <Plus size={16} /> Add New Address
          </button>
        </div>

        {addresses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-2xl"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <MapPin size={32} className="text-velvet-muted" />
            </div>
            <h3 className="text-xl font-heading text-velvet-white mb-2">No addresses found</h3>
            <p className="text-velvet-muted mb-8 text-center max-w-sm">
              You haven't saved any addresses yet. Add one to speed up your future orders.
            </p>
            <button
              onClick={handleAdd}
              className="text-velvet-accent hover:text-velvet-white transition-colors text-xs uppercase tracking-widest font-bold"
            >
              Add your first address
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {addresses.map((address) => (
                <motion.div
                  key={address.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`group relative p-6 bg-velvet-dark border rounded-2xl transition-all duration-500 hover:border-white/30 ${
                    address.isDefault ? 'border-velvet-accent/50' : 'border-white/10'
                  }`}
                >
                  {address.isDefault && (
                    <div className="absolute -top-3 left-6 px-3 py-1 bg-velvet-accent rounded-full flex items-center gap-1.5 shadow-lg shadow-velvet-accent/20">
                      <Star size={10} className="fill-white text-white" />
                      <span className="text-[10px] uppercase tracking-widest font-bold text-white">Default</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/5 rounded-lg">
                          <User size={16} className="text-velvet-muted" />
                        </div>
                        <h3 className="font-heading text-velvet-white tracking-wide">{address.name}</h3>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm text-velvet-muted">
                        <Phone size={14} className="flex-shrink-0" />
                        <span>{address.phone}</span>
                      </div>
                      <div className="flex items-start gap-3 text-sm text-velvet-muted leading-relaxed">
                        <MapPin size={14} className="mt-1 flex-shrink-0" />
                        <span>
                          {address.street},<br />
                          {address.city}, {address.state} - {address.pincode}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between border-t border-white/5">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleEdit(address)}
                          className="p-2 text-velvet-muted hover:text-velvet-white hover:bg-white/5 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => deleteAddress(address.id)}
                          className="p-2 text-velvet-muted hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {!address.isDefault && (
                        <button
                          onClick={() => setDefault(address.id)}
                          className="text-[10px] uppercase tracking-widest font-bold text-velvet-accent hover:text-velvet-white transition-colors"
                        >
                          Set Default
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AddressModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        address={selectedAddress}
      />
    </div>
  )
}
