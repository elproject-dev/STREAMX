import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const versionFilePath = path.resolve(__dirname, '../src/lib/version.js');
const tauriConfigPath = path.resolve(__dirname, '../src-tauri/tauri.conf.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function run() {
  console.log('\n=============================');
  console.log('    STREAMX VERSION MANAGER');
  console.log('=============================\n');

  // Baca isi file saat ini
  let content = fs.readFileSync(versionFilePath, 'utf-8');

  // Ekstrak versi saat ini
  const versionMatch = content.match(/export const APP_VERSION = '(.+?)';/);
  const currentVersion = versionMatch ? versionMatch[1] : '1.0.0';

  // Tanya versi baru
  const newVersionInput = await prompt(`Masukkan Versi terbaru (Saat ini V.${currentVersion}) : `);
  const newVersion = newVersionInput || currentVersion;

  // Tanya changelog berulang kali
  console.log('\nMasukkan CHANGELOG (kosongkan dan tekan Enter jika sudah selesai):');
  const changelogs = [];
  let index = 1;
  
  while (true) {
    const log = await prompt(`${index}. `);
    if (!log) break;
    changelogs.push(log);
    index++;
  }

  // Proses update content
  if (newVersion !== currentVersion) {
    content = content.replace(
      /export const APP_VERSION = '.+?';/,
      `export const APP_VERSION = '${newVersion}';`
    );
  }

  if (changelogs.length > 0) {
    const items = changelogs.map(item => `  "${item}"`);
    const newChangelogArray = `[\n${items.join(',\n')}\n];`;
    
    // Ganti array changelog yang lama
    content = content.replace(
      /export const RELEASE_CHANGELOG = \[([\s\S]*?)\];/,
      `export const RELEASE_CHANGELOG = ${newChangelogArray}`
    );
  }

  // Tulis kembali ke file version.js
  fs.writeFileSync(versionFilePath, content);

  // Update versi di tauri.conf.json
  if (newVersion !== currentVersion) {
    try {
      let tauriContent = fs.readFileSync(tauriConfigPath, 'utf-8');
      tauriContent = tauriContent.replace(
        /"version":\s*".+?"/,
        `"version": "${newVersion}"`
      );
      fs.writeFileSync(tauriConfigPath, tauriContent);
      console.log(`✅ Update tauri.conf.json menjadi versi ${newVersion}`);
    } catch (e) {
      console.warn('⚠️ Gagal memperbarui tauri.conf.json:', e.message);
    }
  }

  console.log(`\n✅ Selesai! Versi aplikasi sekarang adalah V.${newVersion}.`);
  console.log('Jalankan "npm run release:android" atau "npm run release:desktop" untuk build dan upload ke Supabase!');
  console.log('=============================\n');

  rl.close();
}

run();
