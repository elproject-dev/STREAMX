import React, { useEffect, useState } from 'react';
import { VideoStore } from '@/lib/videoStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Flame, Clock, Film, Plus, Search, X, Star } from 'lucide-react';
import VideoRow from '@/components/home/VideoRow';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/lib/FavoritesContext';
import { useLanguage } from '@/lib/i18n';

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
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const queryClient = useQueryClient();
  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['videos'],
    queryFn: () => VideoStore.list('-created_date', 100),
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(homeSearchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [homeSearchQuery]);

  const normalizedSearchQuery = debouncedSearchQuery.trim().toLowerCase();
  const isSearching = normalizedSearchQuery.length > 0;
  const { data: databaseSearchVideos = [], isFetching: isSearchingVideos } = useQuery({
    queryKey: ['videos-home-search', normalizedSearchQuery],
    queryFn: () => VideoStore.search(normalizedSearchQuery),
    enabled: isSearching,
  });

  useEffect(() => {
    VideoStore.migrateScores().then((changed) => {
      if (changed) {
        queryClient.invalidateQueries({ queryKey: ['videos'] });
        queryClient.refetchQueries({ queryKey: ['videos'] });
      }
    });
  }, []);

  const [todayPicks, setTodayPicks] = useState([]);

  useEffect(() => {
    if (videos.length > 0 && todayPicks.length === 0) {
      setTodayPicks(shuffleArray([...videos]).slice(0, 21));
    }
  }, [videos]);

  const { favorites: favoriteVideos } = useFavorites();
  const { t } = useLanguage();

  if (isLoading) return <LoadingSkeleton />;

  // Helper function to shuffle array
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const searchResultVideos = isSearching ? databaseSearchVideos : videos;

  const recentVideos = todayPicks.length > 0 ? todayPicks : shuffleArray([...videos]).slice(0, 21);
  const popularVideos = [...searchResultVideos].sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
  const newlyAddedVideos = [...videos].sort((a, b) => Number(new Date(b.created_date)) - Number(new Date(a.created_date)));

  if (videos.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -right-1/4 w-[500px] h-[500px] bg-primary/3 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative text-center px-6 max-w-lg"
        >
          <div className="relative inline-block mb-8">
            <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Film className="w-14 h-14 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Plus className="w-4 h-4 text-primary" />
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            {t('home.no_videos')}
          </h1>
          <p className="text-muted-foreground text-base md:text-lg mb-8 leading-relaxed">
            {t('home.no_videos_desc')}
          </p>

        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-20 md:pt-24 pb-10">
        {/* Search Header */}
        <div className="w-full px-4 md:px-10 mb-8 flex flex-col items-start gap-1">
          <div className="relative w-full max-w-full">
            <Input
              value={homeSearchQuery}
              onChange={(e) => setHomeSearchQuery(e.target.value)}
              placeholder={t('home.search_placeholder')}
              className="pl-4 h-11 bg-card/50 backdrop-blur-sm border-white/10 focus:border-primary/50 transition-all rounded-xl text-left"
            />
            {homeSearchQuery && (
              <button 
                onClick={() => setHomeSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          {homeSearchQuery && (
            <p className="text-sm text-muted-foreground mt-2 animate-in fade-in slide-in-from-top-1 px-1">
              {isSearchingVideos
                ? t('home.searching')
                : t('home.search_results', { count: searchResultVideos.length, query: homeSearchQuery })}
            </p>
          )}
        </div>

        {popularVideos.length > 0 && (
          <VideoRow title={t('home.popular')} videos={popularVideos} icon={Flame} isSlider={true} />
        )}

        {recentVideos.length > 0 && (
          <VideoRow title={t('home.today_pick')} videos={recentVideos} icon={Clock} isSlider={false} />
        )}

        {newlyAddedVideos.length > 0 && (
          <VideoRow title={t('home.newly_added')} videos={newlyAddedVideos} icon={Clock} isSlider={true} />
        )}

        {favoriteVideos.length > 0 && (
          <VideoRow title={t('home.my_favorites')} videos={favoriteVideos} icon={Star} isSlider={true} />
        )}

        {isSearching && searchResultVideos.length === 0 && videos.length > 0 && (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-xl font-bold text-foreground mb-2">{t('home.no_results')}</h3>
            <p className="text-muted-foreground mb-6">
              {t('home.no_results_desc', { query: homeSearchQuery })}
            </p>
            <Button 
              variant="outline" 
              onClick={() => setHomeSearchQuery('')}
              className="rounded-full"
            >
              {t('home.clear_search')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
