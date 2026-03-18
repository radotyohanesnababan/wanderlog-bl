import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const flowType = 'implicit';
  
  console.log('🔍 Auth flow:', flowType);
  
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: flowType,
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      }
    }
  )
}