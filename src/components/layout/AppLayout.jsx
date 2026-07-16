import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import UpdateChecker from './UpdateChecker';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 mt-[env(safe-area-inset-top)]">
        <Outlet />
      </main>
      <Footer />
      <UpdateChecker />
    </div>
  );
}