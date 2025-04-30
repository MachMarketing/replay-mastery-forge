
import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';

const PricingPage = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 py-16 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Pricing Plans</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Choose the perfect plan to elevate your StarCraft: Brood War skills
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">Free</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-muted-foreground mb-6">
                  Basic analysis for casual players
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </div>
              
              <div className="p-6 border-t border-border bg-secondary/10">
                <ul className="space-y-4">
                  <li className="flex">
                    <Check className="h-5 w-5 text-strength mr-2 flex-shrink-0" />
                    <span>5 replay analyses per month</span>
                  </li>
                  <li className="flex">
                    <Check className="h-5 w-5 text-strength mr-2 flex-shrink-0" />
                    <span>Basic build order analysis</span>
                  </li>
                  <li className="flex">
                    <Check className="h-5 w-5 text-strength mr-2 flex-shrink-0" />
                    <span>APM and basic statistics</span>
                  </li>
                  <li className="flex">
                    <Check className="h-5 w-5 text-strength mr-2 flex-shrink-0" />
                    <span>Strengths and weaknesses overview</span>
                  </li>
                  <li className="flex">
                    <X className="h-5 w-5 text-weakness mr-2 flex-shrink-0" />
                    <span className="text-muted-foreground">Advanced statistics</span>
                  </li>
                  <li className="flex">
                    <X className="h-5 w-5 text-weakness mr-2 flex-shrink-0" />
                    <span className="text-muted-foreground">Pro build comparisons</span>
                  </li>
                  <li className="flex">
                    <X className="h-5 w-5 text-weakness mr-2 flex-shrink-0" />
                    <span className="text-muted-foreground">10-day training plan</span>
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Pro Plan */}
            <div className="border-2 border-primary rounded-lg overflow-hidden bg-card relative transform md:scale-105 z-10 shadow-lg shadow-primary/20">
              <div className="absolute right-4 top-4">
                <Badge>Popular</Badge>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">Pro</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold">$9.99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-muted-foreground mb-6">
                  Full features for serious players
                </p>
                <Button className="w-full" asChild>
                  <Link to="/signup?plan=pro">Get Started</Link>
                </Button>
              </div>
              
              <div className="p-6 border-t border-border bg-secondary/10">
                <ul className="space-y-4">
                  <li className="flex">
                    <Check className="h-5 w-5 text-strength mr-2 flex-shrink-0" />
                    <span>Unlimited replay analyses</span>
                  </li>
                  <li className="flex">
                    <Check className="h-5 w-5 text-strength mr-2 flex-shrink-0" />
                    <span>Detailed build order analysis</span>
                  </li>
                  <li className="flex">
                    <Check className="h-5 w-5 text-strength mr-2 flex-shrink-0" />
                    <span>Advanced APM and EAPM statistics</span>
                  </li>
                  <li className="flex">
                    <Check className="h-5 w-5 text-strength mr-2 flex-shrink-0" />
                    <span>Comprehensive strengths and weaknesses</span>
                  </li>
                  <li className="flex">
                    <Check className="h-5 w-5 text-strength mr-2 flex-shrink-0" />
                    <span>Resource collection graphs</span>
                  </li>
                  <li className="flex">
                    <Check className="h-5 w-5 text-strength mr-2 flex-shrink-0" />
                    <span>Pro build comparisons</span>
                  </li>
                  <li className="flex">
                    <Check className="h-5 w-5 text-strength mr-2 flex-shrink-0" />
                    <span>10-day training plan</span>
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Team Plan */}
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">Team</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold">$39.99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-muted-foreground mb-6">
                  For teams and serious competitors
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/signup?plan=team">Contact Sales</Link>
                </Button>
              </div>
              
              <div className="p-6 border-t border-border bg-secondary/10">
                <ul className="space-y-4">
                  <li className="flex">
                    <Check className="h-5 w-5 text-strength mr-2 flex-shrink-0" />
                    <span>All Pro features for 5 users</span>
                  </li>
                  <li className="flex">
                    <Check className="h-5 w-5 text-strength mr-2 flex-shrink-0" />
                    <span>Team performance dashboard</span>
                  </li>
                  <li className="flex">
                    <Check className="h-5 w-5 text-strength mr-2 flex-shrink-0" />
                    <span>Team-specific practice drills</span>
                  </li>
                  <li className="flex">
                    <Check className="h-5 w-5 text-strength mr-2 flex-shrink-0" />
                    <span>Monthly team coaching call</span>
                  </li>
                  <li className="flex">
                    <Check className="h-5 w-5 text-strength mr-2 flex-shrink-0" />
                    <span>Priority support</span>
                  </li>
                  <li className="flex">
                    <Check className="h-5 w-5 text-strength mr-2 flex-shrink-0" />
                    <span>Custom report branding</span>
                  </li>
                  <li className="flex">
                    <Check className="h-5 w-5 text-strength mr-2 flex-shrink-0" />
                    <span>API access</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="font-medium text-lg mb-2">Can I switch plans later?</h3>
                <p className="text-muted-foreground">
                  Yes, you can upgrade, downgrade or cancel your plan at any time. 
                  Changes to your plan will be effective immediately.
                </p>
              </div>
              
              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="font-medium text-lg mb-2">How accurate is the replay analysis?</h3>
                <p className="text-muted-foreground">
                  Our analysis engine has been trained on thousands of professional replays and 
                  provides insights comparable to coaching from high-ranked players. The accuracy 
                  improves with more data from your games.
                </p>
              </div>
              
              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="font-medium text-lg mb-2">What do I need to upload a replay?</h3>
                <p className="text-muted-foreground">
                  You need a valid StarCraft: Brood War replay (.rep) file. These are automatically 
                  saved in your StarCraft/maps/replays folder after each game if you have replay 
                  saving enabled in your game settings.
                </p>
              </div>
              
              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="font-medium text-lg mb-2">Is my data secure?</h3>
                <p className="text-muted-foreground">
                  Yes, all your replays and analysis data are stored securely. We do not share 
                  your personal information with third parties. You can delete your data at any 
                  time from your account settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default PricingPage;
