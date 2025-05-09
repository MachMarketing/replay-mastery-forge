
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import Index from './pages/Index';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import PricingPage from './pages/PricingPage';
import FeaturesPage from './pages/FeaturesPage';
import UploadPage from './pages/UploadPage';
import ReplaysPage from './pages/ReplaysPage';
import NotFound from './pages/NotFound';
import ParserTest from './pages/ParserTestPage';
import JSSUHTest from './components/JSSUHTest';
import ParserDebug from './pages/ParserDebug';
import { AuthProvider } from './context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="ui-theme">
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/parser-test" element={<ParserTest />} />
              <Route path="/jssuh-test" element={<JSSUHTest />} />
              <Route path="/parser-debug" element={<ParserDebug />} />
              
              <Route path="/upload" element={
                <ProtectedRouteWrapper>
                  <UploadPage />
                </ProtectedRouteWrapper>
              } />
              <Route path="/replays" element={
                <ProtectedRouteWrapper>
                  <ReplaysPage />
                </ProtectedRouteWrapper>
              } />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </Router>
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

// Add missing imports
import { useAuth } from './context/AuthContext';
import { Navigate } from 'react-router-dom';

export default App;
