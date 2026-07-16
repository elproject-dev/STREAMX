import React, { useEffect, useState, useRef } from 'react';
import { VideoStore } from '@/lib/videoStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Flame, Clock, Film, Plus, Search, X, Star } from 'lucide-react';
import VideoRow from '@/components/home/VideoRow';
import UpdateChecker from '@/components/layout/UpdateChecker';
import PullToRefresh from '@/components/ui/PullToRefresh';
import WelcomePopup from '@/components/ui/WelcomePopup';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/lib/FavoritesContext';
import { useLanguage } from '@/lib/i18n';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { toast } from 'sonner';

let cachedTodayPicks = null;
let cachedPopularVideos = null;

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background pt-20 md:pt-24">
      <div className="w-full px-4 md:px-10 mb-8">
        <Skeleton className="w-full h-11 rounded-xl" />
      </div>
      <div className="w-full px-4 md:px-10 space-y-10 overflow-hidden">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <Skeleton className="w-48 h-6 mb-4" />
            <div className="flex gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                <Skeleton key={j} className="w-[calc(33.333%-10.7px)] sm:w-[calc(25%-12px)] lg:w-[calc(25%-18px)] xl:w-[calc(16.666%-20px)] 2xl:w-[calc(14.285%-20.6px)] aspect-[2/3] rounded-lg shrink-0" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper function to shuffle array
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function Home() {
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const limit = typeof window !== 'undefined' && window.innerWidth >= 1536 ? 28 : 24;

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['videos'],
    queryFn: () => VideoStore.list('-created_date', 100),
    staleTime: 5 * 60 * 1000, // Anggap data fresh selama 5 menit
    gcTime: 10 * 60 * 1000, // Simpan di cache memory selama 10 menit
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Jangan fetch ulang saat pindah-pindah halaman
  });

  const lastBackPressTime = useRef(0);
  const handleRefreshRef = useRef(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backListener = null;

    const setupListener = async () => {
      backListener = await CapacitorApp.addListener('backButton', () => {
        const currentTime = new Date().getTime();
        if (currentTime - lastBackPressTime.current < 2000) {
          CapacitorApp.exitApp();
        } else {
          toast(t('home.press_back_again') || 'Tekan sekali lagi untuk keluar', {
            style: { justifyContent: 'center', textAlign: 'center' }
          });
          lastBackPressTime.current = currentTime;
          
          // Refresh konten saat tekan back (mengacak ulang film)
          if (handleRefreshRef.current) {
            handleRefreshRef.current();
            // Scroll ke atas dengan halus
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
      });
    };

    setupListener();

    return () => {
      if (backListener) {
        backListener.remove();
      }
    };
  }, [t]);

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

  const [todayPicks, setTodayPicks] = useState(cachedTodayPicks || []);
  const [popularPicks, setPopularPicks] = useState(cachedPopularVideos || []);

  useEffect(() => {
    if (videos.length > 0 && (!cachedTodayPicks || cachedTodayPicks.length === 0)) {
      cachedTodayPicks = shuffleArray([...videos]).slice(0, limit);
      setTodayPicks(cachedTodayPicks);
    }

    // Cache Most Popular agar tidak berubah-ubah posisinya jika view_count sama
    if (videos.length > 0 && (!cachedPopularVideos || cachedPopularVideos.length === 0)) {
      // Sort berdasarkan view_count, lalu fallback ke created_date agar urutannya selalu stabil
      cachedPopularVideos = [...videos].sort((a, b) => {
        if ((b.view_count || 0) === (a.view_count || 0)) {
          return Number(new Date(b.created_date)) - Number(new Date(a.created_date));
        }
        return (b.view_count || 0) - (a.view_count || 0);
      }).slice(0, 21);
      setPopularPicks(cachedPopularVideos);
    }
  }, [videos]);

  // Simpan posisi scroll vertikal layar (Window)
  useEffect(() => {
    let timeout;
    const handleScroll = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        sessionStorage.setItem('home_scroll_y', window.scrollY);
      }, 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  // Kembalikan posisi scroll vertikal saat data sudah siap
  useEffect(() => {
    if (videos.length > 0) {
      const savedScrollY = sessionStorage.getItem('home_scroll_y');
      if (savedScrollY) {
        // Beri sedikit jeda agar DOM benar-benar selesai dirender sebelum scroll
        setTimeout(() => {
          window.scrollTo({ top: parseInt(savedScrollY, 10), behavior: 'instant' });
        }, 100);
      }
    }
  }, [videos.length]);

  const { favorites: favoriteVideos } = useFavorites();

  const handleRefresh = async () => {
    // Segarkan data dari server
    await queryClient.refetchQueries({ queryKey: ['videos'] });
    
    // Acak ulang "Today's Picks" secara instan
    if (videos.length > 0) {
      cachedTodayPicks = shuffleArray([...videos]).slice(0, limit);
      setTodayPicks(cachedTodayPicks);
    }
  };

  // Update ref agar selalu mengarah ke fungsi handleRefresh terbaru yang memiliki akses closure ke videos
  useEffect(() => {
    handleRefreshRef.current = handleRefresh;
  }, [handleRefresh]);

  if (isLoading) return <LoadingSkeleton />;

  const searchResultVideos = isSearching ? databaseSearchVideos : videos;

  const recentVideos = todayPicks.length > 0 ? todayPicks : shuffleArray([...videos]).slice(0, limit);

  // Gunakan cache untuk popular jika sedang tidak mencari, gunakan data live jika sedang mencari
  const popularVideos = isSearching
    ? [...searchResultVideos].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 15)
    : (popularPicks.length > 0 ? popularPicks : [...videos].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 15));

  const newlyAddedVideos = [...videos].sort((a, b) => Number(new Date(b.created_date)) - Number(new Date(a.created_date))).slice(0, 15);

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
    <>
      <WelcomePopup />
      <PullToRefresh onRefresh={handleRefresh}>
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
            <VideoRow title={t('home.popular')} videos={popularVideos} icon={Flame} isSlider={true} isFirstRow={true} />
          )}

          {recentVideos.length > 0 && (
            <VideoRow title={t('home.today_pick')} videos={recentVideos} icon={Clock} isSlider={false} isFirstRow={popularVideos.length === 0} />
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
    </PullToRefresh>
    </>
  );
}
