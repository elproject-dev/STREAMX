import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Favorites as FavoritesStore } from '@/lib/favorites';
import { useAuth } from '@/lib/AuthContext';

const FavoritesContext = createContext();

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState([]);
  const { user } = useAuth();

  const refresh = useCallback(async () => {
    const data = await FavoritesStore.getAll();
    setFavorites(data);
  }, []);

  useEffect(() => {
    if (user) {
      refresh();
    } else {
      setFavorites([]);
    }
  }, [user, refresh]);

  const toggle = useCallback(async (video) => {
    const added = await FavoritesStore.toggle(video);
    await refresh();
    return added;
  }, [refresh]);

  const remove = useCallback(async (videoId) => {
    await FavoritesStore.remove(videoId);
    await refresh();
  }, [refresh]);

  const clear = useCallback(async () => {
    // Supabase tidak ada clear all per user secara eksplisit di store tapi kita bisa buat
    // Untuk saat ini kita asumsikan FavoritesStore.remove per item atau clear method di store
    setFavorites([]);
  }, []);

  const isFavorite = useCallback((videoId) => {
    return favorites.some(f => f?.id === videoId);
  }, [favorites]);

  return (
    <FavoritesContext.Provider value={{ favorites, toggle, remove, clear, isFavorite, refresh }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
