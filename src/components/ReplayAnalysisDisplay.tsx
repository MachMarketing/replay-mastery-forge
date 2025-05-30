
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EnhancedReplayResult } from '@/services/nativeReplayParser/enhancedDataMapper';
import { Clock, Users, Map, Zap, TrendingUp, Target } from 'lucide-react';

interface ReplayAnalysisDisplayProps {
  replayData: EnhancedReplayResult;
}

export function ReplayAnalysisDisplay({ replayData }: ReplayAnalysisDisplayProps) {
  const [selectedPlayer, setSelectedPlayer] = useState(0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getEffectivenessColor = (efficiency: number) => {
    if (efficiency >= 80) return 'text-green-500';
    if (efficiency >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const player = replayData.players[selectedPlayer];
  const playerMetrics = replayData.realMetrics[selectedPlayer];
  const playerAnalysis = replayData.gameplayAnalysis[selectedPlayer];
  const playerBuildOrder = replayData.enhancedBuildOrders[selectedPlayer] || [];

  return (
    <div className="space-y-6">
      {/* Game Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="w-5 h-5" />
            Spiel-Übersicht
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{replayData.header.mapName}</div>
              <div className="text-sm text-muted-foreground">Karte</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{replayData.header.duration}</div>
              <div className="text-sm text-muted-foreground">Spieldauer</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{replayData.header.gameType}</div>
              <div className="text-sm text-muted-foreground">Spieltyp</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {replayData.dataQuality.eapmCalculated ? '✅' : '⚠️'}
              </div>
              <div className="text-sm text-muted-foreground">EAPM Analyse</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Players Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Spieler-Vergleich
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {replayData.players.map((player, index) => {
              const metrics = replayData.realMetrics[index];
              if (!metrics) return null;
              
              return (
                <Card 
                  key={index} 
                  className={`cursor-pointer transition-all ${selectedPlayer === index ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
                  onClick={() => setSelectedPlayer(index)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg">{player.name}</h3>
                        <Badge variant="outline">{player.race}</Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">{metrics.eapm} EAPM</div>
                        <div className="text-sm text-muted-foreground">{metrics.apm} APM</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Effizienz</span>
                        <span className={getEffectivenessColor(metrics.efficiency)}>{metrics.efficiency}%</span>
                      </div>
                      <Progress value={metrics.efficiency} className="h-2" />
                      
                      <div className="flex justify-between text-sm">
                        <span>Spam Rate</span>
                        <span className={metrics.spamPercentage > 30 ? 'text-red-500' : 'text-green-500'}>
                          {metrics.spamPercentage}%
                        </span>
                      </div>
                      <Progress value={100 - metrics.spamPercentage} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Player Analysis */}
      {player && playerMetrics && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="buildorder">Build Order</TabsTrigger>
            <TabsTrigger value="analysis">Analyse</TabsTrigger>
            <TabsTrigger value="actions">Aktionen</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  {player.name} - Leistungsmetriken
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{playerMetrics.apm}</div>
                    <div className="text-sm text-muted-foreground">APM</div>
                    <div className="text-xs text-muted-foreground">Aktionen/Min</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{playerMetrics.eapm}</div>
                    <div className="text-sm text-muted-foreground">EAPM</div>
                    <div className="text-xs text-muted-foreground">Effektiv/Min</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${getEffectivenessColor(playerMetrics.efficiency)}`}>
                      {playerMetrics.efficiency}%
                    </div>
                    <div className="text-sm text-muted-foreground">Effizienz</div>
                    <div className="text-xs text-muted-foreground">Nützliche Aktionen</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">{playerMetrics.microIntensity}</div>
                    <div className="text-sm text-muted-foreground">Micro/Min</div>
                    <div className="text-xs text-muted-foreground">Einheitenkontrolle</div>
                  </div>
                </div>

                {playerAnalysis && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-3">APM Breakdown</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{playerAnalysis.apmBreakdown.economic}%</div>
                        <div className="text-xs">Wirtschaft</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">{playerAnalysis.apmBreakdown.micro}%</div>
                        <div className="text-xs">Micro</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{playerAnalysis.apmBreakdown.selection}%</div>
                        <div className="text-xs">Selektion</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-600">{playerAnalysis.apmBreakdown.spam}%</div>
                        <div className="text-xs">Spam</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-600">{playerAnalysis.apmBreakdown.effective}%</div>
                        <div className="text-xs">Effektiv</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="buildorder" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Build Order - {player.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {playerBuildOrder.length > 0 ? (
                  <div className="space-y-2">
                    {playerBuildOrder.slice(0, 15).map((entry, index) => (
                      <div key={index} className="flex justify-between items-center p-2 rounded bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="w-12 text-center">{entry.time}</Badge>
                          <span className="font-medium">{entry.action}</span>
                          <span className="text-muted-foreground">{entry.unitName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{entry.supply} Supply</Badge>
                          {entry.cost && (
                            <Badge variant="outline">
                              {entry.cost.minerals}m {entry.cost.gas}g
                            </Badge>
                          )}
                          {entry.effective && (
                            <Badge variant="default" className="bg-green-100 text-green-800">✓</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {playerBuildOrder.length > 15 && (
                      <div className="text-center text-muted-foreground">
                        ... und {playerBuildOrder.length - 15} weitere Aktionen
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Keine Build Order Daten verfügbar
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            {playerAnalysis && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Spielstil-Analyse - {player.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Spielstil</h4>
                        <Badge variant="default" className="text-lg px-3 py-1">
                          {playerAnalysis.playstyle}
                        </Badge>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Stärken</h4>
                        <div className="flex flex-wrap gap-2">
                          {playerAnalysis.strengths.map((strength, index) => (
                            <Badge key={index} variant="default" className="bg-green-100 text-green-800">
                              {strength}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Schwächen</h4>
                        <div className="flex flex-wrap gap-2">
                          {playerAnalysis.weaknesses.map((weakness, index) => (
                            <Badge key={index} variant="destructive" className="bg-red-100 text-red-800">
                              {weakness}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Empfehlungen</h4>
                        <div className="space-y-1">
                          {playerAnalysis.recommendations.map((rec, index) => (
                            <div key={index} className="text-sm p-2 bg-blue-50 rounded">
                              💡 {rec}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Command Coverage</h4>
                        <div className="flex items-center gap-4">
                          <Progress value={playerAnalysis.commandCoverage.coverage} className="flex-1 h-3" />
                          <span className="text-sm font-medium">
                            {playerAnalysis.commandCoverage.coverage}% 
                            ({playerAnalysis.commandCoverage.recognized}/{playerAnalysis.commandCoverage.total})
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Aktionen Timeline - {player.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {replayData.interpretedCommands[selectedPlayer]?.slice(0, 50).map((cmd, index) => (
                    <div 
                      key={index} 
                      className={`flex justify-between items-center p-2 rounded text-sm ${
                        cmd.ineffective ? 'bg-red-50 border-l-4 border-red-300' : 'bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="w-12 text-center">{cmd.timestamp}</Badge>
                        <span className="font-medium">{cmd.actionName}</span>
                        {cmd.unitName && (
                          <span className="text-muted-foreground">{cmd.unitName}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={cmd.priority === 'critical' ? 'default' : 
                                 cmd.priority === 'important' ? 'secondary' : 'outline'}
                        >
                          {cmd.priority}
                        </Badge>
                        {cmd.ineffective && (
                          <Badge variant="destructive" title={cmd.ineffectiveReason}>
                            Ineffektiv
                          </Badge>
                        )}
                      </div>
                    </div>
                  )) || <div className="text-center text-muted-foreground py-8">Keine Aktionen verfügbar</div>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
