
// Environment configuration for Replay Master Forge
export const config = {
  // Supabase configuration (required for replay parsing)
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  
  // App configuration
  app: {
    name: 'Replay Master Forge',
    version: '1.0.0',
    environment: import.meta.env.MODE || 'development',
  },
  
  // Feature flags
  features: {
    supabaseParser: true,
    offlineMode: false,
  }
};

// Validation function
export function validateEnvironment(): { isValid: boolean; missingVars: string[] } {
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];
  
  const missingVars = requiredVars.filter(varName => {
    const value = import.meta.env[varName];
    return !value || value.trim() === '';
  });
  
  return {
    isValid: missingVars.length === 0,
    missingVars
  };
}
