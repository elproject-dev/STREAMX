import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load env from .env.local
dotenv.config({ path: '.env.local' });
console.clear();

const tmdbBearer = process.env.VITE_TMDB_BEARER_TOKEN;
const tmdbApiKey = process.env.VITE_TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

if (!tmdbBearer && !tmdbApiKey) {
  console.error("Error: Kredensial TMDB tidak ditemukan di .env.local");
  process.exit(1);
}

async function fetchFromTmdb(apiPath) {
  const url = tmdbBearer
    ? `${TMDB_BASE}${apiPath}`
    : `${TMDB_BASE}${apiPath}${apiPath.includes('?') ? '&' : '?'}api_key=${tmdbApiKey}`;
    
  const headers = tmdbBearer ? { Authorization: `Bearer ${tmdbBearer}` } : {};
  
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`TMDB error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

// Fungsi untuk format teks agar aman saat dimasukkan ke dalam format CSV
function escapeCsv(text) {
  if (text == null) return '';
  const str = String(text);
  // Jika mengandung koma, kutip dua, atau baris baru, maka bungkus dengan kutip dua
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function run() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  console.log("==========================================");
  console.log("📥 DOWNLOAD POPULAR MOVIES TO CSV");
  console.log("==========================================\n");

  const pagesStr = await question('Masukkan jumlah halaman yang ingin diambil dari TMDB\n(1 halaman = 20 film terpopuler, contoh isi "50" untuk 1000 film): ');
  
  let pages = parseInt(pagesStr, 10);
  if (isNaN(pages) || pages < 1) {
    pages = 1; // Default ke 1 jika input salah
  }

  const yearStr = await question('\nMasukkan filter Tahun Rilis (contoh: 2024, atau kosongkan untuk semua tahun): ');
  const year = parseInt(yearStr, 10);

  console.log(`\n🚀 Mengambil film terpopuler sebanyak ${pages} halaman...`);

  // Header CSV
  let csvContent = "tmdb_id,title,popularity,release_date\n";
  let count = 0;

  for (let page = 1; page <= pages; page++) {
    try {
      let apiUrl = `/discover/movie?sort_by=popularity.desc&page=${page}`;
      if (!isNaN(year)) {
        apiUrl += `&primary_release_year=${year}`;
      }
      const data = await fetchFromTmdb(apiUrl);
      
      if (data && data.results) {
        for (const movie of data.results) {
          const id = movie.id;
          const title = escapeCsv(movie.title);
          const popularity = movie.popularity;
          const release_date = escapeCsv(movie.release_date);
          
          csvContent += `${id},${title},${popularity},${release_date}\n`;
          count++;
        }
      }
      
      // Indikator proses
      process.stdout.write('.');
      
      // Delay sebentar untuk mencegah Rate Limit dari API TMDB
      await new Promise(r => setTimeout(r, 200));

    } catch (err) {
      console.log(`\n⚠️ Gagal mengambil data di halaman ${page}: ${err.message}`);
    }
  }

  // Simpan File ke root folder
  const outputFileName = 'popular_movies.csv';
  const outputPath = path.join(process.cwd(), outputFileName);
  
  try {
    fs.writeFileSync(outputPath, csvContent, 'utf-8');
    console.log(`\n\n✅ Selesai! Berhasil mengunduh dan menyimpan ${count} film.`);
    console.log(`📂 File tersimpan di: ${outputPath}`);
  } catch (err) {
    console.log(`\n❌ Gagal menyimpan file CSV: ${err.message}`);
  }
  
  rl.close();
}

run();
