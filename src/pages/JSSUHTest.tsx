
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import JSSUHTest from '@/components/JSSUHTest';

const JSSUHTestPage = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 py-16 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-6">JSSUH Parser Test</h1>
          
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>JSSUH Direct Test</CardTitle>
            </CardHeader>
            <CardContent>
              <JSSUHTest />
            </CardContent>
          </Card>
          
          <p className="text-sm text-muted-foreground">
            This page tests the direct integration with the JSSUH library to ensure it's loaded and working correctly.
            If the test is successful, it means the basic JSSUH functionality is working. If it fails, check the browser console for more details.
          </p>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default JSSUHTestPage;
