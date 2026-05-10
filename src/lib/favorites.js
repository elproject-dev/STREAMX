import { supabase } from './supabase';

export const Favorites = {
  async getAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('favorites')
      .select('video_id, videos(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching favorites:', error);
      return [];
    }
    
    // Kembalikan format data video yang sama seperti sebelumnya
    return data.map(f => f.videos).filter(Boolean);
  },

  async isFavorite(videoId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('video_id', videoId)
      .single();

    return !!data;
  },

  async add(video) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !video?.id) return;

    const { error } = await supabase
      .from('favorites')
      .upsert({ user_id: user.id, video_id: video.id });

    if (error) console.error('Error adding favorite:', error);
  },

  async remove(videoId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('video_id', videoId);

    if (error) console.error('Error removing favorite:', error);
  },

  async toggle(video) {
    const isFav = await this.isFavorite(video.id);
    if (isFav) {
      await this.remove(video.id);
      return false;
    } else {
      await this.add(video);
      return true;
    }
  }
};
