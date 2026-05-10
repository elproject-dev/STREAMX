import { supabase } from './supabase';

const MAX_ITEMS = 50;

export const WatchHistory = {
  async getAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('watch_history')
      .select('video_id, videos(*)')
      .eq('user_id', user.id)
      .order('watched_at', { ascending: false })
      .limit(MAX_ITEMS);

    if (error) {
      console.error('Error fetching history:', error);
      return [];
    }

    return data.map(h => h.videos).filter(Boolean);
  },

  async add(video) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !video?.id) return;

    // Hapus dulu jika sudah ada agar bisa ditaruh di paling atas (update watched_at)
    await supabase
      .from('watch_history')
      .delete()
      .eq('user_id', user.id)
      .eq('video_id', video.id);

    const { error } = await supabase
      .from('watch_history')
      .insert({ user_id: user.id, video_id: video.id });

    if (error) console.error('Error adding to history:', error);
  },

  async remove(videoId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('watch_history')
      .delete()
      .eq('user_id', user.id)
      .eq('video_id', videoId);

    if (error) console.error('Error removing from history:', error);
  },

  async clear() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('watch_history')
      .delete()
      .eq('user_id', user.id);

    if (error) console.error('Error clearing history:', error);
  }
};
