
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Clock, ArrowDown, Award, LineChart, BarChart2 } from 'lucide-react';
import AdvancedMetricsDisplay from './AdvancedMetricsDisplay';
import { ExtendedReplayData, ParsedReplayResult } from '@/services/replayParser/types';

interface AdvancedAnalysisDisplayProps {
  data: ParsedReplayResult | null;
  activePlayerIndex: number;
  isPremium?: boolean;
}

const AdvancedAnalysisDisplay: React.FC<AdvancedAnalysisDisplayProps> = ({ 
  data, 
  activePlayerIndex,
  isPremium = false
}) => {
  const [activeTab, setActiveTab] = React.useState('overview');
  
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Erweiterte Analyse</CardTitle>
          <CardDescription>Keine Daten verfügbar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-4 opacity-20" />
            <p>Keine Analysedaten verfügbar</p>
            <p className="text-sm">Lade ein Replay hoch, um eine detaillierte Analyse zu erhalten.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Get the active player from the data
  const activePlayer = activePlayerIndex === 0 ? data.primaryPlayer : data.secondaryPlayer;
  
  return (
    <div className="space-y-8">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="overview">
            <Award className="mr-2 h-4 w-4" />
            Übersicht
          </TabsTrigger>
          <TabsTrigger value="metrics">
            <BarChart2 className="mr-2 h-4 w-4" />
            Metriken
          </TabsTrigger>
          <TabsTrigger value="buildOrder">
            <LineChart className="mr-2 h-4 w-4" />
            Build Order
          </TabsTrigger>
          <TabsTrigger value="training">
            <Clock className="mr-2 h-4 w-4" />
            Trainingsplan
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="mr-2 h-5 w-5" />
                Spielanalyse für {activePlayer.name}
              </CardTitle>
              <CardDescription>
                Basierend auf deiner Performance als {activePlayer.race}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Strengths Section */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Stärken</h3>
                  <div className="space-y-2">
                    {activePlayer.strengths.map((strength, index) => (
                      <div 
                        key={index} 
                        className="p-3 rounded-md bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-400 flex items-start"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-2">{strength}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Weaknesses Section */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Verbesserungspotential</h3>
                  <div className="space-y-2">
                    {activePlayer.weaknesses.map((weakness, index) => (
                      <div 
                        key={index}
                        className="p-3 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 flex items-start"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <ArrowDown className="h-5 w-5" />
                        </div>
                        <div className="ml-2">{weakness}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Recommendations Section */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Empfehlungen</h3>
                  <div className="space-y-2">
                    {activePlayer.recommendations.map((recommendation, index) => (
                      <div 
                        key={index}
                        className="p-3 rounded-md bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400 flex items-start"
                      >
                        <div className="flex-shrink-0 mt-0.5 text-blue-500">
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                          </svg>
                        </div>
                        <div className="ml-2">{recommendation}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Zusammenfassung der Spielstatistiken</CardTitle>
              <CardDescription>
                Schnelle Übersicht über deine Performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">APM (Aktionen pro Minute)</p>
                  <p className="text-2xl font-bold">{activePlayer.apm}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">EAPM (Effektive APM)</p>
                  <p className="text-2xl font-bold">{activePlayer.eapm}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Matchup</p>
                  <p className="text-2xl font-bold">{data.matchup}</p>
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Karte</p>
                  <p className="text-lg font-medium">{data.map}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Spieldauer</p>
                  <p className="text-lg font-medium">{data.duration}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Advanced Metrics Tab */}
        <TabsContent value="metrics">
          <AdvancedMetricsDisplay 
            data={data as ExtendedReplayData}
            activePlayerIndex={activePlayerIndex}
          />
        </TabsContent>
        
        {/* Build Order Tab */}
        <TabsContent value="buildOrder" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <LineChart className="mr-2 h-5 w-5" />
                Build Order Analyse
              </CardTitle>
              <CardDescription>
                Detaillierte Build Order für {activePlayer.name} ({activePlayer.race})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activePlayer.buildOrder && activePlayer.buildOrder.length > 0 ? (
                <div className="max-h-96 overflow-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="pb-2 text-left font-medium">Zeit</th>
                        <th className="pb-2 text-left font-medium">Supply</th>
                        <th className="pb-2 text-left font-medium">Aktion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activePlayer.buildOrder.map((item, index) => (
                        <tr key={index} className="border-b border-muted hover:bg-muted/50">
                          <td className="py-2">{item.time}</td>
                          <td className="py-2">{item.supply}</td>
                          <td className="py-2">{item.action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <AlertCircle className="h-10 w-10 mb-4 opacity-20" />
                  <p>Keine Build Order Daten verfügbar</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Build Order Empfehlungen</CardTitle>
              <CardDescription>
                Basierend auf deiner Spielweise und dem Matchup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  {getMatchupBuildOrderRecommendation(data.matchup)}
                </p>
                
                <div className="mt-4">
                  <h3 className="text-md font-medium mb-2">Empfohlene Build Order</h3>
                  <div className="p-4 border rounded-md bg-muted dark:bg-muted/50">
                    {getRecommendedBuildOrder(data.primaryPlayer.race, data.matchup).map((step, index) => (
                      <div key={index} className="flex mb-1">
                        <span className="text-sm font-medium w-12">{step.supply}</span>
                        <span className="text-sm">{step.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Training Plan Tab */}
        <TabsContent value="training" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                7-Tage Trainingsplan
              </CardTitle>
              <CardDescription>
                Personalisierter Trainingsplan basierend auf deiner Spielanalyse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {data.trainingPlan.length > 0 ? (
                  data.trainingPlan.map((day, index) => (
                    <div key={index} className="border rounded-md overflow-hidden">
                      <div className="bg-muted px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-medium mr-2">
                            {day.day}
                          </span>
                          <h3 className="font-medium">Tag {day.day} - {day.focus}</h3>
                        </div>
                      </div>
                      <div className="p-4">
                        <p>{day.drill}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <AlertCircle className="h-10 w-10 mb-4 opacity-20" />
                    <p>Kein Trainingsplan verfügbar</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper functions
function getMatchupBuildOrderRecommendation(matchup: string): string {
  const recommendations: Record<string, string> = {
    'TvP': 'In TvP (Terran vs. Protoss) sind frühe Marine-Pushes und schnelle Expansionen effektiv. Achte besonders auf die Positionierung deiner Einheiten und nutze die Mobilität der Terraner.',
    'TvZ': 'Im TvZ (Terran vs. Zerg) Matchup ist es wichtig, früh Druck auszuüben, um die Wirtschaft des Zerg-Spielers einzuschränken. Hellions für Aufklärung und Drohnen-Kills sind sehr effektiv.',
    'PvT': 'In PvT (Protoss vs. Terran) ist eine solide Verteidigung gegen frühe Angriffe wichtig. Zealot/Dragoon mit guter Kontrolle und Upgrades kann sehr stark sein.',
    'PvZ': 'Im PvZ (Protoss vs. Zerg) ist Wall-Off und frühe Aufklärung entscheidend. Forge Fast Expand oder Corsair-Öffnungen können sehr effektiv sein.',
    'ZvT': 'In ZvZ (Zerg vs. Terran) ist Creep-Spread und eine gute Wirtschaft essentiell. Lurker-Übergänge können besonders wirksam sein.',
    'ZvP': 'Für ZvP (Zerg vs. Protoss) ist frühe Aggression und Hydralisk/Lurker-Timing-Push eine starke Option. Achte auf Protoss-Timings und reagiere entsprechend.'
  };
  
  return recommendations[matchup] || 'Für dieses Matchup ist es wichtig, deine Build Order an den Gegner anzupassen und auf seine Strategie zu reagieren.';
}

function getRecommendedBuildOrder(race: string, matchup: string): Array<{ supply: string, action: string }> {
  const buildOrders: Record<string, Array<{ supply: string, action: string }>> = {
    // Sample Terran build orders
    'TvP_Terran': [
      { supply: '8', action: 'Supply Depot' },
      { supply: '10', action: 'Barracks' },
      { supply: '12', action: 'Refinery' },
      { supply: '15', action: 'Supply Depot' },
      { supply: '16', action: 'Factory' },
      { supply: '20', action: 'Command Center' },
      { supply: '22', action: 'Supply Depot' },
      { supply: '23', action: 'Machine Shop' },
      { supply: '26', action: '2x Barracks' }
    ],
    'TvZ_Terran': [
      { supply: '8', action: 'Supply Depot' },
      { supply: '10', action: 'Barracks' },
      { supply: '12', action: 'Refinery' },
      { supply: '15', action: 'Supply Depot' },
      { supply: '16', action: 'Factory' },
      { supply: '20', action: 'Command Center' },
      { supply: '22', action: 'Supply Depot' },
      { supply: '23', action: 'Starport' },
      { supply: '25', action: 'Science Facility' }
    ],
    
    // Sample Protoss build orders
    'PvT_Protoss': [
      { supply: '8', action: 'Pylon' },
      { supply: '10', action: 'Gateway' },
      { supply: '12', action: 'Assimilator' },
      { supply: '14', action: 'Cybernetics Core' },
      { supply: '16', action: 'Pylon' },
      { supply: '20', action: 'Nexus' },
      { supply: '22', action: 'Robotics Facility' },
      { supply: '26', action: 'Observatory' },
      { supply: '28', action: '2x Gateway' }
    ],
    'PvZ_Protoss': [
      { supply: '8', action: 'Pylon' },
      { supply: '10', action: 'Forge (Fast Expand)' },
      { supply: '12', action: 'Photon Cannon' },
      { supply: '14', action: 'Nexus' },
      { supply: '16', action: 'Gateway' },
      { supply: '18', action: 'Pylon' },
      { supply: '20', action: 'Cybernetics Core' },
      { supply: '23', action: 'Stargate' },
      { supply: '26', action: '2x Gateway' }
    ],
    
    // Sample Zerg build orders
    'ZvT_Zerg': [
      { supply: '9', action: 'Overlord' },
      { supply: '12', action: 'Hatchery' },
      { supply: '11', action: 'Spawning Pool' },
      { supply: '13', action: 'Extractor' },
      { supply: '15', action: 'Overlord' },
      { supply: '16', action: 'Zergling Speed' },
      { supply: '18', action: 'Hydralisk Den' },
      { supply: '21', action: 'Overlord' },
      { supply: '24', action: 'Lurker Aspect' }
    ],
    'ZvP_Zerg': [
      { supply: '9', action: 'Overlord' },
      { supply: '12', action: 'Hatchery' },
      { supply: '11', action: 'Spawning Pool' },
      { supply: '13', action: 'Extractor' },
      { supply: '15', action: 'Overlord' },
      { supply: '16', action: 'Lair' },
      { supply: '18', action: 'Spire' },
      { supply: '21', action: 'Overlord' },
      { supply: '24', action: '3rd Hatchery' }
    ]
  };
  
  // Parse matchup and race to find the right build order
  const key = `${matchup}_${race}`;
  
  return buildOrders[key] || [
    { supply: '?', action: 'Build order nicht verfügbar für dieses Matchup und Rasse' }
  ];
}

export default AdvancedAnalysisDisplay;
