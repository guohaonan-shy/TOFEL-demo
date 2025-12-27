/**
 * Supabase Client Configuration
 * 
 * Environment variables:
 * - VITE_SUPABASE_URL: Supabase API URL
 * - VITE_SUPABASE_ANON_KEY: Supabase anonymous key (public)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseAnonKey) {
  console.warn(
    'Missing VITE_SUPABASE_ANON_KEY environment variable. ' +
    'Run `supabase status` to get the anon key and add it to .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Store session in localStorage
    persistSession: true,
    // Automatically refresh token before expiry
    autoRefreshToken: true,
    // Detect session from URL (for OAuth redirects)
    detectSessionInUrl: true,
  },
});

export default supabase;
