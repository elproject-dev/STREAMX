import React, { useState } from 'react';
import { Play, Clock, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function VideoCard({ video, index = 0 }) {
  const [isHovered, setIsHovered] = useState(false);

  const thumbnail = video.thumbnail_url || `https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&q=60`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link to={`/watch?id=${video.id}`}>
        <div
          className="group relative w-[200px] md:w-[240px] shrink-0 cursor-pointer [.grid_&]:w-full"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Thumbnail */}
          <div className="relative aspect-video rounded-lg overflow-hidden bg-secondary">
            <img
              src={thumbnail}
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
              <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 text-white text-xs font-medium rounded flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {video.duration}
              </div>
            )}
            {/* Rating Badge */}
            {video.rating && (
              <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-primary/90 text-white text-[10px] font-bold rounded">
                {video.rating}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="mt-2.5 px-0.5">
            <h3 className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {video.title}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {video.year && <span>{video.year}</span>}
              {video.genre && <span>• {video.genre}</span>}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}