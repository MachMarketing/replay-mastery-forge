
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Trophy, ChevronRight, Play, BarChart, FileText, ArrowUp } from 'lucide-react';

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
    <div className="flex flex-col min-h-screen">
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

      {/* Hero Section */}
      <div className="pt-16 relative">
        <div className="absolute inset-0 z-0 bg-gradient-radial from-primary/20 to-transparent opacity-50" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative z-10">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary via-protoss-light to-primary">
              Elevate Your StarCraft Skills
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-foreground/80 max-w-3xl mx-auto">
              Upload your replays, get pro-level analysis, and receive personalized coaching to reach your full potential
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
              <Button size="lg" className="text-lg px-8">
                <Link to="/upload" className="flex items-center gap-2">
                  Upload Replay
                  <ChevronRight size={18} />
                </Link>
              </Button>
              
              <Button size="lg" variant="outline" className="text-lg px-8">
                <Link to="/features" className="flex items-center gap-2">
                  <Play size={18} />
                  How It Works
                </Link>
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground mb-8">
              Trusted by over 10,000 players, from beginners to ASL professionals
            </div>
            
            {/* Preview Image */}
            <div className="rounded-lg overflow-hidden border border-border/60 shadow-2xl shadow-primary/20 bg-background transition-transform hover:scale-[1.02] max-w-5xl mx-auto">
              <img 
                src="/replay-analysis-preview.jpg" 
                alt="ReplayCoach Analysis Dashboard"
                className="w-full"
                onError={(e) => {
                  // Fallback to a colored div if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.height = '400px';
                  target.style.background = 'linear-gradient(45deg, #1a202c 25%, #2d3748 25%, #2d3748 50%, #1a202c 50%, #1a202c 75%, #2d3748 75%, #2d3748 100%)';
                  target.style.backgroundSize = '20px 20px';
                  target.style.display = 'flex';
                  target.style.alignItems = 'center';
                  target.style.justifyContent = 'center';
                  target.alt = 'ReplayCoach Analysis Preview';
                }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Race Section */}
      <section className="py-16 md:py-24 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Coaching For All Races</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Terran Card */}
            <div className="bg-card rounded-lg p-6 transition-all hover:shadow-lg hover:shadow-terran/30 border border-border/60">
              <div className="flex items-center justify-center mb-6">
                <div className="h-24 w-24 rounded-full flex items-center justify-center bg-gradient-to-br from-terran-dark to-terran p-1">
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
            <div className="bg-card rounded-lg p-6 transition-all hover:shadow-lg hover:shadow-protoss/30 border border-border/60">
              <div className="flex items-center justify-center mb-6">
                <div className="h-24 w-24 rounded-full flex items-center justify-center bg-gradient-to-br from-protoss-dark to-protoss p-1">
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
            <div className="bg-card rounded-lg p-6 transition-all hover:shadow-lg hover:shadow-zerg/30 border border-border/60">
              <div className="flex items-center justify-center mb-6">
                <div className="h-24 w-24 rounded-full flex items-center justify-center bg-gradient-to-br from-zerg-dark to-zerg p-1">
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

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6">Pro-Level Analysis</h2>
          <p className="text-lg text-center mb-16 text-foreground/80 max-w-3xl mx-auto">
            Our AI-powered coach analyzes your game with the precision of a Korean pro player
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card rounded-lg p-6 border border-border/60 transition-all hover:translate-y-[-4px]">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <BarChart className="text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Deep Metrics Analysis</h3>
              <p className="text-foreground/80">
                Get detailed insights on your APM, resource collection rate, build orders, and army composition with comparisons to pro benchmarks
              </p>
            </div>
            
            <div className="bg-card rounded-lg p-6 border border-border/60 transition-all hover:translate-y-[-4px]">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <FileText className="text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Personalized Coaching</h3>
              <p className="text-foreground/80">
                Receive custom training plans addressing your specific weaknesses, with drills designed by ASL-level players
              </p>
            </div>
            
            <div className="bg-card rounded-lg p-6 border border-border/60 transition-all hover:translate-y-[-4px]">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
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

      {/* CTA Section */}
      <section className="py-16 bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Improve Your Game?</h2>
          <p className="text-lg mb-8 text-foreground/80">
            Join thousands of players who have elevated their StarCraft skills with ReplayCoach.gg
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" className="text-lg">
              <Link to="/signup">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg">
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
