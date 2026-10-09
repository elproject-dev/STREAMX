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
const omdbApiKey = '5e9c0c32'; // Seperti di videoStore.js

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Kredensial Supabase tidak ditemukan di .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// SCRIPT IMPORT MOVIES VIA CLI
// ==========================================

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

async function fetchFromTmdb(path) {
  const url = tmdbBearer
    ? `${TMDB_BASE}${path}`
    : `${TMDB_BASE}${path}?api_key=${tmdbApiKey}`;

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
  } catch (e) {
    // ignore
  }

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
  } catch (e) {
    // ignore
  }

  return result;
}

async function checkVidsrcAvailability(tmdbId, contentType) {
  try {
    const baseUrl = 'https://vidsrcme.ru/embed/';
    const checkUrl = contentType === 'tv'
      ? `${baseUrl}tv?tmdb=${tmdbId}&season=1&episode=1`
      : `${baseUrl}movie?tmdb=${tmdbId}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

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
    console.log(`   ⚠️  Vidsrc check error: ${err.message}`);
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
    console.log(`\n📥 Mengunduh daftar ID TMDB terbaru (${filename})...\nIni memakan waktu beberapa detik (ukuran ~20MB)...`);
    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filePath);
      http.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Gagal mengunduh file TMDB. Status: ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      }).on('error', (err) => {
        fs.unlink(filePath, () => reject(err));
      });
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
      } catch (e) {
      }
    });

    rlStream.on('close', () => {
      resolve(validIds.sort((a, b) => a - b));
    });

    rlStream.on('error', reject);
    fileStream.on('error', reject);
    gunzip.on('error', reject);
  });
}

async function run() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  const startIdStr = await question('Masukkan TMDB ID mulai: ');
  const endIdStr = await question('Masukkan TMDB ID akhir: ');
  const minPopStr = await question('Masukkan minimum popularity (contoh: 15, atau 0 untuk semua): ');

  const startId = parseInt(startIdStr, 10);
  const endId = parseInt(endIdStr, 10);
  const minPop = parseFloat(minPopStr) || 0;

  if (isNaN(startId) || isNaN(endId) || startId > endId) {
    console.error('❌ Input tidak valid. Pastikan ID berupa angka dan ID mulai tidak lebih besar dari ID akhir.');
    rl.close();
    process.exit(1);
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

  console.log(`\n🚀 Memulai proses import ${MOVIE_IDS.length} movies (dari ID ${startId} sampai ${endId})...\n`);

  const successList = [];
  const failedTmdbList = [];
  const failedSupabaseList = [];
  const duplicateList = [];

  for (const id of MOVIE_IDS) {
    console.log(`⏳ Memproses TMDB ID: ${id}...`);
    try {
      // 1. Cek duplikasi di database
      const { data: existing } = await supabase
        .from('videos')
        .select('id, title')
        .eq('tmdb_id', id.toString())
        .maybeSingle();

      if (existing) {
        console.log(`   ⏭️  Lewati: Sudah ada di database (${existing.title})`);
        duplicateList.push(id);
        continue;
      }

      // 2. Fetch TMDB Data
      const movieData = await getMovieData(id);
      if (!movieData) {
        console.log(`   ❌ Gagal: Data tidak ditemukan di TMDB (404)`);
        failedTmdbList.push(id);
        continue;
      }

      // 3. Cek ketersediaan di server Vidsrc
      const isAvailable = await checkVidsrcAvailability(id, movieData.content_type);
      if (!isAvailable) {
        console.log(`   ❌ Gagal: Film belum tersedia di server Vidsrc (Unavailable)`);
        failedTmdbList.push(id); // kita anggap gagal fetch / tidak valid
        continue;
      }

      // 4. Insert ke Supabase
      const { error } = await supabase.from('videos').insert([movieData]);
      if (error) {
        console.log(`   ❌ Gagal: Error insert ke Supabase (${error.message})`);
        failedSupabaseList.push({ id, error: error.message });
        continue;
      }

      console.log(`   ✅ Sukses: Ditambahkan (${movieData.title})`);
      successList.push(id);

      // Kasih delay sedikit untuk mencegah rate limit TMDB (opsional, tp baik dipraktikkan)
      await new Promise(r => setTimeout(r, 200));

    } catch (err) {
      console.log(`   ❌ Gagal: Terjadi error tidak terduga (${err.message})`);
      failedTmdbList.push(id);
    }
  }

  // Laporan Akhir
  console.log(`\n==========================================`);
  console.log(`📊 LAPORAN IMPORT MOVIES`);
  console.log(`==========================================`);
  console.log(`Total Diproses   : ${MOVIE_IDS.length}`);
  console.log(`✅ Sukses        : ${successList.length}`);
  console.log(`⏭️  Duplikat      : ${duplicateList.length}`);
  console.log(`❌ Gagal TMDB    : ${failedTmdbList.length}`);
  console.log(`❌ Gagal Supabase: ${failedSupabaseList.length}`);

  if (failedTmdbList.length > 0) {
    console.log(`\n📋 Daftar ID gagal fetch dari TMDB:`);
    console.log(failedTmdbList.join(', '));
  }

  if (failedSupabaseList.length > 0) {
    console.log(`\n📋 Daftar ID gagal insert Supabase:`);
    failedSupabaseList.forEach(f => console.log(` - ID ${f.id}: ${f.error}`));
  }

  console.log(`==========================================\n`);
  rl.close();
}

run();
