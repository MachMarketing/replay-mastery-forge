
import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Index from '@/pages/Index';
import FeaturesPage from '@/pages/FeaturesPage';
import PricingPage from '@/pages/PricingPage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import ReplaysPage from '@/pages/ReplaysPage';
import UploadPage from '@/pages/UploadPage';
import NotFound from '@/pages/NotFound';
import ParserTestPage from '@/pages/ParserTestPage';
import ParserTest from '@/pages/ParserTest';
import { Toaster } from '@/components/ui/sonner';
import './App.css';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen w-screen bg-background">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-foreground">Loading application...</p>
      </div>
    </div>
  );
}

function App() {
  console.log("🚀 App rendering started");
  
  return (
    <>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/parser-test" element={<ParserTestPage />} />
          <Route path="/parser-debug" element={<ParserTest />} />
          
          {/* Upload route is public to allow users to test without login */}
          <Route path="/upload" element={<UploadPage />} />
          
          {/* Protected Routes */}
          <Route path="/replays" element={<ProtectedRoute element={<ReplaysPage />} />} />
          
          {/* 404 Page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Toaster />
    </>
  );
}

export default App;
