import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';

export function WebBannerAd({ className, adSlot, style, adFormat = "auto", fullWidthResponsive = "true" }) {
  useEffect(() => {
    // Memberi jeda waktu sebentar agar browser selesai merender CSS
    // dan menghitung lebar (width) container sebelum memanggil AdSense.
    const timeoutId = setTimeout(() => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        // Kita abaikan error ini jika muncul berulang kali akibat React StrictMode
        if (!err.message.includes("availableWidth=0") && !err.message.includes("already")) {
           console.error("AdSense error:", err);
        }
      }
    }, 150);

    return () => clearTimeout(timeoutId);
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
        data-ad-client="ca-pub-4330686550985391"
        data-ad-slot={adSlot || "YYYYYYYYYY"}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive}
        {...(process.env.NODE_ENV === 'development' ? { 'data-ad-test': 'on' } : {})}
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
