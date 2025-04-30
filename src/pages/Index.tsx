
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Trophy, ChevronRight, Play, BarChart, FileText, ArrowUp, Shield, Zap, Award } from 'lucide-react';

const Index = () => {
  // Track if user has scrolled down
  const [scrolled, setScrolled] = useState(false);
  // State for animated text
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    
    // Set loaded state for animations
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 300);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden">
      {/* Full cover background image that covers entire page */}
      <div 
        className="fixed top-0 left-0 w-full h-full bg-[url('/background.jpg')] bg-cover bg-center z-0"
        style={{
          backgroundAttachment: 'fixed',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Dark overlay for text readability across entire page */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/90 to-background/95"></div>
      </div>
      
      <Navbar />
      
      {/* Scroll to Top Button */}
      <button 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-6 right-6 z-40 rounded-full p-2 bg-primary text-primary-foreground transition-all duration-300 ${
          scrolled ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
        }`}
      >
        <ArrowUp />
      </button>

      {/* Hero Section with StarCraft Protoss theme and futuristic animations */}
      <div className="pt-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative">
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
              {[...Array(20)].map((_, i) => (
                <div 
                  key={i}
                  className={`absolute w-1 h-1 bg-primary/50 rounded-full transition-opacity duration-1000 animate-pulse`}
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                    opacity: isLoaded ? 0.5 : 0
                  }}
                ></div>
              ))}
            </div>

            {/* Tech grid pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="grid grid-cols-12 h-full">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="border-r border-primary/20 h-full"></div>
                ))}
              </div>
              <div className="grid grid-rows-12 w-full">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="border-b border-primary/20 w-full"></div>
                ))}
              </div>
            </div>
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
              <div className="overflow-hidden mb-4">
                <h1 className={`text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-protoss to-primary relative transition-all duration-700 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
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
                <img 
                  src="/lovable-uploads/71b989af-68ae-495d-88b3-19f1c4bdea4f.png" 
                  alt="StarCraft Protoss warrior watching replay"
                  className="object-contain w-full h-full z-10 relative"
                />
                
                {/* Enhanced decorative glowing elements */}
                <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-protoss/10 filter blur-xl animate-pulse"></div>
                <div className="absolute -bottom-10 right-6 w-36 h-36 rounded-full bg-protoss/10 filter blur-xl animate-pulse" style={{animationDelay: '1s'}}></div>
                
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
            
            <img 
              src="/lovable-uploads/a2cdd695-4ab2-4e55-8251-6f53eddbac2d.png" 
              alt="ReplayCoach Analysis Dashboard"
              className="w-full relative z-0"
              onError={(e) => {
                // Futuristic fallback if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.height = '400px';
                target.style.background = 'linear-gradient(45deg, rgba(0,0,0,0.8) 0%, rgba(0,168,255,0.1) 100%)';
                target.style.backgroundSize = '200% 200%';
                target.style.animation = 'gradient-shift 5s ease infinite';
                target.style.display = 'flex';
                target.style.alignItems = 'center';
                target.style.justifyContent = 'center';
                const text = document.createElement('span');
                text.innerText = 'ReplayCoach Analysis';
                text.style.fontSize = '2rem';
                text.style.fontWeight = 'bold';
                text.style.color = 'hsl(var(--primary))';
                text.style.textShadow = '0 0 10px rgba(0,168,255,0.5)';
                text.style.letterSpacing = '2px';
                target.appendChild(text);
              }} 
            />
            
            {/* Data display */}
            <div className="absolute bottom-0 left-0 w-full h-8 bg-background/80 backdrop-blur-sm border-t border-primary/20 flex items-center justify-between px-4 text-xs text-primary/70">
              <span>System ready - Real-time analysis active</span>
              <span className="flex items-center gap-2">
                APM peak: <span className="text-primary">312</span> at minute <span className="text-primary">10</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Race Section with enhanced styling */}
      <section className="py-16 md:py-24 bg-secondary/50 backdrop-blur-sm relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Coaching For All Races</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Terran Card */}
            <div className="bg-card/80 backdrop-blur-sm rounded-lg p-6 transition-all hover:-translate-y-1 duration-300 hover:shadow-lg hover:shadow-terran/30 border border-border/60 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-terran/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="flex items-center justify-center mb-6">
                <div className="h-24 w-24 rounded-full flex items-center justify-center bg-gradient-to-br from-terran-dark to-terran p-1 terran-glow">
                  <div className="h-full w-full rounded-full bg-card flex items-center justify-center">
                    <span className="text-terran text-4xl font-bold">T</span>
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-center mb-4 text-terran">Terran</h3>
              <p className="text-center mb-6 text-foreground/80">
                Master tank pushes, bio control, and optimize your build orders with detailed Terran-specific analysis
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <ChevronRight size={18} className="text-terran mt-1 flex-shrink-0" />
                  <span className="ml-2">Marine micro optimization</span>
                </li>
                <li className="flex items-start">
                  <ChevronRight size={18} className="text-terran mt-1 flex-shrink-0" />
                  <span className="ml-2">Build timings for each matchup</span>
                </li>
                <li className="flex items-start">
                  <ChevronRight size={18} className="text-terran mt-1 flex-shrink-0" />
                  <span className="ml-2">Drop harassment strategies</span>
                </li>
              </ul>
            </div>
            
            {/* Protoss Card */}
            <div className="bg-card/80 backdrop-blur-sm rounded-lg p-6 transition-all hover:-translate-y-1 duration-300 hover:shadow-lg hover:shadow-protoss/30 border border-border/60 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-protoss/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="flex items-center justify-center mb-6">
                <div className="h-24 w-24 rounded-full flex items-center justify-center bg-gradient-to-br from-protoss-dark to-protoss p-1 protoss-glow">
                  <div className="h-full w-full rounded-full bg-card flex items-center justify-center">
                    <span className="text-protoss text-4xl font-bold">P</span>
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-center mb-4 text-protoss">Protoss</h3>
              <p className="text-center mb-6 text-foreground/80">
                Perfect your gateway timing, carrier transitions, and shield management against all opponents
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <ChevronRight size={18} className="text-protoss mt-1 flex-shrink-0" />
                  <span className="ml-2">Effective shield battery usage</span>
                </li>
                <li className="flex items-start">
                  <ChevronRight size={18} className="text-protoss mt-1 flex-shrink-0" />
                  <span className="ml-2">Carrier micro techniques</span>
                </li>
                <li className="flex items-start">
                  <ChevronRight size={18} className="text-protoss mt-1 flex-shrink-0" />
                  <span className="ml-2">Counter builds for meta strategies</span>
                </li>
              </ul>
            </div>
            
            {/* Zerg Card */}
            <div className="bg-card/80 backdrop-blur-sm rounded-lg p-6 transition-all hover:-translate-y-1 duration-300 hover:shadow-lg hover:shadow-zerg/30 border border-border/60 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-zerg/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="flex items-center justify-center mb-6">
                <div className="h-24 w-24 rounded-full flex items-center justify-center bg-gradient-to-br from-zerg-dark to-zerg p-1 zerg-glow">
                  <div className="h-full w-full rounded-full bg-card flex items-center justify-center">
                    <span className="text-zerg text-4xl font-bold">Z</span>
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-center mb-4 text-zerg">Zerg</h3>
              <p className="text-center mb-6 text-foreground/80">
                Improve your larva management, creep spread, and harass timing for maximum efficiency
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <ChevronRight size={18} className="text-zerg mt-1 flex-shrink-0" />
                  <span className="ml-2">Optimal drone saturation</span>
                </li>
                <li className="flex items-start">
                  <ChevronRight size={18} className="text-zerg mt-1 flex-shrink-0" />
                  <span className="ml-2">Effective mutalisk control</span>
                </li>
                <li className="flex items-start">
                  <ChevronRight size={18} className="text-zerg mt-1 flex-shrink-0" />
                  <span className="ml-2">Zerg expansion timing</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section with tech styling */}
      <section className="py-16 md:py-24 relative z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Pro-Level Analysis</h2>
          <p className="text-lg text-center mb-16 text-foreground/80 max-w-3xl mx-auto">
            Our AI-powered coach analyzes your game with the precision of a Korean pro player
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card/80 backdrop-blur-sm rounded-lg p-6 border border-border/60 transition-all hover:-translate-y-2 duration-300 hover:shadow-lg hover:shadow-primary/30 relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <BarChart className="text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Deep Metrics Analysis</h3>
              <p className="text-foreground/80">
                Get detailed insights on your APM, resource collection rate, build orders, and army composition with comparisons to pro benchmarks
              </p>
            </div>
            
            <div className="bg-card/80 backdrop-blur-sm rounded-lg p-6 border border-border/60 transition-all hover:-translate-y-2 duration-300 hover:shadow-lg hover:shadow-primary/30 relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <FileText className="text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Personalized Coaching</h3>
              <p className="text-foreground/80">
                Receive custom training plans addressing your specific weaknesses, with drills designed by ASL-level players
              </p>
            </div>
            
            <div className="bg-card/80 backdrop-blur-sm rounded-lg p-6 border border-border/60 transition-all hover:-translate-y-2 duration-300 hover:shadow-lg hover:shadow-primary/30 relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Trophy className="text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Progression Tracking</h3>
              <p className="text-foreground/80">
                Monitor your improvement over time with visual progress charts and achievement badges as your skills grow
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section with futuristic glow */}
      <section className="py-16 bg-secondary/50 backdrop-blur-sm relative z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="mb-6">
            <Zap className="h-12 w-12 mx-auto text-primary animate-pulse" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Improve Your Game?</h2>
          <p className="text-lg mb-8 text-foreground/80">
            Join thousands of players who have elevated their StarCraft skills with ReplayCoach.gg
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" className="text-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 border border-primary/50 shadow-lg shadow-primary/20 transition-all duration-300">
              <Link to="/signup">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg border border-primary/50 shadow-lg hover:bg-primary/10 transition-all duration-300">
              <Link to="/pricing">View Pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
