import React, { useState, useEffect, useRef, useMemo } from 'react';
import { VideoStore } from '@/lib/videoStore';
import { useWatchHistory } from '@/lib/WatchHistoryContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Film, AlertCircle, Play, Maximize, Languages, Download, Loader2, X, Lock, Unlock, LogIn } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import VideoRow from '@/components/home/VideoRow';
import { useAuth } from '@/lib/AuthContext';
import { openExternalUrl } from '@/lib/openUrl';


import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { StatusBar } from '@capacitor/status-bar';
import { useLanguage } from '@/lib/i18n';
import { getAppSettings } from '@/lib/appSettings';

// Deteksi Tauri runtime
// const isTauri = typeof window !== 'undefined' && window.__TAURI_INTERNALS__;

export default function Watch() {
  const { id: videoId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [activeServer] = useState('primary-server');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [subtitles, setSubtitles] = useState([]);
  const [isSearchingSubs, setIsSearchingSubs] = useState(false);
  const [isDownloadingSubs, setIsDownloadingSubs] = useState(null);
  const { t } = useLanguage();
  const playerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const isTauri = typeof window !== 'undefined' && window.__TAURI_INTERNALS__;
  const isWebPlayer = !Capacitor.isNativePlatform() && !isTauri;

  const isInWebFullscreen = () => {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  };

  const exitWebFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      }
    } catch {
      // ignore
    }
  };

  const enterFullscreenMode = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        if (window.AndroidImmersive?.enter) {
          window.AndroidImmersive.enter();
        }

        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.hide();

        // Lock paksa ke landscape saat masuk fullscreen
        await ScreenOrientation.lock({ orientation: 'landscape' });
        setIsFullscreen(true);
      } catch (err) {
        console.error('Fullscreen enter error:', err);
        // Fallback: tetap update state walaupun ada error
        setIsFullscreen(true);
      }
      return;
    }

    const elem = playerRef.current || document.documentElement;
    try {
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        await elem.mozRequestFullScreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      console.error('Fullscreen enter error:', err);
    }
  };

  const exitFullscreenMode = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        if (window.AndroidImmersive?.exit) {
          window.AndroidImmersive.exit();
        }

        // Lock paksa kembali ke portrait saat keluar fullscreen
        await ScreenOrientation.lock({ orientation: 'portrait' });

        await StatusBar.show();
        // Pancing Capacitor plugin agar menyadari perubahan dengan toggle cepat
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setOverlaysWebView({ overlay: true });
        setIsFullscreen(false);
      } catch (err) {
        console.error('Fullscreen exit error:', err);
        // Fallback: tetap update state walaupun ada error
        setIsFullscreen(false);
      }
      return;
    }

    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        await document.mozCancelFullScreen();
      }
      setIsFullscreen(false);
    } catch (err) {
      console.error('Fullscreen exit error:', err);
    }
  };

  const handleBackFromPlayer = async () => {
    if (isFullscreen) {
      await exitFullscreenMode();
    } else if (!Capacitor.isNativePlatform() && isInWebFullscreen()) {
      await exitWebFullscreen();
    }
    setIsPlaying(false);
  };

  const [playerBaseUrl, setPlayerBaseUrl] = useState(() => {
    const saved = localStorage.getItem('streamx_player_url');
    return saved && typeof saved === 'string' && saved.trim()
      ? saved.trim()
      : 'https://vidsrcme.ru/embed/';
  });

  // Cleanup orientation saat berhenti bermain
  useEffect(() => {
    if (!isPlaying) {
      if (isFullscreen) {
        // Jika masih fullscreen saat berhenti, exit dengan proper
        exitFullscreenMode().catch(err => console.warn('Cleanup exit fullscreen:', err));
      }

      if (Capacitor.isNativePlatform()) {
        if (window.AndroidImmersive?.resetOrientation) {
          window.AndroidImmersive.resetOrientation();
        }
        // Reset orientation ke normal (portrait jika auto-rotate mati)
        ScreenOrientation.unlock().catch(err => console.warn('Cleanup unlock orientation:', err));
      }
    }
  }, [isPlaying]);

  // Handle Android Physical Back Button & Orientation Changes
  useEffect(() => {
    let backListener;
    let orientationListener;

    const setupListeners = async () => {
      if (Capacitor.isNativePlatform()) {
        // Back button listener
        backListener = await App.addListener('backButton', () => {
          if (showSubtitleMenu) {
            setShowSubtitleMenu(false);
          } else if (isPlaying) {
            setIsPlaying(false);
          } else {
            navigate(-1);
          }
        });

        // Orientation change listener
        orientationListener = await ScreenOrientation.addListener('screenOrientationChange', (orientation) => {
          // Update fullscreen state based on actual device orientation
          if (isFullscreen) {
            const isLandscape = orientation.type?.includes('landscape');
            // Keep fullscreen state in sync with device orientation while in fullscreen
            if (!isLandscape && isFullscreen) {
              // Device rotated to portrait while in fullscreen
              // Let user control when to exit via button
            }
          }
        });
      }
    };

    setupListeners();

    return () => {
      if (backListener) {
        backListener.remove();
      }
      if (orientationListener) {
        orientationListener.remove();
      }
    };
  }, [isPlaying, showSubtitleMenu, navigate, isFullscreen]);

  useEffect(() => {
    if (!isPlaying && !Capacitor.isNativePlatform() && isInWebFullscreen()) {
      exitWebFullscreen();
    }
  }, [isPlaying]);

  const handleSearchSubtitles = async () => {
    if (!video?.tmdb_id) {
      toast.error(t('watch.tmdb_not_found'));
      return;
    }

    setIsSearchingSubs(true);
    setShowSubtitleMenu(true);
    try {
      const results = await VideoStore.searchSubtitles(
        video.tmdb_id,
        video.content_type,
        video.season,
        video.episode
      );
      setSubtitles(results);
      if (results.length === 0) {
        toast.info(t('watch.no_subtitle'));
      }
    } catch (error) {
      console.error('Subtitle search error:', error);
      toast.error(t('watch.subtitle_search_fail'));
    } finally {
      setIsSearchingSubs(false);
    }
  };

  const handleDownloadSubtitle = async (fileId, releaseName) => {
    setIsDownloadingSubs(fileId);
    try {
      const safeName = (releaseName || 'subtitle').replace(/[\\/:*?"<>|]/g, '');
      const fileName = `${safeName}.srt`;

      // Panggil Edge Function langsung via fetch() untuk kontrol penuh atas binary response
      const functionUrl = `https://latyqaoxpdizvttxlbfa.supabase.co/functions/v1/download-subtitle`;
      const res = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ file_id: fileId, filename: fileName }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(errText || `Edge Function error: ${res.status}`);
      }

      // Cek content-type: jika JSON berarti error, jika biner berarti file subtitle
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('application/json')) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Edge Function mengembalikan error');
      }

      if (isTauri) {
        // Tauri Desktop: tampilkan Save dialog lalu tulis file
        const arrayBuffer = await res.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);

        if (uint8.length < 500) {
          throw new Error(t('watch.subtitle_invalid'));
        }

        const { save } = await import('@tauri-apps/plugin-dialog');
        const filePath = await save({
          defaultPath: fileName,
          filters: [{ name: 'Subtitle', extensions: ['srt'] }],
        });

        if (!filePath) {
          return;
        }

        const { writeFile } = await import('@tauri-apps/plugin-fs');
        await writeFile(filePath, uint8);
        toast.success(`Subtitle berhasil disimpan ke ${filePath}`);
      } else if (Capacitor.isNativePlatform()) {
        // Android/iOS: simpan file langsung ke Documents folder
        const arrayBuffer = await res.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);

        if (uint8.length < 500) {
          throw new Error(t('watch.subtitle_invalid'));
        }

        // Konversi ke base64
        let base64Data = '';
        const bytes = new Uint8Array(arrayBuffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          base64Data += String.fromCharCode(bytes[i]);
        }
        base64Data = btoa(base64Data);

        const { Filesystem, Directory } = await import('@capacitor/filesystem');

        // Cek apakah Documents folder ada, jika tidak buat dulu
        try {
          await Filesystem.mkdir({
            path: 'StreamX_Subtitles',
            directory: Directory.Documents,
            recursive: true,
          });
        } catch (err) {
          // Folder mungkin sudah ada, ignore error
          console.warn('Folder creation warning:', err);
        }

        // Simpan file langsung ke Documents/StreamX_Subtitles
        const result = await Filesystem.writeFile({
          path: `StreamX_Subtitles/${fileName}`,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true,
        });

        // Tampilkan notifikasi sukses dengan path
        toast.success(`Subtitle tersimpan di Documents/StreamX_Subtitles/${fileName}`);
      } else {
        // Web: download via Blob + anchor click
        const blob = await res.blob();

        if (blob.size < 500) {
          throw new Error(t('watch.subtitle_invalid'));
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 2000);

        toast.success(`Subtitle berhasil diunduh: ${fileName}`);
      }
    } catch (error) {
      console.error('Subtitle download error:', error);

      // Fallback: Jika Edge Function gagal, coba cara manual
      try {
        const downloadLink = await VideoStore.getSubtitleDownloadLink(fileId);
        if (downloadLink) {
          openExternalUrl(downloadLink);
        } else {
          toast.error(t('watch.subtitle_download_fail'));
        }
      } catch {
        toast.error(t('watch.subtitle_process_fail'));
      }
    } finally {
      setIsDownloadingSubs(null);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadPlayerUrl = async () => {
      const { data } = await getAppSettings();
      if (cancelled || !data) return;

      if (typeof data.player_url === 'string' && data.player_url.trim()) {
        const next = data.player_url.trim();
        setPlayerBaseUrl(next);
        localStorage.setItem('streamx_player_url', next);
      }
    };

    loadPlayerUrl();
    return () => {
      cancelled = true;
    };
  }, []);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    // Gunakan durasi custom jika ada, default 15 detik (DINONAKTIFKAN untuk kenyamanan target media player)
    // const timeoutDuration = 15000;

    // controlsTimeoutRef.current = setTimeout(() => {
    //   setShowControls(false);
    // }, timeoutDuration);
  };

  const handleContainerClick = () => {
    resetControlsTimeout();
  };

  const handleTouchStart = () => {
    resetControlsTimeout();
  };

  useEffect(() => {
    if (isPlaying) {
      resetControlsTimeout();
    } else {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      setShowControls(true);
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  // Cleanup timeout on unmount or when locked status changes
  useEffect(() => {
    if (isLocked) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    } else {
      resetControlsTimeout();
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isLocked]);

  const baseUrl = playerBaseUrl.endsWith('/') ? playerBaseUrl : `${playerBaseUrl}/`;

  const servers = useMemo(() => {
    return [
      {
        id: 'primary-server',
        label: 'Server Utama',
        url: video => {
          const isTv = video.content_type === 'tv';
          const tmdbId = video.tmdb_id;
          const s = video.season || 1;
          const e = video.episode || 1;

          // Deteksi otomatis format berdasarkan domain untuk akurasi lebih tinggi
          if (baseUrl.includes('vidsrcme.ru')) {
            return isTv
              ? `${baseUrl}tv?tmdb=${tmdbId}&season=${s}&episode=${e}`
              : `${baseUrl}movie?tmdb=${tmdbId}`;
          }

          if (baseUrl.includes('vidsrc.xyz')) {
            return isTv
              ? `${baseUrl}tv/${tmdbId}/${s}/${e}`
              : `${baseUrl}movie/${tmdbId}`;
          }

          if (baseUrl.includes('vidsrc.to') || baseUrl.includes('vidsrc.me')) {
            return isTv
              ? `${baseUrl}embed/tv/${tmdbId}/${s}/${e}`
              : `${baseUrl}embed/movie/${tmdbId}`;
          }

          // Fallback umum jika domain tidak dikenal
          return isTv
            ? `${baseUrl}tv/${tmdbId}/${s}/${e}`
            : `${baseUrl}movie/${tmdbId}`;
        }
      }
    ];
  }, [baseUrl]);

  const { data: video, isLoading } = useQuery({
    queryKey: ['video', videoId],
    queryFn: () => VideoStore.filter({ id: videoId }),
    select: (data) => data[0],
    enabled: !!videoId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: relatedVideos = [] } = useQuery({
    queryKey: ['related-videos', video?.id, video?.category, video?.genre],
    queryFn: async () => {
      if (!video) return [];

      let related = [];

      // 1. Cari berdasarkan kategori yang sama (Movie/TV)
      if (video.category) {
        const byCategory = await VideoStore.filter({ category: video.category }, '-created_date', 30);
        related = [...byCategory];
      }

      // 2. Jika ada genre, cari yang memiliki genre serupa
      if (video.genre) {
        const genres = video.genre.split(',').map(g => g.trim());
        const allVideos = await VideoStore.list('-created_date', 100);

        const byGenre = allVideos.filter(v => {
          if (v.id === video.id) return false;
          const vGenres = v.genre ? v.genre.split(',').map(g => g.trim()) : [];
          return genres.some(g => vGenres.includes(g));
        });

        // Gabungkan dan prioritaskan yang memiliki genre sama
        related = [...byGenre, ...related];
      }

      // 3. Hilangkan duplikat dan video yang sedang ditonton
      const uniqueRelated = Array.from(new Map(related.map(v => [v.id, v])).values())
        .filter(v => v.id !== video.id);

      // 4. Batasi jumlah berdasarkan perangkat
      const isMobile = window.innerWidth < 768;
      const limit = isMobile ? 12 : 14;

      // 5. Jika masih sedikit, ambil video terbaru sebagai pelengkap
      if (uniqueRelated.length < 10) {
        const latest = await VideoStore.list('-created_date', 20);
        const combined = [...uniqueRelated, ...latest];
        return Array.from(new Map(combined.map(v => [v.id, v])).values())
          .filter(v => v.id !== video.id)
          .slice(0, limit);
      }

      return uniqueRelated.slice(0, limit);
    },
    enabled: !!video,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const filteredRelated = relatedVideos;

  useEffect(() => {
    if (isPlaying && playerRef.current) {
      // Tunggu sedikit agar animasi render selesai
      setTimeout(() => {
        const yOffset = -50; // Diubah dari -100 ke -50 agar posisi player lebih turun lagi ke tengah layar
        const element = playerRef.current;
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;

        window.scrollTo({ top: y, behavior: 'smooth' });
      }, 150);
    }
  }, [isPlaying]);

  // Increment view count
  const viewMutation = useMutation({
    mutationFn: () => VideoStore.update(videoId, { view_count: (video?.view_count || 0) + 1 }),
  });

  useEffect(() => {
    if (videoId) {
      viewMutation.mutate();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setIsPlaying(false);
    }
  }, [videoId]);

  // Simpan ke riwayat tontonan hanya saat user klik Putar
  const { add: addHistory } = useWatchHistory();
  useEffect(() => {
    if (isPlaying && video) {
      addHistory(video);
    }
  }, [isPlaying, video, addHistory]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-20">
        <Skeleton className="w-full aspect-video max-w-5xl mx-auto rounded-lg" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-background pt-28 text-center">
        <Film className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">{t('watch.not_found')}</h2>
        <Link to="/" className="text-primary hover:underline">{t('watch.back_home')}</Link>
      </div>
    );
  }

  const selectedServer = servers.find(s => s.id === activeServer);
  const vidsrcUrl = video?.tmdb_id && selectedServer ? selectedServer.url(video) : null;

  const iframeProps = (baseUrl.includes('vidsrcme.ru') || baseUrl.includes('superembed'))
    ? {
      referrerPolicy: 'no-referrer',
      allow: 'autoplay; encrypted-media; fullscreen; picture-in-picture',
    }
    : {
      // Melonggarkan sandbox untuk domain kustom agar tidak terblokir
      referrerPolicy: 'origin',
      allow: 'autoplay; encrypted-media; fullscreen; picture-in-picture',
    };

  const toggleFullscreen = async () => {
    // Jangan biarkan toggle ketika controls terkunci
    if (isLocked) {
      console.warn('Fullscreen toggle blocked: controls are locked');
      return;
    }

    try {
      if (isFullscreen) {
        // Sedang fullscreen, exit
        await exitFullscreenMode();
      } else {
        // Tidak fullscreen, masuk
        await enterFullscreenMode();
      }
    } catch (err) {
      console.error('Fullscreen toggle error:', err);
      toast.error('Gagal mengubah mode fullscreen');
    }
  };

  // Cleanup orientation on unmount or stop playing
  return (
    <div className="min-h-screen bg-background">
      {/* Player (only when playing) */}
      {isPlaying && (
        isWebPlayer ? (
          <div
            ref={playerRef}
            className="fixed inset-0 z-[100] bg-black overflow-hidden"
          >
            {vidsrcUrl ? (
              isAuthenticated ? (
                <iframe
                  src={vidsrcUrl}
                  className="absolute inset-0 w-full h-full z-10"
                  {...iframeProps}
                  allowFullScreen
                  title={video.title}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 bg-background/80 backdrop-blur-xl z-10 overflow-hidden">
                  {/* Decorative Background Glows */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/20 rounded-full blur-[80px] pointer-events-none" />

                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, type: "spring" }}
                    className="relative z-10 flex flex-col items-center max-w-lg w-full p-8 md:px-12 rounded-3xl border border-primary/60 bg-black/60 shadow-[0_0_40px_rgba(229,9,20,0.4),inset_0_0_20px_rgba(229,9,20,0.15)] backdrop-blur-xl"
                  >
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                      className="w-24 h-24 bg-gradient-to-br from-primary/30 to-primary/5 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(229,9,20,0.3)] border border-primary/20"
                    >
                      <Lock className="w-10 h-10 text-primary drop-shadow-[0_0_15px_rgba(229,9,20,0.5)]" />
                    </motion.div>

                    <h3 className="text-base sm:text-lg md:text-xl font-semibold text-white mb-2 tracking-tight whitespace-nowrap [text-shadow:0_0_10px_#e50914,0_0_20px_#e50914,0_0_2px_#e50914]">
                      {t('login.login_required') || 'Untuk pengalaman menonton film lebih baik lagi'}
                    </h3>

                    <p className="text-white/90 text-sm md:text-base leading-relaxed mb-8 px-4 [text-shadow:0_0_8px_rgba(229,9,20,0.8)]">
                      {t('login.login_desc') || 'Harap Login/Buat akun terlebih dahulu'}
                    </p>

                    <Link
                      to="/login"
                      className="w-full sm:w-auto px-8 py-3.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(229,9,20,0.4)] hover:shadow-[0_0_30px_rgba(229,9,20,0.6)] hover:-translate-y-1 flex items-center justify-center gap-2"
                    >
                      <LogIn className="w-5 h-5" />
                      {t('login.button') || 'Masuk / Daftar'}
                    </Link>
                  </motion.div>
                </div>
              )
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-3" />
                <h3 className="text-lg font-semibold text-foreground mb-1">{t('watch.cannot_play')}</h3>
                <p className="text-sm text-muted-foreground max-w-md">{t('watch.add_tmdb')}</p>
              </div>
            )}

            {/* Header Controls - Versi Clean & Persistent */}
            <div className="absolute top-0 left-0 right-0 mt-[env(safe-area-inset-top)] p-6 flex items-center justify-between z-50 pointer-events-none">
              {!Capacitor.isNativePlatform() ? (
                <button
                  onClick={handleBackFromPlayer}
                  className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/80 flex items-center justify-center transition-colors border border-white/10 backdrop-blur-md pointer-events-auto"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
              ) : (
                <div></div>
              )}

              <button
                onClick={toggleFullscreen}
                className="bg-black/40 hover:bg-black/80 text-white border border-white/10 backdrop-blur-md h-10 w-10 rounded-lg flex items-center justify-center transition-all pointer-events-auto"
                title={t('watch.fullscreen')}
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div
            ref={playerRef}
            className={`fixed inset-0 z-[100] bg-black overflow-hidden transition-all duration-300 ${!showControls ? 'cursor-none' : ''}`}
            onMouseMove={resetControlsTimeout}
            onTouchStart={handleTouchStart}
            onClick={handleContainerClick}
          >
            <div className="relative w-full h-full">
              {/* Overlay transparan tipis untuk menangkap klik saat kontrol tersembunyi */}
              <div
                className={`absolute inset-0 z-30 cursor-pointer ${showControls ? 'pointer-events-none' : 'pointer-events-auto'}`}
                onClick={resetControlsTimeout}
              />

              {/* Lock Overlay */}
              {isLocked && (
                <div
                  className="absolute inset-0 z-40 bg-transparent pointer-events-auto"
                  onClick={() => {
                    setShowControls(true);
                    resetControlsTimeout();
                  }}
                />
              )}

              {vidsrcUrl ? (
                isAuthenticated ? (
                  <iframe
                    src={vidsrcUrl}
                    className="absolute inset-0 w-full h-full z-10"
                    {...iframeProps}
                    allowFullScreen
                    title={video.title}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 bg-background/80 backdrop-blur-xl z-10 overflow-hidden">
                    {/* Decorative Background Glows */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/20 rounded-full blur-[80px] pointer-events-none" />

                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.5, type: "spring" }}
                      className="relative z-10 flex flex-col items-center max-w-lg w-full p-8 md:px-12 rounded-3xl border border-primary/60 bg-black/60 shadow-[0_0_40px_rgba(229,9,20,0.4),inset_0_0_20px_rgba(229,9,20,0.15)] backdrop-blur-xl"
                    >
                      <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                        className="w-24 h-24 bg-gradient-to-br from-primary/30 to-primary/5 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(229,9,20,0.3)] border border-primary/20"
                      >
                        <Lock className="w-10 h-10 text-primary drop-shadow-[0_0_15px_rgba(229,9,20,0.5)]" />
                      </motion.div>

                      <h3 className="text-base sm:text-lg md:text-xl font-semibold text-white mb-2 tracking-tight whitespace-nowrap [text-shadow:0_0_10px_#e50914,0_0_20px_#e50914,0_0_2px_#e50914]">
                        {t('login.login_required') || 'Untuk pengalaman menonton film lebih baik lagi'}
                      </h3>

                      <p className="text-white/90 text-sm md:text-base leading-relaxed mb-8 px-4 [text-shadow:0_0_8px_rgba(229,9,20,0.8)]">
                        {t('login.login_desc') || 'Harap Login/Buat akun terlebih dahulu'}
                      </p>

                      <Link
                        to="/login"
                        className="w-full sm:w-auto px-8 py-3.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(229,9,20,0.4)] hover:shadow-[0_0_30px_rgba(229,9,20,0.6)] hover:-translate-y-1 flex items-center justify-center gap-2"
                      >
                        <LogIn className="w-5 h-5" />
                        {t('login.button') || 'Masuk / Daftar'}
                      </Link>
                    </motion.div>
                  </div>
                )
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-10">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-semibold text-foreground mb-1">{t('watch.cannot_play')}</h3>
                  <p className="text-sm text-muted-foreground max-w-md">{t('watch.add_tmdb')}</p>
                </div>
              )}

              <div className={`absolute top-0 left-0 right-0 mt-[env(safe-area-inset-top)] p-4 flex items-center justify-between z-50 transition-opacity duration-500 ${showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                {!Capacitor.isNativePlatform() ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isLocked) {
                        handleBackFromPlayer();
                      }
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isLocked) {
                        handleBackFromPlayer();
                      }
                    }}
                    type="button"
                    disabled={isLocked}
                    className={`w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors border border-white/10 backdrop-blur-md pointer-events-auto relative z-50 ${isLocked ? 'opacity-0' : 'opacity-100'}`}
                  >
                    <ArrowLeft className="w-5 h-5 text-white" />
                  </button>
                ) : (
                  <div></div>
                )}

                <div className="flex items-center gap-2 pointer-events-auto">
                  {Capacitor.isNativePlatform() && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const newLockState = !isLocked;
                        setIsLocked(newLockState);
                        if (newLockState) {
                          setShowControls(false);
                          if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
                        } else {
                          resetControlsTimeout();
                        }
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const newLockState = !isLocked;
                        setIsLocked(newLockState);
                        if (newLockState) {
                          setShowControls(false);
                          if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
                        } else {
                          resetControlsTimeout();
                        }
                      }}
                      type="button"
                      className="bg-black/60 hover:bg-black/80 text-white border border-white/10 backdrop-blur-md h-10 w-10 rounded-lg flex items-center justify-center transition-all pointer-events-auto"
                      title={isLocked ? "Buka Kontrol" : "Kunci Kontrol"}
                    >
                      {isLocked ? <Lock className="w-4 h-4 text-white" /> : <Unlock className="w-4 h-4" />}
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Ensure button click is processed immediately
                      if (!isLocked) {
                        toggleFullscreen().catch(err => console.error('Toggle fullscreen failed:', err));
                      }
                    }}
                    onTouchEnd={(e) => {
                      // Handle touch end untuk better mobile responsiveness
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isLocked) {
                        toggleFullscreen().catch(err => console.error('Toggle fullscreen failed:', err));
                      }
                    }}
                    type="button"
                    disabled={isLocked}
                    className={`bg-black/60 hover:bg-black/80 text-white border border-white/10 backdrop-blur-md h-10 w-10 rounded-lg flex items-center justify-center transition-all pointer-events-auto relative z-50 ${isLocked ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    title="Fullscreen"
                  >
                    <Maximize className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* Netflix-style Hero Banner */}
      <div className="relative w-full h-[65vh] landscape:h-[100vh] md:h-[90vh] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={video.backdrop_url || video.thumbnail_url || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1920&q=80'}
            alt={video.title}
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>

        <div className="relative h-full flex flex-col justify-center pb-0">
          <div className="w-full px-4 md:px-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-[90%] w-full overflow-hidden mt-16 landscape:mt-20 md:mt-0"
            >
              {/* Score + Category */}
              <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4">
                {typeof video.score === 'number' && (
                  <span
                    className="relative rounded-full flex items-center justify-center shrink-0"
                    style={{
                      width: 24, height: 24, md: { width: 28, height: 28 },
                      background: `conic-gradient(${video.score * 10 >= 70 ? '#22c55e' : video.score * 10 >= 50 ? '#eab308' : '#ef4444'} ${Math.round(video.score * 10)}%, rgba(255,255,255,0.12) 0)`,
                    }}
                  >
                    <span
                      className="rounded-full bg-background/80 flex items-center justify-center font-black text-foreground"
                      style={{ width: 18, height: 18, fontSize: 8 }}
                    >
                      {Math.round(video.score * 10)}
                    </span>
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight text-foreground mb-2 md:mb-4">
                {video.title}
              </h1>

              {/* Description */}
              {video.description && (
                <p className="text-[11px] md:text-lg text-white/90 leading-relaxed mb-1.5 md:mb-6 line-clamp-2 md:line-clamp-4 drop-shadow-md font-medium">
                  {video.description}
                </p>
              )}

              {/* Buttons */}
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1.5 md:mb-5">
                <Link to="/" className="hidden md:block">
                  <Button
                    variant="secondary"
                    className="!h-auto bg-black/60 hover:bg-black/80 text-white font-semibold px-2.5 md:px-6 py-1 md:py-2 text-[10px] md:text-sm rounded-md md:rounded-lg gap-1 md:gap-2 border border-white/30 min-w-[85px] md:min-w-[120px]"
                  >
                    <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" />
                    {t('watch.back')}
                  </Button>
                </Link>
                <Button
                  onClick={() => setIsPlaying(true)}
                  className="!h-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-2.5 md:px-6 py-1 md:py-2 text-[10px] md:text-sm rounded-md md:rounded-lg gap-1 md:gap-2 min-w-[85px] md:min-w-[120px]"
                >
                  <Play className="w-3 h-3 md:w-4 md:h-4 fill-current" />
                  {t('watch.play')}
                </Button>

                {/* Subtitle Download Button */}
                <Button
                  onClick={handleSearchSubtitles}
                  className="!h-auto bg-white/10 hover:bg-white/20 text-white font-semibold px-2.5 md:px-6 py-1 md:py-2 text-[10px] md:text-sm rounded-md md:rounded-lg gap-1 md:gap-2 border border-white/20 min-w-[85px] md:min-w-[120px]"
                >
                  {isSearchingSubs ? (
                    <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                  ) : (
                    <Languages className="w-3 h-3 md:w-4 md:h-4" />
                  )}
                  {t('watch.subtitle')}
                </Button>

                {/* Subtitle Popup Modal */}
                <AnimatePresence>
                  {showSubtitleMenu && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center"
                        onClick={() => setShowSubtitleMenu(false)}
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 60, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 60, scale: 0.95 }}
                          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                          className="w-full max-w-lg md:rounded-2xl rounded-t-2xl bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden max-h-[85vh] md:max-h-[70vh] flex flex-col"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          {/* Header */}
                          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                                <Languages className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-white">
                                  Subtitle {
                                    (() => {
                                      const lang = localStorage.getItem('streamx_subtitle_lang') || 'id';
                                      const langs = {
                                        'id': 'Indonesia',
                                        'en': 'English',
                                        'es': 'Español',
                                        'fr': 'Français',
                                        'de': 'Deutsch',
                                        'ja': '日本語',
                                        'ko': '한국어',
                                        'zh': '中文',
                                        'ar': 'العربية',
                                        'pt': 'Português',
                                        'ru': 'Русский'
                                      };
                                      return langs[lang] || t('watch.subtitle_pilihan');
                                    })()
                                  }
                                </h3>
                                <p className="text-[11px] text-white/40">{t('watch.download_subtitle')}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setShowSubtitleMenu(false)}
                              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                            >
                              <X className="w-4 h-4 text-white/60" />
                            </button>
                          </div>

                          {/* Content */}
                          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                            {isSearchingSubs ? (
                              <div className="py-16 text-center flex flex-col items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Loader2 className="w-7 h-7 animate-spin text-primary" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-white/80">{t('watch.search_subtitle')}</p>
                                  <p className="text-xs text-white/30 mt-1">{t('watch.searching_wait')}</p>
                                </div>
                              </div>
                            ) : subtitles.length > 0 ? (
                              <div className="space-y-2">
                                {subtitles.map((sub) => (
                                  <button
                                    key={sub.id}
                                    onClick={() => handleDownloadSubtitle(sub.attributes.files[0].file_id, sub.attributes.release)}
                                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all hover:bg-white/10 active:bg-white/15 border border-white/5 hover:border-white/10 group"
                                    disabled={isDownloadingSubs === sub.attributes.files[0].file_id}
                                  >
                                    <div className="shrink-0">
                                      {isDownloadingSubs === sub.attributes.files[0].file_id ? (
                                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                        </div>
                                      ) : (
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                                          <Download className="w-5 h-5" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-white/90 group-hover:text-primary transition-colors leading-snug line-clamp-2">
                                        {sub.attributes.release || t('watch.subtitle_default')}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1.5">
                                        <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-md text-[11px] font-bold">ID</span>
                                        <span className="text-[11px] text-white/35 truncate">{sub.attributes.files[0].file_name}</span>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="py-16 text-center flex flex-col items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                  <Languages className="w-7 h-7 text-white/10" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-white/50">{t('watch.no_subtitle')}</p>
                                  <p className="text-xs text-white/25 mt-1">{t('watch.subtitle_not_available')}</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Footer */}
                          {subtitles.length > 0 && (
                            <div className="px-5 py-3 bg-white/5 border-t border-white/5 shrink-0">
                              <p className="text-[10px] text-white/20 text-center font-medium uppercase tracking-widest">Powered by OpenSubtitles</p>
                            </div>
                          )}
                        </motion.div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-1.5 md:gap-3 text-[9px] md:text-sm text-muted-foreground overflow-hidden whitespace-nowrap">
                {video.year && <span className="shrink-0">{video.year}</span>}
                {video.duration && <span className="shrink-0">• {video.duration}</span>}
                {video.genre && <span className="shrink min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">• {video.genre}</span>}
                {video.view_count > 0 && <span className="shrink-0">• {video.view_count} views</span>}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Related Videos */}
      {filteredRelated.length > 0 && (
        <div className="pb-16">
          <VideoRow title={t('watch.related')} videos={filteredRelated} icon={Film} />
        </div>
      )}
    </div>
  );
}