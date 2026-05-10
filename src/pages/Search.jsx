import React from 'react';
import { VideoStore } from '@/lib/videoStore';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, Film } from 'lucide-react';
import { motion } from 'framer-motion';
import VideoCard from '@/components/home/VideoCard';
import { useSearchParams } from 'react-router-dom';

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const { data: allVideos = [], isLoading } = useQuery({
    queryKey: ['videos-search'],
    queryFn: () => VideoStore.list('-created_date', 200),
  });

  const filteredVideos = query
    ? allVideos.filter(v => {
        const q = query.toLowerCase();
        return (
          v.title?.toLowerCase().includes(q) ||
          v.description?.toLowerCase().includes(q) ||
          v.genre?.toLowerCase().includes(q) ||
          v.category?.toLowerCase().includes(q)
        );
      })
    : allVideos;

  return (
    <div className="min-h-screen bg-background pt-24 md:pt-28 pb-16">
      <div className="w-full px-4 md:px-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 mb-1">
            <SearchIcon className="w-5 h-5 text-primary" />
            <h1 className="text-lg md:text-xl font-bold text-foreground">
              {query ? `Hasil pencarian: "${query}"` : 'Semua Video'}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {filteredVideos.length} video ditemukan
          </p>
        </motion.div>

        {/* Results Grid */}
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-10 gap-4 md:gap-6">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[2/3] bg-secondary rounded-lg" />
                <div className="mt-2 h-4 bg-secondary rounded w-3/4" />
                <div className="mt-1 h-3 bg-secondary rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredVideos.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-10 gap-4 md:gap-6">
            {filteredVideos.map((video, index) => (
              <div key={video.id} className="w-full">
                <VideoCard video={video} index={index} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Film className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Tidak ada hasil</h3>
            <p className="text-muted-foreground">
              Coba kata kunci lain atau jelajahi semua video
            </p>
          </div>
        )}
      </div>
    </div>
  );
}