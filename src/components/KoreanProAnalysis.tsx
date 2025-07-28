import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface KoreanProAnalysisProps {
  analysis: any;
  parsingStats: any;
}

export const KoreanProAnalysis: React.FC<KoreanProAnalysisProps> = ({ 
  analysis, 
  parsingStats 
}) => {
  const firstPlayerId = Object.keys(analysis)[0];
  const playerData = analysis[firstPlayerId];

  if (!playerData) {
    return (
      <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
            <span className="text-lg font-bold text-amber-800">🇰🇷 Korean Professional Parser</span>
          </div>
          <p className="text-amber-700 font-medium">Using icza/screp - Industry Standard</p>
          <p className="text-sm text-amber-600 mt-1">Same technology used by Korean esports professionals</p>
          <div className="mt-4 w-full bg-amber-200 rounded-full h-2">
            <div className="bg-amber-500 h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
          </div>
          <p className="text-xs text-amber-600 mt-2">Professional parsing in progress...</p>
        </CardContent>
      </Card>
    );
  }

  const skillLevel = playerData.skill_level || 'Analyzing...';
  const overallScore = playerData.overall_score || 0;
  
  const getSkillColor = (level: string) => {
    switch (level) {
      case 'Professional': return 'from-purple-500 to-pink-500';
      case 'Advanced': return 'from-blue-500 to-cyan-500';
      case 'Intermediate': return 'from-green-500 to-emerald-500';
      case 'Beginner': return 'from-yellow-500 to-orange-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Korean Parser Status */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <div>
                <p className="font-bold text-emerald-800">🇰🇷 Korean Professional Parser</p>
                <p className="text-sm text-emerald-600">icza/screp - Industry Standard</p>
              </div>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
              ✓ Professional Quality
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Professional Skill Assessment */}
      <Card className={`bg-gradient-to-r ${getSkillColor(skillLevel)} text-white`}>
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            Professional Skill Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-6xl font-bold mb-2">{overallScore}</div>
          <div className="text-xl font-semibold mb-4">{skillLevel}</div>
          <Progress value={overallScore} className="w-full h-3 bg-white/20" />
          <p className="mt-2 text-sm opacity-90">Korean Professional Standards</p>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">⚡ Actions Per Minute</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {playerData.apm || 0}
            </div>
            <p className="text-sm text-muted-foreground">Total APM</p>
            <div className="mt-3">
              <div className="flex justify-between text-sm mb-1">
                <span>Effective APM</span>
                <span className="font-semibold">{playerData.eapm || 0}</span>
              </div>
              <Progress value={(playerData.eapm / Math.max(playerData.apm, 1)) * 100} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🏗️ Build Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Strategy:</span>
                <Badge variant="outline">{playerData.build_analysis?.strategy || 'Unknown'}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Efficiency:</span>
                <span className="font-semibold">{playerData.build_analysis?.efficiency || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Worker Count:</span>
                <span className="font-semibold">{playerData.build_analysis?.worker_count || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-green-600">💪 Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(playerData.strengths || []).map((strength: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-green-500 text-sm">✓</span>
                  <span className="text-sm">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-amber-600">⚠️ Areas to Improve</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(playerData.weaknesses || []).map((weakness: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-amber-500 text-sm">!</span>
                  <span className="text-sm">{weakness}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Professional Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-blue-600">🎯 Professional Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(playerData.recommendations || []).map((rec: string, index: number) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="text-blue-500 font-bold text-sm">{index + 1}</span>
                <span className="text-sm">{rec}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Parsing Quality Indicator */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Parser Quality:</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Korean Professional</Badge>
              <span className="text-gray-500">
                {parsingStats?.commands_parsed || 0} commands processed
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};