'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface AuthVideoBackgroundProps {
  videoUrl?: string
}

export function AuthVideoBackground({ videoUrl }: AuthVideoBackgroundProps) {
  // Use the new background video provided by the user
  const defaultVideo = "/videos/auth-background.mp4"
  const mobileVideo = "/videos/auth-mobile-v2.mp4"
  const finalVideoUrl = videoUrl || defaultVideo

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-black">
      {/* DESKTOP VIDEO */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="hidden md:block absolute w-full h-full object-cover opacity-75"
        style={{ objectPosition: 'center center' }}
      >
        <source src={finalVideoUrl} type="video/mp4" />
      </video>

      {/* MOBILE VIDEO - New requested video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="block md:hidden absolute w-full h-full object-cover opacity-75"
        style={{ objectPosition: 'center center' }}
      >
        <source src={mobileVideo} type="video/mp4" />
      </video>

      {/* 
          ATMOSPHERIC OVERLAYS
          Lightened to show more of the high-quality video
      */}
      <div className="absolute inset-0 bg-black/25" />
      
      {/* Vertical Masking - Lightened */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60" />

      {/* 4. GRAIN TEXTURE (Diffuses watermark outlines) */}
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </div>
  )
}
