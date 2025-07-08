/**
 * Replay Comparison Tool für Pro-Level Training
 * Vergleicht Replays um Skill-Entwicklung zu tracken
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { JssuhReplayResult } from '@/services/nativeReplayParser/jssuhParser';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Zap, 
  Target, 
  Trophy,
  BarChart3,
  Users
} from 'lucide-react';

interface ReplayComparisonToolProps {
  currentReplay: JssuhReplayResult;
  previousReplays?: JssuhReplayResult[];
}

const ReplayComparisonTool: React.FC<ReplayComparisonToolProps> = ({ 
  currentReplay, 
  previousReplays = [] 
}) => {
  const currentPlayer = currentReplay.players[0];
  const currentAnalysis = currentReplay.gameplayAnalysis[0];
  
  // Simuliere historische Daten für Demo
  const previousAvgAPM = 145;
  const previousAvgEAPM = 87;
  const previousAvgEfficiency = 68;

  const calculateTrend = (current: number, previous: number) => {
    const diff = current - previous;
    const percentage = ((diff / previous) * 100).toFixed(1);
    return { diff, percentage: parseFloat(percentage) };
  };

  const apmTrend = calculateTrend(currentPlayer?.apm || 0, previousAvgAPM);
  const eapmTrend = calculateTrend(currentPlayer?.eapm || 0, previousAvgEAPM);
  const efficiencyTrend = calculateTrend(currentPlayer?.efficiency || 0, previousAvgEfficiency);

  const getTrendIcon = (percentage: number) => {
    if (percentage > 5) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (percentage < -5) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-yellow-500" />;
  };

  const getTrendColor = (percentage: number) => {
    if (percentage > 5) return 'text-green-500';
    if (percentage < -5) return 'text-red-500';
    return 'text-yellow-500';
  };

  const getSkillProgression = (apm: number) => {
    const levels = [
      { name: 'Beginner', min: 0, max: 80, color: 'bg-blue-500' },
      { name: 'Intermediate', min: 80, max: 120, color: 'bg-green-500' },
      { name: 'Advanced', min: 120, max: 200, color: 'bg-yellow-500' },
      { name: 'Expert', min: 200, max: 300, color: 'bg-orange-500' },
      { name: 'Pro', min: 300, max: 500, color: 'bg-red-500' },
    ];

    const currentLevel = levels.find(level => apm >= level.min && apm < level.max) || levels[0];
    const progressInLevel = ((apm - currentLevel.min) / (currentLevel.max - currentLevel.min)) * 100;
    
    return { currentLevel, progressInLevel: Math.min(progressInLevel, 100) };
  };

  const skillProgression = getSkillProgression(currentPlayer?.apm || 0);

  return (
    <div className="space-y-6">
      {/* Performance Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Entwicklung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* APM Trend */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-blue-500" />
                <span className="font-medium">APM</span>
              </div>
              <div className="text-3xl font-bold mb-1">{currentPlayer?.apm || 0}</div>
              <div className="flex items-center justify-center gap-1">
                {getTrendIcon(apmTrend.percentage)}
                <span className={`text-sm font-medium ${getTrendColor(apmTrend.percentage)}`}>
                  {apmTrend.percentage > 0 ? '+' : ''}{apmTrend.percentage}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground">vs. Durchschnitt {previousAvgAPM}</div>
            </div>

            {/* EAPM Trend */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Target className="h-5 w-5 text-green-500" />
                <span className="font-medium">EAPM</span>
              </div>
              <div className="text-3xl font-bold mb-1">{currentPlayer?.eapm || 0}</div>
              <div className="flex items-center justify-center gap-1">
                {getTrendIcon(eapmTrend.percentage)}
                <span className={`text-sm font-medium ${getTrendColor(eapmTrend.percentage)}`}>
                  {eapmTrend.percentage > 0 ? '+' : ''}{eapmTrend.percentage}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground">vs. Durchschnitt {previousAvgEAPM}</div>
            </div>

            {/* Efficiency Trend */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span className="font-medium">Effizienz</span>
              </div>
              <div className="text-3xl font-bold mb-1">{currentPlayer?.efficiency || 0}%</div>
              <div className="flex items-center justify-center gap-1">
                {getTrendIcon(efficiencyTrend.percentage)}
                <span className={`text-sm font-medium ${getTrendColor(efficiencyTrend.percentage)}`}>
                  {efficiencyTrend.percentage > 0 ? '+' : ''}{efficiencyTrend.percentage}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground">vs. Durchschnitt {previousAvgEfficiency}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skill Level Progression */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Skill Level Progression
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{skillProgression.currentLevel.name} Level</div>
                <div className="text-sm text-muted-foreground">
                  {currentPlayer?.apm || 0} APM • {skillProgression.progressInLevel.toFixed(1)}% im Level
                </div>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2">
                {skillProgression.currentLevel.name}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{skillProgression.currentLevel.min} APM</span>
                <span>{skillProgression.currentLevel.max} APM</span>
              </div>
              <Progress value={skillProgression.progressInLevel} className="h-3" />
            </div>

            <div className="grid grid-cols-5 gap-2 mt-4">
              {[
                { name: 'Beginner', active: skillProgression.currentLevel.name === 'Beginner' },
                { name: 'Intermediate', active: skillProgression.currentLevel.name === 'Intermediate' },
                { name: 'Advanced', active: skillProgression.currentLevel.name === 'Advanced' },
                { name: 'Expert', active: skillProgression.currentLevel.name === 'Expert' },
                { name: 'Pro', active: skillProgression.currentLevel.name === 'Pro' },
              ].map((level, index) => (
                <div key={index} className="text-center">
                  <div className={`w-full h-2 rounded ${
                    level.active ? 'bg-primary' : 'bg-muted'
                  }`}></div>
                  <div className={`text-xs mt-1 ${
                    level.active ? 'font-medium' : 'text-muted-foreground'
                  }`}>
                    {level.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Gezielte Trainingsempfehlungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {apmTrend.percentage < 0 && (
              <div className="p-4 border-l-4 border-red-500 bg-red-50 dark:bg-red-950/30">
                <div className="font-medium text-red-700 dark:text-red-300">APM Rückgang erkannt</div>
                <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                  Fokussiere auf Geschwindigkeit: Übe Build Orders und Hotkeys für 15 Min täglich
                </div>
              </div>
            )}

            {efficiencyTrend.percentage < 0 && (
              <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30">
                <div className="font-medium text-yellow-700 dark:text-yellow-300">Effizienz-Optimierung</div>
                <div className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                  Reduziere Spam-Clicks: Konzentriere dich auf sinnvolle Aktionen statt schnelles Klicken
                </div>
              </div>
            )}

            <div className="p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/30">
              <div className="font-medium text-blue-700 dark:text-blue-300">Nächstes Ziel</div>
              <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                Erreiche {skillProgression.currentLevel.max} APM für das nächste Level
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Mit Pro-Spieler vergleichen
              </Button>
              <Button variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                Detaillierte Statistiken
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReplayComparisonTool;