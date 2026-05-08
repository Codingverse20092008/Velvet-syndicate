'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

export function Footer() {
  return (
    <motion.footer
      className="bg-velvet-dark border-t border-white/5"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16 pb-24 md:pb-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="font-heading text-lg md:text-xl tracking-[0.3em] text-velvet-white mb-4 uppercase">
              VELVET SYNDICATE
            </h3>
            <p className="text-velvet-muted font-light text-xs md:text-sm leading-relaxed max-w-sm hidden md:block">
              Silent luxury meets streetwear attitude.
              Footwear designed not to announce, but to exist.
            </p>
          </div>

          {/* Links Grid - Side by side on mobile */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-8 md:col-span-2">
            <div>
              <h4 className="text-[10px] tracking-widest uppercase text-velvet-white/60 mb-4 md:mb-6">
                Explore
              </h4>
              <ul className="space-y-2 md:space-y-3">
                <li>
                  <Link href="/collection" className="text-xs md:text-sm text-velvet-muted hover:text-velvet-white transition-colors">
                    Collection
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-xs md:text-sm text-velvet-muted hover:text-velvet-white transition-colors">
                    About
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] tracking-widest uppercase text-velvet-white/60 mb-4 md:mb-6">
                Support
              </h4>
              <ul className="space-y-2 md:space-y-3">
                <li>
                  <Link href="/policies" className="text-xs md:text-sm text-velvet-muted hover:text-velvet-white transition-colors">
                    Policies
                  </Link>
                </li>
                <li>
                  <a href="https://wa.me/919876543210" className="text-xs md:text-sm text-velvet-muted hover:text-velvet-white transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 md:mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-1">
            <p className="text-[10px] text-neutral-600 tracking-wide">
              © 2026 Velvet Syndicate.
            </p>
            <p className="text-[9px] text-neutral-700 tracking-[0.2em] uppercase font-bold">
              Wear the Unspoken
            </p>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-6">
            <a
              href="https://www.instagram.com/_velvet.syndicate_?igsh=emZuYjNoNDl1d3Ux"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 hover:text-velvet-white transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 hover:text-velvet-white transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </motion.footer>
  )
}
