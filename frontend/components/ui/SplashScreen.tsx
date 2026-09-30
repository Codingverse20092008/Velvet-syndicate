'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    // 1. Never show on non-home pages (e.g. /login, /profile, /vault, /cart, etc.)
    if (pathname !== '/') {
      setIsVisible(false);
      return;
    }

    try {
      // 2. Check if explicitly forced via URL for developer testing (?splash=1 or ?splash=true)
      const urlParams = new URLSearchParams(window.location.search);
      const forceSplash = urlParams.get('splash') === 'true' || urlParams.get('splash') === '1';

      if (forceSplash) {
        sessionStorage.removeItem('velvet_splash_seen');
        sessionStorage.removeItem('has_seen_splash');
      }

      // 3. Strict session capping check:
      // If velvet_splash_seen === 'true': immediately skip and unmount with zero flash
      const splashSeen = 
        sessionStorage.getItem('velvet_splash_seen') === 'true' ||
        sessionStorage.getItem('has_seen_splash') === 'true';

      if (splashSeen) {
        setIsVisible(false);
        return;
      }

      // 4. Not seen yet in this session -> show splash
      setIsVisible(true);
      document.body.style.overflow = 'hidden';

      const mobileDetected =
        window.innerWidth < 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobileDetected);
    } catch {
      setIsVisible(false);
      return;
    }

    // 5. Safety timeout (10 seconds max)
    const fallbackTimer = setTimeout(() => {
      handleExit();
    }, 10000);

    return () => {
      document.body.style.overflow = 'unset';
      clearTimeout(fallbackTimer);
    };
  }, [pathname]);

  // Ensure DOM video properties are set directly (required for iOS Safari and mobile Chrome autoplay)
  useEffect(() => {
    if (isVisible && videoRef.current) {
      const video = videoRef.current;
      video.defaultMuted = true;
      video.muted = true;
      video.playsInline = true;

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Autoplay prevented by mobile browser policy:', err);
        });
      }
    }
  }, [isVisible, isMobile]);

  const handleExit = () => {
    try {
      sessionStorage.setItem('velvet_splash_seen', 'true');
      sessionStorage.setItem('has_seen_splash', 'true');
    } catch {
      // Ignore storage errors in private browsing
    }
    setIsVisible(false);
    document.body.style.overflow = 'unset';
  };

  const videoSrc = isMobile ? '/videos/splash-mobile.mp4' : '/videos/splash-desktop.mp4';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black overflow-hidden select-none"
        >
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              key={videoSrc}
              src={videoSrc}
              autoPlay
              muted
              playsInline
              // @ts-ignore
              webkit-playsinline="true"
              x5-playsinline="true"
              preload="auto"
              onEnded={handleExit}
              onError={() => {
                console.warn('Splash video playback error - exiting gracefully');
                handleExit();
              }}
              className="w-full h-full object-cover"
            />

            {/* Skip Button - Positioned safely for mobile notch and safe areas */}
            <button
              type="button"
              onClick={handleExit}
              className="absolute top-6 right-6 z-50 px-4 py-2 text-white/80 hover:text-white text-xs uppercase tracking-widest font-light transition-all duration-300 hover:bg-white/10 rounded-full backdrop-blur-md border border-white/20 active:scale-95 cursor-pointer"
              aria-label="Skip splash screen"
            >
              Skip
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
