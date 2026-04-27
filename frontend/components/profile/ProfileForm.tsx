'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Check, AlertCircle, Loader2, User } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { apiFetch } from '@/lib/api'

const EASE = [0.22, 1, 0.36, 1]

interface FormData {
  name: string
  phone: string
  address: string
  avatar: string | null
}

interface FormErrors {
  name?: string
  phone?: string
  address?: string
  avatar?: string
}

export function ProfileForm() {
  const { user, setUser } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState<FormData>({
    name: user?.name || '',
    phone: (user as any)?.phone || '',
    address: (user as any)?.address || '',
    avatar: (user as any)?.avatar || null,
  })
  
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Validation functions
  const validateName = (name: string): string | undefined => {
    if (!name.trim()) return 'Name is required'
    if (name.trim().length < 2) return 'Name must be at least 2 characters'
    return undefined
  }

  const validatePhone = (phone: string): string | undefined => {
    if (!phone.trim()) return undefined // Optional until first entry
    const phoneRegex = /^[6-9]\d{9}$/ // Indian mobile format
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return 'Please enter a valid 10-digit mobile number'
    }
    return undefined
  }

  const validateAddress = (address: string): string | undefined => {
    if (!address.trim()) return undefined // Optional
    if (address.trim().length < 10) return 'Please enter a complete address (min 10 characters)'
    return undefined
  }

  // Handle image upload
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type (only JPEG, PNG, WebP, AVIF)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
    if (!validTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, avatar: 'Please upload a JPEG, PNG, WebP, or AVIF image' }))
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, avatar: 'Image size must be less than 5MB' }))
      return
    }

    setIsUploading(true)
    setErrors(prev => ({ ...prev, avatar: undefined }))

    try {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        setFormData(prev => ({ ...prev, avatar: base64 }))
        setIsUploading(false)
      }
      reader.onerror = () => {
        setErrors(prev => ({ ...prev, avatar: 'Failed to read image' }))
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    } catch {
      setErrors(prev => ({ ...prev, avatar: 'Failed to upload image' }))
      setIsUploading(false)
    }
  }, [])

  // Remove avatar
  const handleRemoveAvatar = useCallback(() => {
    setFormData(prev => ({ ...prev, avatar: null }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate all fields
    const newErrors: FormErrors = {
      name: validateName(formData.name),
      phone: validatePhone(formData.phone),
      address: validateAddress(formData.address),
    }

    // Remove undefined errors
    Object.keys(newErrors).forEach(key => {
      if (!newErrors[key as keyof FormErrors]) {
        delete newErrors[key as keyof FormErrors]
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSaving(true)
    setErrors({})

    try {
      const res = await apiFetch('/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
          avatar: formData.avatar,
        }),
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to update profile')
      }

      // Update local state
      setUser({
        ...user!,
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        avatar: formData.avatar || undefined,
      })

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      let errorMessage = 'Failed to save changes'
      
      if (error instanceof Error) {
        if (error.message.includes('fetch') || error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.'
        } else if (error.message.includes('unique') || error.message.includes('already registered')) {
          errorMessage = 'This phone number is already registered to another account'
        } else {
          errorMessage = error.message
        }
      }
      
      setErrors({
        name: errorMessage,
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Handle input changes with validation
  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }

    // Real-time validation
    let validationError: string | undefined
    switch (field) {
      case 'name':
        validationError = validateName(value)
        break
      case 'phone':
        validationError = validatePhone(value)
        break
      case 'address':
        validationError = validateAddress(value)
        break
    }

    if (validationError) {
      setErrors(prev => ({ ...prev, [field]: validationError }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Success Message */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-lg"
          >
            <Check size={16} className="text-green-500" />
            <span className="text-sm text-green-500">Profile updated successfully</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar Upload */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className="w-28 h-28 rounded-full bg-velvet-dark border-2 border-white/10 overflow-hidden flex items-center justify-center">
            {formData.avatar ? (
              <img
                src={formData.avatar}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={40} className="text-velvet-muted" />
            )}
          </div>
          
          {/* Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute bottom-0 right-0 w-10 h-10 bg-velvet-accent rounded-full flex items-center justify-center hover:bg-velvet-accent/80 transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 size={16} className="text-white animate-spin" />
            ) : (
              <Camera size={16} className="text-white" />
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* Avatar Actions */}
        <div className="flex items-center gap-4 mt-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[11px] uppercase tracking-[0.3em] text-velvet-muted hover:text-velvet-white transition-colors"
          >
            {formData.avatar ? 'Change Photo' : 'Upload Photo'}
          </button>
          {formData.avatar && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              className="text-[11px] uppercase tracking-[0.3em] text-red-400 hover:text-red-300 transition-colors"
            >
              Remove
            </button>
          )}
        </div>

        {errors.avatar && (
          <p className="text-xs text-red-400 mt-2">{errors.avatar}</p>
        )}
      </div>

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Name Field */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted mb-3 block">
            Full Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter your name"
            className={`w-full h-12 px-4 bg-velvet-dark border rounded-lg text-velvet-white placeholder-white/30 outline-none transition-all duration-300 ${
              errors.name ? 'border-red-500/50' : 'border-white/10 focus:border-white/30'
            }`}
          />
          {errors.name && (
            <div className="flex items-center gap-1.5 mt-2">
              <AlertCircle size={12} className="text-red-400" />
              <p className="text-xs text-red-400">{errors.name}</p>
            </div>
          )}
        </div>

        {/* Email (Read-only) */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted mb-3 block">
            Email Address
          </label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full h-12 px-4 bg-velvet-dark/50 border border-white/5 rounded-lg text-velvet-muted cursor-not-allowed"
          />
          <p className="text-[10px] text-velvet-muted/60 mt-2">
            Email cannot be changed
          </p>
        </div>

        {/* Phone Field */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted mb-3 block">
            Mobile Number
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="10-digit mobile number"
            className={`w-full h-12 px-4 bg-velvet-dark border rounded-lg text-velvet-white placeholder-white/30 outline-none transition-all duration-300 ${
              errors.phone ? 'border-red-500/50' : 'border-white/10 focus:border-white/30'
            }`}
          />
          {errors.phone ? (
            <div className="flex items-center gap-1.5 mt-2">
              <AlertCircle size={12} className="text-red-400" />
              <p className="text-xs text-red-400">{errors.phone}</p>
            </div>
          ) : (
            <p className="text-[10px] text-velvet-muted/60 mt-2">
              Enter 10-digit Indian mobile number
            </p>
          )}
        </div>

        {/* Address Field */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted mb-3 block">
            Delivery Address
          </label>
          <textarea
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="Enter your complete address"
            rows={4}
            className={`w-full px-4 py-3 bg-velvet-dark border rounded-lg text-velvet-white placeholder-white/30 outline-none transition-all duration-300 resize-none ${
              errors.address ? 'border-red-500/50' : 'border-white/10 focus:border-white/30'
            }`}
          />
          {errors.address ? (
            <div className="flex items-center gap-1.5 mt-2">
              <AlertCircle size={12} className="text-red-400" />
              <p className="text-xs text-red-400">{errors.address}</p>
            </div>
          ) : (
            <p className="text-[10px] text-velvet-muted/60 mt-2">
              Full address including street, city, state and PIN code
            </p>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={isSaving}
          className="w-full h-14 bg-velvet-white text-velvet-black text-[11px] uppercase tracking-[0.4em] font-medium rounded-lg hover:bg-white/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {isSaving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </form>
  )
}
