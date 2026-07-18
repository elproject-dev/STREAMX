import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import UpdateChecker from './UpdateChecker';
import { WebBannerAd } from '../ads/WebBannerAd';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 mt-[env(safe-area-inset-top)]">
        <Outlet />
      </main>
      
      {/* Container Iklan Global di atas Footer */}
      <div className="container mx-auto px-4 max-w-7xl">
        <WebBannerAd adSlot="" />
      </div>

      <Footer />
      <UpdateChecker />
    </div>
  );
}