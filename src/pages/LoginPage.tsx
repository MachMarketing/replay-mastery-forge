
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Google } from '@/components/icons/Google';
import { Twitch } from '@/components/icons/Twitch';
import { useAuth } from '@/context/AuthContext';
import { Loader2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [showAdminTip, setShowAdminTip] = useState(false);
  
  const { 
    signIn, 
    user, 
    isEmailNotConfirmed, 
    emailPendingVerification, 
    resendVerificationEmail 
  } = useAuth();
  
  const navigate = useNavigate();
  
  useEffect(() => {
    // If user is already logged in, redirect to replays page immediately
    if (user) {
      console.log("User is logged in, redirecting to replays page");
      navigate('/replays');
    }
  }, [user, navigate]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      console.log(`Attempting to sign in with email: ${email}`);
      const { error } = await signIn(email, password);
      
      if (!error) {
        console.log("Login successful, user should be redirected automatically");
        toast({
          title: 'Login successful',
          description: 'Redirecting you to your replays...',
        });
        
        // Force navigate to ensure redirect happens
        navigate('/replays');
      } else {
        console.log("Login error detected, incrementing attempts counter");
        // Increment login attempts to track retry attempts
        setLoginAttempts(prev => prev + 1);
        
        // For cristiantuerk@gmail.com, show special admin tip after 2 attempts
        if (email.toLowerCase() === 'cristiantuerk@gmail.com' && loginAttempts > 1) {
          setShowAdminTip(true);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!emailPendingVerification) return;
    
    setResendingVerification(true);
    try {
      await resendVerificationEmail(emailPendingVerification);
    } finally {
      setResendingVerification(false);
    }
  };

  const handleOAuthLogin = (provider: 'google' | 'twitch') => {
    // This is a placeholder for future OAuth implementation
    console.log(`Login with ${provider}`);
    toast({
      title: `${provider} login`,
      description: 'This feature is coming soon!',
      variant: 'default'
    });
  };

  const handleClearCacheAndRetry = () => {
    // Force refresh the page to clear any potential cache issues
    window.location.reload();
  };
  
  const handleForceRedirect = () => {
    // Sometimes a manual redirect helps when the automatic one doesn't trigger
    navigate('/replays', { replace: true });
    window.location.href = '/replays'; // Fallback direct URL change
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center py-16 mt-16">
        <div className="w-full max-w-md px-4">
          <Card className="border-border">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">Welcome back</CardTitle>
              <CardDescription className="text-center">
                Log in to your ReplayCoach.gg account
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {isEmailNotConfirmed && emailPendingVerification && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>Email not confirmed</AlertTitle>
                  <AlertDescription className="flex flex-col gap-2">
                    <p>Please check your inbox for the verification email.</p>
                    {loginAttempts > 1 && (
                      <div className="text-sm space-y-2">
                        <p>
                          If you've already confirmed your email and still see this message, 
                          try refreshing the page or clearing your browser cache.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleClearCacheAndRetry}
                          className="self-start flex items-center gap-1"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Refresh Page
                        </Button>
                      </div>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleResendVerification}
                      disabled={resendingVerification}
                      className="self-start"
                    >
                      {resendingVerification ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Resending...
                        </>
                      ) : (
                        'Resend verification email'
                      )}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* OAuth Providers */}
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  type="button"
                  onClick={() => handleOAuthLogin('google')}
                  disabled
                >
                  <Google className="mr-2 h-4 w-4" />
                  Google
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  type="button"
                  onClick={() => handleOAuthLogin('twitch')}
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
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium">Password</label>
                    <Link to="/reset-password" className="text-xs text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    'Log In'
                  )}
                </Button>

                {user && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full mt-2" 
                    onClick={handleForceRedirect}
                  >
                    Continue to Replays
                  </Button>
                )}
              </form>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4">
              <div className="text-sm text-center text-muted-foreground">
                Don't have an account?{' '}
                <Link to="/signup" className="text-primary hover:underline">
                  Sign up
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      </main>
      
      <Footer />
      
      {/* Admin help dialog */}
      <Dialog open={showAdminTip} onOpenChange={setShowAdminTip}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Account Login</DialogTitle>
            <DialogDescription>
              For admin accounts, we've added special handling for unconfirmed emails. 
              The system will attempt to bypass email verification for your admin account.
              
              If you're still having trouble:
              1. Try clearing your browser cache
              2. Restart your browser
              3. Try in an incognito window
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowAdminTip(false)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginPage;
