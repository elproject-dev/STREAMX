import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAppSettings } from '@/lib/appSettings';
import { APP_VERSION, isUpdateAvailable } from '@/lib/version';
import { downloadAndInstallApk } from '@/lib/apkInstaller';
import { Button } from '@/components/ui/button';

const SESSION_CACHE_KEY = 'streamx_update_checked';
const SKIP_VERSION_KEY = 'streamx_skip_version';

export default function UpdateChecker() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [downloadError, setDownloadError] = useState(null);

  useEffect(() => {
    const checkForUpdate = async () => {
      if (sessionStorage.getItem(SESSION_CACHE_KEY)) return;
      sessionStorage.setItem(SESSION_CACHE_KEY, 'true');

      try {
        const { data } = await getAppSettings();
        if (!data) return;

        const latestVersion = data.app_version_latest;
        const currentVersion = APP_VERSION;
        const hasUpdate = isUpdateAvailable(currentVersion, latestVersion);

        if (hasUpdate) {
          const isAndroid = !!window.Capacitor?.isNativePlatform();
          const isDesktop = !!window.__TAURI__;
          
          let downloadUrl = '';
          if (isAndroid) downloadUrl = data.install_android;
          else if (isDesktop) downloadUrl = data.install_windows;
          else return;

          if (!downloadUrl) return;

          const skippedVersion = localStorage.getItem(SKIP_VERSION_KEY);
          const forceUpdate = data.force_update === true || data.force_update === 'true';

          if (skippedVersion === latestVersion && !forceUpdate) return;

          let changelog = [];
          if (data.update_changelog) {
            try {
              changelog = JSON.parse(data.update_changelog);
            } catch {
              changelog = data.update_changelog.split('\n').filter(Boolean);
            }
          }

          setUpdateInfo({
            latestVersion,
            currentVersion,
            forceUpdate,
            downloadUrl,
            title: data.update_title || 'Update Tersedia!',
            message: data.update_message || 'Versi terbaru sudah tersedia.',
            changelog,
          });
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Failed to check for updates:', error);
      }
    };
    const timer = setTimeout(checkForUpdate, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleSkip = () => {
    if (isDownloading) return;
    if (updateInfo?.latestVersion) {
      localStorage.setItem(SKIP_VERSION_KEY, updateInfo.latestVersion);
    }
    setIsOpen(false);
  };

  const handleLater = () => {
    if (isDownloading) return;
    setIsOpen(false);
  };

  const handleUpdate = async () => {
    if (!updateInfo?.downloadUrl || isDownloading) return;

    if (!!window.Capacitor?.isNativePlatform()) {
      setIsDownloading(true);
      setDownloadError(null);
      setProgress({ percent: 0, status: 'Memulai unduhan...' });
      
      const result = await downloadAndInstallApk(updateInfo.downloadUrl, (prog) => {
        setProgress(prog);
      });

      if (!result.success) {
        setDownloadError(result.message);
        setIsDownloading(false);
      }
    } else {
      window.open(updateInfo.downloadUrl, '_blank');
    }
  };

  if (!isOpen || !updateInfo) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={() => !updateInfo.forceUpdate && handleLater()}
        />
        
        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.6, bounce: 0.3 }}
          className="relative w-full max-w-[380px] sm:max-w-[420px] bg-background overflow-hidden border-0 rounded-2xl shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Gradient Header with Animation */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 px-6 pt-10 pb-12">
            {/* Animated Background Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="update-particle update-particle-1 bg-white/20 blur-md" />
              <div className="update-particle update-particle-2 bg-white/20 blur-md" />
              <div className="update-particle update-particle-3 bg-white/20 blur-md" />
            </div>

            {/* Rocket Icon Container */}
            <div className="relative flex flex-col items-center text-center transition-all duration-700">
              <div className="relative mb-6 flex items-center justify-center">
                {/* Outer Spinning Ring */}
                <div className="absolute inset-0 w-24 h-24 -ml-2 -mt-2 rounded-full border-2 border-dashed border-white/40 animate-[spin_10s_linear_infinite]" />
                {/* Inner Circle */}
                <div className="relative w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.5)] ring-2 ring-white/30 z-10 overflow-hidden">
                  {isDownloading ? (
                    <span className="text-4xl drop-shadow-lg">📥</span>
                  ) : (
                    <img src="/update.png" alt="Update Logo" className="w-12 h-12 object-contain animate-[spin_8s_linear_infinite]" />
                  )}
                </div>
                {/* Glow Effect */}
                {!isDownloading && (
                  <div className="absolute inset-0 w-20 h-20 rounded-full bg-white/30 animate-ping" style={{ animationDuration: '2s' }} />
                )}
              </div>

              <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md">
                {isDownloading ? 'Mengunduh Update...' : updateInfo.title}
              </h2>
              <p className="text-[15px] font-medium text-white/90 mt-2 max-w-[280px] leading-relaxed drop-shadow-sm">
                {isDownloading ? progress?.status || 'Memproses...' : updateInfo.message}
              </p>
            </div>

            {/* Wave Divider */}
            <div className="absolute bottom-0 left-0 right-0">
              <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-8 fill-background">
                <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C57.71,78.73,125.13,63.64,185.64,59.78,238.54,56.51,274.2,63.51,321.39,56.44Z" />
              </svg>
            </div>
          </div>

          {/* Content Body */}
          <div className="px-6 pb-6 pt-2 bg-background relative z-10">
            {isDownloading && progress ? (
              <div className="py-4 space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{progress.status}</span>
                    <span className="font-semibold text-primary">{progress.percent}%</span>
                  </div>
                  <div className="w-full h-3 bg-secondary rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-300 ease-out relative"
                      style={{ width: `${progress.percent}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent update-shimmer" />
                    </div>
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  Jangan tutup aplikasi selama proses download
                </p>
              </div>
            ) : (
              <>
                {/* Premium Version Comparison */}
                <div className="relative mx-auto flex items-center justify-between p-2 mb-8 mt-4 w-full max-w-[320px] bg-secondary/50 rounded-2xl border border-border shadow-inner">
                  {/* Current Version */}
                  <div className="flex flex-col items-center justify-center w-[38%] py-2 rounded-xl">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Saat Ini</span>
                    <span className="text-sm font-bold text-muted-foreground">v{updateInfo.currentVersion}</span>
                  </div>

                  {/* Animated Arrow Connector */}
                  <div className="relative flex items-center justify-center w-[24%] h-full overflow-hidden">
                    <div className="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2 bg-gradient-to-r from-border via-primary/60 to-primary/80 rounded-full" />
                    <div className="relative z-10 flex text-primary animate-arrow-slide">
                      <svg className="w-5 h-5 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>

                  {/* New Version (Glowing) */}
                  <div className="flex flex-col items-center justify-center w-[38%] py-2 bg-gradient-to-b from-primary/20 to-primary/5 rounded-xl border border-primary/30 shadow-[0_0_25px_-5px_rgba(var(--primary),0.4)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent update-shimmer" />
                    <span className="text-[10px] uppercase tracking-widest text-primary font-black mb-1 relative z-10">Versi Baru</span>
                    <span className="text-sm font-black text-primary drop-shadow-sm relative z-10">v{updateInfo.latestVersion}</span>
                  </div>
                </div>

                {/* Changelog */}
                {updateInfo.changelog && updateInfo.changelog.length > 0 && (
                  <div className="mb-5">
                    <div className="bg-secondary/50 rounded-xl p-4 border border-border/50">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <span>✨</span> Yang Baru
                      </p>
                      <ul className="space-y-2">
                        {updateInfo.changelog.map((item, index) => (
                          <li key={index} className="flex items-start gap-2.5 text-sm text-foreground">
                            <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                              <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Force Update Warning */}
                {updateInfo.forceUpdate && (
                  <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl text-sm">
                    <span className="text-destructive mt-0.5 text-base">⚠️</span>
                    <p className="text-destructive leading-relaxed">
                      Update ini <strong>wajib</strong> dilakukan untuk melanjutkan menggunakan aplikasi.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Download Error */}
            {downloadError && (
              <div className="mb-4 flex items-start gap-2.5 p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl text-sm">
                <span className="text-destructive mt-0.5">❌</span>
                <div>
                  <p className="text-destructive font-bold">Download gagal</p>
                  <p className="text-destructive/80 mt-0.5">{downloadError}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {!isDownloading && (
                <Button
                  onClick={handleUpdate}
                  className="group relative w-full h-14 text-[15px] font-bold rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg hover:shadow-primary/20 transition-all duration-300 active:scale-[0.98] overflow-hidden border-0"
                >
                  <div className="absolute inset-0 -translate-x-[150%] bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:update-shimmer" />
                  <span className="relative flex items-center z-10">
                    <svg className="w-5 h-5 mr-2 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {downloadError ? 'Coba Lagi' : 'Update Sekarang'}
                  </span>
                </Button>
              )}

              {!updateInfo.forceUpdate && !isDownloading && (
                <Button
                  variant="ghost"
                  onClick={handleLater}
                  className="w-full h-10 text-sm text-muted-foreground hover:text-foreground rounded-xl"
                >
                  Nanti Saja
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
