'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Landmark, CheckCircle2, AlertCircle, Lock } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { apiFetch } from '@/lib/api'

const EASE = [0.22, 1, 0.36, 1]

export default function BankDetailsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()

  const [accountNo, setAccountNo] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [hasSavedDetails, setHasSavedDetails] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/profile/bank-details')
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    // Wait for auth to settle
    if (authLoading) return
    // Not authenticated — redirect handled above, stop fetching
    if (!isAuthenticated) {
      setIsFetching(false)
      return
    }
    const loadProfile = async () => {
      try {
        const res = await apiFetch('/user/profile')
        const data = await res.json()
        if (data.success && data.data?.user) {
          const { bankAccountNo, bankIfsc } = data.data.user
          if (bankAccountNo) setAccountNo(bankAccountNo)
          if (bankIfsc) setIfsc(bankIfsc)
          if (bankAccountNo || bankIfsc) setHasSavedDetails(true)
        }
      } catch {
        // Silently ignore
      } finally {
        setIsFetching(false)
      }
    }
    loadProfile()
  }, [isAuthenticated, authLoading])

  const handleSave = async () => {
    setIsSaving(true)
    setSuccessMsg(null)
    setErrorMsg(null)
    try {
      const res = await apiFetch('/user/bank-details', {
        method: 'PATCH',
        body: JSON.stringify({
          bankAccountNo: accountNo.trim() || null,
          bankIfsc: ifsc.trim().toUpperCase() || null,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to save bank details')
      setSuccessMsg('Bank details saved successfully.')
      setHasSavedDetails(true)
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong')
    } finally {
      setIsSaving(false)
    }
  }

  // Show spinner while auth is loading OR while we're still fetching profile
  if (authLoading || (isAuthenticated && isFetching)) {
    return (
      <div className="min-h-screen bg-velvet-black flex items-center justify-center">
        <div className="w-8 h-8 border border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-velvet-black pt-28 pb-20 px-6">
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-velvet-muted hover:text-velvet-white transition-colors mb-10"
          >
            <ArrowLeft size={14} /> Back to Profile
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <Landmark size={22} className="text-velvet-accent" />
            <h1 className="font-heading text-3xl text-velvet-white tracking-wider uppercase">
              Bank Details
            </h1>
          </div>
          <p className="text-sm text-velvet-muted mb-8 leading-relaxed">
            Add your bank account details for return refunds. Your information is stored securely and only used for processing refunds.
          </p>

          <div className="bg-velvet-card border border-white/10 rounded-2xl p-6 space-y-5">
            {hasSavedDetails && (
              <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs">
                <CheckCircle2 size={14} />
                <span>Bank details are currently saved for your account.</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-velvet-muted mb-2">
                Bank Account Number
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter your account number"
                maxLength={18}
                className="w-full bg-black border border-white/15 rounded-xl px-4 py-3 text-sm text-velvet-white placeholder:text-velvet-muted/40 outline-none focus:border-velvet-accent/50 transition-colors tracking-widest"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-velvet-muted mb-2">
                IFSC Code
              </label>
              <input
                type="text"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder="e.g. SBIN0001234"
                maxLength={11}
                className="w-full bg-black border border-white/15 rounded-xl px-4 py-3 text-sm text-velvet-white placeholder:text-velvet-muted/40 outline-none focus:border-velvet-accent/50 transition-colors tracking-widest"
              />
            </div>

            {successMsg && (
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <CheckCircle2 size={14} /> {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle size={14} /> {errorMsg}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={isSaving || (!accountNo && !ifsc)}
              className="w-full py-3 bg-velvet-white text-velvet-black text-xs uppercase tracking-widest font-bold rounded-xl hover:bg-velvet-accent hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Bank Details'}
            </button>

            <div className="flex items-start gap-2 pt-2 border-t border-white/5">
              <Lock size={12} className="text-velvet-muted mt-0.5 shrink-0" />
              <p className="text-[10px] text-velvet-muted leading-relaxed">
                Your bank details are stored securely. They are only visible to our team for processing return refunds and will never be shared with third parties.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
