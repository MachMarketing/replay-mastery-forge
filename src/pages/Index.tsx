
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import Footer from '@/components/Footer';
import { Trophy, ChevronRight, BarChart, FileText, ArrowUp, Zap } from 'lucide-react';

const Index = () => {
  // Track if user has scrolled down
  const [scrolled, setScrolled] = useState(false);
  
  useEffect(() => {
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

      {/* Hero Section */}
      <HeroSection />

      {/* Race Section with enhanced styling */}
      <section className="py-16 md:py-24 bg-secondary/50 backdrop-blur-sm relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 font-orbitron">Coaching For All Races</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Terran Card */}
            <div className="bg-card/80 backdrop-blur-sm rounded-lg p-6 transition-all hover:-translate-y-1 duration-300 hover:shadow-lg hover:shadow-terran/30 border border-border/60 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-terran/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="flex items-center justify-center mb-6">
                <div className="h-24 w-24 rounded-full flex items-center justify-center bg-gradient-to-br from-terran-dark to-terran p-1 terran-glow">
                  <div className="h-full w-full rounded-full bg-card flex items-center justify-center">
                    <span className="text-terran text-4xl font-bold font-orbitron">T</span>
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-center mb-4 text-terran font-orbitron">Terran</h3>
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
                    <span className="text-protoss text-4xl font-bold font-orbitron">P</span>
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-center mb-4 text-protoss font-orbitron">Protoss</h3>
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
                    <span className="text-zerg text-4xl font-bold font-orbitron">Z</span>
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-center mb-4 text-zerg font-orbitron">Zerg</h3>
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
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 font-orbitron">Pro-Level Analysis</h2>
          <p className="text-lg text-center mb-16 text-foreground/80 max-w-3xl mx-auto">
            Our AI-powered coach analyzes your game with the precision of a Korean pro player
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card/80 backdrop-blur-sm rounded-lg p-6 border border-border/60 transition-all hover:-translate-y-2 duration-300 hover:shadow-lg hover:shadow-primary/30 relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <BarChart className="text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3 font-orbitron">Deep Metrics Analysis</h3>
              <p className="text-foreground/80">
                Get detailed insights on your APM, resource collection rate, build orders, and army composition with comparisons to pro benchmarks
              </p>
            </div>
            
            <div className="bg-card/80 backdrop-blur-sm rounded-lg p-6 border border-border/60 transition-all hover:-translate-y-2 duration-300 hover:shadow-lg hover:shadow-primary/30 relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <FileText className="text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3 font-orbitron">Personalized Coaching</h3>
              <p className="text-foreground/80">
                Receive custom training plans addressing your specific weaknesses, with drills designed by ASL-level players
              </p>
            </div>
            
            <div className="bg-card/80 backdrop-blur-sm rounded-lg p-6 border border-border/60 transition-all hover:-translate-y-2 duration-300 hover:shadow-lg hover:shadow-primary/30 relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Trophy className="text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3 font-orbitron">Progression Tracking</h3>
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
          <h2 className="text-3xl md:text-4xl font-bold mb-6 font-orbitron">Ready to Improve Your Game?</h2>
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
