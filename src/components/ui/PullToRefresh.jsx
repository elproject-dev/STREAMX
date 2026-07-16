import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

export default function PullToRefresh({ onRefresh, children }) {
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(null);
  const touchCurrentY = useRef(null);
  const containerRef = useRef(null);
  
  const MAX_PULL = Capacitor.isNativePlatform() ? 100 : 80;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e) => {
      if (window.scrollY === 0) {
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (!touchStartY.current || isRefreshing) return;
      
      touchCurrentY.current = e.touches[0].clientY;
      const diff = touchCurrentY.current - touchStartY.current;

      // Jika ditarik ke bawah dan posisi scroll di paling atas
      if (diff > 0 && window.scrollY === 0) {
        // Mencegah scroll default browser (hanya jika memang niat pull-to-refresh)
        if (e.cancelable && diff > 10) {
           e.preventDefault();
        }
        const dampenedDiff = Math.min(diff * 0.4, MAX_PULL + 20);
        setPullY(dampenedDiff);
      }
    };

    const handleTouchEnd = async () => {
      if (!touchStartY.current || isRefreshing) return;

      if (pullY > 60) { // Threshold untuk refresh
        setIsRefreshing(true);
        setPullY(60); 
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullY(0);
        }
      } else {
        setPullY(0);
      }
      
      touchStartY.current = null;
      touchCurrentY.current = null;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    // passive: false penting agar bisa e.preventDefault()
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullY, isRefreshing, onRefresh]);

  return (
    <div ref={containerRef} className="relative w-full min-h-screen">
      {/* Loading Indicator */}
      <motion.div 
        className="fixed top-20 md:top-24 left-0 right-0 flex justify-center items-start z-40 pointer-events-none"
        animate={{ 
          y: pullY > 0 ? pullY * 0.8 : -60, 
          opacity: pullY > 0 ? Math.min(pullY / 40, 1) : 0,
          scale: pullY > 0 ? Math.min(0.5 + (pullY / 100), 1) : 0.5
        }}
        transition={{ type: "spring", bounce: 0.2, duration: isRefreshing ? 0.2 : 0 }}
      >
        <div className="bg-card/90 backdrop-blur-xl rounded-full p-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.8)] border border-white/10 text-primary">
          <Loader2 
            className={`w-6 h-6 ${isRefreshing ? 'animate-spin' : ''}`} 
            style={{ transform: `rotate(${pullY * 4}deg)` }}
          />
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        animate={{ y: pullY > 0 ? pullY : 0 }}
        transition={{ type: "spring", bounce: 0, duration: 0.2 }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </div>
  );
}
