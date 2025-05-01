
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
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/parser-test" element={<ParserTestPage />} />
        
        {/* Protected Routes */}
        <Route path="/replays" element={<ProtectedRoute element={<ReplaysPage />} />} />
        <Route path="/upload" element={<ProtectedRoute element={<UploadPage />} />} />
        
        {/* 404 Page */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
