'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

const EASE = [0.22, 1, 0.36, 1]

function FadeUp({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function AboutPreview() {
  return (
    <section className="py-28 bg-velvet-black px-6">
      <div className="max-w-[640px] mx-auto text-center">

        <FadeUp delay={0}>
          <span className="text-[10px] uppercase tracking-[0.52em] text-velvet-muted mb-6 block">
            About Velvet Syndicate
          </span>
        </FadeUp>

        <FadeUp delay={0.1}>
          <p className="text-base md:text-lg text-velvet-white font-light leading-[1.9] mb-3">
            Not everything starts with a plan. Some things start with a conversation.
          </p>
        </FadeUp>

        <FadeUp delay={0.2}>
          <p className="text-sm text-velvet-muted font-light leading-[1.9] mb-3">
            An idea, a discussion, and the quiet realization that we could actually build
            this — together.
          </p>
        </FadeUp>

        <FadeUp delay={0.3}>
          <p className="text-sm text-velvet-muted font-light leading-[1.9] mb-12">
            Velvet Syndicate is the result of that moment. Now actively built,
            one deliberate step at a time.
          </p>
        </FadeUp>

        <FadeUp delay={0.38}>
          <Link
            href="/about"
            className="inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.42em] text-velvet-muted hover:text-velvet-white border-b border-white/20 hover:border-white/50 pb-px transition-all duration-300"
          >
            Read More
            <span className="translate-y-[0.5px]">→</span>
          </Link>
        </FadeUp>

        {/* Accent rule */}
        <motion.div
          className="mt-16 h-px bg-velvet-accent/20 mx-auto"
          initial={{ width: 0, opacity: 0 }}
          whileInView={{ width: 48, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.55, ease: EASE }}
        />
      </div>
    </section>
  )
}
