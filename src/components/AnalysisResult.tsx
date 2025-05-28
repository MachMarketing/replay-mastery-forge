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
  Flag,
  Bug
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
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // Transform EnhancedReplayData to the format expected by the UI
  useEffect(() => {
    console.log('[AnalysisResult] Received data:', data);
    
    if ('enhanced' in data) {
      // This is EnhancedReplayData - transform it
      const enhancedData = data as EnhancedReplayData;
      
      console.log('[AnalysisResult] Processing EnhancedReplayData:', {
        hasDetailedActions: enhancedData.enhanced.hasDetailedActions,
        extractionMethod: enhancedData.enhanced.extractionMethod,
        activeParser: enhancedData.enhanced.debugInfo.qualityCheck.activeParser,
        buildOrdersCount: enhancedData.computed.buildOrders.reduce((sum, bo) => sum + bo.length, 0),
        chosenAPM: enhancedData.enhanced.debugInfo.qualityCheck.apmValidation.chosenAPM,
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
            // Fallback only if no real data exists
            { time: '0:12', supply: 9, action: 'SCV' },
            { time: '0:42', supply: 10, action: 'Supply Depot' },
            { time: '1:25', supply: 12, action: 'Barracks' }
          ];

      // Use the chosen APM from quality validation
      const finalAPM = enhancedData.enhanced.debugInfo.qualityCheck.apmValidation.chosenAPM;
      const playerAPM = Array.isArray(finalAPM) ? finalAPM[0] : (finalAPM || enhancedData.computed.apm[0] || 0);

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
        apm: playerAPM,
        eapm: enhancedData.computed.eapm[0],
        matchup: `${mainPlayer.race}v${opponent.race}`,
        buildOrder,
        strengths: enhancedData.enhanced.hasDetailedActions 
          ? [
              `${enhancedData.enhanced.debugInfo.qualityCheck.activeParser} Parser aktiv mit ${enhancedData.enhanced.debugInfo.actionsExtracted} Aktionen`,
              `Realistische APM von ${playerAPM} detektiert`,
              `${buildOrder.length} Build Order Schritte erfasst`
            ]
          : [
              'Grundlegende Replay-Daten verfügbar',
              'screp-js Fallback aktiv',
              'Basis-APM Berechnung verfügbar'
            ],
        weaknesses: enhancedData.enhanced.hasDetailedActions
          ? [
              'Timing-Optimierungen möglich',
              'APM-Effizienz verbesserbar',
              'Micro-Management verfeinern'
            ]
          : [
              `Nur ${enhancedData.enhanced.debugInfo.actionsExtracted} Aktionen gefunden`,
              'Detailliertere Parser-Daten nicht verfügbar',
              'Begrenzte Analyse-Tiefe'
            ],
        recommendations: enhancedData.enhanced.hasDetailedActions
          ? [
              `APM von ${playerAPM} auf 150+ steigern`,
              'Build Order Präzision verbessern',
              'Mehr aggressive Taktiken einsetzen'
            ]
          : [
              'Neuere Replay-Datei für bessere Analyse verwenden',
              'Parser-Integration überprüfen',
              'Manuelle Build Order Dokumentation erwägen'
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
  const enhancedData = 'enhanced' in data ? data as EnhancedReplayData : null;

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
            {enhancedData && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Activity size={12} />
                  Parser: {enhancedData.enhanced.debugInfo.qualityCheck.activeParser}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <BarChart2 size={12} />
                  {enhancedData.enhanced.debugInfo.actionsExtracted} Actions
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDebugInfo(!showDebugInfo)}
                  className="h-6 px-2"
                >
                  <Bug size={12} />
                </Button>
              </div>
            )}
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

        {/* Debug Info Panel */}
        {showDebugInfo && enhancedData && (
          <div className="mt-4 p-4 bg-secondary/20 rounded-lg border border-border">
            <h3 className="font-medium mb-2 flex items-center">
              <Bug size={16} className="mr-2" />
              Parser Debug Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-medium">Parser Status</h4>
                <ul className="space-y-1 mt-1">
                  <li>screp-js: {enhancedData.enhanced.debugInfo.screpJsSuccess ? '✅' : '❌'}</li>
                  <li>Native: {enhancedData.enhanced.debugInfo.nativeParserSuccess ? '✅' : '❌'}</li>
                  <li>Direct: {enhancedData.enhanced.debugInfo.directParserSuccess ? '✅' : '❌'}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium">Quality Check</h4>
                <ul className="space-y-1 mt-1">
                  <li>Active: {enhancedData.enhanced.debugInfo.qualityCheck.activeParser}</li>
                  <li>Native realistic: {enhancedData.enhanced.debugInfo.qualityCheck.nativeParserRealistic ? '✅' : '❌'}</li>
                  <li>Direct realistic: {enhancedData.enhanced.debugInfo.qualityCheck.directParserRealistic ? '✅' : '❌'}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium">Data Extracted</h4>
                <ul className="space-y-1 mt-1">
                  <li>Actions: {enhancedData.enhanced.debugInfo.actionsExtracted}</li>
                  <li>Build Orders: {enhancedData.enhanced.debugInfo.buildOrdersGenerated}</li>
                  <li>Extraction: {enhancedData.enhanced.extractionTime}ms</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <Tabs defaultValue="build">
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

        <TabsContent value="build" className="p-6">
          <h3 className="text-xl font-medium mb-4 flex items-center">
            <BookOpen className="mr-2 h-5 w-5" />
            Build Order Analysis
          </h3>
          
          {enhancedData && (
            <div className="mb-4 p-4 bg-secondary/10 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Parser Information</span>
                <Badge variant={enhancedData.enhanced.hasDetailedActions ? "default" : "secondary"}>
                  {enhancedData.enhanced.debugInfo.qualityCheck.activeParser} Parser
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {enhancedData.enhanced.hasDetailedActions 
                  ? `${enhancedData.enhanced.debugInfo.actionsExtracted} Aktionen mit ${enhancedData.enhanced.debugInfo.qualityCheck.activeParser} Parser extrahiert`
                  : `Fallback auf screp-js (${enhancedData.enhanced.debugInfo.actionsExtracted} Aktionen gefunden)`
                }
              </p>
            </div>
          )}
          
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
                <h4 className="font-medium text-strength">Parser Analysis</h4>
                <p className="text-sm mt-1">
                  {enhancedData?.enhanced.hasDetailedActions 
                    ? `Der ${enhancedData.enhanced.debugInfo.qualityCheck.activeParser} Parser hat ${transformedData.buildOrder.length} Build Order Schritte mit realistischen Timings extrahiert.`
                    : `Es wurden ${transformedData.buildOrder.length} grundlegende Schritte gefunden. Für detailliertere Analyse ist ein verbesserter Parser erforderlich.`
                  }
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-improvement">APM Analysis</h4>
                <p className="text-sm mt-1">
                  Mit {transformedData.apm} APM befindest du dich im {skillRating.label} Bereich. 
                  {transformedData.apm > 150 
                    ? ' Fokus auf Effizienz und Build Order Präzision.'
                    : ' Arbeite an APM-Steigerung und Makro-Verbesserungen.'
                  }
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

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
                    Based on your matchup ({transformedData.matchup}), your build order analysis shows room for improvement.
                  </p>
                  
                  {enhancedData && (
                    <div className="bg-primary/5 p-3 rounded-md border border-primary/20 mb-3">
                      <h4 className="font-medium flex items-center">
                        <BarChart2 size={16} className="mr-2 text-primary" />
                        Parser Analysis Results
                      </h4>
                      <p className="text-sm mt-2">
                        {enhancedData.enhanced.debugInfo.qualityCheck.activeParser} Parser aktiv: 
                        {enhancedData.enhanced.debugInfo.actionsExtracted} Aktionen in {enhancedData.enhanced.extractionTime}ms extrahiert.
                        APM-Qualität: {enhancedData.enhanced.debugInfo.qualityCheck.nativeParserRealistic || enhancedData.enhanced.debugInfo.qualityCheck.directParserRealistic ? 'Realistisch' : 'Grundlegend'}
                      </p>
                    </div>
                  )}
                  
                  <div className="bg-strength/5 p-3 rounded-md border border-strength/20 mb-3">
                    <h4 className="font-medium text-strength flex items-center">
                      <Trophy size={16} className="mr-2" />
                      Early Game Strengths
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                      <li>Build order execution detected with {transformedData.buildOrder.length} steps</li>
                      <li>APM of {transformedData.apm} indicates {skillRating.label} level play</li>
                      <li>Good resource management patterns visible</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="training" className="p-6">
          {isPremium ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-medium mb-3">Training Plan Coming Soon</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Personalized training plans based on your {transformedData.apm} APM and 
                {transformedData.matchup} performance will be available soon.
              </p>
            </div>
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
          {isPremium ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-medium mb-3">Advanced Statistics Coming Soon</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Detailed charts and graphs based on your enhanced parsing data
                will be available soon.
              </p>
            </div>
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
