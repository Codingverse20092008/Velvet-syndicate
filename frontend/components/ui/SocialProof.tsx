'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, ShoppingBag, LogIn, ExternalLink } from 'lucide-react'

// Dummy data for social proof
const NAMES = [
  'Priyanush', 'Dipti', 'Rohan', 'Ananya', 'Ishaan', 'Meera', 'Vikram', 'Saira', 'Arjun', 'Kavya', 
  'Rahul', 'Sneha', 'Abhishek', 'Pooja', 'Sameer', 'Nisha', 'Aravind', 'Aditi', 'Karthik', 'Riya',
  'Siddharth', 'Zoya', 'Aryan', 'Myra', 'Kabir', 'Kiara', 'Ayaan', 'Shanaya', 'Reyansh', 'Anvi',
  'Vihaan', 'Sarah', 'Arnav', 'Ira', 'Advait', 'Sana', 'Aarav', 'Diya', 'Vivaan', 'Aanya',
  'Mohammed', 'Fatima', 'Ahmed', 'Aisha', 'Omar', 'Mariam', 'Youssef', 'Nour', 'Ali', 'Laila',
  'James', 'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Lucas', 'Sophia', 'Mason', 'Isabella',
  'Ethan', 'Mia', 'Oliver', 'Charlotte', 'Aiden', 'Amelia', 'Elijah', 'Harper', 'Daniel', 'Evelyn'
]
const ACTIONS = [
  { text: 'just purchased', icon: <ShoppingBag size={14} className="text-emerald-400" /> },
  { text: 'added to cart', icon: <ShoppingBag size={14} className="text-velvet-accent" /> },
  { text: 'just logged in', icon: <LogIn size={14} className="text-blue-400" /> },
  { text: 'is viewing', icon: <ExternalLink size={14} className="text-velvet-muted" /> }
]
const PRODUCTS = [
  'Nike Air Force 1', 'Nike Dunk Low', 'Nike Air Jordan 1 Retro Low', 'PUMA Suede XL', 
  'PUMA Park Lifestyle OG', 'ASIAN MEXICO-11 Casual', 'Boldfit Sneakers for Man',
  'Nike Air Max 2090', 'ASIAN Casual Sneaker', 'Campus Siren Running', 'Boldfit Badminton Shoes'
]

export function SocialProof() {
  const [settings, setSettings] = useState({
    enabled: true,
    minVisitors: 480,
    maxVisitors: 712,
    activityInterval: 90
  })
  const [visitorCount, setVisitorCount] = useState(542)
  const [currentActivity, setCurrentActivity] = useState<{ name: string, action: typeof ACTIONS[0], product?: string } | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/settings/public/social-proof`)
        if (res.ok) {
          const data = await res.json()
          if (data?.success && data?.data) {
            setSettings(data.data)
            setVisitorCount(data.data.minVisitors + Math.floor(Math.random() * (data.data.maxVisitors - data.data.minVisitors)))
          }
        }
      } catch (err) {
        console.error('Failed to load social proof settings', err)
      }
    }
    loadSettings()
  }, [])

  // Visitor count fluctuation - Every 1 Minute
  useEffect(() => {
    if (!settings.enabled) return

    const interval = setInterval(() => {
      setVisitorCount(prev => {
        const change = Math.floor(Math.random() * 11) - 5 // -5 to +5
        const next = prev + change
        return Math.min(Math.max(next, settings.minVisitors), settings.maxVisitors)
      })
    }, 60000)
    return () => clearInterval(interval)
  }, [settings.enabled, settings.minVisitors, settings.maxVisitors])

  // Activity feed cycle - Based on settings.activityInterval
  useEffect(() => {
    if (!settings.enabled) return

    const triggerActivity = () => {
      const name = NAMES[Math.floor(Math.random() * NAMES.length)]
      const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)]
      const product = action.text.includes('purchased') || action.text.includes('cart') 
        ? PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)] 
        : undefined

      setCurrentActivity({ name, action, product })
      setIsVisible(true)

      // Hide after 7 seconds
      setTimeout(() => {
        setIsVisible(false)
      }, 7000)
    }

    // Initial delay
    const initialTimeout = setTimeout(triggerActivity, 5000)

    // Periodic trigger
    const interval = setInterval(triggerActivity, settings.activityInterval * 1000)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [settings.enabled, settings.activityInterval])

  if (!settings.enabled) return null


  return (
    <>
      {/* Live Visitor Counter */}
      <div className="fixed top-20 md:top-24 right-4 md:left-6 md:right-auto z-40">
        <motion.div 
          initial={{ opacity: 0, x: 20, md: { x: -20 } }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full px-3 md:px-4 py-1 md:py-1.5 shadow-lg"
        >
          <div className="relative">
            <Users size={12} className="text-velvet-accent" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          </div>
          <span className="text-[8px] md:text-[10px] uppercase tracking-widest text-velvet-white font-medium">
            {visitorCount} LIVE VIEWERS
          </span>
        </motion.div>
      </div>

      {/* Activity Toasts (Bottom Left - Elevated on mobile) */}
      <div className="fixed bottom-24 md:bottom-6 left-4 md:left-6 z-50 pointer-events-none">
        <AnimatePresence>
          {isVisible && currentActivity && (
            <motion.div
              initial={{ opacity: 0, y: 20, x: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="bg-velvet-dark/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 md:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-3 md:gap-4 max-w-[240px] md:max-w-xs pointer-events-auto"
            >
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-velvet-accent/20 to-black/40 flex items-center justify-center border border-white/5 shrink-0">
                {currentActivity.action.icon}
              </div>
              
              <div className="flex flex-col gap-0.5 overflow-hidden">
                <p className="text-[10px] md:text-xs text-velvet-white truncate">
                  <span className="font-bold">{currentActivity.name}</span>{' '}
                  <span className="text-velvet-muted">{currentActivity.action.text}</span>
                </p>
                {currentActivity.product && (
                  <p className="text-[9px] md:text-[10px] text-velvet-accent uppercase tracking-wider font-medium truncate">
                    {currentActivity.product}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
