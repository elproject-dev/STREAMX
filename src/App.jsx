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

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = '/login';
    return null;
  }

  return children;
};

const AppRoutes = () => {
  const { isLoadingPublicSettings, isLoadingAuth } = useAuth();

  // Show loading spinner while checking app public settings
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AppLayout />}>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/watch/:id" element={<Watch />} />
        <Route path="/search" element={<Search />} />
        <Route path="/browse/:category" element={<Browse />} />
        
        {/* Protected Routes */}
        <Route path="/manage" element={<ProtectedRoute><Manage /></ProtectedRoute>} />
        <Route path="/install" element={<ProtectedRoute><Install /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><WatchHistoryPage /></ProtectedRoute>} />
        
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
                <AppRoutes />
              </Router>
              <SonnerToaster 
                position="top-center"
                expand={false}
                richColors={false}
                style={{ marginTop: 'env(safe-area-inset-top)' }}
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: '#E50914',
                    color: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    padding: '12px 16px',
                    boxShadow: '0 10px 25px -5px rgba(229, 9, 20, 0.4)',
                  },
                  className: 'modern-toast',
                }}
              />
            </QueryClientProvider>
          </WatchHistoryProvider>
        </FavoritesProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}

export default App