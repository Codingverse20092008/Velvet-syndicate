'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Check if splash has already been shown in this session
    const hasShownSplash = sessionStorage.getItem('hasShownSplash');
    
    // Splash screen is ONLY for mobile and only once per session
    const checkDevice = () => {
      const isMobile = window.innerWidth < 768;
      const isAuthPage = pathname === '/login' || pathname === '/signup';
      
      // If it's mobile and NOT an auth page AND hasn't been shown yet
      if (isMobile && !isAuthPage && !hasShownSplash) {
        setIsVisible(true);
        document.body.style.overflow = 'hidden';
        sessionStorage.setItem('hasShownSplash', 'true');
      } else {
        setIsVisible(false);
        document.body.style.overflow = 'unset';
      }
    };

    checkDevice();
    
    // Fallback timeout to ensure user is never stuck
    const fallbackTimer = setTimeout(() => {
      handleExit();
    }, 6000);

    return () => {
      document.body.style.overflow = 'unset';
      clearTimeout(fallbackTimer);
    };
  }, []); // Only run on mount, not on pathname changes anymore!

  const handleExit = () => {
    setIsVisible(false);
    document.body.style.overflow = 'unset';
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black overflow-hidden"
        >
          {/* MOBILE ONLY LOGO REVEAL */}
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <video
              autoPlay
              muted
              playsInline
              onEnded={handleExit}
              className="w-full h-full object-cover scale-[1.05]"
            >
              <source src="/videos/splash.mp4" type="video/mp4" />
            </video>
            {/* Subtle mask to hide bottom-right watermark */}
            <div className="absolute bottom-0 right-0 w-1/3 h-16 bg-gradient-to-tl from-black via-black/80 to-transparent z-20 pointer-events-none" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
