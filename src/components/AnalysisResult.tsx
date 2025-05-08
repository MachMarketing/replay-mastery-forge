
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Trophy, 
  AlertTriangle, 
  ArrowUpRight, 
  ChevronRight, 
  Clock, 
  Activity, 
  BarChart2, 
  ChevronDown,
  Award,
  BookOpen,
  Calendar,
  Flag
} from 'lucide-react';

interface BuildOrder {
  time: string;
  supply: number;
  action: string;
}

interface ReplayData {
  id: string;
  playerName: string;
  opponentName: string;
  playerRace: 'Terran' | 'Protoss' | 'Zerg';
  opponentRace: 'Terran' | 'Protoss' | 'Zerg';
  map: string;
  duration: string;
  date: string;
  result: 'win' | 'loss';
  apm: number;
  eapm?: number;
  matchup: string;
  buildOrder: BuildOrder[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  trainingPlan?: {
    day: number;
    focus: string;
    drill: string;
  }[];
  resourcesGraph?: {
    time: string;
    minerals: number;
    gas: number;
  }[];
}

interface AnalysisResultProps {
  data: ReplayData;
  isPremium?: boolean;
}

const AnalysisResult: React.FC<AnalysisResultProps> = ({ 
  data,
  isPremium = false 
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };

  // Helper function to get race-specific color
  const getRaceColor = (race: 'Terran' | 'Protoss' | 'Zerg'): string => {
    switch (race) {
      case 'Terran':
        return 'text-terran';
      case 'Protoss':
        return 'text-protoss';
      case 'Zerg':
        return 'text-zerg';
      default:
        return '';
    }
  };

  // Get a skill rating based on APM
  const getSkillRating = (apm: number): { label: string; color: string } => {
    if (apm >= 300) return { label: 'Professional', color: 'text-strength-dark' };
    if (apm >= 200) return { label: 'Advanced', color: 'text-strength' };
    if (apm >= 120) return { label: 'Intermediate', color: 'text-improvement' };
    return { label: 'Beginner', color: 'text-weakness' };
  };

  const skillRating = getSkillRating(data.apm);

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-secondary/30 to-secondary/10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span className={getRaceColor(data.playerRace)}>{data.playerName}</span>
              <span className="text-muted-foreground">vs.</span>
              <span className={getRaceColor(data.opponentRace)}>{data.opponentName}</span>
            </h2>
            <p className="text-muted-foreground">
              <span className="font-medium">{data.matchup}</span> on {data.map} • {data.date}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant={data.result === 'win' ? "default" : "destructive"} className="text-sm">
              {data.result.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock size={12} />
              {data.duration}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Activity size={12} />
              {data.apm} APM
            </Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full grid grid-cols-3 md:grid-cols-5 bg-background border-y border-border">
          <TabsTrigger value="overview" className="gap-1">
            <Award className="w-4 h-4 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="build" className="gap-1">
            <BookOpen className="w-4 h-4 mr-1" />
            Build Order
          </TabsTrigger>
          <TabsTrigger value="analysis" className="gap-1">
            <BarChart2 className="w-4 h-4 mr-1" />
            Analysis
          </TabsTrigger>
          <TabsTrigger value="training" disabled={!isPremium} className="gap-1">
            <Flag className="w-4 h-4 mr-1" />
            Training {!isPremium && <span className="ml-1">🔒</span>}
          </TabsTrigger>
          <TabsTrigger value="stats" disabled={!isPremium} className="gap-1">
            <Activity className="w-4 h-4 mr-1" />
            Stats {!isPremium && <span className="ml-1">🔒</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Strengths */}
            <div className="bg-secondary/10 rounded-lg p-4 border border-border hover:border-strength/40 transition-colors transform hover:translate-y-[-2px] hover:shadow-lg">
              <h3 className="text-lg font-medium mb-3 flex items-center text-strength">
                <Trophy size={18} className="mr-2" />
                Strengths
              </h3>
              <ul className="space-y-2">
                {data.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start">
                    <ArrowUpRight size={16} className="text-strength mr-2 mt-1 flex-shrink-0" />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            <div className="bg-secondary/10 rounded-lg p-4 border border-border hover:border-weakness/40 transition-colors transform hover:translate-y-[-2px] hover:shadow-lg">
              <h3 className="text-lg font-medium mb-3 flex items-center text-weakness">
                <AlertTriangle size={18} className="mr-2" />
                Weaknesses
              </h3>
              <ul className="space-y-2">
                {data.weaknesses.map((weakness, index) => (
                  <li key={index} className="flex items-start">
                    <ChevronRight size={16} className="text-weakness mr-2 mt-1 flex-shrink-0" />
                    <span>{weakness}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            <div className="bg-secondary/10 rounded-lg p-4 border border-border hover:border-improvement/40 transition-colors transform hover:translate-y-[-2px] hover:shadow-lg">
              <h3 className="text-lg font-medium mb-3 flex items-center text-improvement">
                <BarChart2 size={18} className="mr-2" />
                Key Recommendations
              </h3>
              <ul className="space-y-2">
                {data.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start">
                    <ChevronRight size={16} className="text-improvement mr-2 mt-1 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Skill Assessment */}
          <div className="mt-8">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <Award className="mr-2 h-5 w-5" />
              Skill Assessment
            </h3>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span>APM (Actions Per Minute)</span>
                  <span className={`font-medium ${skillRating.color}`}>
                    {data.apm} - {skillRating.label}
                  </span>
                </div>
                <Progress value={Math.min(data.apm / 4, 100)} className="h-2" />
                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                  <span>Beginner</span>
                  <span>Intermediate</span>
                  <span>Advanced</span>
                  <span>Pro</span>
                </div>
              </div>
              
              {isPremium && data.eapm && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span>EAPM (Effective Actions Per Minute)</span>
                    <span className="font-medium">{data.eapm}</span>
                  </div>
                  <Progress value={Math.min(data.eapm / 3, 100)} className="h-2" />
                </div>
              )}
              
              {!isPremium && (
                <div className="bg-secondary/10 rounded-lg p-4 border border-border">
                  <h3 className="text-lg font-medium mb-2">Unlock Premium Analysis</h3>
                  <p className="text-muted-foreground mb-4">
                    Get access to EAPM measurements, resource efficiency analysis, 
                    and a personalized 10-day training plan.
                  </p>
                  <Button>Upgrade to Premium</Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="build" className="p-6">
          <h3 className="text-xl font-medium mb-4 flex items-center">
            <BookOpen className="mr-2 h-5 w-5" />
            Build Order Analysis
          </h3>
          
          <div className="relative overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-foreground text-left">
                <tr>
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">Supply</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.buildOrder.map((item, index) => (
                  <tr key={index} className="border-t border-border">
                    <td className="px-6 py-3 font-mono">{item.time}</td>
                    <td className="px-6 py-3">{item.supply}</td>
                    <td className="px-6 py-3">{item.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {!isPremium && (
            <div className="mt-6 bg-secondary/10 rounded-lg p-4 border border-border">
              <h3 className="text-lg font-medium mb-2">Premium Build Order Analysis</h3>
              <p className="text-muted-foreground mb-4">
                Upgrade to see detailed build order efficiency analysis, comparisons with pro builds, 
                and recommended adjustments for your playstyle.
              </p>
              <Button>Upgrade to Premium</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="p-6">
          <h3 className="text-xl font-medium mb-6 flex items-center">
            <BarChart2 className="mr-2 h-5 w-5" />
            Detailed Game Analysis
          </h3>
          
          <div className="space-y-4">
            <div className="border border-border rounded-lg overflow-hidden transition-colors hover:border-primary/50">
              <Button 
                variant="ghost"
                className={`w-full flex justify-between items-center p-4 text-left ${
                  expandedSection === 'early' ? 'bg-secondary/50' : 'bg-card'
                }`}
                onClick={() => toggleSection('early')}
              >
                <span className="text-lg font-medium flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Early Game (0:00 - 5:00)
                </span>
                <ChevronDown 
                  className={`transform transition-transform ${
                    expandedSection === 'early' ? 'rotate-180' : ''
                  }`} 
                />
              </Button>
              
              {expandedSection === 'early' && (
                <div className="p-4 bg-secondary/10 border-t border-border">
                  <p className="mb-3">
                    Your early game build order is relatively standard. You went for a quick expansion
                    after barracks, which is good. However, you were supply blocked twice in the
                    first 5 minutes, which slowed down your production.
                  </p>
                  
                  <p className="mb-3">
                    Your scouting was minimal - you only sent one SCV to scout at 2:30, which was later
                    than optimal. This delayed your reaction to your opponent's tech choice.
                  </p>
                  
                  <h4 className="font-medium mt-4 mb-2 flex items-center">
                    <ChevronRight className="h-4 w-4 mr-1 text-improvement" />
                    Recommendations:
                  </h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Practice your supply timing to avoid early blocks</li>
                    <li>Send your first scout around 1:30 - 2:00</li>
                    <li>Consider a more aggressive barracks placement for faster marine production</li>
                  </ul>
                </div>
              )}
            </div>
            
            <div className="border border-border rounded-lg overflow-hidden transition-colors hover:border-primary/50">
              <Button 
                variant="ghost"
                className={`w-full flex justify-between items-center p-4 text-left ${
                  expandedSection === 'mid' ? 'bg-secondary/50' : 'bg-card'
                }`}
                onClick={() => toggleSection('mid')}
              >
                <span className="text-lg font-medium flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Mid Game (5:00 - 12:00)
                </span>
                <ChevronDown 
                  className={`transform transition-transform ${
                    expandedSection === 'mid' ? 'rotate-180' : ''
                  }`} 
                />
              </Button>
              
              {expandedSection === 'mid' && (
                <div className="p-4 bg-secondary/10 border-t border-border">
                  <p className="mb-3">
                    Your mid-game decision to tech to siege tanks was appropriate given your opponent's unit
                    composition. However, your tank positioning during the engagement at 8:45 was suboptimal,
                    resulting in unnecessary losses.
                  </p>
                  
                  <p className="mb-3">
                    You maintained good production throughout this phase, but your third base was delayed
                    by about 2 minutes compared to optimal timing. This put you behind in economy.
                  </p>
                  
                  <h4 className="font-medium mt-4 mb-2 flex items-center">
                    <ChevronRight className="h-4 w-4 mr-1 text-improvement" />
                    Recommendations:
                  </h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Work on sieging tanks on high ground or protected positions</li>
                    <li>Take your third base around 7:00 against this opponent's build</li>
                    <li>Add more production facilities before maxing out supply</li>
                  </ul>
                </div>
              )}
            </div>
            
            <div className="border border-border rounded-lg overflow-hidden transition-colors hover:border-primary/50">
              <Button 
                variant="ghost"
                className={`w-full flex justify-between items-center p-4 text-left ${
                  expandedSection === 'late' ? 'bg-secondary/50' : 'bg-card'
                }`}
                onClick={() => toggleSection('late')}
              >
                <span className="text-lg font-medium flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Late Game (12:00+)
                </span>
                <ChevronDown 
                  className={`transform transition-transform ${
                    expandedSection === 'late' ? 'rotate-180' : ''
                  }`} 
                />
              </Button>
              
              {expandedSection === 'late' && (
                <div className="p-4 bg-secondary/10 border-t border-border">
                  <p className="mb-3">
                    Your army composition in the late game was well-balanced with a mix of marines, 
                    marauders, siege tanks, and medivacs. However, you lacked adequate detection,
                    which allowed your opponent's cloaked units to deal significant damage.
                  </p>
                  
                  <p className="mb-3">
                    The engagement at 15:30 was particularly well-executed with good positioning
                    and focus fire. This was the turning point of the game and showcased strong
                    micro control.
                  </p>
                  
                  <h4 className="font-medium mt-4 mb-2 flex items-center">
                    <ChevronRight className="h-4 w-4 mr-1 text-improvement" />
                    Recommendations:
                  </h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Build detection units earlier against this race/build</li>
                    <li>Consider adding air units to your late-game composition</li>
                    <li>Practice splitting against splash damage units</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
          
          {!isPremium && (
            <div className="mt-6 bg-secondary/10 rounded-lg p-4 border border-border">
              <h3 className="text-lg font-medium mb-2">Get More Detailed Analysis</h3>
              <p className="text-muted-foreground mb-4">
                Premium members receive minute-by-minute analysis, key decision point reviews,
                and personalized improvement recommendations.
              </p>
              <Button>Upgrade to Premium</Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="training" className="p-6">
          {isPremium && data.trainingPlan ? (
            <>
              <h3 className="text-xl font-medium mb-6 flex items-center">
                <Flag className="mr-2 h-5 w-5" />
                10-Day Training Plan
              </h3>
              
              <div className="space-y-4">
                {data.trainingPlan.map((day, index) => (
                  <div key={index} className="bg-secondary/10 rounded-lg p-4 border border-border hover:border-primary/50 transition-colors">
                    <h4 className="font-medium text-lg mb-2 flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Day {day.day}: {day.focus}
                    </h4>
                    <p className="text-muted-foreground mb-3">
                      {day.drill}
                    </p>
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm">
                        Mark Complete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-xl font-medium mb-3">Premium Feature Locked</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Unlock personalized training plans designed by professional coaches
                to target your specific weaknesses.
              </p>
              <Button>Upgrade to Premium</Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="stats" className="p-6">
          {isPremium && data.resourcesGraph ? (
            <>
              <h3 className="text-xl font-medium mb-6 flex items-center">
                <Activity className="mr-2 h-5 w-5" />
                Advanced Statistics
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-secondary/10 rounded-lg p-4 border border-border hover:border-primary/50 transition-colors">
                  <h4 className="font-medium mb-3">Resource Collection Rate</h4>
                  <div className="h-64 bg-card rounded border border-border flex items-center justify-center">
                    <p className="text-muted-foreground">Resource chart would be displayed here</p>
                  </div>
                </div>
                
                <div className="bg-secondary/10 rounded-lg p-4 border border-border hover:border-primary/50 transition-colors">
                  <h4 className="font-medium mb-3">APM Over Time</h4>
                  <div className="h-64 bg-card rounded border border-border flex items-center justify-center">
                    <p className="text-muted-foreground">APM chart would be displayed here</p>
                  </div>
                </div>
                
                <div className="bg-secondary/10 rounded-lg p-4 border border-border hover:border-primary/50 transition-colors">
                  <h4 className="font-medium mb-3">Unit Production</h4>
                  <div className="h-64 bg-card rounded border border-border flex items-center justify-center">
                    <p className="text-muted-foreground">Unit production chart would be displayed here</p>
                  </div>
                </div>
                
                <div className="bg-secondary/10 rounded-lg p-4 border border-border hover:border-primary/50 transition-colors">
                  <h4 className="font-medium mb-3">Army Value Comparison</h4>
                  <div className="h-64 bg-card rounded border border-border flex items-center justify-center">
                    <p className="text-muted-foreground">Army value chart would be displayed here</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-xl font-medium mb-3">Premium Feature Locked</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Upgrade to premium to access detailed statistical analysis, including
                resource collection efficiency, APM distribution, and more.
              </p>
              <Button>Upgrade to Premium</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalysisResult;
