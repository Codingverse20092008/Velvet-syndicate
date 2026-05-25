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
            className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 p-5 sm:p-8 md:p-10 lg:p-12"
          >
            <div className="lg:col-span-6 flex flex-col gap-6 sm:gap-7 lg:gap-0 lg:justify-between lg:min-h-[380px]">
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

              <div className="flex w-max max-w-full self-start overflow-hidden rounded-md border border-amber-200/35 bg-black/35">
                <Link
                  href="/summer-sale"
                  className="inline-flex items-center justify-center px-5 sm:px-7 py-3 text-[10px] sm:text-xs tracking-[0.26em] uppercase text-velvet-white bg-white/[0.03] transition-colors duration-400 luxury-ease hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-velvet-accent/70 focus-visible:ring-inset whitespace-nowrap"
                >
                  Shop Now
                </Link>
                <span aria-hidden className="w-px bg-amber-200/35" />
                <Link
                  href="/summer-sale"
                  className="inline-flex items-center justify-center px-5 sm:px-7 py-3 text-[10px] sm:text-xs tracking-[0.26em] uppercase text-amber-100 bg-amber-100/[0.05] transition-colors duration-400 luxury-ease hover:bg-amber-100/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-velvet-accent/70 focus-visible:ring-inset whitespace-nowrap"
                >
                  Limited Pair
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative w-full overflow-hidden rounded-xl bg-black flex items-center justify-center aspect-[9/16] sm:aspect-[4/5] lg:aspect-[16/9]">
                <div className="absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-transparent z-10 pointer-events-none" />
                <Image
                  src="/images/summer-crazy-deals-placeholder mobile.png"
                  alt="Premium streetwear sneaker campaign visual"
                  fill
                  sizes="100vw"
                  className="object-contain object-center scale-[1.08] sm:scale-100 transition-all duration-700 luxury-ease group-hover:scale-[1.12] sm:hidden"
                />
                <Image
                  src="/images/summer-crazy-deals-placeholder desktop.png"
                  alt="Premium streetwear sneaker campaign visual"
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="hidden sm:block object-contain object-center transition-all duration-700 luxury-ease group-hover:scale-[1.03]"
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
