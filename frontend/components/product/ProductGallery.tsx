'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { getFullImageUrl } from '@/lib/api'

interface ProductGalleryProps {
  images: string[]
  productName: string
}

// Helper to check if URL is external
const isExternalUrl = (url: string): boolean => {
  return url.startsWith('http://') || url.startsWith('https://')
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set())

  const handleImageError = (index: number) => {
    setFailedImages(prev => new Set(prev).add(index))
  }

  const getImageSrc = (index: number): string => {
    return getFullImageUrl(images[index])
  }

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const dragTransition = { power: 0, timeConstant: 200 }
  const [dragDirection, setDragDirection] = useState(0)

  const onDragEnd = (event: any, info: any) => {
    const swipeThreshold = 50
    if (info.offset.x > swipeThreshold) {
      prevImage()
    } else if (info.offset.x < -swipeThreshold) {
      nextImage()
    }
  }

  return (
    <div className="relative group -mx-6 md:mx-0">
      {/* Main Image Container */}
      <div className="relative aspect-[4/5] bg-neutral-900 overflow-hidden touch-pan-y">
        <AnimatePresence initial={false} custom={dragDirection} mode="popLayout">
          <motion.div
            key={currentIndex}
            custom={dragDirection}
            className="w-full h-full relative cursor-zoom-in"
            initial={{ opacity: 0, x: dragDirection > 0 ? -100 : 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dragDirection > 0 ? 100 : -100 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={onDragEnd}
            onClick={() => setIsZoomed(true)}
          >
            <Image
              src={getImageSrc(currentIndex)}
              alt={`${productName} - ${currentIndex + 1}`}
              fill
              className="object-cover select-none pointer-events-none"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              priority={currentIndex === 0}
              onError={() => handleImageError(currentIndex)}
            />
          </motion.div>
        </AnimatePresence>

        {/* Pagination Dots (Mobile) */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 md:hidden">
            {images.map((_, index) => (
              <div
                key={index}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  index === currentIndex ? 'bg-velvet-accent w-4' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        )}

        {/* Zoom Hint (Desktop Only) */}
        <div className="hidden md:flex absolute inset-0 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
          <span className="text-[10px] tracking-[0.4em] uppercase text-velvet-white border border-white/20 px-6 py-2 backdrop-blur-sm">
            Enlarge Presence
          </span>
        </div>
      </div>

      {/* Navigation Arrows (Desktop Only) */}
      {images.length > 1 && (
        <div className="hidden md:flex absolute inset-x-0 top-1/2 -translate-y-1/2 justify-between px-4 pointer-events-none">
          <button
            onClick={(e) => { e.stopPropagation(); setDragDirection(1); prevImage(); }}
            className="p-3 bg-black/40 border border-white/5 text-velvet-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto hover:border-velvet-accent"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDragDirection(-1); nextImage(); }}
            className="p-3 bg-black/40 border border-white/5 text-velvet-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto hover:border-velvet-accent"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Thumbnails (Desktop Only) */}
      {images.length > 1 && (
        <div className="hidden md:flex gap-4 mt-6 overflow-x-auto pb-2 no-scrollbar">
          {images.map((img, index) => (
            <button
              key={index}
              onClick={() => {
                setDragDirection(index > currentIndex ? -1 : 1)
                setCurrentIndex(index)
              }}
              className={`relative w-20 aspect-[4/5] shrink-0 overflow-hidden border bg-neutral-900 transition-all duration-500 luxury-ease ${
                index === currentIndex
                  ? 'border-velvet-accent'
                  : 'border-white/10 opacity-50 hover:opacity-100'
              }`}
            >
              <Image
                src={getFullImageUrl(img)}
                alt={`${productName} thumbnail ${index + 1}`}
                fill
                sizes="80px"
                className="object-cover"
                onError={() => handleImageError(index)}
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
                  src={getImageSrc(currentIndex)}
                  alt={productName}
                  className="max-w-full max-h-full object-contain shadow-[0_0_100px_rgba(74,125,156,0.15)]"
                  onError={() => handleImageError(currentIndex)}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
