import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Film, User, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { VideoStore } from '@/lib/videoStore';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/i18n';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [allVideos, setAllVideos] = useState([]);
  const profileRef = useRef(null);
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { t } = useLanguage();

  useEffect(() => {
    VideoStore.list('-created_date', 200).then(setAllVideos);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get unique genres from all videos
  const availableGenres = Array.from(new Set(
    allVideos.flatMap(v => v.genre ? v.genre.split(',').map(g => g.trim()) : [])
  )).sort();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md shadow-2xl transition-all duration-500 pt-[env(safe-area-inset-top)]">
      <div className="w-full px-4 md:px-10">
        <div className="flex items-center justify-between h-14 landscape:h-12 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Film className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            <span className="text-lg md:text-2xl font-black tracking-tight text-foreground">
              STREAM<span className="text-primary">X</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden sm:flex items-center gap-2 md:gap-4 ml-4 md:ml-10 flex-1 max-w-[60%] md:max-w-[70%] overflow-hidden">
            <Link
              to="/"
              className="text-xs md:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap shrink-0"
            >
              Home
            </Link>

            <div className="h-5 w-[1px] bg-border shrink-0 mx-1 md:mx-2 self-center" />

            <div className="relative flex-1 overflow-hidden">
              <div className="flex items-center group">
                {/* Animasi Loop Container */}
                <motion.div
                  className="flex items-center gap-6 md:gap-8 whitespace-nowrap py-1 px-4"
                  animate={{
                    x: [0, -1500], // Menyesuaikan jarak geser untuk durasi yang lebih lama
                  }}
                  transition={{
                    x: {
                      repeat: Infinity,
                      repeatType: "loop",
                      duration: 45, // Diperlambat agar lebih elegan dan smooth
                      ease: "linear",
                    },
                  }}
                >
                  {/* Render banyak kali untuk looping yang benar-benar mulus tanpa celah */}
                  {[...availableGenres, ...availableGenres, ...availableGenres, ...availableGenres, ...availableGenres].map((genre, idx) => (
                    <Link
                      key={`${genre}-${idx}`}
                      to={`/search?q=${encodeURIComponent(genre)}`}
                      className="text-xs md:text-sm font-medium text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
                    >
                      {genre}
                    </Link>
                  ))}
                </motion.div>

                {/* Gradient Fades for Smooth Edges */}
                <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Profile Dropdown / Login Button (Desktop) */}
            <div ref={profileRef} className="relative hidden sm:block">
              {user ? (
                <>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-secondary rounded-lg transition-colors"
                  >
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 md:w-4.5 md:h-4.5 text-primary" />
                      )}
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 ml-1 text-muted-foreground transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-56 bg-popover/95 backdrop-blur-md border border-border rounded-xl shadow-xl overflow-hidden z-50"
                      >
                        {/* User Info */}
                        <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center shrink-0">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{user.full_name || 'User'}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email || ''}</p>
                          </div>
                        </div>
                        <div className="py-1.5">
                          <Link
                            to="/favorites"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                          >
                            {t('nav.favorites')}
                          </Link>
                          <Link
                            to="/history"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                          >
                            {t('nav.history')}
                          </Link>
                          <Link
                            to="/profile"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                          >
                            {t('nav.settings')}
                          </Link>

                          {isAdmin && (
                            <Link
                              to="/manage"
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                            >
                              {t('nav.manage')}
                            </Link>
                          )}

                          <Link
                            to="/install"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-yellow-500 font-medium hover:text-yellow-400 hover:bg-secondary/80 transition-colors"
                          >
                            {t('nav.install')}
                          </Link>
                          <button
                            onClick={() => { setProfileOpen(false); logout(); }}
                            className="w-full px-4 py-2 text-sm text-destructive hover:bg-secondary/80 transition-colors text-left"
                          >
                            {t('nav.logout')}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <Link
                  to="/login"
                  className="text-primary hover:text-primary/80 text-sm md:text-base font-bold transition-colors"
                >
                  {t('login.button')}
                </Link>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-1.5 hover:bg-secondary rounded-lg shrink-0"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu (Only for Portrait) */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="sm:hidden overflow-hidden border-t border-border"
            >
              <div className="py-4 space-y-1">
                {/* Mobile Profile Section (paling atas) */}
                {user ? (
                  <div className="pb-3 mb-2 border-b border-border">
                    <div className="px-4 flex flex-row-reverse items-center justify-between gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center shrink-0">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{user.full_name || 'User'}</p>
                        <p className="text-sm text-muted-foreground truncate">{user.email || ''}</p>
                      </div>
                    </div>
                    <Link
                      to="/favorites"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                    >
                      {t('nav.favorites')}
                    </Link>
                    <Link
                      to="/history"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                    >
                      {t('nav.history')}
                    </Link>
                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                    >
                      {t('nav.settings')}
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/manage"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                      >
                        {t('nav.manage')}
                      </Link>
                    )}

                    <Link
                      to="/install"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-3 text-sm font-medium text-yellow-500 hover:text-yellow-400 hover:bg-secondary rounded-lg transition-colors"
                    >
                      {t('nav.install')}
                    </Link>
                    <button
                      onClick={() => { setMobileMenuOpen(false); logout(); }}
                      className="block w-full px-4 py-3 text-sm font-medium text-destructive hover:bg-secondary rounded-lg transition-colors text-left"
                    >
                      {t('nav.logout')}
                    </button>
                  </div>
                ) : (
                  <div className="pb-3 mb-2 border-b border-border px-4">
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
                    >
                      {t('login.button')} / {t('login.signup_button')}
                    </Link>
                  </div>
                )}

                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                >
                  Home
                </Link>

                {/* Mobile Genre List (Tampil Semua) */}
                <div className="border-t border-border pt-2 mt-2">
                  <p className="px-4 py-2 text-xs font-bold text-yellow-500 uppercase tracking-wider">
                    Genre
                  </p>
                  <div className="grid grid-cols-2 gap-x-2">
                    {availableGenres.map((genre) => (
                      <Link
                        key={genre}
                        to={`/search?q=${encodeURIComponent(genre)}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                      >
                        {genre}
                      </Link>
                    ))}
                  </div>
                  {availableGenres.length === 0 && (
                    <p className="px-4 py-2 text-xs text-muted-foreground italic">Belum ada genre</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}