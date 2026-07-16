import React, { useRef, useEffect, useState } from 'react';
import VideoCard from './VideoCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function VideoRow({ title, videos, icon: Icon, isSlider = false, extraHeader = null, showDecorLine = true, isFirstRow = false }) {
  const scrollRef = useRef(null);
  const scrollTimeout = useRef(null);
  const [isPaused, setIsPaused] = useState(false);

  // Restore scroll position on mount
  useEffect(() => {
    if (isSlider && scrollRef.current) {
      const savedScroll = sessionStorage.getItem(`scroll_${title}`);
      if (savedScroll) {
        // Hapus class scroll-smooth sementara agar restore terjadi instan tanpa animasi geser
        scrollRef.current.classList.remove('scroll-smooth');
        scrollRef.current.scrollLeft = parseInt(savedScroll, 10);
        // Kembalikan class scroll-smooth setelah restore selesai
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.classList.add('scroll-smooth');
        }, 50);
      }
    }
  }, [isSlider, title]);

  // Handle scroll event with debounce to save position
  const handleScroll = () => {
    if (isSlider && scrollRef.current) {
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        if (scrollRef.current) {
          sessionStorage.setItem(`scroll_${title}`, scrollRef.current.scrollLeft);
        }
      }, 300);
    }
  };

  useEffect(() => {
    // Hanya aktifkan auto-slide jika ini adalah bagian Populer atau Terbaru
    const autoSlideTitles = ["Paling Populer", "Most Popular", "Newly Added", "Terbaru"];
    if (isSlider && autoSlideTitles.includes(title) && !isPaused) {
      const interval = setInterval(() => {
        if (scrollRef.current) {
          const container = scrollRef.current;
          const cardWidth = container.querySelector('.shrink-0').offsetWidth;
          const gap = 24;
          const isMobile = window.innerWidth < 768;
          const cardsToScroll = isMobile ? 3 : 7;
          const scrollAmount = (cardWidth + gap) * cardsToScroll;

          // Cek apakah sudah di ujung kanan
          if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 10) {
            container.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            container.scrollTo({ 
              left: container.scrollLeft + scrollAmount, 
              behavior: 'smooth' 
            });
          }
        }
      }, 5000); // Geser setiap 5 detik

      return () => clearInterval(interval);
    }
  }, [isSlider, title, videos, isPaused]);

  if (!videos || videos.length === 0) return null;

  const scroll = (direction) => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const cardWidth = container.querySelector('.shrink-0').offsetWidth;
      const gap = 24; // md:gap-6 = 24px
      
      // Hitung langkah geser: 7 card + gap di desktop, 3 card + gap di mobile
      const isMobile = window.innerWidth < 768;
      const cardsToScroll = isMobile ? 3 : 7;
      const scrollAmount = (cardWidth + gap) * cardsToScroll;

      const scrollTo = direction === 'left' 
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;
      
      container.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className={`mt-6 md:mt-10 mb-4 md:mb-6 ${isSlider ? 'group/row' : ''}`}>
      {/* Title */}
      <div className="w-full px-4 md:px-10 mb-2 md:mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 md:gap-2">
            {Icon && <Icon className="w-4 h-4 md:w-5 md:h-5 text-primary shrink-0" />}
            <h2 className="text-sm md:text-xl font-bold text-foreground truncate">{title}</h2>
            {showDecorLine && <div className="h-[2px] w-4 md:w-8 bg-primary/50 rounded-full shrink-0" />}
          </div>
          {extraHeader}
        </div>
      </div>

      {/* Videos */}
      <div 
        className="w-full px-4 md:px-10"
        onMouseEnter={() => {
          setIsPaused(true);
        }}
        onMouseLeave={() => {
          setIsPaused(false);
        }}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {isSlider ? (
          <div className="relative flex items-center">
            {/* Prev Button */}
            <button 
              onClick={() => scroll('left')}
              className="absolute -left-2 md:-left-4 z-30 w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/80 border border-white/10 flex items-center justify-center text-white shadow-xl hover:bg-primary transition-all opacity-0 group-hover/row:opacity-100"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            {/* Scrollable Area */}
            <div 
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex overflow-x-auto hide-scrollbar gap-4 md:gap-6 pb-4 scroll-smooth w-full snap-x snap-mandatory"
            >
              {videos.map((video, index) => (
                <div key={video.id} className="w-[calc(33.333%-10.7px)] sm:w-[calc(25%-12px)] lg:w-[calc(25%-18px)] xl:w-[calc(16.666%-20px)] 2xl:w-[calc(14.285%-20.6px)] shrink-0 snap-start">
                  <VideoCard video={video} index={index} priority={index < 7} />
                </div>
              ))}
            </div>

            {/* Next Button */}
            <button 
              onClick={() => scroll('right')}
              className="absolute -right-2 md:-right-4 z-30 w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/80 border border-white/10 flex items-center justify-center text-white shadow-xl hover:bg-primary transition-all opacity-0 group-hover/row:opacity-100"
            >
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
            {videos.map((video, index) => (
              <VideoCard key={video.id} video={video} index={index} priority={index < 7} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}