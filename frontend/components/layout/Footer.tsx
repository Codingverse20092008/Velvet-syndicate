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
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="font-heading text-xl tracking-widest text-velvet-muted mb-4">
              VELVET SYNDICATE
            </h3>
            <p className="text-velvet-muted font-light text-sm leading-relaxed max-w-sm">
              Silent luxury meets streetwear attitude.
              Footwear designed not to announce, but to exist.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-xs tracking-widest uppercase text-velvet-white mb-6">
              Explore
            </h4>
            <ul className="space-y-3">
              <li>
                <Link href="/collection" className="text-sm text-velvet-muted hover:text-velvet-white transition-colors interactive">
                  Collection
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-sm text-velvet-muted hover:text-velvet-white transition-colors interactive">
                  About
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-xs tracking-widest uppercase text-velvet-white mb-6">
              Presence
            </h4>
            <p className="text-sm text-velvet-muted font-light leading-relaxed">
              Based in the shadows. Operating everywhere.
            </p>
          </div>

        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-neutral-600 tracking-wide">
            © 2026 Velvet Syndicate. All rights reserved.
          </p>
          <p className="text-xs text-neutral-600 tracking-wide">
            Wear the Unspoken
          </p>
        </div>

        {/* Social Icons - Instagram & WhatsApp */}
        <div className="flex justify-center gap-6 mt-6">
          <a
            href="https://www.instagram.com/_velvet.syndicate_?igsh=emZuYjNoNDl1d3Ux"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-pink-400 transition-all duration-300 hover:scale-110"
            aria-label="Follow us on Instagram"
            title="Follow us on Instagram"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
          </a>
          <a
            href="https://wa.me/919876543210"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-green-500 transition-all duration-300 hover:scale-110"
            aria-label="Chat on WhatsApp"
            title="Chat on WhatsApp"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
          </a>
        </div>
      </div>
    </motion.footer>
  )
}
