import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Jika ini adalah redirect dari konfirmasi email atau reset password, bersihkan hash di URL
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          if (window.location.hash) {
            // Hapus hash fragment tanpa reload page
            window.history.replaceState(null, null, window.location.pathname);
          }
        }
        
        const isAdmin = session.user.email === 'elproject.dev@gmail.com';
        const userData = {
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.email,
          avatar_url: session.user.user_metadata?.avatar_url || '',
          role: isAdmin ? 'admin' : (session.user.user_metadata?.role || 'user'),
        };
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setAuthChecked(true);
      setIsLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      setAppPublicSettings({ id: 'local', public_settings: {} });
      setIsLoadingPublicSettings(false);
      await checkUserAuth();
    } catch (error) {
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const isAdmin = session.user.email === 'elproject.dev@gmail.com';
        const userData = {
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.email,
          avatar_url: session.user.user_metadata?.avatar_url || '',
          role: isAdmin ? 'admin' : (session.user.user_metadata?.role || 'user'),
        };
        setUser(userData);
        setIsAuthenticated(true);
      }
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
    }
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }
    if (data.user) {
      const isAdmin = data.user.email === 'elproject.dev@gmail.com';
      const userData = {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || data.user.email,
        avatar_url: data.user.user_metadata?.avatar_url || '',
        role: isAdmin ? 'admin' : (data.user.user_metadata?.role || 'user'),
      };
      setUser(userData);
      setIsAuthenticated(true);
      return { success: true };
    }
    return { success: false, error: 'Login gagal' };
  };

  const signup = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: 'user' },
      },
    });
    if (error) {
      return { success: false, error: error.message };
    }
    if (data.user && !data.session) {
      // Email confirmation required
      return { success: true, needsConfirmation: true };
    }
    if (data.user) {
      const userData = {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || data.user.email,
        avatar_url: data.user.user_metadata?.avatar_url || '',
        role: data.user.user_metadata?.role || 'user',
      };
      setUser(userData);
      setIsAuthenticated(true);
      return { success: true };
    }
    return { success: false, error: 'Registrasi gagal' };
  };

  const logout = async (shouldRedirect = true) => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      window.location.href = '/';
    }
  };

  const updateProfile = async (updates) => {
    const { data, error } = await supabase.auth.updateUser({
      data: updates,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    if (data.user) {
      const userData = {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || data.user.email,
        avatar_url: data.user.user_metadata?.avatar_url || '',
        role: data.user.user_metadata?.role || 'user',
      };
      setUser(userData);
      return { success: true };
    }
    return { success: false, error: 'Gagal memperbarui profil' };
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      login,
      signup,
      updateProfile,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
