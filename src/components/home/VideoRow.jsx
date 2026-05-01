import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import VideoCard from './VideoCard';

export default function VideoRow({ title, videos, icon: Icon }) {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -600 : 600;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!videos || videos.length === 0) return null;

  return (
    <div className="mb-8 md:mb-12">
      {/* Title */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 mb-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-primary" />}
          <h2 className="text-lg md:text-xl font-bold text-foreground">{title}</h2>
          <div className="h-[2px] w-8 bg-primary/50 rounded-full ml-1" />
        </div>
      </div>

      {/* Scrollable Row */}
      <div className="relative group">
        {/* Left Arrow */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-8 z-10 w-12 bg-gradient-to-r from-background to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </div>
        </button>

        {/* Right Arrow */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-8 z-10 w-12 bg-gradient-to-l from-background to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary">
            <ChevronRight className="w-5 h-5 text-foreground" />
          </div>
        </button>

        {/* Videos */}
        <div
          ref={scrollRef}
          className="flex gap-3 md:gap-4 overflow-x-auto hide-scrollbar px-4 md:px-8 max-w-[1400px] mx-auto"
        >
          {videos.map((video, index) => (
            <VideoCard key={video.id} video={video} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}