import { supabase } from './supabase';

const STORAGE_KEY = 'streamx_videos';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';
const OMDB_API_KEY = '5e9c0c32'; // Menggunakan API Key yang lebih stabil

function getTmdbFetchOptions() {
  const env = import.meta.env;
  const bearer = env.VITE_TMDB_BEARER_TOKEN;
  const apiKey = env.VITE_TMDB_API_KEY;
  if (bearer) {
    return {
      type: 'bearer',
      fetch: (path) => fetch(`${TMDB_BASE}${path}`, {
        headers: { Authorization: `Bearer ${bearer}` },
      }),
    };
  }
  if (apiKey) {
    return {
      type: 'key',
      fetch: (path) => {
        const url = new URL(`${TMDB_BASE}${path}`);
        url.searchParams.set('api_key', apiKey);
        return fetch(url.toString());
      },
    };
  }
  return null;
}

export async function fetchTmdbData(tmdbId, contentType) {
  if (!tmdbId) return {};
  try {
    const tmdb = getTmdbFetchOptions();
    if (!tmdb) return {};
    
    // Try the primary endpoint first, then fallback to the other type if 404
    const primaryEndpoint = contentType === 'tv' ? `/tv/${tmdbId}` : `/movie/${tmdbId}`;
    const fallbackEndpoint = contentType === 'tv' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
    
    let res = await tmdb.fetch(primaryEndpoint);
    if (!res.ok && res.status === 404) {
      res = await tmdb.fetch(fallbackEndpoint);
    }
    if (!res.ok) return {};
    const data = await res.json();
    const result = {};
    if (data.backdrop_path) result.backdrop_url = `${TMDB_IMG}/w1280${data.backdrop_path}`;
    if (data.poster_path) result.poster_url = `${TMDB_IMG}/w300_and_h450_face${data.poster_path}`;
    if (data.overview && !data.description) result.description = data.overview;
    if (data.title || data.name) result.title = data.title || data.name;
    if (data.genres?.length) result.genre = data.genres.map(g => g.name).join(', ');
    if (data.release_date || data.first_air_date) result.year = (data.release_date || data.first_air_date).split('-')[0];
    if (data.runtime) result.duration = `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m`;
    if (data.vote_average !== undefined && data.vote_average !== null) result.score = Math.round(data.vote_average * 10) / 10;

    // Age Rating
    try {
      const ratingEndpoint = contentType === 'tv' ? `/tv/${tmdbId}/content_ratings` : `/movie/${tmdbId}/release_dates`;
      const ratingRes = await tmdb.fetch(ratingEndpoint);
      if (ratingRes.ok) {
        const ratingData = await ratingRes.json();
        if (contentType === 'tv') {
          const usRating = ratingData.results?.find(r => r.iso_3166_1 === 'US');
          if (usRating?.rating) result.rating = usRating.rating;
        } else {
          const usRelease = ratingData.results?.find(r => r.iso_3166_1 === 'US');
          const certification = usRelease?.release_dates?.find(r => r.certification)?.certification;
          if (certification) result.rating = certification;
        }
      }
    } catch {}

    // IMDb Rating
    try {
      const extEndpoint = contentType === 'tv' ? `/tv/${tmdbId}/external_ids` : `/movie/${tmdbId}/external_ids`;
      const extRes = await tmdb.fetch(extEndpoint);
      if (extRes.ok) {
        const extData = await extRes.json();
        if (extData.imdb_id) {
          const omdbRes = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${extData.imdb_id}`);
          if (omdbRes.ok) {
            const omdbData = await omdbRes.json();
            // Cek jika response OMDB sukses
            if (omdbData.Response !== "False") {
              if (omdbData.imdbRating && omdbData.imdbRating !== 'N/A') {
                result.imdb_score = parseFloat(omdbData.imdbRating);
                result.imdb_votes = omdbData.imdbVotes?.replace(/,/g, '') || '';
              }
              if (omdbData.Rated && omdbData.Rated !== 'N/A' && !result.rating) result.rating = omdbData.Rated;
            }
          }
        }
      }
    } catch (err) {
      console.warn('OMDB Fetch Error:', err);
    }

    return result;
  } catch { return {}; }
}

export const VideoStore = {
  async list(sort = '-created_at', limit = 21, pageParam = 0) {
    let query = supabase.from('videos').select('*');
    
    const desc = sort.startsWith('-');
    const column = sort.replace('-', '');
    const finalColumn = column === 'created_date' ? 'created_at' : column;
    query = query.order(finalColumn, { ascending: !desc });
    
    if (limit) {
      const from = pageParam * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching videos:', error);
      return [];
    }
    return data;
  },

  async search(keyword, sort = '-view_count', limit = 21, pageParam = 0) {
    const q = String(keyword || '').trim();
    if (!q) return [];

    const escaped = q.replace(/[%_]/g, '\\$&').replace(/[(),]/g, ' ');
    const pattern = `%${escaped}%`;
    const searchColumns = [
      `title.ilike.${pattern}`,
      `description.ilike.${pattern}`,
      `genre.ilike.${pattern}`,
      `category.ilike.${pattern}`,
    ];
    if (/^\d+$/.test(q)) {
      searchColumns.push(`year.eq.${q}`);
    }
    const desc = sort.startsWith('-');
    const column = sort.replace('-', '');
    const finalColumn = column === 'created_date' ? 'created_at' : column;

    let query = supabase
      .from('videos')
      .select('*')
      .or(searchColumns.join(','))
      .order(finalColumn, { ascending: !desc });

    if (limit) {
      const from = pageParam * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error searching videos:', error);
      return [];
    }

    return data || [];
  },

  async filter(filters, sort = '-created_at', limit = 21, pageParam = 0) {
    let query = supabase.from('videos').select('*');
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const desc = sort.startsWith('-');
    const column = sort.replace('-', '');
    const finalColumn = column === 'created_date' ? 'created_at' : column;
    query = query.order(finalColumn, { ascending: !desc });
    
    if (limit) {
      const from = pageParam * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('Error filtering videos:', error);
      return [];
    }
    return data;
  },

  async get(id) {
    const { data, error } = await supabase.from('videos').select('*').eq('id', id).single();
    if (error) return null;
    return data;
  },

  async create(data) {
    const { data: newVideo, error } = await supabase.from('videos').insert([data]).select().single();
    if (error) throw error;
    return newVideo;
  },

  async update(id, data) {
    const { data: updatedVideo, error } = await supabase.from('videos').update(data).eq('id', id).select().single();
    if (error) throw error;
    return updatedVideo;
  },

  async delete(id) {
    const { error } = await supabase.from('videos').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  async migrateScores() { return false; }, // Supabase handles this or we do it during ingest

  uploadFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ file_url: reader.result });
      reader.readAsDataURL(file);
    });
  },

  async searchSubtitles(tmdbId, contentType, season = 1, episode = 1) {
    try {
      const apiKey = import.meta.env.VITE_OPENSUBTITLES_API_KEY;
      if (!apiKey) {
        console.warn('VITE_OPENSUBTITLES_API_KEY is not set');
        return [];
      }

      const subtitleLang = localStorage.getItem('streamx_subtitle_lang') || 'id';
      const params = new URLSearchParams({
        tmdb_id: tmdbId,
        languages: subtitleLang,
        type: contentType === 'tv' ? 'episode' : 'movie'
      });

      if (contentType === 'tv') {
        params.append('season_number', season);
        params.append('episode_number', episode);
      }

      const response = await fetch(`https://api.opensubtitles.com/api/v1/subtitles?${params.toString()}`, {
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'StreamX v1.0'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch subtitles');
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error searching subtitles:', error);
      return [];
    }
  },

  async getSubtitleDownloadLink(fileId) {
    try {
      const apiKey = import.meta.env.VITE_OPENSUBTITLES_API_KEY;
      const response = await fetch('https://api.opensubtitles.com/api/v1/download', {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'StreamX v1.0'
        },
        body: JSON.stringify({ file_id: fileId })
      });

      if (!response.ok) throw new Error('Failed to get download link');
      const data = await response.json();
      return data.link;
    } catch (error) {
      console.error('Error getting download link:', error);
      return null;
    }
  }
};
