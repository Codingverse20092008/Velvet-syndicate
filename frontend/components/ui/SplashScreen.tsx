'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        window.innerWidth < 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      );
    }
    return false;
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    // 1. Skip on authentication and admin routes
    const isAuthPage = pathname === '/login' || pathname === '/signup';
    const isAdminPage = pathname?.startsWith('/admin');
    if (isAuthPage || isAdminPage) {
      setIsVisible(false);
      return;
    }

    // 2. Detect mobile device
    const mobileDetected =
      window.innerWidth < 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobileDetected);

    // 3. Check for page reload or explicit ?splash=true / ?splash=1 URL parameter to enable re-testing
    try {
      const navEntries = window.performance?.getEntriesByType?.('navigation');
      const isReload =
        navEntries &&
        navEntries.length > 0 &&
        (navEntries[0] as PerformanceNavigationTiming).type === 'reload';

      const urlParams = new URLSearchParams(window.location.search);
      const forceSplash = urlParams.get('splash') === 'true' || urlParams.get('splash') === '1';

      if (isReload || forceSplash) {
        sessionStorage.removeItem('has_seen_splash');
        sessionStorage.removeItem('hasShownSplash');
      }
    } catch {
      // Ignore performance API errors in legacy browsers
    }

    // 4. Check if already displayed in this browser session
    const hasSeenSplash =
      sessionStorage.getItem('has_seen_splash') === 'true' ||
      sessionStorage.getItem('hasShownSplash') === 'true';

    if (!hasSeenSplash) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    }

    // 5. Fallback safety timer (11s - videos are 10s)
    const fallbackTimer = setTimeout(() => {
      handleExit();
    }, 11000);

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
      sessionStorage.setItem('has_seen_splash', 'true');
      sessionStorage.setItem('hasShownSplash', 'true');
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
