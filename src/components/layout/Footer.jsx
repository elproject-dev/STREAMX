import React from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full py-4 px-4 md:px-10 border-t border-white/5 bg-background/50 backdrop-blur-md">
      <div className="flex flex-col md:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2 opacity-70 grayscale hover:grayscale-0 transition-all duration-300 group md:flex-1">
            <span className="text-[10px] md:text-xs text-muted-foreground/80 font-medium tracking-wide uppercase group-hover:text-primary transition-colors cursor-default">
              EL PROJECT DEVELOPMENT
            </span>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6 md:flex-1 md:justify-center">
            <p className="text-[10px] md:text-xs text-muted-foreground/80 font-medium tracking-wide uppercase hover:text-primary transition-colors cursor-default whitespace-nowrap">
              &copy; {currentYear} STREAMX. All rights reserved.
            </p>
          </div>

          <div className="flex items-center gap-4 text-[10px] md:text-xs text-muted-foreground/40 font-bold uppercase tracking-widest md:flex-1 md:justify-end">
            <span className="hover:text-primary cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-primary cursor-pointer transition-colors">Terms</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
