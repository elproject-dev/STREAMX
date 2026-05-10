import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Loader2, Camera, Type, ChevronDown, Check, Globe, Download, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { getAppSettings, saveAppSettings } from '@/lib/appSettings';
import { toast } from 'sonner';

export default function Profile() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.app_metadata?.role === 'admin';
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);
  const fontRef = useRef(null);
  const [appLangOpen, setAppLangOpen] = useState(false);
  const appLangRef = useRef(null);
  const { language: appLang, setLanguage: setAppLang, t } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  const FONT_SIZES = [
    { key: 'font.small', value: '14px' },
    { key: 'font.normal', value: '16px' },
    { key: 'font.large', value: '18px' },
    { key: 'font.xlarge', value: '20px' },
  ];

  const LANGUAGES_APP = [
    { label: 'English', value: 'en' },
    { label: 'Indonesia', value: 'id' },
  ];

  const LANGUAGES_SUB = [
    { label: 'Indonesia', value: 'id' },
    { label: 'English', value: 'en' },
    { label: 'Español', value: 'es' },
    { label: 'Français', value: 'fr' },
    { label: 'Deutsch', value: 'de' },
    { label: '日本語', value: 'ja' },
    { label: '한국어', value: 'ko' },
    { label: '中文', value: 'zh' },
    { label: 'العربية', value: 'ar' },
    { label: 'Português', value: 'pt' },
    { label: 'Русский', value: 'ru' },
  ];

  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem('streamx_font_size') || '16px';
  });

  const [appUrls, setAppUrls] = useState({
    android: localStorage.getItem('streamx_install_android') || '',
    windows: localStorage.getItem('streamx_install_windows') || ''
  });
  const [playerUrl, setPlayerUrl] = useState(localStorage.getItem('streamx_player_url') || 'https://vidsrcme.ru/embed/');
  const [uploadingApp, setUploadingApp] = useState({ android: false, windows: false });
  const androidInputRef = useRef(null);
  const windowsInputRef = useRef(null);

  const [subtitleLang, setSubtitleLang] = useState(() => {
    return localStorage.getItem('streamx_subtitle_lang') || 'id';
  });

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      if (!isAdmin) return;

      const { data } = await getAppSettings();
      if (cancelled || !data) return;

      if (typeof data.install_android === 'string') {
        setAppUrls((prev) => ({ ...prev, android: data.install_android || '' }));
        localStorage.setItem('streamx_install_android', data.install_android || '');
      }
      if (typeof data.install_windows === 'string') {
        setAppUrls((prev) => ({ ...prev, windows: data.install_windows || '' }));
        localStorage.setItem('streamx_install_windows', data.install_windows || '');
      }
      if (typeof data.player_url === 'string' && data.player_url) {
        setPlayerUrl(data.player_url);
        localStorage.setItem('streamx_player_url', data.player_url);
      }
    };

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    document.documentElement.style.fontSize = fontSize;
    localStorage.setItem('streamx_font_size', fontSize);
    localStorage.setItem('streamx_install_android', appUrls.android);
    localStorage.setItem('streamx_install_windows', appUrls.windows);
    localStorage.setItem('streamx_player_url', playerUrl);
  }, [fontSize, appUrls, playerUrl]);

  useEffect(() => {
    localStorage.setItem('streamx_subtitle_lang', subtitleLang);
  }, [subtitleLang]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (fontRef.current && !fontRef.current.contains(e.target)) {
        setFontOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false);
      }
      if (appLangRef.current && !appLangRef.current.contains(e.target)) {
        setAppLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error(t('toast.name_required'));
      return;
    }
    setSaving(true);
    setSaved(false);

    if (isAdmin) {
      const { error } = await saveAppSettings({
        install_android: appUrls.android,
        install_windows: appUrls.windows,
        player_url: playerUrl,
      });

      if (error) {
        setSaving(false);
        toast.error(error.message);
        return;
      }
    }

    const result = await updateProfile({ 
      full_name: fullName.trim(), 
      avatar_url: avatarUrl.trim(), 
      font_size: fontSize,
      subtitle_lang: subtitleLang 
    });
    setSaving(false);
    if (result.success) {
      setSaved(true);
      toast.success(t('toast.profile_saved'));
      setTimeout(() => setSaved(false), 2000);
    } else {
      toast.error(result.error || t('toast.profile_failed'));
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('toast.image_only'));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('toast.file_too_large'));
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const folder = user.id;
      const filePath = `${folder}/avatar.${ext}`;

      // Hapus semua file lama di folder user sebelum upload yang baru
      const { data: existingFiles } = await supabase.storage
        .from('avatars')
        .list(folder, { limit: 100 });

      if (existingFiles && existingFiles.length > 0) {
        const pathsToRemove = existingFiles.map(f => `${folder}/${f.name}`);
        await supabase.storage.from('avatars').remove(pathsToRemove);
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(t('toast.avatar_failed') + ': ' + uploadError.message);
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const url = publicUrl + '?t=' + Date.now();
      setAvatarUrl(url);

      // Auto-save avatar_url ke user_metadata
      const result = await updateProfile({ avatar_url: url });
      if (result.success) {
        toast.success(t('toast.avatar_updated'));
      } else {
        toast.error(t('toast.avatar_failed'));
      }
    } catch {
      toast.error(t('toast.avatar_failed'));
    } finally {
      setUploading(false);
    }
  };

  const handleAppUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingApp(prev => ({ ...prev, [type]: true }));
    try {
      const fileExt = file.name.split('.').pop();
      // Menggunakan nama file yang lebih profesional sesuai permintaan
      const fileName = type === 'android' ? `streamX-Latest.${fileExt}` : `streamX-Latest-Windows.${fileExt}`;
      const filePath = `apps/${fileName}`;

      // Tambahkan opsi upsert: true untuk menimpa file yang sudah ada
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      // Tambahkan timestamp di akhir URL agar browser tidak mengambil cache file lama
      const finalUrl = `${publicUrl}?t=${Date.now()}`;

      const newUrls = { ...appUrls, [type]: finalUrl };
      setAppUrls(newUrls);
      localStorage.setItem(`streamx_install_${type}`, finalUrl);
      
      toast.success(`${type === 'android' ? 'APK Android' : 'Aplikasi Windows'} berhasil diperbarui!`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Gagal upload: ${error.message}`);
    } finally {
      setUploadingApp(prev => ({ ...prev, [type]: false }));
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20 md:pt-24 pb-10 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">{t('profile.title')}</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-xl space-y-6"
        >
          {/* Avatar & Info - avatar kanan, info kiri */}
          <div className="flex flex-row-reverse items-center gap-4">
            {/* Info - kiri */}
            <div className="flex-1 min-w-0">
              <h2 className="text-base md:text-lg font-bold text-foreground truncate">{fullName || 'Pengguna'}</h2>
              <p className="text-sm text-muted-foreground truncate">{user?.email || ''}</p>
            </div>
            {/* Avatar - kanan */}
            <div className="relative group shrink-0">
              <div className="w-16 h-16 md:w-24 md:h-24 rounded-full overflow-hidden bg-secondary border-2 border-border">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-6 h-6 md:w-10 md:h-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              <label className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all">
                <Camera className="w-5 h-5 md:w-6 md:h-6 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 md:w-6 md:h-6 text-white animate-spin" />
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center hidden md:block">{t('profile.upload_hint')}</p>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Full Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('profile.username')}</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t('profile.username_placeholder')}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-sm"
            />
          </div>

          {/* Email (readonly) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('profile.email')}</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-muted-foreground text-sm cursor-not-allowed"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Font Size */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-muted-foreground" />
              <label className="text-sm font-medium text-foreground">{t('profile.font_size')}</label>
            </div>
            <div ref={fontRef} className="relative">
              <button
                onClick={() => setFontOpen(!fontOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-background border border-border rounded-lg text-foreground hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-sm"
              >
                <span>{t(FONT_SIZES.find(s => s.value === fontSize)?.key || 'font.normal')}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${fontOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {fontOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-0 right-0 top-full mt-1 bg-popover/95 backdrop-blur-md border border-border rounded-xl shadow-xl overflow-hidden z-50"
                  >
                    <div className="py-1">
                      {FONT_SIZES.map((size) => (
                        <button
                          key={size.value}
                          onClick={() => { setFontSize(size.value); setFontOpen(false); }}
                          className="flex items-center justify-between w-full px-4 py-2.5 text-sm hover:bg-secondary/80 transition-colors"
                        >
                          <span className={fontSize === size.value ? 'text-primary font-medium' : 'text-muted-foreground'}>{t(size.key)}</span>
                          {fontSize === size.value && <Check className="w-4 h-4 text-primary" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Subtitle Language */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <label className="text-sm font-medium text-foreground">{t('profile.language')}</label>
            </div>
            <div ref={appLangRef} className="relative">
              <button
                onClick={() => setAppLangOpen(!appLangOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-background border border-border rounded-lg text-foreground hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-sm"
              >
                <span>{LANGUAGES_APP.find(l => l.value === appLang)?.label || 'English'}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${appLangOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {appLangOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-0 right-0 top-full mt-1 bg-popover/95 backdrop-blur-md border border-border rounded-xl shadow-xl overflow-hidden z-50"
                  >
                    <div className="py-1">
                      {LANGUAGES_APP.map((lang) => (
                        <button
                          key={lang.value}
                          onClick={() => { setAppLang(lang.value); setAppLangOpen(false); }}
                          className="flex items-center justify-between w-full px-4 py-2.5 text-sm hover:bg-secondary/80 transition-colors"
                        >
                          <span className={appLang === lang.value ? 'text-primary font-medium' : 'text-muted-foreground'}>{lang.label}</span>
                          {appLang === lang.value && <Check className="w-4 h-4 text-primary" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Subtitle Search Language */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <label className="text-sm font-medium text-foreground">Subtitle Search Language</label>
            </div>
            <div ref={langRef} className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-background border border-border rounded-lg text-foreground hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-sm"
              >
                <span>{LANGUAGES_SUB.find(l => l.value === subtitleLang)?.label || 'Indonesia'}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${langOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-0 right-0 top-full mt-1 bg-popover/95 backdrop-blur-md border border-border rounded-xl shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto"
                  >
                    <div className="py-1">
                      {LANGUAGES_SUB.map((lang) => (
                        <button
                          key={lang.value}
                          onClick={() => { setSubtitleLang(lang.value); setLangOpen(false); }}
                          className="flex items-center justify-between w-full px-4 py-2.5 text-sm hover:bg-secondary/80 transition-colors"
                        >
                          <span className={subtitleLang === lang.value ? 'text-primary font-medium' : 'text-muted-foreground'}>{lang.label}</span>
                          {subtitleLang === lang.value && <Check className="Check w-4 h-4 text-primary" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* App Links Card (Admin Only) */}
          {(user?.role === 'admin' || user?.app_metadata?.role === 'admin') && (
            <>
              <div className="border-t border-border pt-6" />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-bold text-foreground">Link Install Aplikasi (Admin)</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {/* Android */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground flex justify-between">
                      URL Android Apps
                      <span className="italic text-[10px] text-zinc-600">URL atau Upload</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={appUrls.android}
                        onChange={(e) => setAppUrls({ ...appUrls, android: e.target.value })}
                        placeholder="masukkan link apk..."
                        className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <input
                        type="file"
                        ref={androidInputRef}
                        className="hidden"
                        accept=".apk"
                        onChange={(e) => handleAppUpload(e, 'android')}
                      />
                      <button
                        type="button"
                        onClick={() => androidInputRef.current?.click()}
                        disabled={uploadingApp.android}
                        className="p-2 border border-border rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
                      >
                        {uploadingApp.android ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Windows */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground flex justify-between">
                      URL Windows Apps
                      <span className="italic text-[10px] text-zinc-600">URL atau Upload</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={appUrls.windows}
                        onChange={(e) => setAppUrls({ ...appUrls, windows: e.target.value })}
                        placeholder="masukkan link exe..."
                        className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <input
                        type="file"
                        ref={windowsInputRef}
                        className="hidden"
                        accept=".exe,.msi"
                        onChange={(e) => handleAppUpload(e, 'windows')}
                      />
                      <button
                        type="button"
                        onClick={() => windowsInputRef.current?.click()}
                        disabled={uploadingApp.windows}
                        className="p-2 border border-border rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
                      >
                        {uploadingApp.windows ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-6" />
              <div className="space-y-4 pb-4">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-bold text-foreground">Konfigurasi Media Player (Admin)</h3>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    URL Media Player (Embed)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={playerUrl}
                      onChange={(e) => setPlayerUrl(e.target.value)}
                      placeholder="https://vidsrcme.ru/embed/..."
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    URL dasar untuk player video (contoh: VidSrc). Digunakan sebagai fallback jika server player utama bermasalah.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>                {t('profile.saving')}              </>            ) : saved ? (
              <>                {t('profile.saved')}
              </>
            ) : (
              t('profile.save')
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
