'use client'

import React from 'react'
import { motion } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1]

export function AboutSection() {
  return (
    <section className="py-32 bg-velvet-black px-6 overflow-hidden">
      {/* Constrained to 600px — makes copy feel intentional, never sprawling */}
      <div className="max-w-[600px] mx-auto text-center">

        <motion.span
          className="text-[10px] uppercase tracking-[0.52em] text-velvet-muted/60 mb-7 block"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          Philosophy
        </motion.span>

        <motion.h2
          className="font-heading text-4xl md:text-5xl text-velvet-white mb-10 tracking-tight leading-[1.1]"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
        >
          Wear the Unspoken
        </motion.h2>

        {/* Brand statement — surfaced as the primary voice */}
        <motion.p
          className="text-base md:text-lg text-velvet-white/90 font-light leading-[1.85] mb-6"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, delay: 0.18, ease: EASE }}
        >
          We design for presence, not attention.
        </motion.p>

        <motion.p
          className="text-sm text-velvet-muted/55 font-light leading-[1.9]"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, delay: 0.28, ease: EASE }}
        >
          In a world of noise, true luxury is the decision to remain silent. Each silhouette
          is a testament to the understated power of precision — an unspoken code for those
          who lead without a word.
        </motion.p>

        {/* Accent rule */}
        <motion.div
          className="mt-14 h-px bg-velvet-accent/25 mx-auto"
          initial={{ width: 0, opacity: 0 }}
          whileInView={{ width: 56, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, delay: 0.5, ease: EASE }}
        />
      </div>
    </section>
  )
}
