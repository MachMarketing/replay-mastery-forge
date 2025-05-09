import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import Index from './pages/IndexPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import PricingPage from './pages/PricingPage';
import FeaturesPage from './pages/FeaturesPage';
import UploadPage from './pages/UploadPage';
import ReplaysPage from './pages/ReplaysPage';
import NotFound from './pages/NotFoundPage';
import ParserTest from './pages/ParserTestPage';
import JSSUHTest from './components/JSSUHTest';
import ParserDebug from './pages/ParserDebug';
import { AuthProvider, ProtectedRoute } from './context/AuthContext';
import { QueryClient, QueryClientProvider } from 'react-query';

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
              
              <Route element={<ProtectedRoute />}>
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/replays" element={<ReplaysPage />} />
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </Router>
  );
}

export default App;
