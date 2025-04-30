
import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart2,
  Zap,
  Target,
  Clock,
  ChevronRight,
  FileText,
  Users,
  Trophy,
  BarChart,
  Laptop,
  Languages,
  Shield
} from 'lucide-react';

const FeaturesPage = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 py-16 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Platform Features</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Discover how ReplayCoach.gg helps you master StarCraft: Brood War
            </p>
          </div>
          
          {/* Feature tabs */}
          <Tabs defaultValue="analysis" className="mb-16">
            <div className="flex justify-center mb-8">
              <TabsList className="grid grid-cols-4 w-full max-w-2xl">
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
                <TabsTrigger value="coaching">Coaching</TabsTrigger>
                <TabsTrigger value="training">Training</TabsTrigger>
                <TabsTrigger value="community">Community</TabsTrigger>
              </TabsList>
            </div>
            
            {/* Analysis Tab Content */}
            <TabsContent value="analysis">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                  <h2 className="text-3xl font-bold mb-6">Deep Replay Analysis</h2>
                  <p className="text-lg text-muted-foreground mb-6">
                    Our AI-powered analysis engine breaks down your gameplay with professional-level 
                    precision, revealing insights that would take hours of manual review.
                  </p>
                  
                  <div className="space-y-6 mb-8">
                    <div className="flex">
                      <div className="mr-4 h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <BarChart2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium mb-2">Comprehensive Metrics</h3>
                        <p className="text-muted-foreground">
                          Track your APM, EAPM, resource collection rate, unit production efficiency,
                          and dozens of other metrics that reveal your true skill level.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex">
                      <div className="mr-4 h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium mb-2">Build Order Analysis</h3>
                        <p className="text-muted-foreground">
                          Compare your build orders to professional standards, identify 
                          optimization opportunities, and receive recommendations for improvement.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex">
                      <div className="mr-4 h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Target className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium mb-2">Weakness Detection</h3>
                        <p className="text-muted-foreground">
                          Our engine identifies your specific weaknesses, such as production gaps,
                          poor unit control, or inefficient resource gathering.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Button asChild>
                    <Link to="/upload" className="flex items-center">
                      Try Analysis Now <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                
                <div className="rounded-lg overflow-hidden border border-border shadow-xl">
                  <img 
                    src="/analysis-screenshot.jpg" 
                    alt="Replay Analysis Dashboard"
                    className="w-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.height = '400px';
                      target.style.background = 'linear-gradient(45deg, #1a202c 25%, #2d3748 25%, #2d3748 50%, #1a202c 50%, #1a202c 75%, #2d3748 75%, #2d3748 100%)';
                      target.style.backgroundSize = '20px 20px';
                      target.alt = 'Analysis Dashboard Preview';
                    }} 
                  />
                </div>
              </div>
            </TabsContent>
            
            {/* Coaching Tab Content */}
            <TabsContent value="coaching">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                  <h2 className="text-3xl font-bold mb-6">Personalized Coaching</h2>
                  <p className="text-lg text-muted-foreground mb-6">
                    Receive tailored advice and recommendations from our AI coach, which has been
                    trained on thousands of professional replays and coaching sessions.
                  </p>
                  
                  <div className="space-y-6 mb-8">
                    <div className="flex">
                      <div className="mr-4 h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Zap className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium mb-2">Actionable Recommendations</h3>
                        <p className="text-muted-foreground">
                          Get specific, practical advice that you can immediately apply to your
                          games, not vague suggestions or generic tips.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex">
                      <div className="mr-4 h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Clock className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium mb-2">Timing Optimization</h3>
                        <p className="text-muted-foreground">
                          Learn the optimal timings for expansions, tech switches, and attacks
                          based on your race, matchup, and playstyle preferences.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex">
                      <div className="mr-4 h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <BarChart className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium mb-2">Progress Tracking</h3>
                        <p className="text-muted-foreground">
                          Track your improvement over time with detailed progress charts and
                          achievement badges as you implement coaching advice.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Button asChild>
                    <Link to="/pricing" className="flex items-center">
                      View Coaching Plans <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                
                <div className="rounded-lg overflow-hidden border border-border shadow-xl">
                  <img 
                    src="/coaching-screenshot.jpg" 
                    alt="Personalized Coaching Dashboard"
                    className="w-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.height = '400px';
                      target.style.background = 'linear-gradient(45deg, #1a202c 25%, #2d3748 25%, #2d3748 50%, #1a202c 50%, #1a202c 75%, #2d3748 75%, #2d3748 100%)';
                      target.style.backgroundSize = '20px 20px';
                      target.alt = 'Coaching Dashboard Preview';
                    }} 
                  />
                </div>
              </div>
            </TabsContent>
            
            {/* Training Tab Content */}
            <TabsContent value="training">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                  <h2 className="text-3xl font-bold mb-6">Custom Training Plans</h2>
                  <p className="text-lg text-muted-foreground mb-6">
                    Take your game to the next level with personalized training plans designed 
                    to address your specific weaknesses and build on your strengths.
                  </p>
                  
                  <div className="space-y-6 mb-8">
                    <div className="flex">
                      <div className="mr-4 h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium mb-2">10-Day Training Programs</h3>
                        <p className="text-muted-foreground">
                          Follow structured 10-day training programs with specific drills and
                          exercises designed by professional coaches.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex">
                      <div className="mr-4 h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Target className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium mb-2">Skill-Specific Drills</h3>
                        <p className="text-muted-foreground">
                          Master micro, macro, and decision-making with tailored exercises that
                          target your specific skill gaps.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex">
                      <div className="mr-4 h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Laptop className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium mb-2">Interactive Exercises</h3>
                        <p className="text-muted-foreground">
                          Practice with interactive scenarios and challenges designed to improve
                          your reaction time, decision-making, and execution.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Button asChild>
                    <Link to="/training" className="flex items-center">
                      Explore Training Plans <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                
                <div className="rounded-lg overflow-hidden border border-border shadow-xl">
                  <img 
                    src="/training-screenshot.jpg" 
                    alt="Training Plan Dashboard"
                    className="w-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.height = '400px';
                      target.style.background = 'linear-gradient(45deg, #1a202c 25%, #2d3748 25%, #2d3748 50%, #1a202c 50%, #1a202c 75%, #2d3748 75%, #2d3748 100%)';
                      target.style.backgroundSize = '20px 20px';
                      target.alt = 'Training Plan Preview';
                    }} 
                  />
                </div>
              </div>
            </TabsContent>
            
            {/* Community Tab Content */}
            <TabsContent value="community">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                  <h2 className="text-3xl font-bold mb-6">Vibrant Community</h2>
                  <p className="text-lg text-muted-foreground mb-6">
                    Connect with other players, share replays, and learn from the collective wisdom
                    of the StarCraft: Brood War community.
                  </p>
                  
                  <div className="space-y-6 mb-8">
                    <div className="flex">
                      <div className="mr-4 h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium mb-2">Player Network</h3>
                        <p className="text-muted-foreground">
                          Connect with players of similar skill level for practice matches,
                          replay sharing, and mutual improvement.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex">
                      <div className="mr-4 h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Trophy className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium mb-2">Community Tournaments</h3>
                        <p className="text-muted-foreground">
                          Participate in regular tournaments organized by skill level, with
                          analysis and feedback provided for all participants.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex">
                      <div className="mr-4 h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Languages className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium mb-2">Global Reach</h3>
                        <p className="text-muted-foreground">
                          Connect with players from around the world, with support for multiple
                          languages including English, Korean, and German.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Button asChild>
                    <Link to="/community" className="flex items-center">
                      Join Community <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                
                <div className="rounded-lg overflow-hidden border border-border shadow-xl">
                  <img 
                    src="/community-screenshot.jpg" 
                    alt="Community Dashboard"
                    className="w-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.height = '400px';
                      target.style.background = 'linear-gradient(45deg, #1a202c 25%, #2d3748 25%, #2d3748 50%, #1a202c 50%, #1a202c 75%, #2d3748 75%, #2d3748 100%)';
                      target.style.backgroundSize = '20px 20px';
                      target.alt = 'Community Preview';
                    }} 
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          {/* Additional Features */}
          <div className="mt-16">
            <h2 className="text-3xl font-bold text-center mb-12">Additional Features</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-card rounded-lg p-6 border border-border">
                <Shield className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-3">Privacy Focused</h3>
                <p className="text-muted-foreground">
                  Your replays and personal data are kept secure. Control exactly what you share
                  with the community and what remains private.
                </p>
              </div>
              
              <div className="bg-card rounded-lg p-6 border border-border">
                <Languages className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-3">Multi-Language Support</h3>
                <p className="text-muted-foreground">
                  Access ReplayCoach.gg in English, German, and Korean, with more languages planned
                  for the future.
                </p>
              </div>
              
              <div className="bg-card rounded-lg p-6 border border-border">
                <Laptop className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-3">API Access</h3>
                <p className="text-muted-foreground">
                  For premium subscribers, integrate ReplayCoach.gg data with your own tools and
                  applications via our developer API.
                </p>
              </div>
            </div>
          </div>
          
          {/* CTA Section */}
          <div className="mt-20 text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Elevate Your Game?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Join thousands of players who have improved their StarCraft: Brood War skills
              with ReplayCoach.gg's professional-level analysis and training.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" className="text-lg" asChild>
                <Link to="/upload">Upload Your First Replay</Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg" asChild>
                <Link to="/pricing">View Pricing Plans</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default FeaturesPage;
