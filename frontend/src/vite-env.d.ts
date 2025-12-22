/// <reference types="vite/client" />

/**
 * Custom environment variables for this project.
 * 
 * These are loaded from .env files in the project root:
 * - .env           - All environments
 * - .env.local     - Local overrides (git ignored)
 * - .env.development - Development only
 * - .env.production  - Production only
 * 
 * Only variables prefixed with VITE_ are exposed to the frontend.
 * Access via: import.meta.env.VITE_XXX
 * 
 * Note: MODE, DEV, PROD are built-in Vite variables, 
 * already typed in vite/client, no need to declare here.
 */
interface ImportMetaEnv {
  // Supabase configuration
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  
  // Backend API
  readonly VITE_API_BASE_URL: string;
  
  // Development flags
  readonly VITE_DEV_SKIP_MIC: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
