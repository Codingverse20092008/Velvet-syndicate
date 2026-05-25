'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'

export function SummerCrazyDealsBanner() {
  return (
    <section className="bg-velvet-black px-4 sm:px-6 md:px-10 lg:px-16 py-8 md:py-12" aria-label="Summer Crazy Deals campaign">
      <div className="max-w-7xl mx-auto">
        <div className="group relative block overflow-hidden rounded-2xl border border-white/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_32%,rgba(244,164,96,0.16),transparent_42%),radial-gradient(circle_at_86%_18%,rgba(255,140,0,0.12),transparent_38%),linear-gradient(135deg,#060606_0%,#0c0c0c_48%,#050505_100%)]" />
          <div className="absolute inset-0 campaign-ambient opacity-70" />
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 p-6 sm:p-8 md:p-10 lg:p-12"
          >
            <div className="lg:col-span-7 flex flex-col justify-between min-h-[300px] sm:min-h-[340px] md:min-h-[380px]">
              <div className="inline-flex w-fit items-center rounded-full border border-amber-300/30 bg-amber-200/5 px-3 py-1 text-[10px] tracking-[0.25em] uppercase text-amber-100/85">
                Limited Time
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h2 className="font-heading text-3xl xs:text-4xl sm:text-5xl lg:text-6xl tracking-[0.06em] uppercase text-velvet-white leading-[0.95]">
                  SUMMER CRAZY DEALS
                </h2>
                <p className="text-sm sm:text-base md:text-lg text-velvet-muted max-w-xl">
                  Fresh Fits. Hot Prices.
                </p>
              </div>

              <div className="inline-flex overflow-hidden rounded-md border border-amber-200/35 bg-black/35">
                <Link
                  href="/summer-sale"
                  className="inline-flex items-center justify-center px-6 sm:px-7 py-3 text-[10px] sm:text-xs tracking-[0.26em] uppercase text-velvet-white bg-white/[0.03] transition-colors duration-400 luxury-ease hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-velvet-accent/70 focus-visible:ring-inset"
                >
                  Shop Now
                </Link>
                <span aria-hidden className="w-px bg-amber-200/35" />
                <Link
                  href="/summer-sale"
                  className="inline-flex items-center justify-center px-6 sm:px-7 py-3 text-[10px] sm:text-xs tracking-[0.26em] uppercase text-amber-100 bg-amber-100/[0.05] transition-colors duration-400 luxury-ease hover:bg-amber-100/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-velvet-accent/70 focus-visible:ring-inset"
                >
                  Limited Pair
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative h-[300px] sm:h-[360px] md:h-[420px] lg:h-full min-h-[300px] overflow-hidden rounded-xl bg-transparent">
                <div className="absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-transparent z-10 pointer-events-none" />
                <Image
                  src="/images/summer-crazy-deals-placeholder mobile.png"
                  alt="Premium streetwear sneaker campaign visual"
                  fill
                  sizes="100vw"
                  className="object-cover object-center transition-all duration-700 luxury-ease group-hover:brightness-110 sm:hidden"
                />
                <Image
                  src="/images/summer-crazy-deals-placeholder desktop.png"
                  alt="Premium streetwear sneaker campaign visual"
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="hidden object-cover object-center transition-all duration-700 luxury-ease group-hover:brightness-110 sm:block"
                />
                <div className="absolute right-4 top-4 z-20 rounded border border-white/20 bg-black/55 px-2.5 py-1 text-[9px] tracking-[0.18em] uppercase text-white/90">
                  SS26 Edit
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
