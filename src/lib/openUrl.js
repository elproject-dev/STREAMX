import { isTauri } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';

export async function openExternalUrl(url) {
  if (!url) return;
  const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;

  let isDesktop = false;
  try {
    isDesktop = isTauri();
  } catch (e) {}

  if (isDesktop) {
    try {
      await open(normalizedUrl);
    } catch (e) {
      console.error('Gagal membuka link via Tauri shell:', e);
      window.open(normalizedUrl, '_blank');
    }
  } else {
    window.open(normalizedUrl, '_blank');
  }
}


