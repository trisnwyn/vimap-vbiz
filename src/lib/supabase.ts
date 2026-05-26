import { createClient } from '@supabase/supabase-js';

// Fall back to placeholder values so the module doesn't throw at build time
// when env vars aren't configured. Real requests will fail gracefully until
// real values are added to .env.local.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

// Client-side (anon key — respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side only (service role — bypasses RLS, use only in API routes)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
