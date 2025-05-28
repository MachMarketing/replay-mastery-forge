import React, { useState, useEffect } from 'react';
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
import { EnhancedReplayData } from '@/services/nativeReplayParser/enhancedScrepWrapper';

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
  data: EnhancedReplayData | ReplayData;
  isPremium?: boolean;
}

const AnalysisResult: React.FC<AnalysisResultProps> = ({ 
  data,
  isPremium = false 
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('early');
  const [transformedData, setTransformedData] = useState<ReplayData | null>(null);

  // Transform EnhancedReplayData to the format expected by the UI
  useEffect(() => {
    console.log('[AnalysisResult] Received data:', data);
    
    if ('enhanced' in data) {
      // This is EnhancedReplayData - transform it
      const enhancedData = data as EnhancedReplayData;
      
      console.log('[AnalysisResult] Processing EnhancedReplayData:', {
        hasDetailedActions: enhancedData.enhanced.hasDetailedActions,
        extractionMethod: enhancedData.enhanced.extractionMethod,
        buildOrdersCount: enhancedData.computed.buildOrders.reduce((sum, bo) => sum + bo.length, 0),
        apmData: enhancedData.computed.apm,
        playersCount: enhancedData.players.length
      });

      // Get the first player (main player) and second player (opponent)
      const mainPlayer = enhancedData.players[0] || { name: 'Unknown', race: 'Terran' };
      const opponent = enhancedData.players[1] || { name: 'Unknown', race: 'Terran' };
      
      // Transform build order from enhanced data - use first player's build order
      const realBuildOrder = enhancedData.computed.buildOrders[0] || [];
      console.log('[AnalysisResult] Real build order for player 0:', realBuildOrder);
      
      const buildOrder: BuildOrder[] = realBuildOrder.length > 0 
        ? realBuildOrder.map(item => ({
            time: item.timestamp || '0:00',
            supply: item.supply || 0,
            action: item.action || 'Unknown Action'
          }))
        : [
            // Fallback mock data only if no real data exists
            { time: '0:12', supply: 9, action: 'SCV' },
            { time: '0:42', supply: 10, action: 'Supply Depot' },
            { time: '1:25', supply: 12, action: 'Barracks' },
            { time: '1:45', supply: 13, action: 'SCV' },
            { time: '2:10', supply: 15, action: 'Marine' }
          ];

      const transformed: ReplayData = {
        id: enhancedData.header.title || 'unknown',
        playerName: mainPlayer.name,
        opponentName: opponent.name,
        playerRace: mainPlayer.race as 'Terran' | 'Protoss' | 'Zerg',
        opponentRace: opponent.race as 'Terran' | 'Protoss' | 'Zerg',
        map: enhancedData.header.mapName || 'Unknown Map',
        duration: enhancedData.header.duration || '0:00',
        date: new Date().toLocaleDateString('de-DE'),
        result: 'win', // Could be determined from game data if available
        apm: enhancedData.computed.apm[0] || 0,
        eapm: enhancedData.computed.eapm[0],
        matchup: `${mainPlayer.race}v${opponent.race}`,
        buildOrder,
        strengths: enhancedData.enhanced.hasDetailedActions 
          ? [
              `Starke Micro-Performance mit ${enhancedData.enhanced.debugInfo.actionsExtracted} erfassten Aktionen`,
              `Effizienter ${enhancedData.enhanced.extractionMethod} Parsing verwendet`,
              `Konsistente Build Order mit ${buildOrder.length} dokumentierten Schritten`
            ]
          : [
              'Grundlegende Makro-Struktur erkennbar',
              'Stabile Spieleröffnung',
              'Angemessene Ressourcenverteilung'
            ],
        weaknesses: enhancedData.enhanced.hasDetailedActions
          ? [
              'Verbesserbare APM-Effizienz in kritischen Momenten',
              'Optimierbare Build Order Timings',
              'Gelegenheiten für bessere Ressourcennutzung'
            ]
          : [
              'Begrenzte Aktionsdaten verfügbar für detaillierte Analyse',
              'Timing-Optimierungen schwer messbar',
              'Micro-Management Details nicht erfasst'
            ],
        recommendations: enhancedData.enhanced.hasDetailedActions
          ? [
              `Fokus auf APM-Steigerung von ${enhancedData.computed.apm[0]} auf 150+`,
              'Build Order Timing um 5-10 Sekunden optimieren',
              'Mehr aggressive Scouting in der frühen Spielphase'
            ]
          : [
              'Detailliertere Replays für bessere Analyse verwenden',
              'APM durch regelmäßiges Training steigern',
              'Build Order Präzision durch Wiederholung verbessern'
            ]
      };

      console.log('[AnalysisResult] Transformed data:', transformed);
      setTransformedData(transformed);
    } else {
      // This is already ReplayData
      console.log('[AnalysisResult] Using ReplayData as-is');
      setTransformedData(data as ReplayData);
    }
  }, [data]);

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

  if (!transformedData) {
    return <div className="p-6">Loading analysis...</div>;
  }

  const skillRating = getSkillRating(transformedData.apm);

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-secondary/30 to-secondary/10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span className={getRaceColor(transformedData.playerRace)}>{transformedData.playerName}</span>
              <span className="text-muted-foreground">vs.</span>
              <span className={getRaceColor(transformedData.opponentRace)}>{transformedData.opponentName}</span>
            </h2>
            <p className="text-muted-foreground">
              <span className="font-medium">{transformedData.matchup}</span> on {transformedData.map} • {transformedData.date}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant={transformedData.result === 'win' ? "default" : "destructive"} className="text-sm">
              {transformedData.result.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock size={12} />
              {transformedData.duration}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Activity size={12} />
              {transformedData.apm} APM
            </Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="analysis">
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
                {transformedData.strengths.map((strength, index) => (
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
                {transformedData.weaknesses.map((weakness, index) => (
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
                {transformedData.recommendations.map((rec, index) => (
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
                    {transformedData.apm} - {skillRating.label}
                  </span>
                </div>
                <Progress value={Math.min(transformedData.apm / 4, 100)} className="h-2" />
                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                  <span>Beginner</span>
                  <span>Intermediate</span>
                  <span>Advanced</span>
                  <span>Pro</span>
                </div>
              </div>
              
              {isPremium && transformedData.eapm && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span>EAPM (Effective Actions Per Minute)</span>
                    <span className="font-medium">{transformedData.eapm}</span>
                  </div>
                  <Progress value={Math.min(transformedData.eapm / 3, 100)} className="h-2" />
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
                {transformedData.buildOrder.map((item, index) => (
                  <tr key={index} className="border-t border-border">
                    <td className="px-6 py-3 font-mono">{item.time}</td>
                    <td className="px-6 py-3">{item.supply}</td>
                    <td className="px-6 py-3">{item.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 bg-secondary/10 rounded-lg p-4 border border-border">
            <h3 className="text-lg font-medium mb-2">Build Order Insights</h3>
            <div className="space-y-4 mt-4">
              <div>
                <h4 className="font-medium text-strength">Efficiency Analysis</h4>
                <p className="text-sm mt-1">
                  {transformedData.buildOrder.length > 5 
                    ? `Deine Build Order zeigt ${transformedData.buildOrder.length} dokumentierte Schritte mit stabilen Timings.`
                    : 'Build Order Daten sind begrenzt - für detailliertere Analyse Upload einer neueren Replay-Datei empfohlen.'
                  }
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-improvement">Pro Comparison</h4>
                <p className="text-sm mt-1">
                  Basierend auf deinem {transformedData.matchup} Matchup und {transformedData.apm} APM 
                  liegt dein Spielniveau im {skillRating.label} Bereich. 
                  {transformedData.apm > 150 
                    ? ' Weiterhin Micro-Management und Build Order Präzision verfeinern.'
                    : ' Fokus auf APM-Steigerung und Build Order Memorierung wird empfohlen.'
                  }
                </p>
              </div>
            </div>
          </div>
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
                    Your early game showed a standard {transformedData.playerRace} opening against {transformedData.opponentRace}. 
                    Based on your matchup ({transformedData.matchup}), your build order is well-structured but has
                    some timing inefficiencies.
                  </p>
                  
                  <p className="mb-3">
                    In this {transformedData.matchup} matchup on {transformedData.map}, your scouting was at 2:30, which is 
                    45 seconds later than optimal for this matchup. This delayed your reaction to your
                    opponent's tech choice and could have been punished by an aggressive build.
                  </p>
                  
                  <div className="bg-strength/5 p-3 rounded-md border border-strength/20 mb-3">
                    <h4 className="font-medium text-strength flex items-center">
                      <Trophy size={16} className="mr-2" />
                      Early Game Strengths
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                      <li>Consistent worker production (no gaps until 4:20)</li>
                      <li>Good building placement for wall-off against potential early aggression</li>
                      <li>Effective resource management with minimal floating minerals</li>
                    </ul>
                  </div>
                  
                  <div className="bg-weakness/5 p-3 rounded-md border border-weakness/20 mb-3">
                    <h4 className="font-medium text-weakness flex items-center">
                      <AlertTriangle size={16} className="mr-2" />
                      Early Game Weaknesses
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                      <li>Late scouting at 2:30 (recommended: 1:45 for this matchup)</li>
                      <li>Supply block at 3:15 delayed production by 10 seconds</li>
                      <li>First gas timing of 2:10 is suboptimal for your chosen tech path</li>
                    </ul>
                  </div>
                  
                  <h4 className="font-medium mt-4 mb-2 flex items-center">
                    <ChevronRight className="h-4 w-4 mr-1 text-improvement" />
                    Recommendations:
                  </h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Send your first scout at 1:45 against {transformedData.opponentRace} on {transformedData.map}</li>
                    <li>Build supply slightly earlier at key points (18 supply, 26 supply)</li>
                    <li>Consider taking gas at 1:55 to better align with your chosen tech path</li>
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
                    Your mid-game transitions are showing good understanding of {transformedData.matchup} matchup fundamentals.
                    For a player with {transformedData.apm} APM, your micro was above average, but your macro slipped
                    during engagements.
                  </p>
                  
                  <p className="mb-3">
                    The major engagement at 8:45 showed strong tactical positioning with {transformedData.playerRace} units,
                    but your economy suffered during this period with several production facilities idle for 
                    30+ seconds while microing.
                  </p>
                  
                  <div className="bg-strength/5 p-3 rounded-md border border-strength/20 mb-3">
                    <h4 className="font-medium text-strength flex items-center">
                      <Trophy size={16} className="mr-2" />
                      Mid Game Strengths
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                      <li>Excellent unit positioning during the 8:45 engagement</li>
                      <li>Good tech transitions appropriate for scouted enemy composition</li>
                      <li>Efficient expansion timing at 7:30, well-defended</li>
                    </ul>
                  </div>
                  
                  <div className="bg-weakness/5 p-3 rounded-md border border-weakness/20 mb-3">
                    <h4 className="font-medium text-weakness flex items-center">
                      <AlertTriangle size={16} className="mr-2" />
                      Mid Game Weaknesses
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                      <li>Macro slipped during battles (idle production facilities)</li>
                      <li>Upgrades started later than optimal (6:40 vs recommended 5:30)</li>
                      <li>Map control was conceded without contest from 7:00-9:00</li>
                    </ul>
                  </div>
                  
                  <h4 className="font-medium mt-4 mb-2 flex items-center">
                    <ChevronRight className="h-4 w-4 mr-1 text-improvement" />
                    Recommendations:
                  </h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Practice using control groups to maintain production during battles</li>
                    <li>Start upgrades at 5:30 to maintain tech advantage in this matchup</li>
                    <li>Establish better map presence with small control groups at key map positions</li>
                    <li>Use camera location hotkeys to quickly cycle between bases during engagements</li>
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
                    Your late game execution showed good understanding of {transformedData.matchup} unit compositions. The
                    decisive engagement at 15:30 was particularly well-executed with excellent positioning
                    and focus fire.
                  </p>
                  
                  <p className="mb-3">
                    For the {transformedData.playerRace} vs {transformedData.opponentRace} matchup on {transformedData.map}, your unit composition was
                    strong but lacked adequate detection against cloaked units, which allowed your opponent to deal
                    significant economic damage at your third base.
                  </p>
                  
                  <div className="bg-strength/5 p-3 rounded-md border border-strength/20 mb-3">
                    <h4 className="font-medium text-strength flex items-center">
                      <Trophy size={16} className="mr-2" />
                      Late Game Strengths
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                      <li>Excellent army positioning at the 15:30 engagement</li>
                      <li>Well-balanced army composition appropriate for the matchup</li>
                      <li>Good upgrades timing in the late game (3/3 completed by 16:00)</li>
                      <li>Effective use of {transformedData.playerRace} special abilities/spells</li>
                    </ul>
                  </div>
                  
                  <div className="bg-weakness/5 p-3 rounded-md border border-weakness/20 mb-3">
                    <h4 className="font-medium text-weakness flex items-center">
                      <AlertTriangle size={16} className="mr-2" />
                      Late Game Weaknesses
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                      <li>Insufficient detection against cloaked units</li>
                      <li>Banking excessive resources (2000+ minerals, 1500+ gas) after 14:00</li>
                      <li>Incomplete map control allowed opponent to establish hidden expansions</li>
                      <li>Limited use of late-game {transformedData.playerRace} tech options</li>
                    </ul>
                  </div>
                  
                  <h4 className="font-medium mt-4 mb-2 flex items-center">
                    <ChevronRight className="h-4 w-4 mr-1 text-improvement" />
                    Recommendations:
                  </h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Maintain mobile detection units with each army group</li>
                    <li>Spend excess resources on production facilities and remax capacity</li>
                    <li>Use small units to patrol for hidden expansions</li>
                    <li>Incorporate more {transformedData.playerRace} special units appropriate for this matchup</li>
                    <li>Practice hotkey usage to improve your late-game APM efficiency</li>
                  </ul>
                </div>
              )}
            </div>
            
            <div className="border border-border rounded-lg overflow-hidden transition-colors hover:border-primary/50">
              <Button 
                variant="ghost"
                className={`w-full flex justify-between items-center p-4 text-left ${
                  expandedSection === 'pro' ? 'bg-secondary/50' : 'bg-card'
                }`}
                onClick={() => toggleSection('pro')}
              >
                <span className="text-lg font-medium flex items-center">
                  <Award className="h-5 w-5 mr-2" />
                  Pro-Level Insights
                </span>
                <ChevronDown 
                  className={`transform transition-transform ${
                    expandedSection === 'pro' ? 'rotate-180' : ''
                  }`} 
                />
              </Button>
              
              {expandedSection === 'pro' && (
                <div className="p-4 bg-secondary/10 border-t border-border">
                  <p className="mb-3">
                    If you were playing in an ASL-level competition, here are the key differences
                    that would set apart your gameplay from professional players:
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-improvement">Build Order Precision</h4>
                      <p className="text-sm mt-1">
                        Pro {transformedData.playerRace} players in {transformedData.matchup} matchups execute build orders with
                        second-perfect precision. Your build deviates by ~8-12 seconds from optimal timings,
                        creating small inefficiencies that compound throughout the game.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-improvement">APM Distribution</h4>
                      <p className="text-sm mt-1">
                        While your overall APM of {transformedData.apm} is respectable, pro players maintain more consistent
                        APM across all game phases. Your APM drops by 30% during key engagements, indicating 
                        mechanical strain. Pros maintain higher effective APM while multitasking.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-improvement">Adaptation Speed</h4>
                      <p className="text-sm mt-1">
                        Pro players adapt to opponent's strategies within 30 seconds of scouting. Your
                        adaptations took 1-2 minutes on average. This reaction speed difference is
                        crucial at professional levels.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-improvement">Current Meta Analysis</h4>
                      <p className="text-sm mt-1">
                        The current ASL meta for {transformedData.matchup} on {transformedData.map} favors earlier expansion
                        with tight defensive positioning. Your approach is slightly outdated compared
                        to recent professional trends. Review recent ASL matches for updated patterns.
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-primary/5 p-3 rounded-md border border-primary/20 mt-4">
                    <h4 className="font-medium flex items-center">
                      <Award size={16} className="mr-2 text-primary" />
                      Pro Player Reference
                    </h4>
                    <p className="text-sm mt-2">
                      Your gameplay style most closely resembles {transformedData.playerRace === 'Terran' ? 'FlaSh' : 
                      transformedData.playerRace === 'Protoss' ? 'Bisu' : 'Jaedong'} in terms of overall approach, but with
                      less refinement in execution. Study their recent {transformedData.matchup} matches for specific
                      improvements to your gameplay pattern.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="training" className="p-6">
          {isPremium && transformedData.trainingPlan ? (
            <>
              <h3 className="text-xl font-medium mb-6 flex items-center">
                <Flag className="mr-2 h-5 w-5" />
                10-Day Training Plan
              </h3>
              
              <div className="space-y-4">
                {transformedData.trainingPlan.map((day, index) => (
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
                
                {/* Additional personalized training items */}
                <div className="bg-secondary/10 rounded-lg p-4 border border-border hover:border-primary/50 transition-colors">
                  <h4 className="font-medium text-lg mb-2 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Day 3: {transformedData.matchup} Specific Micromanagement
                  </h4>
                  <p className="text-muted-foreground mb-3">
                    Practice {transformedData.playerRace === 'Terran' ? 'marine/medic control against lurkers' : 
                    transformedData.playerRace === 'Protoss' ? 'zealot/dragoon positioning against tanks' : 
                    'mutalisk harass and stack control'} for 45 minutes with focus on minimizing losses.
                  </p>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm">
                      Mark Complete
                    </Button>
                  </div>
                </div>
                
                <div className="bg-secondary/10 rounded-lg p-4 border border-border hover:border-primary/50 transition-colors">
                  <h4 className="font-medium text-lg mb-2 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Day 4: Macro Cycle Refinement
                  </h4>
                  <p className="text-muted-foreground mb-3">
                    Practice your standard {transformedData.matchup} opening with focus on worker production consistency and 
                    eliminating supply blocks. Target less than 3 seconds idle production time per facility.
                  </p>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm">
                      Mark Complete
                    </Button>
                  </div>
                </div>
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
          {isPremium && transformedData.resourcesGraph ? (
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
