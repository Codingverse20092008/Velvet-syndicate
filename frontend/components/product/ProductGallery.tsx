'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface ProductGalleryProps {
  images: string[]
  productName: string
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div className="relative group">
      {/* Main Image */}
      <motion.div
        className="aspect-[4/5] bg-velvet-dark overflow-hidden cursor-none relative"
        onClick={() => setIsZoomed(true)}
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.8, ease: [0.215, 0.61, 0.355, 1] }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            className="w-full h-full relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Image
              src={images[currentIndex] || '/placeholder.jpg'}
              alt={`${productName} - ${currentIndex + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority={currentIndex === 0}
            />
          </motion.div>
        </AnimatePresence>

        
        {/* Zoom Hint */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
          <span className="text-[10px] tracking-[0.4em] uppercase text-velvet-white border border-white/20 px-6 py-2 backdrop-blur-sm">
            Enlarge Presence
          </span>
        </div>
      </motion.div>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 pointer-events-none">
          <button
            onClick={(e) => { e.stopPropagation(); prevImage(); }}
            className="p-3 bg-black/40 border border-white/5 text-velvet-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto hover:border-velvet-accent"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); nextImage(); }}
            className="p-3 bg-black/40 border border-white/5 text-velvet-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto hover:border-velvet-accent"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-4 mt-6">
          {images.map((img, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`relative w-20 aspect-[4/5] overflow-hidden border transition-all duration-500 luxury-ease ${
                index === currentIndex
                  ? 'border-velvet-accent'
                  : 'border-white/10 opacity-50 hover:opacity-100'
              }`}
            >
              <img
                src={img}
                alt={`${productName} thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Zoom Modal */}
      <AnimatePresence>
        {isZoomed && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/95 z-[100]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsZoomed(false)}
            />
            <motion.div
              className="fixed inset-0 z-[101] flex items-center justify-center p-4 md:p-12 lg:p-24 pointer-events-none"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.8, ease: [0.215, 0.61, 0.355, 1] }}
            >
              <button
                onClick={() => setIsZoomed(false)}
                className="absolute top-8 right-8 text-velvet-white hover:text-velvet-accent transition-colors pointer-events-auto"
              >
                <X size={32} strokeWidth={1} />
              </button>
              
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={images[currentIndex]}
                  alt={productName}
                  className="max-w-full max-h-full object-contain shadow-[0_0_100px_rgba(74,125,156,0.15)]"
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
