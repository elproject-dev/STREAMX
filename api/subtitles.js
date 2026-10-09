import { search, configure } from 'wyzie-lib';

configure({ key: process.env.WYZIE_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { tmdb_id, season, episode, language } = req.query;

    if (!tmdb_id) {
      return res.status(400).json({ error: 'tmdb_id is required' });
    }

    const searchParams = {
      tmdb_id: parseInt(tmdb_id),
      language: language || 'en',
    };
    
    if (season) searchParams.season = parseInt(season);
    if (episode) searchParams.episode = parseInt(episode);

    const results = await search(searchParams);
    res.status(200).json(results);
  } catch (error) {
    console.error('Wyzie API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
