import { useState, useEffect } from 'react';

// Cache di memory agar tidak perlu memanggil Cache API berulang kali untuk URL yang sama dalam satu sesi
const memoryCache = new Map();

export function useCachedImage(url) {
  const [src, setSrc] = useState(memoryCache.get(url) || null);

  useEffect(() => {
    if (!url) return;
    
    // Jika sudah ada di memory cache, gunakan langsung
    if (memoryCache.has(url)) {
      setSrc(memoryCache.get(url));
      return;
    }

    let isMounted = true;

    const loadAndCacheImage = async () => {
      try {
        // Buka Cache Storage API bawaan browser
        const cache = await caches.open('streamx-images');
        const cachedRes = await cache.match(url);
        
        if (cachedRes) {
          // Jika ada di cache, ubah menjadi Blob URL lokal agar sangat cepat dimuat
          const blob = await cachedRes.blob();
          const objectUrl = URL.createObjectURL(blob);
          memoryCache.set(url, objectUrl);
          if (isMounted) setSrc(objectUrl);
        } else {
          // Jika belum ada, gunakan URL asli agar termuat normal oleh browser
          if (isMounted) setSrc(url);
          
          // Lalu simpan ke cache di background untuk penggunaan berikutnya
          try {
            const res = await fetch(url);
            if (res.ok) {
              cache.put(url, res.clone());
            }
          } catch (e) {
            // Abaikan error (biasanya karena CORS pada gambar pihak ketiga)
            // Gambar tetap akan dimuat secara normal melalui tag img src
          }
        }
      } catch (err) {
        // Fallback jika Cache API tidak didukung atau error
        if (isMounted) setSrc(url);
      }
    };

    loadAndCacheImage();

    return () => {
      isMounted = false;
    };
  }, [url]);

  // Jika src belum siap, kembalikan url asli agar tidak ada delay sama sekali
  return src || url;
}
