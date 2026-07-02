import { useState, useEffect } from 'react';

interface MobileBreakpoints {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  orientation: 'portrait' | 'landscape';
}

export function useMobile(): MobileBreakpoints {
  const [breakpoints, setBreakpoints] = useState<MobileBreakpoints>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenWidth: 0,
    orientation: 'landscape'
  });

  useEffect(() => {
    const updateBreakpoints = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setBreakpoints({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        screenWidth: width,
        orientation: height > width ? 'portrait' : 'landscape'
      });
    };

    // Initial check
    updateBreakpoints();

    // Listen for resize events
    window.addEventListener('resize', updateBreakpoints);
    window.addEventListener('orientationchange', updateBreakpoints);

    return () => {
      window.removeEventListener('resize', updateBreakpoints);
      window.removeEventListener('orientationchange', updateBreakpoints);
    };
  }, []);

  return breakpoints;
}

// Touch-specific utilities
export function useTouchSupport() {
  const [hasTouch, setHasTouch] = useState(false);

  useEffect(() => {
    setHasTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  return hasTouch;
}

// Viewport height utilities (useful for mobile Safari)
export function useViewportHeight() {
  const [vh, setVh] = useState(0);

  useEffect(() => {
    const updateVh = () => {
      const vh = window.innerHeight * 0.01;
      setVh(vh);
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    updateVh();
    window.addEventListener('resize', updateVh);
    window.addEventListener('orientationchange', updateVh);

    return () => {
      window.removeEventListener('resize', updateVh);
      window.removeEventListener('orientationchange', updateVh);
    };
  }, []);

  return vh;
}