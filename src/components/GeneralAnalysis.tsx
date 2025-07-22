
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Clock, Users, Map, Zap, Target, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface GeneralAnalysisProps {
  data: any;
}

interface PlayerAnalysis {
  player_name: string;
  race: string;
  apm: number;
  eapm: number;
  build_order: Array<{
    supply: string;
    timestamp: string;
    action: string;
    unitName: string;
    category: string;
    cost: { minerals: number; gas: number };
  }>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  build_analysis: {
    strategy: string;
    timing: string;
    efficiency: number;
  };
}

const GeneralAnalysis: React.FC<GeneralAnalysisProps> = ({ data }) => {
  console.log('[GeneralAnalysis] Received data:', data);

  if (!data?.data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="mx-auto mb-2 h-8 w-8" />
            <p>No analysis data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { data: analysisData } = data;
  const { players, analysis, map_name, duration, parsing_stats } = analysisData;

  const getRaceColor = (race: string) => {
    const colors = {
      'Terran': 'bg-blue-500',
      'Protoss': 'bg-yellow-500', 
      'Zerg': 'bg-purple-500'
    };
    return colors[race as keyof typeof colors] || 'bg-gray-500';
  };

  const formatBuildOrder = (buildOrder: any[]) => {
    return buildOrder.slice(0, 20).map((item, index) => (
      <div key={index} className="flex items-center justify-between py-2 border-b border-border/50">
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-muted-foreground min-w-[60px]">
            {item.timestamp}
          </span>
          <Badge variant="outline" className="text-xs">
            {item.supply}
          </Badge>
          <span className="text-sm">
            {item.action} <span className="font-semibold">{item.unitName}</span>
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {item.cost.minerals}m {item.cost.gas > 0 && `${item.cost.gas}g`}
        </div>
      </div>
    ));
  };

  return (
    <div className="space-y-6">
      {/* Match Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Match Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Map className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{map_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{duration}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{players?.length || 0} players</span>
            </div>
          </div>
          
          {parsing_stats && (
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <h4 className="text-sm font-semibold mb-2">Parsing Statistics</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>Commands: <span className="font-mono">{parsing_stats.commands_parsed}</span></div>
                <div>Players: <span className="font-mono">{parsing_stats.players_found}</span></div>
                <div>Build Items: <span className="font-mono">{parsing_stats.build_items_extracted}</span></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Player Analysis */}
      {analysis && Object.keys(analysis).length > 0 && (
        <Tabs defaultValue={Object.keys(analysis)[0]} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            {Object.entries(analysis).map(([playerId, playerData]: [string, any]) => (
              <TabsTrigger key={playerId} value={playerId} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getRaceColor(playerData.race)}`} />
                {playerData.player_name}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(analysis).map(([playerId, playerData]: [string, any]) => (
            <TabsContent key={playerId} value={playerId} className="space-y-6">
              {/* Player Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${getRaceColor(playerData.race)}`} />
                      <span className="font-semibold">{playerData.race}</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-orange-500" />
                      <div>
                        <div className="font-semibold">{playerData.apm}</div>
                        <div className="text-xs text-muted-foreground">APM</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="font-semibold">{playerData.eapm}</div>
                        <div className="text-xs text-muted-foreground">EAPM</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="font-semibold">{playerData.build_analysis?.efficiency || 0}%</div>
                        <div className="text-xs text-muted-foreground">Efficiency</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Build Order Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Build Order Analysis</CardTitle>
                  <CardDescription>
                    Strategy: <Badge variant="secondary">{playerData.build_analysis?.strategy}</Badge>
                    {' '}Timing: <Badge variant="outline">{playerData.build_analysis?.timing}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {playerData.build_order && playerData.build_order.length > 0 ? (
                      formatBuildOrder(playerData.build_order)
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <AlertTriangle className="mx-auto mb-2 h-8 w-8" />
                        <p>No build order data extracted</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {playerData.strengths && playerData.strengths.length > 0 ? (
                      <ul className="space-y-2">
                        {playerData.strengths.map((strength: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{strength}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground text-sm">No strengths identified</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-600">
                      <AlertTriangle className="h-5 w-5" />
                      Areas for Improvement
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {playerData.weaknesses && playerData.weaknesses.length > 0 ? (
                      <ul className="space-y-2">
                        {playerData.weaknesses.map((weakness: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{weakness}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground text-sm">No weaknesses identified</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Coaching Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {playerData.recommendations && playerData.recommendations.length > 0 ? (
                    <ul className="space-y-3">
                      {playerData.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                          <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-sm">No recommendations available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};

export default GeneralAnalysis;
