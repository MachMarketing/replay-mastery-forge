
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import Index from './pages/Index';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import PricingPage from './pages/PricingPage';
import FeaturesPage from './pages/FeaturesPage';
import Upload from './pages/Upload';
import UploadPage from './pages/Upload';
import ReplaysPage from './pages/ReplaysPage';
import NotFound from './pages/NotFound';
import ParserTest from './pages/ParserTestPage';
import ParserDebug from './pages/ParserDebug';
import { useAuth } from './context/AuthContext';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/parser-test" element={<ParserTest />} />
        <Route path="/parser-debug" element={<ParserDebug />} />
        
        {/* Pro SC:R Analyzer Route */}
        <Route path="/upload" element={<UploadPage />} />
        
        {/* Simple JSON Debug Route */}
        <Route path="/upload-debug" element={<Upload />} />
        <Route path="/replays" element={
          <ProtectedRouteWrapper>
            <ReplaysPage />
          </ProtectedRouteWrapper>
        } />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </>
  );
}

// Custom wrapper component to handle protected routes
const ProtectedRouteWrapper = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin mx-auto mb-4 text-primary border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default App;
