import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

const ApkInstaller = registerPlugin('ApkInstaller');

/**
 * Mengonversi Uint8Array ke string base64 dengan efisien
 */
function uint8ArrayToBase64(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192; // Chunking to avoid stack overflow
  for (let i = 0; i < len; i += chunkSize) {
    const slice = bytes.subarray(i, Math.min(i + chunkSize, len));
    for (let j = 0; j < slice.length; j++) {
      binary += String.fromCharCode(slice[j]);
    }
  }
  return btoa(binary);
}

/**
 * Format bytes ke string mudah dibaca (KB, MB)
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Mendownload APK dari URL dan membuka installer bawaan Android.
 * Fungsi ini memancarkan event progres.
 * 
 * @param {string} url - URL APK
 * @param {function} onProgress - Callback untuk mendapatkan nilai persentase dan teks status
 */
export async function downloadAndInstallApk(url, onProgress) {
  if (!Capacitor.isNativePlatform()) {
    window.open(url, '_blank');
    return { success: true, message: 'Dibuka di browser' };
  }

  try {
    if (onProgress) onProgress({ percent: 0, loaded: 0, total: 0, status: 'Memulai unduhan...' });

    // Step 1: Download menggunakan Fetch stream
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download gagal: HTTP ${response.status}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Gagal membaca stream unduhan.');
    }

    const chunks = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      loaded += value.length;

      const percent = total > 0 ? Math.round((loaded / total) * 85) : 0;
      if (onProgress) {
        onProgress({
          percent,
          loaded,
          total,
          status: `Mengunduh... ${formatBytes(loaded)}${total > 0 ? ` / ${formatBytes(total)}` : ''}`
        });
      }
    }

    // Step 2: Gabungkan semua chunk
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    if (onProgress) onProgress({ percent: 88, loaded, total, status: 'Menyimpan file ke penyimpanan...' });

    // Step 3: Simpan ke perangkat menggunakan Base64 (Capacitor Filesystem API)
    const base64 = uint8ArrayToBase64(combined);
    const fileName = `streamx-update.apk`;

    await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.External,
    });

    if (onProgress) onProgress({ percent: 93, loaded, total, status: 'Mempersiapkan pemasang aplikasi...' });

    // Step 4: Dapatkan URI absolut file
    const fileUri = await Filesystem.getUri({
      path: fileName,
      directory: Directory.External,
    });

    if (onProgress) onProgress({ percent: 100, loaded, total, status: 'Membuka installer...' });

    // Step 5: Eksekusi plugin Java native untuk memunculkan prompt "Install APK" Android
    if (Capacitor.isNativePlatform()) {
      await ApkInstaller.install({ path: fileUri.uri });
    } else {
      window.open(fileUri.uri, '_system');
    }

    return { success: true, message: 'Selesai.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat mengunduh APK';
    console.error('[APK Installer Error]', message);
    return { success: false, message };
  }
}
