
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EnhancedReplayResult } from '@/services/nativeReplayParser/enhancedDataMapper';

interface ReplayAnalysisDisplayProps {
  replayData: EnhancedReplayResult;
}

export function ReplayAnalysisDisplay({ replayData }: ReplayAnalysisDisplayProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Gameplay Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {replayData.players.map((player, index) => {
              const analysis = replayData.gameplayAnalysis[index];
              const metrics = replayData.realMetrics[index];
              
              if (!analysis || !metrics) return null;
              
              return (
                <div key={index} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{player.name}</h3>
                    <Badge variant="outline">{player.race}</Badge>
                    <Badge variant="secondary">{analysis.playstyle}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium">APM</div>
                      <div className="text-lg font-bold text-blue-600">{metrics.apm}</div>
                    </div>
                    <div>
                      <div className="font-medium">EAPM</div>
                      <div className="text-lg font-bold text-green-600">{metrics.eapm}</div>
                    </div>
                  </div>
                  
                  {analysis.strengths.length > 0 && (
                    <div>
                      <h4 className="font-medium text-green-700 mb-1">Strengths</h4>
                      <ul className="text-sm text-green-600 list-disc list-inside">
                        {analysis.strengths.map((strength, i) => (
                          <li key={i}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {analysis.weaknesses.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-700 mb-1">Weaknesses</h4>
                      <ul className="text-sm text-red-600 list-disc list-inside">
                        {analysis.weaknesses.map((weakness, i) => (
                          <li key={i}>{weakness}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {analysis.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-medium text-blue-700 mb-1">Recommendations</h4>
                      <ul className="text-sm text-blue-600 list-disc list-inside">
                        {analysis.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
