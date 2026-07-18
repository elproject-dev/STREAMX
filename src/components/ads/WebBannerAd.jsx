import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';

export function WebBannerAd({ className, adSlot, style, adFormat = "auto", fullWidthResponsive = "true" }) {
  useEffect(() => {
    try {
      // Inisialisasi unit iklan (Google AdSense)
      // Array adsbygoogle didorong saat komponen dipasang ke DOM
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error("AdSense error", err);
    }
  }, []);

  return (
    <div className={cn("flex justify-center w-full my-4 overflow-hidden rounded-md bg-zinc-900/50 border border-white/5", className)}>
      {/* 
        Catatan: 
        1. Ganti data-ad-client dengan ID Publisher Anda (misal: ca-pub-1234567890)
        2. Ganti data-ad-slot dengan ID Unit Iklan Anda (misal: 1234567890)
        
        Selama mode development atau jika Anda belum disetujui AdSense, 
        iklan ini mungkin akan tampil kosong.
      */}
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minHeight: '90px', ...style }}
        data-ad-client="ca-pub-4330686550985391" // TODO: Ganti dengan Client ID AdSense
        data-ad-slot={adSlot || "YYYYYYYYYY"}      // TODO: Ganti dengan Slot ID AdSense
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive}
      />
      {/* Teks placeholder sementara (bisa dihapus nanti) */}
      {!adSlot && (
        <div className="absolute flex flex-col items-center justify-center p-4 text-center">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Advertisement</span>
          <span className="text-[10px] text-zinc-600">Google AdSense Space</span>
        </div>
      )}
    </div>
  );
}
