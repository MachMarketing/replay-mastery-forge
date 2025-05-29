
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { EnhancedReplayResult } from '@/services/nativeReplayParser/enhancedDataMapper';
import { EnhancedBuildOrderDisplay } from './EnhancedBuildOrderDisplay';

interface AnalysisResultProps {
  replayData: EnhancedReplayResult;
  onReset: () => void;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ replayData, onReset }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const formatAPM = (apm: number) => `${apm} APM`;
  
  const getDataQuality = () => {
    return replayData.dataQuality.reliability;
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'high': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getQualityBadge = (quality: string) => {
    switch (quality) {
      case 'high': return 'Enhanced Parser - Echte Aktionen';
      case 'medium': return 'Standard Analysis';
      case 'low': return 'Header-Only Analysis';
      default: return 'Unknown';
    }
  };

  const player1 = replayData.players[0];
  const player2 = replayData.players[1];
  const apm1 = replayData.realMetrics[0]?.apm || 0;
  const apm2 = replayData.realMetrics[1]?.apm || 0;

  // Get real action count from enhanced data
  const realActionsExtracted = replayData.realCommands.length;
  const realBuildOrdersCount = Object.values(replayData.enhancedBuildOrders).reduce((sum, bo) => sum + bo.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Enhanced Replay Analysis</CardTitle>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="outline" className="text-sm">
                {replayData.dataQuality.source.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="text-sm">
                {realActionsExtracted} echte Aktionen
              </Badge>
              <Badge variant="outline" className="text-sm">
                {getQualityBadge(getDataQuality())}
              </Badge>
            </div>
          </div>
          <Button variant="outline" onClick={onReset}>
            Analyze Another Replay
          </Button>
        </CardHeader>
      </Card>

      {/* Analysis Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="enhanced-build-orders">Enhanced Build Orders</TabsTrigger>
          <TabsTrigger value="performance">Performance Analysis</TabsTrigger>
          <TabsTrigger value="raw-data">Raw Data</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Game Info */}
            <Card>
              <CardHeader>
                <CardTitle>Game Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Map:</span>
                  <span className="font-medium">{replayData.header.mapName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{replayData.header.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Players:</span>
                  <span className="font-medium">{replayData.players.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parser:</span>
                  <Badge className={getQualityColor(getDataQuality())}>
                    {getQualityBadge(getDataQuality())}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Echte Aktionen:</span>
                  <Badge variant="outline">{realActionsExtracted}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Players */}
            <Card>
              <CardHeader>
                <CardTitle>Players</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">{player1.name}</div>
                    <div className="text-sm text-muted-foreground">{player1.race}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatAPM(apm1)}</div>
                    <div className="text-sm text-muted-foreground">APM</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">{player2.name}</div>
                    <div className="text-sm text-muted-foreground">{player2.race}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatAPM(apm2)}</div>
                    <div className="text-sm text-muted-foreground">APM</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="enhanced-build-orders" className="space-y-6">
          {Object.keys(replayData.enhancedBuildOrders).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(replayData.enhancedBuildOrders).map(([playerId, buildOrder]) => (
                <Card key={playerId}>
                  <CardHeader>
                    <CardTitle>
                      {replayData.players[parseInt(playerId)]?.name || `Player ${parseInt(playerId) + 1}`} Build Order
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {buildOrder.slice(0, 10).map((entry, index) => (
                        <div key={index} className="flex justify-between items-center py-1 border-b">
                          <span className="text-sm font-mono">{entry.time}</span>
                          <span className="text-sm">{entry.action}</span>
                          <span className="text-sm text-muted-foreground">{entry.unitName}</span>
                          <Badge variant="outline" className="text-xs">{entry.category}</Badge>
                        </div>
                      ))}
                      {buildOrder.length > 10 && (
                        <div className="text-sm text-muted-foreground text-center py-2">
                          ... and {buildOrder.length - 10} more entries
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground mb-4">
                  Keine detaillierten Build Order Daten verfügbar
                </div>
                <div className="text-sm text-muted-foreground">
                  Parser: {replayData.dataQuality.source} | 
                  Aktionen: {realActionsExtracted} | 
                  Build Orders: {realBuildOrdersCount}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analysis (Echte Daten)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* APM Comparison */}
              <div>
                <h3 className="text-lg font-semibold mb-4">APM Comparison</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium">{player1.name}</div>
                    <div className="flex-1">
                      <Progress value={Math.min((apm1 / 300) * 100, 100)} className="h-2" />
                    </div>
                    <div className="w-16 text-right text-sm font-medium">{apm1} APM</div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium">{player2.name}</div>
                    <div className="flex-1">
                      <Progress value={Math.min((apm2 / 300) * 100, 100)} className="h-2" />
                    </div>
                    <div className="w-16 text-right text-sm font-medium">{apm2} APM</div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Data Quality & Features */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Enhanced Data Quality</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">
                      {realActionsExtracted}
                    </div>
                    <div className="text-sm text-muted-foreground">Echte Aktionen</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {realBuildOrdersCount}
                    </div>
                    <div className="text-sm text-muted-foreground">Build Order Einträge</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-500">
                      {replayData.dataQuality.commandsExtracted}
                    </div>
                    <div className="text-sm text-muted-foreground">Commands</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {replayData.dataQuality.reliability === 'high' ? '✓' : '❌'}
                    </div>
                    <div className="text-sm text-muted-foreground">High Quality</div>
                  </div>
                </div>
              </div>

              {/* Gameplay Analysis */}
              {Object.keys(replayData.gameplayAnalysis).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Gameplay Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(replayData.gameplayAnalysis).map(([playerId, analysis]) => (
                      <Card key={playerId}>
                        <CardHeader>
                          <CardTitle className="text-base">
                            {replayData.players[parseInt(playerId)]?.name || `Player ${parseInt(playerId) + 1}`}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <span className="text-sm font-medium">Playstyle: </span>
                            <Badge>{analysis.playstyle}</Badge>
                          </div>
                          
                          {analysis.strengths.length > 0 && (
                            <div>
                              <span className="text-sm font-medium text-green-600">Strengths:</span>
                              <ul className="text-sm list-disc list-inside mt-1">
                                {analysis.strengths.map((strength, i) => (
                                  <li key={i}>{strength}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {analysis.weaknesses.length > 0 && (
                            <div>
                              <span className="text-sm font-medium text-red-600">Weaknesses:</span>
                              <ul className="text-sm list-disc list-inside mt-1">
                                {analysis.weaknesses.map((weakness, i) => (
                                  <li key={i}>{weakness}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {analysis.recommendations.length > 0 && (
                            <div>
                              <span className="text-sm font-medium text-blue-600">Recommendations:</span>
                              <ul className="text-sm list-disc list-inside mt-1">
                                {analysis.recommendations.map((rec, i) => (
                                  <li key={i}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="raw-data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Raw Enhanced Data</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-96">
                {JSON.stringify({
                  dataQuality: replayData.dataQuality,
                  realActionsExtracted,
                  realBuildOrdersCount,
                  commandsBreakdown: {
                    total: replayData.realCommands.length,
                    byPlayer: Object.keys(replayData.realMetrics).map(playerId => ({
                      player: parseInt(playerId),
                      actions: replayData.realMetrics[parseInt(playerId)]?.realActions || 0
                    }))
                  }
                }, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
