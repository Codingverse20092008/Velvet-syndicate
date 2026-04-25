'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function Cursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [followerPosition, setFollowerPosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY })

      // Smooth follower with delay
      setTimeout(() => {
        setFollowerPosition({ x: e.clientX, y: e.clientY })
      }, 50)
    }

    const handleMouseLeave = () => setIsVisible(false)
    const handleMouseEnter = () => setIsVisible(true)

    // Handle hover states on interactive elements
    const handleInteractiveEnter = () => setIsHovering(true)
    const handleInteractiveLeave = () => setIsHovering(false)

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('mouseenter', handleMouseEnter)

    // Add hover listeners to interactive elements
    const interactiveElements = document.querySelectorAll('a, button, [role="button"], input, .interactive')
    interactiveElements.forEach((el) => {
      el.addEventListener('mouseenter', handleInteractiveEnter)
      el.addEventListener('mouseleave', handleInteractiveLeave)
    })

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('mouseenter', handleMouseEnter)

      interactiveElements.forEach((el) => {
        el.removeEventListener('mouseenter', handleInteractiveEnter)
        el.removeEventListener('mouseleave', handleInteractiveLeave)
      })
    }
  }, [])

  // Don't render on touch devices
  if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) {
    return null
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Cursor dot */}
          <motion.div
            className="fixed w-2 h-2 bg-velvet-white rounded-full pointer-events-none z-[9999]"
            animate={{
              x: position.x - 4,
              y: position.y - 4,
              scale: isHovering ? 1.5 : 1,
              backgroundColor: isHovering ? '#4A7D9C' : '#EAEAEA',
            }}
            transition={{
              duration: 0.1,
              ease: 'easeOut',
            }}
          />

          {/* Cursor follower */}
          <motion.div
            className="fixed w-10 h-10 border border-velvet-accent/60 rounded-full pointer-events-none z-[9998]"
            animate={{
              x: followerPosition.x - 20,
              y: followerPosition.y - 20,
              scale: isHovering ? 1.8 : 1,
              borderColor: isHovering ? '#EAEAEA' : 'rgba(74, 125, 156, 0.6)',
              opacity: isHovering ? 0.3 : 0.5,
            }}
            transition={{
              duration: 0.15,
              ease: [0.215, 0.61, 0.355, 1],
            }}
          />
        </>
      )}
    </AnimatePresence>
  )
}
