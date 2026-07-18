import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load env from .env.local
dotenv.config({ path: '.env.local' });
console.clear();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const tmdbBearer = process.env.VITE_TMDB_BEARER_TOKEN;
const tmdbApiKey = process.env.VITE_TMDB_API_KEY;
const omdbApiKey = '5e9c0c32'; // Sesuai dengan konfigurasi proyek Anda

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Kredensial Supabase tidak ditemukan di .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// SCRIPT UPLOAD DARI CSV (BATCH & VALIDASI)
// ==========================================

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

const CONCURRENCY_LIMIT = 5; // Memproses 5 ID sekaligus

async function fetchFromTmdb(apiPath) {
  const url = tmdbBearer
    ? `${TMDB_BASE}${apiPath}`
    : `${TMDB_BASE}${apiPath}${apiPath.includes('?') ? '&' : '?'}api_key=${tmdbApiKey}`;

  const headers = tmdbBearer ? { Authorization: `Bearer ${tmdbBearer}` } : {};

  const res = await fetch(url, { headers });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`TMDB error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

async function getMovieData(tmdbId) {
  const data = await fetchFromTmdb(`/movie/${tmdbId}`);
  if (!data) return null;

  const result = {
    tmdb_id: tmdbId.toString(),
    content_type: 'movie',
    category: 'film',
  };

  if (data.backdrop_path) result.backdrop_url = `${TMDB_IMG}/w1280${data.backdrop_path}`;
  if (data.poster_path) {
    const poster = `${TMDB_IMG}/w300_and_h450_face${data.poster_path}`;
    result.poster_url = poster;
    result.thumbnail_url = poster;
  }
  if (data.overview) result.description = data.overview;
  if (data.title) result.title = data.title;
  if (data.genres?.length) result.genre = data.genres.map(g => g.name).join(', ');
  if (data.release_date) result.year = Number(data.release_date.split('-')[0]);
  if (data.runtime) result.duration = `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m`;
  if (data.vote_average != null) result.score = Math.round(data.vote_average * 10) / 10;

  try {
    const ratingData = await fetchFromTmdb(`/movie/${tmdbId}/release_dates`);
    if (ratingData) {
      const usRelease = ratingData.results?.find(r => r.iso_3166_1 === 'US');
      const certification = usRelease?.release_dates?.find(r => r.certification)?.certification;
      if (certification) result.rating = certification;
    }
  } catch (e) {}

  try {
    const extData = await fetchFromTmdb(`/movie/${tmdbId}/external_ids`);
    if (extData && extData.imdb_id) {
      const omdbRes = await fetch(`https://www.omdbapi.com/?apikey=${omdbApiKey}&i=${extData.imdb_id}`);
      if (omdbRes.ok) {
        const omdbData = await omdbRes.json();
        if (omdbData.Response !== "False") {
          if (omdbData.imdbRating && omdbData.imdbRating !== 'N/A') {
            result.imdb_score = parseFloat(omdbData.imdbRating);
            result.imdb_votes = omdbData.imdbVotes?.replace(/,/g, '') || '';
          }
          if (omdbData.Rated && omdbData.Rated !== 'N/A' && !result.rating) {
            result.rating = omdbData.Rated;
          }
        }
      }
    }
  } catch (e) {}

  return result;
}

async function checkVidsrcAvailability(tmdbId, contentType) {
  try {
    const baseUrl = 'https://vidsrcme.ru/embed/';
    const checkUrl = contentType === 'tv'
      ? `${baseUrl}tv?tmdb=${tmdbId}&season=1&episode=1`
      : `${baseUrl}movie?tmdb=${tmdbId}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(checkUrl, {
      signal: controller.signal,
      headers: { 'Referer': 'https://vidsrcme.ru/' }
    });

    clearTimeout(timeoutId);

    if (response.status === 404) return false;
    const text = await response.text();
    if (text.toLowerCase().includes('unavailable')) return false;

    return true;
  } catch (err) {
    return false;
  }
}

// Fungsi Batching untuk Parallel Processing
async function processInBatches(items, batchSize, processor) {
  let results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchPromises = batch.map(processor);
    const batchResults = await Promise.all(batchPromises);
    results = results.concat(batchResults);
    // Tambahkan sedikit delay antar batch agar tidak kena rate limit
    await new Promise(r => setTimeout(r, 300));
  }
  return results;
}

async function run() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  console.log("==========================================");
  console.log("🚀 UPLOAD DARI CSV (DENGAN VALIDASI VIDSRC)");
  console.log("==========================================\n");

  const csvFileName = 'popular_movies.csv';
  const csvPath = path.join(process.cwd(), csvFileName);

  if (!fs.existsSync(csvPath)) {
    console.error(`\n❌ Error: File ${csvFileName} tidak ditemukan di folder root.`);
    rl.close();
    process.exit(1);
  }

  console.log(`\n📂 Membaca file ${csvFileName}...`);
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  
  // Memecah baris CSV dan mengambil ID (melewati baris pertama sebagai header)
  const lines = fileContent.split('\n').filter(line => line.trim().length > 0);
  const movieIds = [];
  
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols[0] && !isNaN(parseInt(cols[0], 10))) {
      movieIds.push(parseInt(cols[0], 10));
    }
  }

  if (movieIds.length === 0) {
    console.log(`\n❌ Tidak ditemukan TMDB ID di dalam file CSV.`);
    rl.close();
    return;
  }

  console.log(`✅ Ditemukan ${movieIds.length} ID untuk diproses.`);
  console.log(`\n⏳ Memulai upload paralel (Batch size: ${CONCURRENCY_LIMIT})...\n`);

  let successCount = 0;
  let duplicateCount = 0;
  let notFoundVidsrcCount = 0;
  let errorCount = 0;

  await processInBatches(movieIds, CONCURRENCY_LIMIT, async (id) => {
    try {
      // 1. Cek duplikasi di Supabase
      const { data: existing } = await supabase
        .from('videos')
        .select('id, title')
        .eq('tmdb_id', id.toString())
        .maybeSingle();

      if (existing) {
        process.stdout.write('⏭️ '); // Duplikat
        duplicateCount++;
        return;
      }

      // 2. Fetch full metadata dari TMDB
      const movieData = await getMovieData(id);
      if (!movieData) {
        process.stdout.write('❌'); // Error fetch TMDB
        errorCount++;
        return;
      }

      // 3. Validasi ke server Vidsrc
      const isAvailable = await checkVidsrcAvailability(id, movieData.content_type);
      if (!isAvailable) {
        process.stdout.write('🚫'); // Tidak tersedia di Vidsrc
        notFoundVidsrcCount++;
        return;
      }

      // 4. Insert data ke Database (Supabase)
      const { error } = await supabase.from('videos').insert([movieData]);
      if (error) {
        process.stdout.write('⚠️'); // Error saat insert database
        errorCount++;
        return;
      }

      process.stdout.write('✅'); // Upload Sukses
      successCount++;
    } catch (err) {
      process.stdout.write('❌');
      errorCount++;
    }
  });

  // Laporan Akhir
  console.log(`\n\n==========================================`);
  console.log(`📊 LAPORAN UPLOAD CSV KE DATABASE`);
  console.log(`==========================================`);
  console.log(`Total File CSV   : ${movieIds.length}`);
  console.log(`✅ Berhasil Diupload  : ${successCount}`);
  console.log(`⏭️  Sudah Ada (Duplikat) : ${duplicateCount}`);
  console.log(`🚫 Tidak Ada di Vidsrc : ${notFoundVidsrcCount}`);
  console.log(`❌ Error Sistem       : ${errorCount}`);
  console.log(`==========================================\n`);
  
  rl.close();
}

run();
