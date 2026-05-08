'use client'

import React from 'react'
import Link from 'next/link'

export function MobileFooterLinks() {
  return (
    <div className="md:hidden mt-20 pb-32 border-t border-white/5 pt-12 text-center">
      <h3 className="font-heading text-lg tracking-[0.3em] text-velvet-white mb-8 uppercase">
        VELVET SYNDICATE
      </h3>
      
      <div className="grid grid-cols-2 gap-8 mb-12 px-4">
        <div className="text-left">
          <h4 className="text-[10px] tracking-widest uppercase text-velvet-white/60 mb-4">
            Explore
          </h4>
          <ul className="space-y-3">
            <li>
              <Link href="/collection" className="text-xs text-velvet-muted">Collection</Link>
            </li>
            <li>
              <Link href="/about" className="text-xs text-velvet-muted">About Us</Link>
            </li>
          </ul>
        </div>
        <div className="text-left">
          <h4 className="text-[10px] tracking-widest uppercase text-velvet-white/60 mb-4">
            Support
          </h4>
          <ul className="space-y-3">
            <li>
              <Link href="/policies" className="text-xs text-velvet-muted">Policies</Link>
            </li>
            <li>
              <a href="https://wa.me/919876543210" className="text-xs text-velvet-muted">Contact</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 mb-8">
        <p className="text-[10px] text-neutral-600 tracking-wide">
          © 2026 Velvet Syndicate.
        </p>
        <p className="text-[9px] text-neutral-700 tracking-[0.2em] uppercase font-bold">
          Wear the Unspoken
        </p>
      </div>

      {/* Socials */}
      <div className="flex justify-center gap-8">
        <a href="https://instagram.com" className="text-neutral-500">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
        </a>
        <a href="https://wa.me" className="text-neutral-500">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
        </a>
      </div>
    </div>
  )
}
