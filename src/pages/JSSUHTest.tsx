
import React from 'react';
import Navbar from '@/components/Navbar';
import ScreparsedTest from '@/components/JSSUHTest';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ScreparsedTestPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      
      <main className="flex-1 py-16 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-foreground mb-8">Screparsed Parser Test</h1>
          
          <div className="grid grid-cols-1 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Parser Test Suite</CardTitle>
              </CardHeader>
              <CardContent>
                <ScreparsedTest />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ScreparsedTestPage;
