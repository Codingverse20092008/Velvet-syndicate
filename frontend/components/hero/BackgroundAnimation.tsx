'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  baseOpacity: number
  opacity: number
  color: string
}

export default function BackgroundAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const mouseRef = useRef({ x: -1000, y: -1000 })

  useEffect(() => {
    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let particles: Particle[] = []

    const resizeCanvas = () => {
      const parent = canvas.parentElement
      if (!parent) return
      canvas.width = parent.clientWidth
      canvas.height = parent.clientHeight
      initParticles()
    }

    const initParticles = () => {
      particles = []
      const particleCount = Math.min(Math.floor((canvas.width * canvas.height) / 15000), 80)
      
      const colors = [
        'rgba(212, 196, 176, ', // Champagne/Sand
        'rgba(255, 255, 255, ', // Pure White
        'rgba(74, 125, 156, '   // Accent Blue (dim)
      ]

      for (let i = 0; i < particleCount; i++) {
        const radius = Math.random() * 1.5 + 0.5
        const colorBase = colors[Math.floor(Math.random() * colors.length)]
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          radius,
          baseOpacity: Math.random() * 0.5 + 0.15,
          opacity: 0,
          color: colorBase
        })
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
    }

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 }
    }

    window.addEventListener('resize', resizeCanvas)
    window.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', handleMouseLeave)

    resizeCanvas()

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const mouse = mouseRef.current
      const maxDistance = 100 // Distance for lines
      const mouseInfluenceRadius = 150

      // Update and Draw Particles
      particles.forEach((p) => {
        // Reduced motion check
        if (!reducedMotion) {
          p.x += p.vx
          p.y += p.vy

          // Mouse interaction (gentle attraction)
          if (mouse.x > -1000) {
            const dx = mouse.x - p.x
            const dy = mouse.y - p.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < mouseInfluenceRadius) {
              const force = (mouseInfluenceRadius - dist) / mouseInfluenceRadius
              p.x += (dx / dist) * force * 0.4
              p.y += (dy / dist) * force * 0.4
            }
          }

          // Boundary checks with wrap-around
          if (p.x < 0) p.x = canvas.width
          if (p.x > canvas.width) p.x = 0
          if (p.y < 0) p.y = canvas.height
          if (p.y > canvas.height) p.y = 0
        }

        // Fade in opacity initially
        if (p.opacity < p.baseOpacity) {
          p.opacity += 0.01
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `${p.color}${p.opacity})`
        ctx.shadowBlur = 4
        ctx.shadowColor = 'rgba(212, 196, 176, 0.3)'
        ctx.fill()
        ctx.shadowBlur = 0 // Reset shadow blur
      })

      // Draw faint lines between close particles
      if (!reducedMotion) {
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const p1 = particles[i]
            const p2 = particles[j]
            const dx = p1.x - p2.x
            const dy = p1.y - p2.y
            const dist = Math.sqrt(dx * dx + dy * dy)

            if (dist < maxDistance) {
              const alpha = (1 - dist / maxDistance) * 0.06
              ctx.beginPath()
              ctx.moveTo(p1.x, p1.y)
              ctx.lineTo(p2.x, p2.y)
              ctx.strokeStyle = `rgba(212, 196, 176, ${alpha})`
              ctx.lineWidth = 0.5
              ctx.stroke()
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
      cancelAnimationFrame(animationFrameId)
    }
  }, [reducedMotion])

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#060606] select-none pointer-events-none">
      {/* Floating Glowing Orbs (CSS/Framer Motion) */}
      {!reducedMotion ? (
        <>
          {/* Champagne Gold Orb */}
          <motion.div
            className="absolute rounded-full filter blur-[120px] opacity-[0.12]"
            style={{
              background: 'radial-gradient(circle, #D4C4B0 0%, transparent 70%)',
              width: '50vw',
              height: '50vw',
              top: '10%',
              left: '5%',
            }}
            animate={{
              x: [0, 40, -20, 0],
              y: [0, -50, 30, 0],
              scale: [1, 1.08, 0.95, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Velvet Syndicate Blue Orb */}
          <motion.div
            className="absolute rounded-full filter blur-[130px] opacity-[0.1]"
            style={{
              background: 'radial-gradient(circle, #4A7D9C 0%, transparent 70%)',
              width: '60vw',
              height: '60vw',
              bottom: '5%',
              right: '-10%',
            }}
            animate={{
              x: [0, -50, 20, 0],
              y: [0, 40, -30, 0],
              scale: [1, 0.95, 1.05, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Deep Charcoal Center Wash */}
          <div
            className="absolute inset-0 bg-radial-gradient"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 0%, rgba(6,6,6,0.8) 90%)',
            }}
          />
        </>
      ) : (
        <>
          {/* Static Ambient Orbs for Reduced Motion */}
          <div
            className="absolute rounded-full filter blur-[120px] opacity-[0.08]"
            style={{
              background: 'radial-gradient(circle, #D4C4B0 0%, transparent 70%)',
              width: '50vw',
              height: '50vw',
              top: '15%',
              left: '10%',
            }}
          />
          <div
            className="absolute rounded-full filter blur-[130px] opacity-[0.07]"
            style={{
              background: 'radial-gradient(circle, #4A7D9C 0%, transparent 70%)',
              width: '60vw',
              height: '60vw',
              bottom: '10%',
              right: '5%',
            }}
          />
        </>
      )}

      {/* Interactive Stardust Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-[0.85]"
      />
    </div>
  )
}
