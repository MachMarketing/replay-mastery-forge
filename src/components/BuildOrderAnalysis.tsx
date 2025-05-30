
/**
 * Intelligente Build Order Analyse Komponente
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, Info, Zap, Clock, Target, TrendingUp } from 'lucide-react';
import { BuildOrderTimeline, BuildOrderAction } from '@/services/buildOrderAnalysis/buildOrderExtractor';
import { StrategicInsight } from '@/services/buildOrderAnalysis/strategicAnalyzer';

interface BuildOrderAnalysisProps {
  timeline: BuildOrderTimeline;
  insights: StrategicInsight[];
}

export const BuildOrderAnalysis: React.FC<BuildOrderAnalysisProps> = ({ timeline, insights }) => {
  const { playerName, race, actions, analysis } = timeline;
  
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <Info className="h-4 w-4 text-yellow-500" />;
      case 'suggestion': return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'strength': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Info className="h-4 w-4" />;
    }
  };
  
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'worker': return 'bg-yellow-100 text-yellow-800';
      case 'military': return 'bg-red-100 text-red-800';
      case 'building': return 'bg-blue-100 text-blue-800';
      case 'tech': return 'bg-purple-100 text-purple-800';
      case 'economy': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Strategische Übersicht */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {playerName} ({race}) - Strategische Analyse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {analysis.economicTiming.toFixed(1)}min
              </div>
              <div className="text-sm text-muted-foreground">Erste Wirtschaft</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">
                {analysis.militaryTiming.toFixed(1)}min
              </div>
              <div className="text-sm text-muted-foreground">Erste Militär</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">
                {analysis.techTiming.toFixed(1)}min
              </div>
              <div className="text-sm text-muted-foreground">Erste Tech</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{analysis.efficiency}%</div>
              <div className="text-sm text-muted-foreground">Effizienz</div>
            </div>
          </div>
          
          <div className="mb-4">
            <Badge variant="outline" className="text-sm">
              Strategie: {analysis.strategy}
            </Badge>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Build Order Effizienz</span>
              <span className={analysis.efficiency > 70 ? 'text-green-500' : analysis.efficiency > 50 ? 'text-yellow-500' : 'text-red-500'}>
                {analysis.efficiency}%
              </span>
            </div>
            <Progress value={analysis.efficiency} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Strategische Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Konkrete Verbesserungsvorschläge
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.slice(0, 8).map((insight, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{insight.title}</h4>
                      <Badge variant={insight.impact === 'high' ? 'destructive' : insight.impact === 'medium' ? 'default' : 'outline'}>
                        {insight.impact}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {insight.description}
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded p-2">
                      <p className="text-sm font-medium text-blue-800">
                        💡 {insight.actionable}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detaillierte Build Order */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Detaillierte Build Order Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {actions.slice(0, 20).map((action, index) => (
              <div key={index} className="flex items-center justify-between text-sm border-b pb-2">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground font-mono w-12">
                    {action.time}
                  </span>
                  <span className="w-16 text-center text-muted-foreground">
                    {action.supply}
                  </span>
                  <span className="font-medium">{action.unitName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${getCategoryColor(action.category)}`}>
                    {action.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {action.cost.minerals}m {action.cost.gas > 0 && `${action.cost.gas}g`}
                  </span>
                  <Badge 
                    variant={action.strategic.timing === 'early' ? 'default' : action.strategic.timing === 'normal' ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    {action.strategic.timing}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          {actions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Keine Build Order Daten verfügbar - Commands konnten nicht extrahiert werden
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
