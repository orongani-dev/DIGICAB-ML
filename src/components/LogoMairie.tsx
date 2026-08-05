import { motion } from 'motion/react';

export default function LogoMairie({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center justify-center p-1 rounded-full bg-white shadow-2xl border-2 border-gold ring-4 ring-navy/10 ${className}`}
    >
      <div className="relative w-full h-full rounded-full flex flex-col items-center justify-center bg-white overflow-hidden p-1.5">
        {/* Heraldic Shield Representation - Authentic Libreville Seal Colors */}
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <defs>
             <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#D4AF37" />
                <stop offset="50%" stopColor="#F9E076" />
                <stop offset="100%" stopColor="#D4AF37" />
             </linearGradient>
             <clipPath id="shieldClip">
                <path d="M50 8 L85 22 L85 65 Q50 95 15 65 L15 22 Z" />
             </clipPath>
          </defs>
          
          {/* Outer Ring - Gold */}
          <circle cx="50" cy="50" r="48" stroke="#D4AF37" strokeWidth="1.5" />
          <circle cx="50" cy="50" r="45" stroke="#D4AF37" strokeWidth="0.5" opacity="0.5" />
          
          {/* Main Shield with National Colors */}
          <g clipPath="url(#shieldClip)">
             {/* Top: Green (Forests) */}
             <rect x="0" y="0" width="100" height="35" fill="#3A7728" />
             {/* Middle: Gold (Sun/Wealth) */}
             <rect x="0" y="35" width="100" height="35" fill="url(#goldGrad)" />
             {/* Bottom: Blue (Sea) */}
             <rect x="0" y="70" width="100" height="30" fill="#3A75C4" />
             
             {/* Ship Symbols (Stylized Vaisseaux) */}
             <path d="M35 55 L45 55 L40 50 Z" fill="#0f172a" />
             <path d="M50 55 L60 55 L55 50 Z" fill="#0f172a" />
             <path d="M42 62 L58 62 L50 58 Z" fill="#0f172a" />
          </g>
          
          {/* Shield Border */}
          <path d="M50 8 L85 22 L85 65 Q50 95 15 65 L15 22 Z" stroke="#D4AF37" strokeWidth="2.5" />
          
          {/* Official Banner */}
          <path d="M15 72 Q50 85 85 72 L85 85 Q50 98 15 85 Z" fill="#223344" stroke="#D4AF37" strokeWidth="1" />
          <text x="50" y="82" fontSize="5" fontWeight="900" textAnchor="middle" fill="#D4AF37" style={{ fontFamily: 'serif' }} className="tracking-widest">LIBREVILLE</text>
          
          {/* Top Label */}
          <text x="50" y="18" fontSize="4" fontWeight="black" textAnchor="middle" fill="white" className="tracking-tight italic">Mairie de Libreville</text>
        </svg>
      </div>
    </motion.div>
  );
}
