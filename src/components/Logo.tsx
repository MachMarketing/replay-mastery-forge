
import React from 'react';
import { Link } from 'react-router-dom';

const Logo = () => {
  return (
    <Link to="/" className="flex items-center gap-2 group">
      <div className="relative w-8 h-8 flex items-center justify-center">
        {/* Logo Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/60 rounded-md transform rotate-45 group-hover:scale-110 transition-transform duration-300"></div>
        
        {/* Logo Inner Elements */}
        <div className="absolute inset-1 bg-background rounded-sm transform rotate-45"></div>
        <div className="absolute w-5 h-1 bg-primary rounded-full"></div>
        <div className="absolute w-1 h-5 bg-primary rounded-full"></div>
        
        {/* Decorative elements */}
        <div className="absolute top-[-2px] right-[-2px] w-2 h-2 bg-primary rounded-full opacity-80 animate-pulse"></div>
        <div className="absolute bottom-[-1px] left-[-1px] w-1 h-1 bg-primary/70 rounded-full animate-ping"></div>
      </div>
      
      <div className="flex flex-col">
        <span className="text-lg font-bold leading-none text-foreground">
          Replay<span className="text-primary">Coach</span>
        </span>
        <span className="text-[9px] leading-none tracking-widest text-primary/80 uppercase">Performance Analytics</span>
      </div>
    </Link>
  );
};

export default Logo;
