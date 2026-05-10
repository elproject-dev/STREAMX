import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from 'sonner';
import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { LanguageProvider } from '@/lib/i18n';
import { FavoritesProvider } from '@/lib/FavoritesContext';
import { WatchHistoryProvider } from '@/lib/WatchHistoryContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import Home from '@/pages/Home';
import Watch from '@/pages/Watch';
import Search from '@/pages/Search';
import Browse from '@/pages/Browse';
import Manage from '@/pages/Manage';
import Install from '@/pages/Install';
import Login from '@/pages/Login';
import Profile from '@/pages/Profile';
import FavoritesPage from '@/pages/Favorites';
import WatchHistoryPage from '@/pages/WatchHistoryPage';

const AuthenticatedApp = () => {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  // Not authenticated — show login page or redirect
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  // Authenticated — render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/watch/:id" element={<Watch />} />
        <Route path="/search" element={<Search />} />
        <Route path="/browse/:category" element={<Browse />} />
        <Route path="/manage" element={<Manage />} />
        <Route path="/install" element={<Install />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/history" element={<WatchHistoryPage />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};


function App() {
  // Restore font size on app load
  useEffect(() => {
    const saved = localStorage.getItem('streamx_font_size');
    if (saved) document.documentElement.style.fontSize = saved;
  }, []);

  return (
    <AuthProvider>
      <LanguageProvider>
        <FavoritesProvider>
          <WatchHistoryProvider>
            <QueryClientProvider client={queryClientInstance}>
              <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <AuthenticatedApp />
              </Router>
              <Toaster />
              <SonnerToaster richColors />
            </QueryClientProvider>
          </WatchHistoryProvider>
        </FavoritesProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}

export default App