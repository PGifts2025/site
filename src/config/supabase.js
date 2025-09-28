// Supabase configuration
// Replace these with your actual Supabase project credentials
// You can get these from https://app.supabase.com/project/_/settings/api

export const supabaseConfig = {
  url: process.env.REACT_APP_SUPABASE_URL || 'https://your-project.supabase.co',
  anonKey: process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key'
};

// For development/demo purposes, we'll use a mock auth system if Supabase isn't configured
export const isMockAuth = !process.env.REACT_APP_SUPABASE_URL || 
                         process.env.REACT_APP_SUPABASE_URL === 'https://your-project.supabase.co';
