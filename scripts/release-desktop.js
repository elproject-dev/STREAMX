import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

// Konfigurasi dotenv untuk membaca .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ ERROR: Variabel SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di file .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runRelease() {
  try {
    console.log('🚀 Memulai proses rilis Windows Desktop otomatis...\n');

    // 1. Baca versi dari version.js
    const versionFilePath = path.resolve(__dirname, '../src/lib/version.js');
    const versionFileContent = fs.readFileSync(versionFilePath, 'utf-8');
    const versionMatch = versionFileContent.match(/export const APP_VERSION = '(.+?)';/);

    if (!versionMatch || !versionMatch[1]) {
      throw new Error('Tidak bisa menemukan APP_VERSION di src/lib/version.js');
    }

    const version = versionMatch[1];
    console.log(`📦 Versi terdeteksi: v${version}`);

    // 2. Build Web dan Aplikasi Tauri Desktop
    console.log('🏗️ Menjalankan build Web Vite dan Tauri Build...');
    execSync('npm run build', { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' });
    execSync('npx tauri build', { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' });

    // 3. Cek ketersediaan file Installer (EXE)
    const nsisDir = path.resolve(__dirname, '../src-tauri/target/release/bundle/nsis');
    if (!fs.existsSync(nsisDir)) {
      throw new Error(`Folder NSIS installer tidak ditemukan di ${nsisDir}.\nPastikan proses build Tauri berhasil.`);
    }

    const files = fs.readdirSync(nsisDir);
    const exeFile = files.find(f => f.endsWith('-setup.exe') || (f.endsWith('.exe') && !f.includes('uninst')));

    if (!exeFile) {
      throw new Error(`File installer EXE tidak ditemukan di dalam folder ${nsisDir}.`);
    }

    const exePath = path.join(nsisDir, exeFile);
    console.log(`✅ File installer EXE ditemukan: ${exeFile}`);

    // 4. Bersihkan file lama di folder windows bucket
    const fileName = `StreamX_v.${version}_setup.exe`;
    const storagePath = `windows/${fileName}`;

    console.log(`\n🗑️ Membersihkan installer versi lama di Supabase Storage...`);
    const { data: existingFiles } = await supabase.storage.from('app-releases').list('windows');
    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles
        .filter(f => f.name !== fileName && f.name !== '.emptyFolderPlaceholder')
        .map(f => `windows/${f.name}`);

      if (filesToDelete.length > 0) {
        await supabase.storage.from('app-releases').remove(filesToDelete);
        console.log(`✅ Berhasil menghapus ${filesToDelete.length} file versi lama.`);
      }
    }

    // 5. Upload EXE Baru ke Supabase Storage
    console.log(`☁️ Mengupload ${fileName} ke Supabase Storage (app-releases/windows)...`);

    const exeBuffer = fs.readFileSync(exePath);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('app-releases')
      .upload(storagePath, exeBuffer, {
        contentType: 'application/x-msdownload',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Gagal upload EXE: ${uploadError.message}. Pastikan bucket 'app-releases' ada di Supabase Anda.`);
    }

    // Dapatkan Public URL
    const { data: publicUrlData } = supabase.storage.from('app-releases').getPublicUrl(storagePath);
    const downloadUrl = publicUrlData.publicUrl;
    console.log(`✅ Upload berhasil! URL Publik: ${downloadUrl}`);

    // 6. Update Database app_settings
    console.log('\n🔄 Memperbarui versi, changelog, dan link download di Database app_settings...');

    const changelogMatch = versionFileContent.match(/export const RELEASE_CHANGELOG = \[([\s\S]*?)\];/);
    let changelogString = "";
    if (changelogMatch && changelogMatch[1]) {
      const items = [...changelogMatch[1].matchAll(/["'](.*?)["']/g)].map(m => m[1]);
      if (items.length > 0) changelogString = items.join('\n');
    }

    const { error: dbError } = await supabase
      .from('app_settings')
      .upsert({ 
        id: 'global', 
        install_windows: downloadUrl,
        app_version_latest: version,
        update_changelog: changelogString || null
      }, { onConflict: 'id' });

    if (dbError) {
       if (dbError.message.includes('row-level security')) {
          throw new Error('Gagal update database: Diblokir oleh RLS! Pastikan VITE_SUPABASE_SERVICE_ROLE_KEY di-set.');
       }
       throw new Error(`Gagal update database: ${dbError.message}`);
    }

    console.log(`✅ Database berhasil diperbarui (Versi: ${version})!`);
    console.log('\n🎉 Rilis Sukses! Link download Windows terbaru telah otomatis terhubung ke aplikasi.');

  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}`);
    process.exit(1);
  }
}

runRelease();
