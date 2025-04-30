import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronRight, Play, Shield, Award } from 'lucide-react';
const HeroSection = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    // Animation delay for elements to appear
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Generate random positions for decorative elements
  const generateRandomPositions = (count: number) => {
    return Array.from({
      length: count
    }, () => ({
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 3,
      duration: Math.random() * 4 + 3
    }));
  };
  const dotPositions = generateRandomPositions(30);
  return <div className="pt-16 relative z-10">
      {/* Full screen background image with no overlay */}
      <div className="absolute inset-0 z-0" style={{
      backgroundImage: "url('/lovable-uploads/d571fd6c-60f8-4930-9fdc-8f29054538e7.png')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      width: '100%',
      height: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: -1
    }}>
        {/* Overlay completely removed */}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative">
        {/* Tech Grid Background with reduced opacity */}
        <div className="absolute inset-0 grid-tech-bg opacity-30"></div>
        
        {/* Animated geometric elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Horizontal lines */}
          <div className={`absolute top-[20%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent transform transition-transform duration-1000 ${isLoaded ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`}></div>
          <div className={`absolute top-[60%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent transform transition-transform delay-300 duration-1000 ${isLoaded ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}></div>
          
          {/* Vertical lines */}
          <div className={`absolute top-0 left-[10%] w-[1px] h-full bg-gradient-to-b from-transparent via-primary/30 to-transparent transform transition-transform delay-150 duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}></div>
          <div className={`absolute top-0 right-[10%] w-[1px] h-full bg-gradient-to-b from-transparent via-primary/30 to-transparent transform transition-transform delay-450 duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}></div>
          
          {/* Decorative circles */}
          <div className={`absolute top-[15%] left-[5%] w-32 h-32 rounded-full border border-primary/20 transform transition-transform delay-600 duration-1000 ${isLoaded ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}></div>
          <div className={`absolute bottom-[15%] right-[5%] w-24 h-24 rounded-full border border-protoss/20 transform transition-transform delay-750 duration-1000 ${isLoaded ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}></div>
          
          {/* Animated dots */}
          <div className="absolute inset-0">
            {dotPositions.map((dot, i) => <div key={i} className="absolute w-1 h-1 bg-primary/50 rounded-full transition-opacity duration-1000 animate-pulse" style={{
            left: `${dot.left}%`,
            top: `${dot.top}%`,
            width: `${dot.size}px`,
            height: `${dot.size}px`,
            animationDelay: `${dot.delay}s`,
            animationDuration: `${dot.duration}s`,
            opacity: isLoaded ? 0.5 : 0
          }}></div>)}
          </div>

          {/* Scan lines effect */}
          <div className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-tech-scan"></div>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Left content with futuristic animations */}
          <div className="flex-1 text-center lg:text-left relative z-10">
            {/* Icon with enhanced animation */}
            <div className="inline-block mb-4 relative">
              <div className={`transition-all duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0 -translate-y-6'}`}>
                <Shield className="h-16 w-16 mx-auto lg:mx-0 text-primary animate-pulse" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
              </div>
              {/* Rotating ring around icon */}
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-dashed border-primary/30 rounded-full transition-all duration-1000 ${isLoaded ? 'opacity-100 animate-[spin_15s_linear_infinite]' : 'opacity-0 scale-50'}`}></div>
            </div>
            
            {/* Animated heading with tech typewriter effect */}
            <div className="overflow-hidden mb-4 font-orbitron">
              <h1 className={`hero-heading relative transition-all duration-700 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                <span className="inline-block overflow-hidden">
                  <span className="block transform animate-typing-1">Elevate Your</span>
                </span>
                <span className="inline-block overflow-hidden">
                  <span className="block transform animate-typing-2">StarCraft Skills</span>
                </span>
                {/* Tech decoration */}
                <span className="absolute -left-4 top-1/2 -translate-y-1/2 w-2 h-10 bg-primary/30"></span>
              </h1>
            </div>
            
            {/* Subtitle with fade in animation */}
            <p className={`text-xl md:text-2xl mb-8 text-foreground/80 max-w-3xl mx-auto lg:mx-0 transition-all duration-700 delay-500 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
              Upload your replays, get pro-level analysis, and receive personalized coaching to reach your full potential
            </p>
            
            {/* CTA buttons with hover effects */}
            <div className={`flex flex-col sm:flex-row justify-center lg:justify-start gap-4 mb-8 transition-all duration-700 delay-700 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
              <Button size="lg" className="text-lg px-8 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 border border-primary/50 shadow-lg shadow-primary/20 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-primary/30 relative group">
                <Link to="/upload" className="flex items-center gap-2">
                  Upload Replay
                  <ChevronRight size={18} className="transform transition-transform group-hover:translate-x-1" />
                  <span className="absolute inset-0 rounded-md overflow-hidden">
                    <span className="absolute top-0 left-[-100%] w-[200%] h-full bg-gradient-to-r from-transparent via-primary/20 to-transparent transform transition-transform duration-1000 group-hover:left-[100%]"></span>
                  </span>
                </Link>
              </Button>
              
              <Button size="lg" variant="outline" className="text-lg px-8 border border-primary/50 shadow-lg hover:bg-primary/10 transition-all duration-300 hover:translate-y-[-2px] relative group">
                <Link to="/features" className="flex items-center gap-2">
                  <Play size={18} className="transition-transform group-hover:scale-110" />
                  How It Works
                  <span className="absolute inset-0 rounded-md overflow-hidden">
                    <span className="absolute top-0 left-[-100%] w-[200%] h-full bg-gradient-to-r from-transparent via-primary/10 to-transparent transform transition-transform duration-1000 group-hover:left-[100%]"></span>
                  </span>
                </Link>
              </Button>
            </div>
            
            {/* Trust badge with animation */}
            <div className={`text-sm text-muted-foreground mb-8 flex items-center justify-center lg:justify-start gap-2 transition-all duration-700 delay-900 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <Award size={16} className="text-primary animate-pulse" />
              <span>Trusted by over 10,000 players, from beginners to ASL professionals</span>
            </div>

            {/* Tech status indicators */}
            <div className={`hidden lg:flex items-center gap-4 text-xs text-muted-foreground transition-all duration-700 delay-1000 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span>System Online</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span>Analysis Ready</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-protoss animate-pulse"></span>
                <span>AI Powered</span>
              </div>
            </div>
          </div>
          
          {/* Right side - Featured Protoss image with enhanced effects */}
          <div className="flex-1 relative">
            <div className={`relative w-full aspect-square max-w-md mx-auto transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
              {/* Protoss Image */}
              <img src="/lovable-uploads/71b989af-68ae-495d-88b3-19f1c4bdea4f.png" alt="StarCraft Protoss warrior watching replay" className="object-contain w-full h-full z-10 relative" />
              
              {/* Enhanced decorative glowing elements */}
              <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-protoss/10 filter blur-xl animate-pulse"></div>
              <div className="absolute -bottom-10 right-6 w-36 h-36 rounded-full bg-protoss/10 filter blur-xl animate-pulse" style={{
              animationDelay: '1s'
            }}></div>
              
              {/* Tech scan effect */}
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-primary/30 animate-[scan_3s_ease-in-out_infinite]"></div>
              </div>
              
              {/* Animated borders */}
              <div className="absolute top-1/4 left-0 h-1/2 w-1 bg-gradient-to-b from-transparent via-protoss to-transparent"></div>
              <div className="absolute bottom-0 left-1/4 h-1 w-1/2 bg-gradient-to-r from-transparent via-protoss to-transparent"></div>
              
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-protoss/70"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-protoss/70"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-protoss/70"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-protoss/70"></div>
              
              {/* Rotating circle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-primary/20 animate-[spin_20s_linear_infinite]"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full border border-primary/10 animate-[spin_25s_linear_reverse_infinite]"></div>
              
              {/* HUD elements */}
              <div className="absolute -right-2 top-10 px-3 py-1 bg-background/80 backdrop-blur-sm border border-primary/30 text-primary text-xs rounded-sm">
                <div className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-primary animate-pulse"></span>
                  <span>APM: 312</span>
                </div>
              </div>
              <div className="absolute -left-2 bottom-10 px-3 py-1 bg-background/80 backdrop-blur-sm border border-primary/30 text-primary text-xs rounded-sm">
                <div className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-protoss animate-pulse"></span>
                  <span>Analysis Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Preview area below hero section - with enhanced futuristic elements */}
        <div className={`mt-16 rounded-lg overflow-hidden border border-primary/30 shadow-2xl shadow-primary/20 bg-background/80 backdrop-blur-sm transition-all duration-700 delay-1000 hover:scale-[1.02] max-w-5xl mx-auto relative ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
          {/* Tech scan line */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary/30 animate-[scan_4s_ease-in-out_infinite]"></div>
          </div>
          
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary z-20"></div>
          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary z-20"></div>
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary z-20"></div>
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary z-20"></div>
          
          {/* Status indicators */}
          <div className="absolute top-2 right-8 flex items-center gap-3 z-20">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-xs text-primary/70">ONLINE</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs text-primary/70">READY</span>
            </div>
          </div>
          
          
          
          {/* Data display */}
          <div className="absolute bottom-0 left-0 w-full h-8 bg-background/80 backdrop-blur-sm border-t border-primary/20 flex items-center justify-between px-4 text-xs text-primary/70">
            <span>System ready - Real-time analysis active</span>
            <span className="flex items-center gap-2">
              APM peak: <span className="text-primary">312</span> at minute <span className="text-primary">10</span>
            </span>
          </div>
        </div>
      </div>
    </div>;
};
export default HeroSection;