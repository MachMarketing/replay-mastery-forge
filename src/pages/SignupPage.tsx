
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Google } from '@/components/icons/Google';
import { Twitch } from '@/components/icons/Twitch';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const { signUp, user, resendVerificationEmail, emailPendingVerification } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // If user is already logged in, redirect to replays page
    if (user) {
      navigate('/replays');
    }
  }, [user, navigate]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreedToTerms) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { error } = await signUp(email, password, username);
      if (!error) {
        // Show verification message after successful signup
        setShowVerificationMessage(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!emailPendingVerification) return;
    
    setIsSubmitting(true);
    try {
      await resendVerificationEmail(emailPendingVerification);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuthSignup = (provider: 'google' | 'twitch') => {
    // This is a placeholder for future OAuth implementation
    console.log(`Signup with ${provider}`);
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center py-16 mt-16">
        <div className="w-full max-w-md px-4">
          {showVerificationMessage && emailPendingVerification ? (
            <Card className="border-border">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center">Check your email</CardTitle>
                <CardDescription className="text-center">
                  We've sent a verification link to {emailPendingVerification}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Please check your inbox and click the verification link to complete your registration.
                  </AlertDescription>
                </Alert>
                
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Didn't receive an email? Check your spam folder or request a new verification email.
                  </p>
                  <Button 
                    onClick={handleResendVerification}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resending...
                      </>
                    ) : (
                      'Resend verification email'
                    )}
                  </Button>
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col space-y-4">
                <div className="text-sm text-center text-muted-foreground">
                  Already verified?{' '}
                  <Link to="/login" className="text-primary hover:underline">
                    Log in
                  </Link>
                </div>
              </CardFooter>
            </Card>
          ) : (
            <Card className="border-border">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center">Create an account</CardTitle>
                <CardDescription className="text-center">
                  Sign up to start improving your StarCraft skills
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* OAuth Providers */}
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    type="button"
                    onClick={() => handleOAuthSignup('google')}
                    disabled
                  >
                    <Google className="mr-2 h-4 w-4" />
                    Google
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    type="button"
                    onClick={() => handleOAuthSignup('twitch')}
                    disabled
                  >
                    <Twitch className="mr-2 h-4 w-4" />
                    Twitch
                  </Button>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">Email</label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="username" className="text-sm font-medium">Username</label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Your in-game name"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium">Password</label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isSubmitting}
                      minLength={8}
                    />
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 8 characters long
                    </p>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <Checkbox 
                      id="terms" 
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                      disabled={isSubmitting}
                    />
                    <label
                      htmlFor="terms"
                      className="text-sm leading-tight text-muted-foreground"
                    >
                      I agree to the{' '}
                      <Link to="/terms" className="text-primary hover:underline">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link to="/privacy" className="text-primary hover:underline">
                        Privacy Policy
                      </Link>
                    </label>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={!agreedToTerms || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </CardContent>
              
              <CardFooter className="flex flex-col space-y-4">
                <div className="text-sm text-center text-muted-foreground">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary hover:underline">
                    Log in
                  </Link>
                </div>
              </CardFooter>
            </Card>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default SignupPage;
