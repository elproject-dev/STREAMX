import React, { useState } from 'react';
import { Play, Clock, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useFavorites } from '@/lib/FavoritesContext';

export default function VideoCard({ video, index = 0 }) {
  const [isHovered, setIsHovered] = useState(false);
  const { isFavorite, toggle } = useFavorites();
  const isFav = isFavorite(video.id);

  const handleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(video);
  };

  const poster = video.poster_url || video.thumbnail_url || `https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&q=60`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link to={`/watch/${video.id}`}>
        <div
          className="group relative cursor-pointer"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Thumbnail */}
          <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-secondary">
            <img
              src={poster}
              alt={video.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
              <motion.div
                initial={false}
                animate={{ scale: isHovered ? 1 : 0.5, opacity: isHovered ? 1 : 0 }}
                className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30"
              >
                <Play className="w-5 h-5 text-primary-foreground fill-current ml-0.5" />
              </motion.div>
            </div>
            {/* Duration Badge */}
            {video.duration && (
              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 text-white text-[9px] sm:text-xs font-medium rounded flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                {video.duration}
              </div>
            )}
            {/* Score Badge */}
            {typeof video.score === 'number' && (
              <div
                className="absolute top-1 left-1 sm:top-1.5 sm:left-1.5 rounded-full flex items-center justify-center"
                style={{
                  width: 22, height: 22,
                  background: `conic-gradient(${video.score * 10 >= 70 ? '#22c55e' : video.score * 10 >= 50 ? '#eab308' : '#ef4444'} ${Math.round(video.score * 10)}%, rgba(255,255,255,0.12) 0)`,
                }}
              >
                <div
                  className="rounded-full bg-black/80 flex items-center justify-center font-black text-white"
                  style={{ width: 16, height: 16, fontSize: 8 }}
                >
                  {Math.round(video.score * 10)}
                </div>
              </div>
            )}
            {/* Favorite Star */}
            <button
              onClick={handleFavorite}
              className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 z-20 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110 hover:bg-black/70"
            >
              <Star
                className={`w-3.5 h-3.5 transition-colors ${isFav ? 'text-yellow-400 fill-yellow-400' : 'text-white/70'}`}
              />
            </button>
          </div>

          {/* Info */}
          <div className="mt-1.5 sm:mt-2.5 px-0.5">
            <h3 className="text-[11px] sm:text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {video.title}
            </h3>
            <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1 text-[9px] sm:text-xs text-muted-foreground overflow-hidden whitespace-nowrap">
              {video.year && <span className="shrink-0">{video.year}</span>}
              {video.genre && <span className="shrink min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">• {video.genre}</span>}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}