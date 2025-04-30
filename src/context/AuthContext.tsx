
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

// Define admin email for bypassing email verification (case insensitive comparison)
const ADMIN_EMAIL = "cristiantuerk@gmail.com";

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
      (event, session) => {
        console.log("Auth state change event:", event);
        // If we get a session, the user is confirmed
        if (session) {
          console.log("Session received, user is authenticated");
          setIsEmailNotConfirmed(false);
          setEmailPendingVerification(null);
        }
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session check:", session ? "Session exists" : "No session");
      setSession(session);
      setUser(session?.user ?? null);
      // If we have a session, email must be confirmed
      if (session) {
        setIsEmailNotConfirmed(false);
        setEmailPendingVerification(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const isAdminEmail = (email: string): boolean => {
    return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Reset email confirmation state before attempting login
      setIsEmailNotConfirmed(false);
      setEmailPendingVerification(null);
      
      // Convert email to lowercase for consistent comparison
      const normalizedEmail = email.toLowerCase();
      const isAdmin = isAdminEmail(normalizedEmail);
      
      console.log(`Attempting to sign in user: ${normalizedEmail}, isAdmin: ${isAdmin}`);
      
      // First attempt - try normal login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

      // If login is successful, return early
      if (data.session) {
        console.log("Login successful on first attempt");
        toast({
          title: 'Logged in successfully',
          description: 'Welcome back!',
        });
        return { error: null };
      }
      
      // Handle specific errors
      if (error) {
        console.log("Login error:", error.message);
        
        // If this is the admin and the error is about email confirmation
        if (error.message.includes('Email not confirmed') && isAdmin) {
          console.log("Admin login detected, bypassing email verification...");
          
          // For admin account, forcefully try login again
          // This is a special case for development/testing
          const { data: adminData, error: adminError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password
          });
          
          if (adminData.session) {
            console.log("Admin bypass successful");
            toast({
              title: 'Admin logged in successfully',
              description: 'Welcome back, admin!',
            });
            return { error: null };
          }
          
          if (adminError) {
            // If we still have an error, it might be a password issue
            console.error("Admin bypass failed:", adminError.message);
            toast({
              title: 'Login failed',
              description: adminError.message,
              variant: 'destructive'
            });
            return { error: adminError };
          }
        } 
        else if (error.message.includes('Email not confirmed')) {
          // For non-admin users with unconfirmed email
          console.log("Email not confirmed, setting verification state");
          setIsEmailNotConfirmed(true);
          setEmailPendingVerification(normalizedEmail);
          
          toast({
            title: 'Login failed',
            description: 'Email not confirmed. Please check your inbox or resend the verification email.',
            variant: 'destructive'
          });
        } 
        else {
          // For any other error
          toast({
            title: 'Login failed',
            description: error.message,
            variant: 'destructive'
          });
        }
        
        return { error };
      }

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
