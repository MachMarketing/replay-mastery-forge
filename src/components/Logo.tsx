
import React from 'react';
import { Link } from 'react-router-dom';
import LogoIcon from '@/components/icons/Logo';

const Logo = () => {
  return (
    <Link to="/" className="flex items-center gap-3 group">
      <div className="relative w-8 h-8 flex items-center justify-center">
        {/* Logo glow animation */}
        <div className="absolute inset-0 bg-primary/30 rounded-md blur-md animate-pulse opacity-70"></div>
        
        {/* Shield logo */}
        <LogoIcon className="w-8 h-8 text-primary relative z-10 group-hover:scale-110 transition-transform duration-300" />
      </div>
      
      <div className="flex flex-col">
        <span className="text-lg font-bold leading-none text-primary font-orbitron">
          ReplayCoach<span className="text-foreground">.gg</span>
        </span>
        <span className="text-[9px] leading-none tracking-widest text-muted-foreground uppercase">
          AI-Powered Brood War Analysis
        </span>
      </div>
    </Link>
  );
};

export default Logo;
