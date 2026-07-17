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
    const bundleDir = path.resolve(__dirname, '../src-tauri/target/release/bundle');
    if (fs.existsSync(bundleDir)) {
      console.log('🗑️ Membersihkan folder bundle lama lokal...');
      fs.rmSync(bundleDir, { recursive: true, force: true });
    }
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
      throw new Error(`File installer EXE tidak ditemukan di dalam folder ${nsisDir}. Pastikan proses build Tauri berhasil.`);
    }
    
    const sigFile = files.find(f => f === `${exeFile}.sig`);
    if (!sigFile) {
      throw new Error(`File signature (.sig) untuk installer ${exeFile} tidak ditemukan! Pastikan tauri updater sudah dikonfigurasi.`);
    }

    const exePath = path.join(nsisDir, exeFile);
    const sigPath = path.join(nsisDir, sigFile);
    console.log(`✅ File installer ditemukan: ${exeFile} dan signature-nya`);

    // 4. Bersihkan file lama di folder windows bucket
    const fileName = `StreamX_v.${version}_setup.exe`;
    const sigName = `StreamX_v.${version}_setup.exe.sig`;
    const storagePathExe = `windows/${fileName}`;
    const storagePathSig = `windows/${sigName}`;

    console.log(`\n🗑️ Membersihkan installer versi lama di Supabase Storage...`);
    const { data: existingFiles } = await supabase.storage.from('app-releases').list('windows');
    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles
        .filter(f => f.name !== fileName && f.name !== sigName && f.name !== 'updater.json' && f.name !== '.emptyFolderPlaceholder')
        .map(f => `windows/${f.name}`);

      if (filesToDelete.length > 0) {
        await supabase.storage.from('app-releases').remove(filesToDelete);
        console.log(`✅ Berhasil menghapus ${filesToDelete.length} file versi lama.`);
      }
    }

    // 5. Upload File Baru ke Supabase Storage
    console.log(`☁️ Mengupload file EXE dan SIG ke Supabase Storage...`);

    const uploadFile = async (filePath, storagePath, contentType) => {
      const buffer = fs.readFileSync(filePath);
      const { error } = await supabase.storage
        .from('app-releases')
        .upload(storagePath, buffer, { contentType, upsert: true });
      if (error) throw new Error(`Gagal upload ${storagePath}: ${error.message}`);
      return supabase.storage.from('app-releases').getPublicUrl(storagePath).data.publicUrl;
    };

    const exeUrl = await uploadFile(exePath, storagePathExe, 'application/x-msdownload');
    const sigUrl = await uploadFile(sigPath, storagePathSig, 'text/plain');

    console.log(`✅ Upload berhasil! URL EXE: ${exeUrl}`);

    // Dapatkan Signature Content
    const signatureContent = fs.readFileSync(sigPath, 'utf-8');

    // 6. Buat dan Upload updater.json
    console.log(`☁️ Membuat dan mengupload updater.json...`);
    
    // Ambil pub_date
    const pubDate = new Date().toISOString();
    
    // Ambil changelog
    const changelogMatch = versionFileContent.match(/export const RELEASE_CHANGELOG = \[([\s\S]*?)\];/);
    let changelogString = "";
    if (changelogMatch && changelogMatch[1]) {
      const items = [...changelogMatch[1].matchAll(/["'](.*?)["']/g)].map(m => m[1]);
      if (items.length > 0) changelogString = items.join('\n');
    }

    const updaterJson = {
      version: version,
      notes: changelogString || "Pembaruan minor dan perbaikan bug.",
      pub_date: pubDate,
      platforms: {
        "windows-x86_64": {
          signature: signatureContent,
          url: exeUrl
        }
      }
    };

    const updaterBuffer = Buffer.from(JSON.stringify(updaterJson, null, 2));
    const { error: updaterError } = await supabase.storage
      .from('app-releases')
      .upload('windows/updater.json', updaterBuffer, {
        contentType: 'application/json',
        upsert: true
      });
      
    if (updaterError) throw new Error(`Gagal upload updater.json: ${updaterError.message}`);
    console.log(`✅ updater.json berhasil diperbarui!`);

    // 6. Update Database app_settings
    console.log('\n🔄 Memperbarui versi, changelog, dan link download di Database app_settings...');



    const { error: dbError } = await supabase
      .from('app_settings')
      .upsert({ 
        id: 'global', 
        install_windows: exeUrl,
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
