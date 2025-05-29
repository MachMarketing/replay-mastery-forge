import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { EnhancedReplayData } from '@/services/nativeReplayParser/enhancedScrepWrapper';
import { EnhancedBuildOrderDisplay } from './EnhancedBuildOrderDisplay';

interface AnalysisResultProps {
  replayData: EnhancedReplayData;
  onReset: () => void;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ replayData, onReset }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const formatAPM = (apm: number) => `${apm} APM`;
  
  const getDataQuality = () => {
    if (replayData.enhanced.hasDetailedActions && replayData.enhanced.directParserData?.success) {
      return 'high';
    }
    if (replayData.enhanced.hasDetailedActions) {
      return 'medium';
    }
    return 'basic';
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'high': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'basic': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getQualityBadge = (quality: string) => {
    switch (quality) {
      case 'high': return 'Direct Parser - Echte Aktionen';
      case 'medium': return 'Standard Analysis';
      case 'basic': return 'Header-Only Analysis';
      default: return 'Unknown';
    }
  };

  const player1 = replayData.players[0];
  const player2 = replayData.players[1];
  const apm1 = replayData.computed.apm[0] || 0;
  const apm2 = replayData.computed.apm[1] || 0;

  // Get real action count from direct parser
  const realActionsExtracted = replayData.enhanced.directParserData?.commands?.length || 0;
  const realBuildOrdersCount = replayData.enhanced.enhancedBuildOrders?.reduce((sum, bo) => sum + bo.entries.length, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Enhanced Replay Analysis</CardTitle>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="outline" className="text-sm">
                {replayData.enhanced.extractionMethod.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="text-sm">
                {realActionsExtracted} echte Aktionen
              </Badge>
              <Badge variant="outline" className="text-sm">
                {getQualityBadge(getDataQuality())}
              </Badge>
              <Button variant="outline" size="sm">
                Show Debug
              </Button>
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
                  <span className="font-medium">{replayData.header.playerCount}</span>
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
          {replayData.enhanced.enhancedBuildOrders && replayData.enhanced.enhancedBuildOrders.length > 0 ? (
            <div className="space-y-6">
              {replayData.enhanced.enhancedBuildOrders.map((buildOrder, index) => (
                <EnhancedBuildOrderDisplay 
                  key={index}
                  buildOrder={buildOrder}
                  playerName={replayData.players[index]?.name || `Player ${index + 1}`}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground mb-4">
                  {replayData.enhanced.hasDetailedActions ? 
                    'Parsing echte Build Order Daten...' : 
                    'Keine detaillierten Build Order Daten verfügbar'
                  }
                </div>
                <div className="text-sm text-muted-foreground">
                  Parser: {replayData.enhanced.extractionMethod} | 
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
                <h3 className="text-lg font-semibold mb-4">Echte Daten Quality & Features</h3>
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
                      {replayData.enhanced.extractionTime}ms
                    </div>
                    <div className="text-sm text-muted-foreground">Parse Time</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {replayData.enhanced.hasDetailedActions ? '✓' : '❌'}
                    </div>
                    <div className="text-sm text-muted-foreground">Direct Parser</div>
                  </div>
                </div>
              </div>

              {/* Real Parser Status */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Parser Status</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold">
                      {replayData.enhanced.debugInfo.directParserSuccess ? '✅' : '❌'}
                    </div>
                    <div className="text-sm">Direct Parser</div>
                    <div className="text-xs text-muted-foreground">
                      {replayData.enhanced.debugInfo.directParserSuccess ? 'Echte Daten' : 'Fehlgeschlagen'}
                    </div>
                  </div>
                  
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold">
                      {replayData.enhanced.debugInfo.screpJsSuccess ? '✅' : '❌'}
                    </div>
                    <div className="text-sm">Screp-js</div>
                    <div className="text-xs text-muted-foreground">Header Only</div>
                  </div>
                  
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-blue-500">
                      {replayData.enhanced.debugInfo.qualityCheck.activeParser.toUpperCase()}
                    </div>
                    <div className="text-sm">Aktiver Parser</div>
                    <div className="text-xs text-muted-foreground">Datenquelle</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="raw-data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Raw Debug Data</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-96">
                {JSON.stringify({
                  extractionMethod: replayData.enhanced.extractionMethod,
                  hasDetailedActions: replayData.enhanced.hasDetailedActions,
                  realActionsExtracted,
                  realBuildOrdersCount,
                  debugInfo: replayData.enhanced.debugInfo
                }, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
