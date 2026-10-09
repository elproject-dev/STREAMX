import React, { useEffect, useState } from 'react';
import { ArrowLeft, Download, Smartphone, Monitor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { getAppSettings } from '@/lib/appSettings';
import { openExternalUrl } from '@/lib/openUrl';

// Deteksi Tauri runtime
const isTauri = typeof window !== 'undefined' && window.__TAURI_INTERNALS__;

export default function Install() {
  const navigate = useNavigate();

  const [appUrls, setAppUrls] = useState(() => ({
    android: localStorage.getItem('streamx_install_android') || '#',
    windows: localStorage.getItem('streamx_install_windows') || '#',
  }));

  const handleDownload = async (url) => {
    if (!url || url === '#') return;

    const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;

    try {
      openExternalUrl(normalizedUrl);
    } catch (error) {
      console.error('Error opening URL:', error);
      // Fallback
      try {
        window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data } = await getAppSettings();
      if (cancelled || !data) return;

      const next = {
        android: data.install_android || '#',
        windows: data.install_windows || '#',
      };

      setAppUrls(next);
      localStorage.setItem('streamx_install_android', next.android);
      localStorage.setItem('streamx_install_windows', next.windows);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background pt-24 md:pt-28 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <div className="flex items-center justify-center mx-auto mb-4">
            <Download className="w-12 h-12 text-primary" />
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-foreground uppercase tracking-tight">
            Instal STREAM<span className="text-primary">X</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Nikmati pengalaman menonton yang lebih stabil dan cepat dengan aplikasi resmi <span className="font-bold text-foreground">STREAM<span className="text-primary">X</span></span>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
            <div className="bg-card border border-border p-6 rounded-2xl text-left space-y-4 hover:border-primary hover:border-2 transition-all duration-300">
              <div className="flex items-center justify-between">
                <Smartphone className="w-8 h-8 text-blue-500" />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 uppercase tracking-wider">Mobile</span>
              </div>
              <h3 className="font-bold text-foreground text-lg">Android</h3>
              <p className="text-sm text-muted-foreground">Download file APK untuk dipasang di smartphone Android kamu.</p>
              <Button 
                onClick={() => handleDownload(appUrls.android)}
                className="w-full bg-primary hover:bg-primary/90"
                disabled={appUrls.android === '#'}
              >
                {appUrls.android === '#' ? 'Belum Tersedia' : 'Download APK'}
              </Button>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl text-left space-y-4 hover:border-primary hover:border-2 transition-all duration-300">
              <div className="flex items-center justify-between">
                <Monitor className="w-8 h-8 text-zinc-400" />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-400 uppercase tracking-wider">Desktop</span>
              </div>
              <h3 className="font-bold text-foreground text-lg">Windows</h3>
              <p className="text-sm text-muted-foreground">Aplikasi Desktop untuk Windows untuk PC/Laptop kamu.</p>
              <Button 
                onClick={() => handleDownload(appUrls.windows)}
                variant="secondary" 
                className="w-full"
                disabled={appUrls.windows === '#'}
              >
                {appUrls.windows === '#' ? 'Segera Hadir' : 'Download Windows App'}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
