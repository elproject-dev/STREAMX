export const APP_VERSION = '1.0.16';
export const SKIP_VERSION_KEY = 'streamx_skipped_version';
export const RELEASE_CHANGELOG = [
  "Update Apps"
];

/**
 * Membandingkan versi aplikasi lokal dengan versi remote
 * Mendukung format semantic versioning (misal: 1.0.0, 1.0.1, 2.1.0)
 * 
 * @param {string} current - Versi lokal (e.g., '1.0.0')
 * @param {string} latest - Versi terbaru di server (e.g., '1.0.1')
 * @returns {boolean} true jika latest > current
 */
export function isUpdateAvailable(current, latest) {
  if (!latest || !current) return false;

  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const curr = currentParts[i] || 0;
    const lat = latestParts[i] || 0;

    if (lat > curr) return true;
    if (lat < curr) return false;
  }
  
  return false;
}
