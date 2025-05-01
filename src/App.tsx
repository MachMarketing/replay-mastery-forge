
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import { AuthProvider } from './context/AuthContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/parser-test" element={<ParserTestPage />} />
          <Route path="/parser-debug" element={<ParserTest />} />
          
          {/* Make upload route public so users can test it without login */}
          <Route path="/upload" element={<UploadPage />} />
          
          {/* Protected Routes */}
          <Route path="/replays" element={<ProtectedRoute element={<ReplaysPage />} />} />
          
          {/* 404 Page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
