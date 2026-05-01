import React from 'react';
import { Play, Info, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function HeroBanner({ video }) {
  if (!video) return null;

  const bgImage = video.thumbnail_url || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1920&q=80';

  return (
    <div className="relative w-full h-[70vh] md:h-[85vh] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={bgImage}
          alt={video.title}
          className="w-full h-full object-cover"
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full flex items-end pb-20 md:pb-28">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 w-full">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="max-w-xl"
          >
            {/* Category Badge */}
            <div className="flex items-center gap-3 mb-4">
              {video.category && (
                <span className="px-3 py-1 bg-primary/20 text-primary text-xs font-semibold uppercase tracking-wider rounded-full border border-primary/30">
                  {video.category.replace('_', ' ')}
                </span>
              )}
              {video.year && (
                <span className="text-sm text-muted-foreground">{video.year}</span>
              )}
              {video.rating && (
                <span className="px-2 py-0.5 border border-muted-foreground/30 text-muted-foreground text-xs font-medium rounded">
                  {video.rating}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-tight mb-4 text-foreground">
              {video.title}
            </h1>

            {/* Description */}
            {video.description && (
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-6 line-clamp-3">
                {video.description}
              </p>
            )}

            {/* Duration & Genre */}
            <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
              {video.duration && <span>{video.duration}</span>}
              {video.genre && <span>• {video.genre}</span>}
              {video.view_count > 0 && <span>• {video.view_count} views</span>}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3">
              <Link to={`/watch?id=${video.id}`}>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-6 text-base rounded-lg gap-2">
                  <Play className="w-5 h-5 fill-current" />
                  Putar
                </Button>
              </Link>
              <Link to={`/watch?id=${video.id}`}>
                <Button variant="secondary" className="bg-secondary/80 hover:bg-secondary text-foreground font-semibold px-6 py-6 text-base rounded-lg gap-2">
                  <Info className="w-5 h-5" />
                  Detail
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}