import React from 'react';
import { Star, Film } from 'lucide-react';
import VideoRow from '@/components/home/VideoRow';
import { useFavorites } from '@/lib/FavoritesContext';
import { useLanguage } from '@/lib/i18n';
import { toast } from 'sonner';

export default function FavoritesPage() {
  const { favorites, clear } = useFavorites();
  const { t } = useLanguage();

  const handleClearAll = () => {
    clear();
    toast.success(t('favorites.cleared'));
  };

  return (
    <div className="min-h-screen bg-background pt-20 md:pt-24 pb-20">
      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Film className="w-10 h-10 text-muted-foreground/40" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">{t('favorites.empty')}</h3>
          <p className="text-muted-foreground max-w-md">
            {t('favorites.empty_desc')}
          </p>
        </div>
      ) : (
        <VideoRow
          title={`${t('favorites.title')} (${favorites.length})`}
          videos={favorites}
          icon={Star}
          isSlider={false}
          showDecorLine={false}
          extraHeader={
            <button
              onClick={handleClearAll}
              className="px-2.5 py-1 md:px-4 md:py-1.5 text-[10px] md:text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
            >
              {t('favorites.clear')}
            </button>
          }
        />
      )}
    </div>
  );
}
