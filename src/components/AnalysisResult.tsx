import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ParserValidationDebug } from './ParserValidationDebug';
import { EnhancedBuildOrderDisplay } from './EnhancedBuildOrderDisplay';
import { EnhancedReplayData } from '@/services/nativeReplayParser/enhancedScrepWrapper';

interface AnalysisResultProps {
  replayData: EnhancedReplayData;
  onReset: () => void;
}

export function AnalysisResult({ replayData, onReset }: AnalysisResultProps) {
  const [showDebug, setShowDebug] = useState(false);
  
  const player1 = replayData.players[0];
  const player2 = replayData.players[1];
  
  // Use enhanced APM data if available
  const player1APM = replayData.enhanced?.debugInfo?.qualityCheck?.apmValidation?.chosenAPM?.[0] || replayData.computed.apm[0] || 0;
  const player2APM = replayData.enhanced?.debugInfo?.qualityCheck?.apmValidation?.chosenAPM?.[1] || replayData.computed.apm[1] || 0;
  
  const buildOrder1 = replayData.computed.buildOrders[0] || [];
  const buildOrder2 = replayData.computed.buildOrders[1] || [];

  // Get enhanced build orders if available - fix property access
  const enhancedBuildOrders = replayData.enhanced?.enhancedBuildOrders || [];

  const getRaceColor = (race: string) => {
    switch (race?.toLowerCase()) {
      case 'protoss': return 'text-yellow-600';
      case 'terran': return 'text-blue-600';
      case 'zerg': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getAPMColor = (apm: number) => {
    if (apm >= 200) return 'text-red-600';
    if (apm >= 150) return 'text-orange-600';
    if (apm >= 100) return 'text-yellow-600';
    if (apm >= 50) return 'text-green-600';
    return 'text-gray-600';
  };

  const getQualityBadge = (apm: number) => {
    if (apm >= 180) return { text: 'Pro', variant: 'destructive' as const };
    if (apm >= 120) return { text: 'Advanced', variant: 'default' as const };
    if (apm >= 80) return { text: 'Intermediate', variant: 'secondary' as const };
    if (apm >= 40) return { text: 'Beginner', variant: 'outline' as const };
    return { text: 'Learning', variant: 'outline' as const };
  };

  return (
    <div className="space-y-6">
      {/* Header with Parser Status */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Enhanced Replay Analysis</h2>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={replayData.enhanced?.hasDetailedActions ? "default" : "secondary"}>
              {replayData.enhanced?.extractionMethod?.toUpperCase() || 'DIRECT'}
            </Badge>
            <Badge variant="outline">
              {replayData.enhanced?.debugInfo?.actionsExtracted || 0} actions
            </Badge>
            <Badge variant="outline">
              Command ID Mapping ✅
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDebug(!showDebug)}
            >
              {showDebug ? 'Hide' : 'Show'} Debug
            </Button>
          </div>
        </div>
        <Button onClick={onReset} variant="outline">
          Analyze Another Replay
        </Button>
      </div>

      {/* Debug Panel */}
      {showDebug && (
        <ParserValidationDebug enhancedData={replayData} />
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="build-orders">Enhanced Build Orders</TabsTrigger>
          <TabsTrigger value="analysis">Performance Analysis</TabsTrigger>
          <TabsTrigger value="raw-data">Raw Data</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Game Information */}
          <Card>
            <CardHeader>
              <CardTitle>Game Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Map</p>
                  <p className="text-lg font-semibold">{replayData.header.mapName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Duration</p>
                  <p className="text-lg font-semibold">{replayData.header.duration}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Matchup</p>
                  <p className="text-lg font-semibold">
                    {enhancedBuildOrders[0]?.race?.charAt(0) || player1?.race?.charAt(0) || '?'}v{enhancedBuildOrders[1]?.race?.charAt(0) || player2?.race?.charAt(0) || '?'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Data Quality</p>
                  <p className="text-lg font-semibold">
                    {replayData.enhanced?.hasDetailedActions ? '✅ Enhanced' : '⚠️ Basic'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Player Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player 1 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{player1?.name || 'Player 1'}</span>
                  <div className="flex items-center gap-2">
                    <Badge className={getRaceColor(enhancedBuildOrders[0]?.race || player1?.race || '')}>
                      {enhancedBuildOrders[0]?.race || player1?.race || 'Unknown'}
                    </Badge>
                    {enhancedBuildOrders[0] && (
                      <Badge variant="outline">
                        Grade {enhancedBuildOrders[0].efficiency.overallGrade}
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold mb-1">
                      <span className={getAPMColor(player1APM)}>{player1APM}</span>
                    </p>
                    <p className="text-sm text-gray-500">APM</p>
                    <Badge variant={getQualityBadge(player1APM).variant} className="text-xs">
                      {getQualityBadge(player1APM).text}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold mb-1">
                      <span className={getAPMColor(replayData.computed.eapm[0] || 0)}>
                        {replayData.computed.eapm[0] || 0}
                      </span>
                    </p>
                    <p className="text-sm text-gray-500">EAPM</p>
                  </div>
                </div>
                
                {enhancedBuildOrders[0] && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Build Efficiency</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Economy</span>
                        <span>{enhancedBuildOrders[0].efficiency.economyScore}%</span>
                      </div>
                      <Progress value={enhancedBuildOrders[0].efficiency.economyScore} className="h-2" />
                      <div className="flex justify-between text-sm">
                        <span>Tech</span>
                        <span>{enhancedBuildOrders[0].efficiency.techScore}%</span>
                      </div>
                      <Progress value={enhancedBuildOrders[0].efficiency.techScore} className="h-2" />
                    </div>
                  </div>
                )}
                
                {buildOrder1.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Build Order Preview</p>
                    <div className="space-y-1">
                      {buildOrder1.slice(0, 3).map((item, index) => (
                        <div key={index} className="text-sm">
                          <span className="text-gray-500">{item.timestamp}</span> - {item.action}
                        </div>
                      ))}
                      {buildOrder1.length > 3 && (
                        <p className="text-xs text-gray-400">+{buildOrder1.length - 3} more items</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Player 2 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{player2?.name || 'Player 2'}</span>
                  <div className="flex items-center gap-2">
                    <Badge className={getRaceColor(enhancedBuildOrders[1]?.race || player2?.race || '')}>
                      {enhancedBuildOrders[1]?.race || player2?.race || 'Unknown'}
                    </Badge>
                    {enhancedBuildOrders[1] && (
                      <Badge variant="outline">
                        Grade {enhancedBuildOrders[1].efficiency.overallGrade}
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold mb-1">
                      <span className={getAPMColor(player2APM)}>{player2APM}</span>
                    </p>
                    <p className="text-sm text-gray-500">APM</p>
                    <Badge variant={getQualityBadge(player2APM).variant} className="text-xs">
                      {getQualityBadge(player2APM).text}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold mb-1">
                      <span className={getAPMColor(replayData.computed.eapm[1] || 0)}>
                        {replayData.computed.eapm[1] || 0}
                      </span>
                    </p>
                    <p className="text-sm text-gray-500">EAPM</p>
                  </div>
                </div>
                
                {enhancedBuildOrders[1] && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Build Efficiency</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Economy</span>
                        <span>{enhancedBuildOrders[1].efficiency.economyScore}%</span>
                      </div>
                      <Progress value={enhancedBuildOrders[1].efficiency.economyScore} className="h-2" />
                      <div className="flex justify-between text-sm">
                        <span>Tech</span>
                        <span>{enhancedBuildOrders[1].efficiency.techScore}%</span>
                      </div>
                      <Progress value={enhancedBuildOrders[1].efficiency.techScore} className="h-2" />
                    </div>
                  </div>
                )}
                
                {buildOrder2.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Build Order Preview</p>
                    <div className="space-y-1">
                      {buildOrder2.slice(0, 3).map((item, index) => (
                        <div key={index} className="text-sm">
                          <span className="text-gray-500">{item.timestamp}</span> - {item.action}
                        </div>
                      ))}
                      {buildOrder2.length > 3 && (
                        <p className="text-xs text-gray-400">+{buildOrder2.length - 3} more items</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="build-orders" className="space-y-6">
          <div className="grid grid-cols-1 gap-8">
            {enhancedBuildOrders.length > 0 ? (
              enhancedBuildOrders.map((buildOrder, index) => (
                <EnhancedBuildOrderDisplay
                  key={index}
                  buildOrder={buildOrder}
                  playerName={replayData.players[index]?.name || `Player ${index + 1}`}
                />
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">Enhanced build order data not available</p>
                  <p className="text-sm text-gray-400 mt-2">Using basic build order display...</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* APM Analysis */}
              <div>
                <h4 className="font-semibold mb-3">APM Comparison</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{player1?.name || 'Player 1'}</span>
                      <span className="text-sm text-gray-500">{player1APM} APM</span>
                    </div>
                    <Progress value={Math.min((player1APM / 300) * 100, 100)} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{player2?.name || 'Player 2'}</span>
                      <span className="text-sm text-gray-500">{player2APM} APM</span>
                    </div>
                    <Progress value={Math.min((player2APM / 300) * 100, 100)} className="h-2" />
                  </div>
                </div>
              </div>

              {/* Enhanced Build Order Analysis */}
              {enhancedBuildOrders.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Build Order Efficiency</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {enhancedBuildOrders.map((buildOrder, index) => (
                      <div key={index} className="space-y-2">
                        <div className="text-sm font-medium">
                          {replayData.players[index]?.name || `Player ${index + 1}`} ({buildOrder.race})
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Overall Grade</span>
                            <Badge variant="outline">{buildOrder.efficiency.overallGrade}</Badge>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span>Benchmarks Hit</span>
                            <span>{buildOrder.benchmarks.filter(b => b.status !== 'missing').length}/{buildOrder.benchmarks.length}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Quality & Features */}
              <div>
                <h4 className="font-semibold mb-3">Data Quality & Features</h4>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {replayData.enhanced?.debugInfo?.actionsExtracted || 0}
                    </div>
                    <div className="text-sm text-gray-500">Actions Extracted</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {replayData.enhanced?.debugInfo?.buildOrdersGenerated || 0}
                    </div>
                    <div className="text-sm text-gray-500">Build Orders</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {replayData.enhanced?.extractionTime || 0}ms
                    </div>
                    <div className="text-sm text-gray-500">Parse Time</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      ✅
                    </div>
                    <div className="text-sm text-gray-500">Enhanced Mapping</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="raw-data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Raw Replay Data</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 rounded overflow-auto max-h-96 border">
                {JSON.stringify(replayData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
