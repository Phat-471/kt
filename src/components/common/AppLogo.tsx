import React from 'react';

interface AppLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
  subtitle?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 36,
  className = '',
  showText = false,
  textClassName = '',
  subtitle = 'Hệ Thống Quản Trị Offline',
}) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div 
        className="relative shrink-0 flex items-center justify-center group"
        style={{ width: size, height: size }}
      >
        {/* Ambient Glow Background Effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 rounded-2xl blur-sm opacity-40 group-hover:opacity-80 transition duration-300" />
        
        {/* SVG Vector Logo */}
        <svg
          viewBox="0 0 512 512"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full relative z-10 drop-shadow-md transition-transform duration-300 group-hover:scale-105"
        >
          <defs>
            <linearGradient id="appLogoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#064e3b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#022c22" />
            </linearGradient>

            <linearGradient id="appLogoEmeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            <linearGradient id="appLogoTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#0d9488" />
            </linearGradient>

            <linearGradient id="appLogoGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            <linearGradient id="appLogoFacet1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.2" />
            </linearGradient>

            <linearGradient id="appLogoFacet2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#065f46" stopOpacity="0.25" />
            </linearGradient>
          </defs>

          {/* Rounded Background Badge */}
          <rect width="512" height="512" rx="128" fill="url(#appLogoBgGrad)" />
          <rect width="504" height="504" x="4" y="4" rx="124" stroke="url(#appLogoEmeraldGrad)" strokeWidth="8" strokeOpacity="0.4" fill="none" />

          {/* Isometric Cube Structure */}
          <polygon points="256,90 380,160 256,230 132,160" fill="url(#appLogoFacet2)" stroke="url(#appLogoEmeraldGrad)" strokeWidth="8" strokeLinejoin="round" />
          <polygon points="132,160 256,230 256,380 132,310" fill="url(#appLogoFacet1)" stroke="url(#appLogoTealGrad)" strokeWidth="8" strokeLinejoin="round" />
          <polygon points="380,160 256,230 256,380 380,310" fill="url(#appLogoFacet2)" stroke="url(#appLogoEmeraldGrad)" strokeWidth="8" strokeLinejoin="round" />

          {/* Financial Shield */}
          <path 
            d="M256,150 L340,195 C340,285 256,350 256,350 C256,350 172,285 172,195 Z" 
            fill="#064e3b" 
            fillOpacity="0.9" 
            stroke="url(#appLogoEmeraldGrad)" 
            strokeWidth="10" 
            strokeLinejoin="round" 
          />

          {/* Financial Growth Chart Arrow */}
          <polyline 
            points="200,280 230,250 255,270 295,215" 
            fill="none" 
            stroke="url(#appLogoGoldGrad)" 
            strokeWidth="14" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          <polygon points="290,200 315,210 305,235" fill="url(#appLogoGoldGrad)" />

          {/* Data Nodes */}
          <circle cx="200" cy="280" r="8" fill="#fde047" stroke="#b45309" strokeWidth="2" />
          <circle cx="230" cy="250" r="8" fill="#fde047" stroke="#b45309" strokeWidth="2" />
          <circle cx="255" cy="270" r="8" fill="#fde047" stroke="#b45309" strokeWidth="2" />

          {/* Top Crown Diamond */}
          <polygon points="256,120 270,135 256,150 242,135" fill="url(#appLogoGoldGrad)" />
        </svg>
      </div>

      {showText && (
        <div className={`flex flex-col ${textClassName}`}>
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-black text-sm tracking-tight text-slate-900 dark:text-slate-100">
              Kế Toán
            </span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm">
              PRO
            </span>
          </div>
          {subtitle && (
            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mt-1">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
