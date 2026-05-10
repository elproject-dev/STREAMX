import { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'streamx_language';

const translations = {
  id: {
    // Navbar
    'nav.home': 'Home',
    'nav.genre': 'Genre',
    'nav.settings': 'Pengaturan',
    'nav.manage': 'Kelola Video',
    'nav.favorites': 'Favorit',
    'nav.history': 'Riwayat',
    'nav.install': 'Install StreamX',
    'nav.logout': 'Keluar',

    // Profile
    'profile.title': 'Pengaturan Profil',
    'profile.username': 'Nama Pengguna',
    'profile.username_placeholder': 'Nama Anda',
    'profile.email': 'Email',
    'profile.font_size': 'Ukuran Font',
    'profile.language': 'Bahasa',
    'profile.save': 'Simpan',
    'profile.saving': 'Menyimpan...',
    'profile.saved': 'Tersimpan!',
    'profile.upload_hint': 'Klik foto untuk mengunggah',

    // Font sizes
    'font.small': 'Kecil',
    'font.normal': 'Normal',
    'font.large': 'Besar',
    'font.xlarge': 'Sangat Besar',

    // Languages
    'lang.indonesian': 'Indonesia',
    'lang.english': 'Inggris',

    // Watch
    'watch.play': 'Putar',
    'watch.back': 'Kembali',
    'watch.subtitle': 'Subtitle',
    'watch.related': 'Video Terkait',
    'watch.not_found': 'Video Tidak Ditemukan',
    'watch.cannot_play': 'Video Tidak Dapat Diputar',
    'watch.add_tmdb': 'Tambahkan TMDB ID di Kelola Video.',
    'watch.select_server': 'Pilih Server',
    'watch.search_subtitle': 'Mencari subtitle...',
    'watch.no_subtitle': 'Tidak ada subtitle ditemukan',
    'watch.download_subtitle': 'Unduh file .srt untuk film ini',
    'watch.subtitle_pilihan': 'Pilihan',
    'watch.searching_wait': 'Mohon tunggu sebentar',
    'watch.subtitle_not_available': 'Subtitle Indonesia belum tersedia untuk film ini',
    'watch.subtitle_default': 'Subtitle Indonesia',
    'watch.fullscreen': 'Layar Penuh',
    'watch.back_home': 'Kembali ke Home',
    'watch.tmdb_not_found': 'TMDB ID tidak ditemukan',
    'watch.subtitle_invalid': 'File subtitle tidak valid atau terlalu kecil',
    'watch.subtitle_saved': 'Subtitle berhasil disimpan',
    'watch.subtitle_downloaded': 'Subtitle berhasil diunduh',
    'watch.subtitle_open_link': 'Membuka link unduhan di tab baru',
    'watch.subtitle_download_fail': 'Gagal mengunduh subtitle',
    'watch.subtitle_process_fail': 'Gagal memproses unduhan subtitle',
    'watch.subtitle_search_fail': 'Gagal mencari subtitle',
    'watch.save_subtitle': 'Simpan Subtitle',

    // Watch History
    'history.title': 'Riwayat Tontonan',
    'history.empty': 'Belum ada riwayat',
    'history.empty_desc': 'Video yang Anda tonton akan otomatis tersimpan di sini.',
    'history.clear': 'Hapus Semua',
    'history.cleared': 'Riwayat tontonan dihapus',

    // Favorites
    'favorites.title': 'Favorit Saya',
    'favorites.empty': 'Belum ada favorit',
    'favorites.empty_desc': 'Klik bintang ⭐ pada film untuk menambahkan ke daftar favorit Anda.',
    'favorites.clear': 'Hapus Semua',
    'favorites.cleared': 'Semua favorit dihapus',

    // Home
    'home.search_placeholder': 'Cari film atau genre...',
    'home.search_results': 'Menampilkan {count} hasil untuk "{query}"',
    'home.popular': 'Paling Populer',
    'home.today_pick': 'Pilihan Hari Ini',
    'home.newly_added': 'Baru Ditambahkan',
    'home.my_favorites': 'Favorit Saya',
    'home.no_videos': 'Belum Ada Video',
    'home.no_videos_desc': 'Mulai tambahkan video dari Google Drive untuk membangun koleksi streaming Anda.',
    'home.add_video': 'Tambah Video',
    'home.no_results': 'Tidak ada hasil',
    'home.no_results_desc': 'Tidak dapat menemukan video yang cocok dengan "{query}"',
    'home.clear_search': 'Hapus Pencarian',

    // Login
    'login.title': 'Masuk ke STREAMX',
    'login.signup_title': 'Daftar STREAMX',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.fullname': 'Nama Lengkap',
    'login.button': 'Masuk',
    'login.signup_button': 'Daftar',
    'login.no_account': 'Belum punya akun?',
    'login.has_account': 'Sudah punya akun?',
    'login.login_subtitle': 'Masuk ke akun Anda',
    'login.signup_subtitle': 'Buat akun baru',
    'login.email_placeholder': 'Masukkan Email',
    'login.password_placeholder': 'Masukkan Password',
    'login.name_placeholder': 'Nama Anda',
    'login.processing': 'Memproses...',
    'login.error_empty': 'Email dan password harus diisi',
    'login.error_name': 'Nama lengkap harus diisi',
    'login.error_password': 'Password minimal 6 karakter',
    'login.error_generic': 'Terjadi kesalahan',
    'login.error_login': 'Login gagal',
    'login.error_signup': 'Registrasi gagal',
    'login.success_signup': 'Registrasi berhasil! Silakan cek email Anda untuk konfirmasi.',
    'login.signup_link': 'Daftar sekarang',
    'login.login_link': 'Masuk',
    'login.confirm_email': 'Cek email Anda untuk konfirmasi pendaftaran.',
    'login.welcome': 'Selamat datang!',

    // Home
    // Manage
    'manage.title': 'Kelola Video',

    // Toast
    'toast.profile_saved': 'Profil berhasil disimpan',
    'toast.profile_failed': 'Gagal menyimpan profil',
    'toast.name_required': 'Nama tidak boleh kosong',
    'toast.avatar_updated': 'Foto profil berhasil diperbarui',
    'toast.avatar_failed': 'Gagal mengunggah foto',
    'toast.image_only': 'File harus berupa gambar',
    'toast.file_too_large': 'Ukuran file maksimal 2MB',

    // General
    'general.views': 'views',
    'general.new': 'Baru saja',
  },
  en: {
    // Navbar
    'nav.home': 'Home',
    'nav.genre': 'Genre',
    'nav.settings': 'Settings',
    'nav.manage': 'Manage Videos',
    'nav.favorites': 'Favorites',
    'nav.history': 'History',
    'nav.install': 'Install StreamX',
    'nav.logout': 'Logout',

    // Profile
    'profile.title': 'Profile Settings',
    'profile.username': 'Username',
    'profile.username_placeholder': 'Your Name',
    'profile.email': 'Email',
    'profile.font_size': 'Font Size',
    'profile.language': 'Language',
    'profile.save': 'Save',
    'profile.saving': 'Saving...',
    'profile.saved': 'Saved!',
    'profile.upload_hint': 'Click photo to upload',

    // Font sizes
    'font.small': 'Small',
    'font.normal': 'Normal',
    'font.large': 'Large',
    'font.xlarge': 'Extra Large',

    // Languages
    'lang.indonesian': 'Indonesian',
    'lang.english': 'English',

    // Watch
    'watch.play': 'Play',
    'watch.back': 'Back',
    'watch.subtitle': 'Subtitle',
    'watch.related': 'Related Videos',
    'watch.not_found': 'Video Not Found',
    'watch.cannot_play': 'Video Cannot Be Played',
    'watch.add_tmdb': 'Add TMDB ID in Manage Videos.',
    'watch.select_server': 'Select Server',
    'watch.search_subtitle': 'Searching subtitles...',
    'watch.no_subtitle': 'No subtitles found',
    'watch.download_subtitle': 'Download .srt file for this movie',
    'watch.subtitle_pilihan': 'Selected',
    'watch.searching_wait': 'Please wait a moment',
    'watch.subtitle_not_available': 'Subtitle is not yet available for this movie',
    'watch.subtitle_default': 'Subtitle',
    'watch.fullscreen': 'Fullscreen',
    'watch.back_home': 'Back to Home',
    'watch.tmdb_not_found': 'TMDB ID not found',
    'watch.subtitle_invalid': 'Invalid subtitle file or too small',
    'watch.subtitle_saved': 'Subtitle saved successfully',
    'watch.subtitle_downloaded': 'Subtitle downloaded successfully',
    'watch.subtitle_open_link': 'Opening download link in new tab',
    'watch.subtitle_download_fail': 'Failed to download subtitle',
    'watch.subtitle_process_fail': 'Failed to process subtitle download',
    'watch.subtitle_search_fail': 'Failed to search subtitles',
    'watch.save_subtitle': 'Save Subtitle',

    // Watch History
    'history.title': 'Watch History',
    'history.empty': 'No history yet',
    'history.empty_desc': 'Videos you watch will automatically be saved here.',
    'history.clear': 'Clear All',
    'history.cleared': 'Watch history cleared',

    // Favorites
    'favorites.title': 'My Favorites',
    'favorites.empty': 'No favorites yet',
    'favorites.empty_desc': 'Click the ⭐ star on a movie to add it to your favorites list.',
    'favorites.clear': 'Clear All',
    'favorites.cleared': 'All favorites cleared',

    // Home
    'home.search_placeholder': 'Search movies or genres...',
    'home.search_results': 'Showing {count} results for "{query}"',
    'home.popular': 'Most Popular',
    'home.today_pick': "Today's Picks",
    'home.newly_added': 'Newly Added',
    'home.my_favorites': 'My Favorites',
    'home.no_videos': 'No Videos Yet',
    'home.no_videos_desc': 'Start adding videos from Google Drive to build your streaming collection.',
    'home.add_video': 'Add Video',
    'home.no_results': 'No results',
    'home.no_results_desc': 'Could not find any videos matching "{query}"',
    'home.clear_search': 'Clear Search',

    // Login
    'login.title': 'Sign in to STREAMX',
    'login.signup_title': 'Sign up for STREAMX',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.fullname': 'Full Name',
    'login.button': 'Sign In',
    'login.signup_button': 'Sign Up',
    'login.no_account': "Don't have an account?",
    'login.has_account': 'Already have an account?',
    'login.login_subtitle': 'Sign in to your account',
    'login.signup_subtitle': 'Create a new account',
    'login.email_placeholder': 'Enter your email',
    'login.password_placeholder': 'Enter your password',
    'login.name_placeholder': 'Your name',
    'login.processing': 'Processing...',
    'login.error_empty': 'Email and password are required',
    'login.error_name': 'Full name is required',
    'login.error_password': 'Password must be at least 6 characters',
    'login.error_generic': 'An error occurred',
    'login.error_login': 'Login failed',
    'login.error_signup': 'Registration failed',
    'login.success_signup': 'Registration successful! Please check your email to confirm.',
    'login.signup_link': 'Sign up now',
    'login.login_link': 'Sign in',
    'login.confirm_email': 'Check your email to confirm registration.',
    'login.welcome': 'Welcome!',

    // Home
    // Manage
    'manage.title': 'Manage Videos',

    // Toast
    'toast.profile_saved': 'Profile saved successfully',
    'toast.profile_failed': 'Failed to save profile',
    'toast.name_required': 'Name cannot be empty',
    'toast.avatar_updated': 'Profile photo updated',
    'toast.avatar_failed': 'Failed to upload photo',
    'toast.image_only': 'File must be an image',
    'toast.file_too_large': 'File size max 2MB',

    // General
    'general.views': 'views',
    'general.new': 'Just now',
  },
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'en';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key, params) => {
    let str = translations[language]?.[key] || translations.en[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\{${k}\}`, 'g'), v);
      });
    }
    return str;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
