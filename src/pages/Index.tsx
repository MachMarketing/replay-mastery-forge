
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Trophy, ChevronRight, Play, BarChart, FileText, ArrowUp, Shield, Zap, Award } from 'lucide-react';

const Index = () => {
  // Track if user has scrolled down
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden">
      {/* Background with subtle starfield effect - adjusted opacity and positioning */}
      <div className="fixed top-0 left-0 right-0 h-[50vh] bg-[url('/background.jpg')] bg-cover bg-top opacity-30 z-0"></div>
      
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

      {/* Hero Section with StarCraft Protoss theme */}
      <div className="pt-16 relative z-10">
        <div className="absolute inset-0 z-0 bg-gradient-radial from-primary/20 to-transparent opacity-50"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Left content */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-block mb-4 relative">
                <Shield className="h-16 w-16 mx-auto lg:mx-0 text-primary animate-pulse" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary via-protoss to-primary animate-pulse">
                Elevate Your StarCraft Skills
              </h1>
              
              <p className="text-xl md:text-2xl mb-8 text-foreground/80 max-w-3xl mx-auto lg:mx-0">
                Upload your replays, get pro-level analysis, and receive personalized coaching to reach your full potential
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 mb-8">
                <Button size="lg" className="text-lg px-8 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 border border-primary/50 shadow-lg shadow-primary/20 transition-all duration-300">
                  <Link to="/upload" className="flex items-center gap-2">
                    Upload Replay
                    <ChevronRight size={18} />
                  </Link>
                </Button>
                
                <Button size="lg" variant="outline" className="text-lg px-8 border border-primary/50 shadow-lg hover:bg-primary/10 transition-all duration-300">
                  <Link to="/features" className="flex items-center gap-2">
                    <Play size={18} />
                    How It Works
                  </Link>
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground mb-8 flex items-center justify-center lg:justify-start gap-2">
                <Award size={16} className="text-primary" />
                Trusted by over 10,000 players, from beginners to ASL professionals
              </div>
            </div>
            
            {/* Right side - Featured Protoss image */}
            <div className="flex-1 relative">
              <div className="relative w-full aspect-square max-w-md mx-auto">
                {/* Protoss Image */}
                <img 
                  src="/lovable-uploads/71b989af-68ae-495d-88b3-19f1c4bdea4f.png" 
                  alt="StarCraft Protoss warrior watching replay"
                  className="object-contain w-full h-full z-10 relative"
                />
                
                {/* Decorative elements */}
                <div className="absolute -top-4 -left-4 w-24 h-24 rounded-full bg-protoss/10 filter blur-xl"></div>
                <div className="absolute -bottom-6 right-10 w-28 h-28 rounded-full bg-protoss/10 filter blur-xl"></div>
                
                {/* Glowing borders */}
                <div className="absolute top-1/4 left-0 h-1/2 w-1 bg-gradient-to-b from-transparent via-protoss to-transparent"></div>
                <div className="absolute bottom-0 left-1/4 h-1 w-1/2 bg-gradient-to-r from-transparent via-protoss to-transparent"></div>
              </div>
            </div>
          </div>
          
          {/* Preview area below hero section */}
          <div className="mt-16 rounded-lg overflow-hidden border border-primary/30 shadow-2xl shadow-primary/20 bg-background/80 backdrop-blur-sm transition-transform hover:scale-[1.02] max-w-5xl mx-auto relative before:absolute before:inset-0 before:border before:border-primary/10 before:rounded-lg before:z-10 before:pointer-events-none after:absolute after:inset-0 after:border-2 after:rounded-lg after:z-20 after:pointer-events-none after:border-primary/5">
            <img 
              src="/replay-analysis-preview.jpg" 
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
            {/* Corner accents for futuristic UI feel */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary"></div>
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary"></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary"></div>
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
