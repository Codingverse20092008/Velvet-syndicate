'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Landmark, Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface BankDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function BankDetailsModal({ isOpen, onClose, onSuccess }: BankDetailsModalProps) {
  const [accountNo, setAccountNo] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    let isMounted = true
    const loadDetails = async () => {
      setIsLoading(true)
      setErrorMsg(null)
      setSuccessMsg(null)
      try {
        const res = await apiFetch('/user/profile')
        const data = await res.json()
        if (isMounted && data.success && data.data?.user) {
          if (data.data.user.bankAccountNo) setAccountNo(data.data.user.bankAccountNo)
          if (data.data.user.bankIfsc) setIfsc(data.data.user.bankIfsc)
        }
      } catch (err: any) {
        if (isMounted) setErrorMsg('Failed to load current bank details')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadDetails()
    return () => {
      isMounted = false
    }
  }, [isOpen])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    const cleanAccount = accountNo.trim()
    const cleanIfsc = ifsc.trim().toUpperCase()

    if (!cleanAccount || cleanAccount.length < 9 || cleanAccount.length > 18) {
      setErrorMsg('Account number must be between 9 and 18 digits')
      return
    }

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/
    if (!ifscRegex.test(cleanIfsc)) {
      setErrorMsg('Invalid IFSC code format (e.g. HDFC0001234, SBIN0000456)')
      return
    }

    setIsSaving(true)
    try {
      const res = await apiFetch('/user/bank-details', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankAccountNo: cleanAccount,
          bankIfsc: cleanIfsc,
        }),
      })

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to save bank details')
      }

      setSuccessMsg('Bank details saved successfully for instant refunds.')
      if (onSuccess) onSuccess()
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save bank details')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-lg bg-[#0A0A0A] border border-[#222222] border-t-[#C9A961]/40 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 overflow-hidden"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              type="button"
              className="absolute top-5 right-5 p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#C9A961]/10 border border-[#C9A961]/30 flex items-center justify-center text-[#C9A961]">
                <Landmark size={20} />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#C9A961] block font-medium">
                  Direct Refund Settlement
                </span>
                <h3 className="font-heading text-xl text-white">Bank Account Details</h3>
              </div>
            </div>

            {/* Security Notice */}
            <div className="flex items-start gap-2.5 p-3.5 bg-white/[0.03] border border-white/5 rounded-xl mb-6 text-xs text-white/60">
              <Lock size={14} className="text-[#C9A961] shrink-0 mt-0.5" />
              <span>
                Your financial credentials are encrypted and stored exclusively to process returns and instant refunds.
              </span>
            </div>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-white/50 text-sm">
                <Loader2 size={24} className="animate-spin text-[#C9A961]" />
                <span>Retrieving secured records...</span>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-5">
                {/* Account Number */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-white/70 block">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={accountNo}
                    onChange={(e) => setAccountNo(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 9-18 digit account number"
                    maxLength={18}
                    required
                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#C9A961] focus:ring-1 focus:ring-[#C9A961]/40 transition-all placeholder:text-white/30 tracking-wider font-mono"
                  />
                </div>

                {/* IFSC Code */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-white/70 block">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="e.g. HDFC0001234"
                    maxLength={11}
                    required
                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#C9A961] focus:ring-1 focus:ring-[#C9A961]/40 transition-all placeholder:text-white/30 tracking-wider font-mono uppercase"
                  />
                </div>

                {/* Status Messages */}
                {errorMsg && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400">
                    <CheckCircle2 size={14} className="shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-3 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 text-xs uppercase tracking-widest transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-[#C9A961] hover:bg-[#D4AF37] text-black font-semibold text-xs tracking-wider uppercase py-3 px-6 rounded-xl transition-all shadow-lg shadow-[#C9A961]/10 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving && <Loader2 size={14} className="animate-spin" />}
                    Save Account
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
