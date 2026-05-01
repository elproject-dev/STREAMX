import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Flame, Clock, Film, Tv, BookOpen, Sparkles } from 'lucide-react';
import HeroBanner from '@/components/home/HeroBanner';
import VideoRow from '@/components/home/VideoRow';
import { Skeleton } from '@/components/ui/skeleton';

const categoryConfig = {
  film: { label: 'Film', icon: Film },
  series: { label: 'Series', icon: Tv },
  documentary: { label: 'Dokumenter', icon: BookOpen },
  animation: { label: 'Animasi', icon: Sparkles },
  short_film: { label: 'Film Pendek', icon: Film },
  music_video: { label: 'Video Musik', icon: Film },
};

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <Skeleton className="w-full h-[70vh] rounded-none" />
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 mt-8 space-y-10">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <Skeleton className="w-48 h-6 mb-4" />
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5].map((j) => (
                <Skeleton key={j} className="w-[240px] h-[135px] rounded-lg shrink-0" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['videos'],
    queryFn: () => base44.entities.Video.list('-created_date', 100),
  });

  if (isLoading) return <LoadingSkeleton />;

  const featuredVideo = videos.find(v => v.is_featured) || videos[0];
  const recentVideos = [...videos].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 15);
  const popularVideos = [...videos].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 15);

  // Group by category
  const categories = {};
  videos.forEach(v => {
    if (v.category) {
      if (!categories[v.category]) categories[v.category] = [];
      categories[v.category].push(v);
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <HeroBanner video={featuredVideo} />

      <div className="-mt-16 relative z-10 pb-20">
        {recentVideos.length > 0 && (
          <VideoRow title="Baru Ditambahkan" videos={recentVideos} icon={Clock} />
        )}

        {popularVideos.length > 0 && (
          <VideoRow title="Paling Populer" videos={popularVideos} icon={Flame} />
        )}

        {Object.entries(categories).map(([cat, catVideos]) => {
          const config = categoryConfig[cat] || { label: cat, icon: Film };
          return (
            <VideoRow
              key={cat}
              title={config.label}
              videos={catVideos}
              icon={config.icon}
            />
          );
        })}

        {videos.length === 0 && (
          <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-20 text-center">
            <Film className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Belum Ada Video</h2>
            <p className="text-muted-foreground mb-6">
              Mulai tambahkan video dari Google Drive untuk membangun koleksi Anda.
            </p>
            <a
              href="/manage"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-colors"
            >
              Tambah Video
            </a>
          </div>
        )}
      </div>
    </div>
  );
}