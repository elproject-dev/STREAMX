import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PlayCircle, Monitor, Smartphone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAppSettings } from '@/lib/appSettings';
import { toast } from 'sonner';
import { isTauri } from '@tauri-apps/api/core';
import { openExternalUrl } from '@/lib/openUrl';

export default function WelcomePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [downloadUrls, setDownloadUrls] = useState({ android: '', windows: '' });

  useEffect(() => {
    // Cek apakah user sudah melihat popup di sesi ini
    const hasSeen = sessionStorage.getItem('streamx_welcome_seen');
    
    // Jangan tampilkan jika berjalan di native Android/Windows (Capacitor/Tauri)
    const isAndroid = typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform();
    let isDesktop = false;
    try {
      isDesktop = isTauri();
    } catch(e) {}

    if (!hasSeen && !isAndroid && !isDesktop) {
      // Beri sedikit jeda (delay) sebelum popup muncul agar tidak mengagetkan
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const [isLoadingLinks, setIsLoadingLinks] = useState(true);

  useEffect(() => {
    // Ambil link download terbaru
    const fetchDownloadLinks = async () => {
      try {
        const data = await getAppSettings();
        if (data && data.data) {
          setDownloadUrls({
            android: data.data.install_android || '',
            windows: data.data.install_windows || ''
          });
        }
      } catch (error) {
        console.error('Gagal mengambil link download:', error);
      } finally {
        setIsLoadingLinks(false);
      }
    };
    fetchDownloadLinks();
  }, []);

  const handleDownload = (os) => {
    const url = downloadUrls[os];
    if (!url) {
      toast.error(`Link unduhan untuk ${os} belum tersedia saat ini.`);
      return;
    }
    openExternalUrl(url);
    handleClose();
  };

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('streamx_welcome_seen', 'true');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay Gelap/Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md md:max-w-xl aspect-[4/5] sm:aspect-square flex flex-col bg-card/90 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(229,9,20,0.3)]"
            >
              {/* Tombol Close */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header Image / Dekorasi */}
              <div className="relative h-1/2 min-h-[140px] w-full bg-gradient-to-br from-primary/40 to-primary/5 flex flex-col items-center justify-center gap-4 overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1574267432553-4b4628081524?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay" />
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />

                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                  className="relative z-10 w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30 shadow-[0_0_30px_rgba(229,9,20,0.5)]"
                >
                  <PlayCircle className="w-10 h-10 text-primary drop-shadow-[0_0_15px_rgba(229,9,20,0.8)]" />
                </motion.div>

                {/* Logo STREAMX */}
                <div className="absolute bottom-4 left-0 right-0 z-10 text-3xl md:text-4xl font-black tracking-tight text-white drop-shadow-lg text-center">
                  STREAM<span className="text-primary drop-shadow-[0_0_10px_rgba(229,9,20,0.8)]">X</span>
                </div>
              </div>

              {/* Konten Text */}
              <div className="p-4 sm:p-8 pt-5 sm:pt-6 flex-1 flex flex-col justify-start text-center w-full overflow-hidden">

                <h2 className="text-[1.1rem] sm:text-xl md:text-2xl font-bold text-white mb-3 tracking-tighter sm:tracking-tight whitespace-nowrap">
                  Nikmati Pengalaman Menonton Film Gratis!
                </h2>

                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed mb-4 sm:mb-6 px-2">
                  <span className="block mb-1 sm:mb-2 text-white/90 font-medium text-[11px] sm:text-sm whitespace-nowrap tracking-tighter sm:tracking-normal">Sekarang STREAMX tersedia untuk perangkat Android &amp; Windows.</span>
                  Unduh aplikasinya sekarang juga!
                </p>

                <div className="flex flex-col gap-2 sm:gap-3 w-full">
                  {/* Tombol Android */}
                  <Button
                    onClick={() => handleDownload('android')}
                    disabled={isLoadingLinks}
                    className="w-full py-4 sm:py-5 rounded-2xl bg-[#3DDC84] hover:bg-[#3DDC84]/90 text-black font-bold text-sm sm:text-base shadow-[0_0_15px_rgba(61,220,132,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isLoadingLinks ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Smartphone className="w-5 h-5 mr-2" />}
                    Unduh Android
                  </Button>
                  
                  {/* Tombol Windows */}
                  <Button
                    onClick={() => handleDownload('windows')}
                    disabled={isLoadingLinks}
                    className="w-full py-4 sm:py-5 rounded-2xl bg-[#0078D4] hover:bg-[#0078D4]/90 text-white font-bold text-sm sm:text-base shadow-[0_0_15px_rgba(0,120,212,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isLoadingLinks ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Monitor className="w-5 h-5 mr-2" />}
                    Unduh Windows
                  </Button>
                </div>

                <button
                  onClick={handleClose}
                  className="mt-3 sm:mt-4 text-[10px] sm:text-xs text-muted-foreground hover:text-white transition-colors underline underline-offset-4"
                >
                  Nanti saja
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
