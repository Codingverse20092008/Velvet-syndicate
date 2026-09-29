'use client'

import React from 'react'
import { motion } from 'framer-motion'

export function HowVaultWorks() {
  const steps = [
    {
      number: '01',
      title: 'COP SNEAKERS',
      description: 'Browse and buy verified streetwear kicks.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
        </svg>
      ),
    },
    {
      number: '02',
      title: 'EARN VAULT XP',
      description: 'Level up your profile with every order & daily style drop.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
    },
    {
      number: '03',
      title: 'UNLOCK MYSTERY CRATES',
      description: 'Redeem XP for rare sneakers, early access, and secret discounts.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      ),
    },
  ]

  return (
    <section className="relative bg-velvet-black py-16 px-6 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <h2 className="font-heading text-3xl uppercase tracking-wide text-velvet-white sm:text-4xl">
            How the Vault Works
          </h2>
        </motion.div>

        {/* Steps Grid - Desktop: Horizontal, Mobile: Vertical Stack */}
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-velvet-card/40 p-8 backdrop-blur-sm transition-all duration-300 hover:border-[#C9A961]/50 hover:bg-velvet-card/60"
            >
              {/* Accent Line */}
              <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-[#C9A961]/0 via-[#C9A961] to-[#C9A961]/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              {/* Step Number */}
              <div className="mb-4 flex items-center justify-between">
                <span className="font-heading text-5xl text-[#C9A961]/20 transition-colors duration-300 group-hover:text-[#C9A961]/40">
                  {step.number}
                </span>
                <div className="text-velvet-muted transition-colors duration-300 group-hover:text-[#C9A961]">
                  {step.icon}
                </div>
              </div>

              {/* Content */}
              <h3 className="mb-3 font-heading text-xl uppercase tracking-wide text-velvet-white">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-velvet-muted">
                {step.description}
              </p>

              {/* Touch target for mobile - ensures minimum 44px */}
              <div className="absolute inset-0 min-h-[44px] min-w-[44px]" aria-hidden="true" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
