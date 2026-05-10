import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { WatchHistory as WatchHistoryStore } from '@/lib/watchHistory';
import { useAuth } from '@/lib/AuthContext';

const WatchHistoryContext = createContext();

export function WatchHistoryProvider({ children }) {
  const [history, setHistory] = useState([]);
  const { user } = useAuth();

  const refresh = useCallback(async () => {
    const data = await WatchHistoryStore.getAll();
    setHistory(data);
  }, []);

  useEffect(() => {
    if (user) {
      refresh();
    } else {
      setHistory([]);
    }
  }, [user, refresh]);

  const add = useCallback(async (video) => {
    await WatchHistoryStore.add(video);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (videoId) => {
    await WatchHistoryStore.remove(videoId);
    await refresh();
  }, [refresh]);

  const clear = useCallback(async () => {
    await WatchHistoryStore.clear();
    setHistory([]);
  }, []);

  return (
    <WatchHistoryContext.Provider value={{ history, add, remove, clear, refresh }}>
      {children}
    </WatchHistoryContext.Provider>
  );
}

export function useWatchHistory() {
  const ctx = useContext(WatchHistoryContext);
  if (!ctx) throw new Error('useWatchHistory must be used within WatchHistoryProvider');
  return ctx;
}
