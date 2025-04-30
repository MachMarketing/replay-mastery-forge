
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<{ error: any }>;
  isEmailNotConfirmed: boolean;
  emailPendingVerification: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmailNotConfirmed, setIsEmailNotConfirmed] = useState(false);
  const [emailPendingVerification, setEmailPendingVerification] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Check specifically for email not confirmed error
        if (error.message.includes('Email not confirmed')) {
          setIsEmailNotConfirmed(true);
          setEmailPendingVerification(email);
          
          toast({
            title: 'Login failed',
            description: 'Email not confirmed. Please check your inbox or resend the verification email.',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Login failed',
            description: error.message,
            variant: 'destructive'
          });
        }
        return { error };
      }

      // Reset email confirmation error state on successful login
      setIsEmailNotConfirmed(false);
      setEmailPendingVerification(null);

      toast({
        title: 'Logged in successfully',
        description: 'Welcome back!',
      });

      return { error: null };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  const resendVerificationEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email
      });

      if (error) {
        toast({
          title: 'Failed to resend verification email',
          description: error.message,
          variant: 'destructive'
        });
        return { error };
      }
      
      toast({
        title: 'Verification email sent',
        description: 'Please check your inbox to verify your email address.',
      });
      
      return { error: null };
    } catch (error: any) {
      console.error('Resend verification error:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username
          }
        }
      });

      if (error) {
        toast({
          title: 'Signup failed',
          description: error.message,
          variant: 'destructive'
        });
        return { error };
      }
      
      // Store the email that needs confirmation
      setEmailPendingVerification(email);
      
      toast({
        title: 'Account created',
        description: 'Please check your email to verify your account.',
      });
      
      return { error: null };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: 'Logged out',
        description: 'You have been signed out.'
      });
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: 'Sign out failed',
        description: 'An error occurred while signing out.',
        variant: 'destructive'
      });
    }
  };

  const value = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
    resendVerificationEmail,
    isEmailNotConfirmed,
    emailPendingVerification
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
