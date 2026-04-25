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
                <Link href="/collection" className="text-sm text-velvet-muted hover:text-velvet-white transition-colors cursor-none interactive">
                  Collection
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
      </div>
    </motion.footer>
  )
}
