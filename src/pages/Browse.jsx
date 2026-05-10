import React from 'react';
import { VideoStore } from '@/lib/videoStore';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Film, Tv, BookOpen, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import VideoCard from '@/components/home/VideoCard';

const categoryMeta = {
  film: { label: 'Film', icon: Film, description: 'Koleksi film dari berbagai genre' },
  series: { label: 'Series', icon: Tv, description: 'Serial dan TV show terbaik' },
  documentary: { label: 'Dokumenter', icon: BookOpen, description: 'Dokumenter informatif dan inspiratif' },
  animation: { label: 'Animasi', icon: Sparkles, description: 'Animasi seru untuk semua usia' },
  short_film: { label: 'Film Pendek', icon: Film, description: 'Film pendek kreatif' },
  music_video: { label: 'Video Musik', icon: Film, description: 'Video musik populer' },
};

export default function Browse() {
  const { category } = useParams();

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['videos-browse', category],
    queryFn: () => category
      ? VideoStore.filter({ category }, '-created_date', 100)
      : VideoStore.list('-created_date', 100),
  });

  const meta = categoryMeta[category] || { label: 'Semua Video', icon: Film, description: 'Jelajahi semua video' };
  const Icon = meta.icon;

  return (
    <div className="min-h-screen bg-background pt-24 md:pt-28 pb-16">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-2">
            <Icon className="w-6 h-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{meta.label}</h1>
          </div>
          <p className="text-muted-foreground">{meta.description}</p>
        </motion.div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-video bg-secondary rounded-lg" />
                <div className="mt-2 h-4 bg-secondary rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : videos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {videos.map((video, index) => (
              <div key={video.id} className="w-full">
                <VideoCard video={video} index={index} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Film className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Belum ada video</h3>
            <p className="text-muted-foreground">
              Kategori ini masih kosong. Tambahkan video baru.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}