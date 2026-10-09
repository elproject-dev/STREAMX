import React, { useState } from 'react';
import { Film, Eye, EyeOff, Loader2, UserPlus, LogIn, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/i18n';
import * as Dialog from '@radix-ui/react-dialog';

export default function LoginModal({ isOpen, onOpenChange }) {
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

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setMode('login');
      setEmail('');
      setPassword('');
      setFullName('');
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !password.trim()) {
      setError(t('login.error_empty') || 'Email and password are required');
      return;
    }

    if (mode === 'signup' && !fullName.trim()) {
      setError(t('login.error_name') || 'Full name is required');
      return;
    }

    if (password.length < 6) {
      setError(t('login.error_password') || 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const result = await signup(email, password, fullName);
        if (result.success) {
          if (result.needsConfirmation) {
            setSuccess(t('login.success_signup') || 'Please check your email to confirm registration');
          } else {
            onOpenChange(false); // Close on success
          }
        } else {
          setError(result.error || t('login.error_signup') || 'Signup failed');
        }
      } else {
        const result = await login(email, password);
        if (result.success) {
          onOpenChange(false); // Close on success
        } else {
          setError(result.error || t('login.error_login') || 'Login failed');
        }
      }
    } catch {
      setError(t('login.error_generic') || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.3, type: "spring", bounce: 0.2 }}
                className="fixed left-[50%] top-[50%] z-[201] w-full max-w-md translate-x-[-50%] translate-y-[-50%] p-4 focus:outline-none"
              >
                <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">

                  {/* Background effects */}
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

                  <Dialog.Close asChild>
                    <button
                      className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors outline-none z-10"
                      aria-label="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </Dialog.Close>

                  {/* Logo */}
                  <div className="text-center mb-8 mt-2 relative z-10">
                    <div className="inline-flex items-center gap-2">
                      <Film className="w-8 h-8 text-primary" />
                      <span className="text-2xl font-black tracking-tight text-foreground">
                        STREAM<span className="text-primary">X</span>
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm mt-2">
                      {mode === 'login'
                        ? (t('login.login_subtitle') || 'Login to unlock full access')
                        : (t('login.signup_subtitle') || 'Create a new account')}
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
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
                    <AnimatePresence mode="popLayout">
                      {mode === 'signup' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2 overflow-hidden"
                        >
                          <label className="text-sm font-medium text-foreground">{t('login.fullname') || 'Full Name'}</label>
                          <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder={t('login.name_placeholder') || 'John Doe'}
                            className="w-full px-4 py-2.5 bg-background/50 backdrop-blur-sm border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Email */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{t('login.email') || 'Email'}</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('login.email_placeholder') || 'you@example.com'}
                        className="w-full px-4 py-2.5 bg-background/50 backdrop-blur-sm border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                        autoComplete="email"
                      />
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{t('login.password') || 'Password'}</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={t('login.password_placeholder') || '••••••••'}
                          className="w-full px-4 py-2.5 pr-11 bg-background/50 backdrop-blur-sm border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
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
                      className="w-full py-2.5 mt-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t('login.processing') || 'Processing...'}
                        </>
                      ) : mode === 'login' ? (
                        <><LogIn className="w-4 h-4" /> {t('login.button') || 'Login'}</>
                      ) : (
                        <><UserPlus className="w-4 h-4" /> {t('login.signup_button') || 'Sign Up'}</>
                      )}
                    </button>

                    {/* Toggle Mode */}
                    <div className="text-center text-sm text-muted-foreground pt-4">
                      {mode === 'login' ? (
                        <>
                          {t('login.no_account') || "Don't have an account?"}{' '}
                          <button
                            type="button"
                            onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
                            className="text-primary hover:underline font-medium"
                          >
                            {t('login.signup_button') || 'Sign Up'}
                          </button>
                        </>
                      ) : (
                        <>
                          {t('login.has_account') || "Already have an account?"}{' '}
                          <button
                            type="button"
                            onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                            className="text-primary hover:underline font-medium"
                          >
                            {t('login.button') || 'Login'}
                          </button>
                        </>
                      )}
                      <div className="mt-5">
                        <button
                          type="button"
                          onClick={() => onOpenChange(false)}
                          className="text-muted-foreground hover:text-foreground hover:underline transition-colors text-xs font-medium"
                        >
                          Not Now
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
