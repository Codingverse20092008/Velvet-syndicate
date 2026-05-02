'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'info'
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info'
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-velvet-dark border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`p-2 rounded-full ${variant === 'danger' ? 'bg-red-500/20 text-red-400' : 'bg-velvet-accent/20 text-velvet-accent'}`}>
                  <AlertTriangle size={20} />
                </div>
                <h2 className="text-lg font-heading text-velvet-white tracking-wide uppercase">{title}</h2>
              </div>
              
              <p className="text-sm text-velvet-muted leading-relaxed mb-8">
                {message}
              </p>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-12 rounded-xl text-xs uppercase tracking-widest font-bold text-velvet-muted border border-white/10 hover:bg-white/5 transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className={`flex-1 h-12 rounded-xl text-xs uppercase tracking-widest font-bold text-white transition-all ${
                    variant === 'danger' ? 'bg-red-600 hover:bg-red-500' : 'bg-velvet-accent hover:opacity-90'
                  }`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-velvet-muted hover:text-velvet-white transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
