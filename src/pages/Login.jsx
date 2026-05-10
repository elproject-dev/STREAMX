import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Film, Eye, EyeOff, Loader2, UserPlus, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/i18n';

export default function Login() {
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  const { t } = useLanguage();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !password.trim()) {
      setError(t('login.error_empty'));
      return;
    }

    if (mode === 'signup' && !fullName.trim()) {
      setError(t('login.error_name'));
      return;
    }

    if (password.length < 6) {
      setError(t('login.error_password'));
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const result = await signup(email, password, fullName);
        if (result.success) {
          if (result.needsConfirmation) {
            setSuccess(t('login.success_signup'));
          } else {
            navigate('/');
          }
        } else {
          setError(result.error || t('login.error_signup'));
        }
      } else {
        const result = await login(email, password);
        if (result.success) {
          navigate('/');
        } else {
          setError(result.error || t('login.error_login'));
        }
      }
    } catch {
      setError(t('login.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <Film className="w-10 h-10 text-primary" />
            <span className="text-3xl font-black tracking-tight text-foreground">
              STREAM<span className="text-primary">X</span>
            </span>
          </Link>
          <p className="text-muted-foreground text-sm mt-2">
            {mode === 'login' ? t('login.login_subtitle') : t('login.signup_subtitle')}
          </p>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg px-4 py-3"
              >
                {error}
              </motion.div>
            )}

            {/* Success Message */}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm rounded-lg px-4 py-3"
              >
                {success}
              </motion.div>
            )}

            {/* Full Name (signup only) */}
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('login.fullname')}</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t('login.name_placeholder')}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('login.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.email_placeholder')}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('login.password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('login.password_placeholder')}
                  className="w-full px-4 py-2.5 pr-11 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('login.processing')}
                </>
              ) : mode === 'login' ? (
                <><LogIn className="w-4 h-4" /> {t('login.button')}</>
              ) : (
                <><UserPlus className="w-4 h-4" /> {t('login.signup_button')}</>
              )}
            </button>

            {/* Toggle Mode */}
            <div className="text-center text-sm text-muted-foreground">
              {mode === 'login' ? (
                <>
                  {t('login.no_account')}{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
                    className="text-primary hover:underline font-medium"
                  >
                    {t('login.signup_button')}
                  </button>
                </>
              ) : (
                <>
                  {t('login.has_account')}{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                    className="text-primary hover:underline font-medium"
                  >
                    {t('login.button')}
                  </button>
                </>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-muted-foreground text-xs mt-6">
          STREAMX &copy; {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  );
}
