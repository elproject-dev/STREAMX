import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import readline from 'readline';
import http from 'http';
import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
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
const omdbApiKey = '5e9c0c32'; // Sesuai di sistem sebelumnya

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Kredensial Supabase tidak ditemukan di .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// SCRIPT IMPORT MOVIES ADVANCED (CEPAT & KATEGORI)
// ==========================================

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

const CONCURRENCY_LIMIT = 5; // Jumlah proses yang berjalan bersamaan (jangan terlalu tinggi agar tidak diblokir API)

const GENRES = {
  'action': 28, 'adventure': 12, 'animation': 16, 'comedy': 35,
  'crime': 80, 'documentary': 99, 'drama': 18, 'family': 10751,
  'fantasy': 14, 'history': 36, 'horror': 27, 'music': 10402,
  'mystery': 9648, 'romance': 10749, 'science fiction': 878,
  'tv movie': 10770, 'thriller': 53, 'war': 10752, 'western': 37
};

async function fetchFromTmdb(path) {
  const url = tmdbBearer
    ? `${TMDB_BASE}${path}`
    : `${TMDB_BASE}${path}${path.includes('?') ? '&' : '?'}api_key=${tmdbApiKey}`;

  const headers = tmdbBearer ? { Authorization: `Bearer ${tmdbBearer}` } : {};

  const res = await fetch(url, { headers });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`TMDB error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

async function getMovieData(tmdbId, targetGenreId = null) {
  const data = await fetchFromTmdb(`/movie/${tmdbId}`);
  if (!data) return null;

  // Filter berdasarkan Kategori (Genre) jika ditentukan
  if (targetGenreId) {
    const hasGenre = data.genres && data.genres.some(g => g.id === targetGenreId);
    if (!hasGenre) return { skip: true, reason: 'Kategori tidak cocok' };
  }

  const result = {
    tmdb_id: tmdbId.toString(),
    content_type: 'movie',
    category: 'film', // auto category for movie
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

  // Age Rating (US Certification)
  try {
    const ratingData = await fetchFromTmdb(`/movie/${tmdbId}/release_dates`);
    if (ratingData) {
      const usRelease = ratingData.results?.find(r => r.iso_3166_1 === 'US');
      const certification = usRelease?.release_dates?.find(r => r.certification)?.certification;
      if (certification) result.rating = certification;
    }
  } catch (e) {}

  // OMDB / IMDB Score
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

function getTmdbExportDate() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}_${dd}_${yyyy}`;
}

async function fetchValidIdsFromExport(startId, endId, minPopularity = 0) {
  const dateStr = getTmdbExportDate();
  const filename = `movie_ids_${dateStr}.json.gz`;
  const url = `http://files.tmdb.org/p/exports/${filename}`;

  const tempDir = path.join(__dirname, '..', 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  const filePath = path.join(tempDir, filename);

  const ObjectList = fs.readdirSync(tempDir);
  for (const file of ObjectList) {
    if (file !== filename && file.startsWith('movie_ids_')) {
      fs.unlinkSync(path.join(tempDir, file));
    }
  }

  if (!fs.existsSync(filePath)) {
    console.log(`\n📥 Mengunduh daftar ID TMDB terbaru (${filename})...`);
    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filePath);
      http.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Gagal mengunduh file TMDB. Status: ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => file.close(resolve));
      }).on('error', (err) => fs.unlink(filePath, () => reject(err)));
    });
    console.log(`✅ Berhasil mengunduh daftar ID TMDB.\n`);
  }

  console.log(`🔍 Mengekstrak & memfilter ID yang valid di rentang ${startId} - ${endId}...`);

  const validIds = [];
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath);
    const gunzip = zlib.createGunzip();
    const rlStream = readline.createInterface({
      input: fileStream.pipe(gunzip),
      crlfDelay: Infinity
    });

    rlStream.on('line', (line) => {
      try {
        const obj = JSON.parse(line);
        if (obj.id >= startId && obj.id <= endId && (obj.popularity || 0) >= minPopularity) {
          validIds.push(obj.id);
        }
      } catch (e) {}
    });

    rlStream.on('close', () => resolve(validIds.sort((a, b) => a - b)));
    rlStream.on('error', reject);
    fileStream.on('error', reject);
    gunzip.on('error', reject);
  });
}

// Fungsi Batching untuk Parallel Processing
async function processInBatches(items, batchSize, processor) {
  let results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchPromises = batch.map(processor);
    const batchResults = await Promise.all(batchPromises);
    results = results.concat(batchResults);
    // Tambahkan sedikit delay antar batch untuk menghindari rate limit
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
  console.log("🎬 ADVANCED TMDB MOVIE IMPORTER");
  console.log("==========================================\n");

  const startIdStr = await question('1. Masukkan TMDB ID MULAI (contoh: 1): ');
  const endIdStr = await question('2. Masukkan TMDB ID AKHIR (contoh: 100000): ');
  
  console.log("\n[Daftar Kategori Populer]: Action, Adventure, Animation, Comedy, Crime, Documentary, Drama, Family, Fantasy, History, Horror, Music, Mystery, Romance, Science Fiction, Thriller, War, Western");
  const categoryStr = await question('3. Masukkan Kategori/Genre (Tulis nama atau ID, kosongkan untuk semua): ');
  
  const minPopStr = await question('4. Masukkan Minimum Popularity (contoh: 10, atau 0 untuk semua): ');

  const startId = parseInt(startIdStr, 10);
  const endId = parseInt(endIdStr, 10);
  const minPop = parseFloat(minPopStr) || 0;

  if (isNaN(startId) || isNaN(endId) || startId > endId) {
    console.error('❌ Input tidak valid. Pastikan ID berupa angka dan ID mulai <= ID akhir.');
    rl.close();
    process.exit(1);
  }

  // Resolusi Target Genre ID
  let targetGenreId = null;
  if (categoryStr.trim()) {
    const lowerInput = categoryStr.trim().toLowerCase();
    if (GENRES[lowerInput]) {
      targetGenreId = GENRES[lowerInput];
    } else if (!isNaN(parseInt(lowerInput, 10))) {
      targetGenreId = parseInt(lowerInput, 10);
    } else {
      console.log(`⚠️ Kategori "${categoryStr}" tidak dikenali, akan memproses SEMUA kategori.`);
    }
    
    if (targetGenreId) {
      console.log(`📌 Filter Kategori Aktif: ID ${targetGenreId}`);
    }
  }

  let MOVIE_IDS = [];
  try {
    MOVIE_IDS = await fetchValidIdsFromExport(startId, endId, minPop);
    if (MOVIE_IDS.length === 0) {
      console.log(`\n❌ Tidak ditemukan satupun ID valid di rentang ${startId} - ${endId} dengan popularity >= ${minPop}.`);
      rl.close();
      return;
    }
  } catch (err) {
    console.error(`\n❌ Gagal memproses daftar ID TMDB: ${err.message}`);
    rl.close();
    return;
  }

  console.log(`\n🚀 Memulai proses import ${MOVIE_IDS.length} movies secara PARALEL (Batch size: ${CONCURRENCY_LIMIT})...\n`);

  let successCount = 0;
  let skippedCount = 0;
  let duplicateCount = 0;
  let failedCount = 0;

  await processInBatches(MOVIE_IDS, CONCURRENCY_LIMIT, async (id) => {
    try {
      // 1. Cek duplikasi di database
      const { data: existing } = await supabase
        .from('videos')
        .select('id, title')
        .eq('tmdb_id', id.toString())
        .maybeSingle();

      if (existing) {
        process.stdout.write('⏭️ ');
        duplicateCount++;
        return;
      }

      // 2. Fetch TMDB Data & Filter Kategori
      const movieData = await getMovieData(id, targetGenreId);
      if (!movieData) {
        process.stdout.write('❌');
        failedCount++;
        return;
      }
      
      if (movieData.skip) {
        process.stdout.write('➖'); // Kategori tidak cocok
        skippedCount++;
        return;
      }

      // 3. Cek ketersediaan di server Vidsrc
      const isAvailable = await checkVidsrcAvailability(id, movieData.content_type);
      if (!isAvailable) {
        process.stdout.write('🚫'); // Tidak tersedia di Vidsrc
        failedCount++;
        return;
      }

      // 4. Insert ke Supabase
      const { error } = await supabase.from('videos').insert([movieData]);
      if (error) {
        process.stdout.write('⚠️'); // Error Supabase
        failedCount++;
        return;
      }

      process.stdout.write('✅'); // Sukses
      successCount++;
    } catch (err) {
      process.stdout.write('❌');
      failedCount++;
    }
  });

  // Laporan Akhir
  console.log(`\n\n==========================================`);
  console.log(`📊 LAPORAN IMPORT MOVIES ADVANCED`);
  console.log(`==========================================`);
  console.log(`Total ID Diproses: ${MOVIE_IDS.length}`);
  console.log(`✅ Berhasil Masuk DB   : ${successCount}`);
  console.log(`⏭️  Sudah Ada (Duplikat) : ${duplicateCount}`);
  if (targetGenreId) {
    console.log(`➖ Beda Kategori       : ${skippedCount}`);
  }
  console.log(`🚫 Gagal/Tidak Tersedia: ${failedCount}`);
  console.log(`==========================================\n`);
  console.log(`Keterangan Ikon:`);
  console.log(`✅ Sukses | ⏭️ Duplikat | ➖ Beda Kategori | 🚫 Tidak di Vidsrc | ❌/⚠️ Error`);
  
  rl.close();
}

run();
