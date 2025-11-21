import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rimhmaeecdcrhuqbisjv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpbWhtYWVlY2Rjcmh1cWJpc2p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTgwNDYsImV4cCI6MjA3OTAzNDA0Nn0.rSiGYktT3oESNSGRTY8S2hF_0_aoS6xNzzfh4d71BQY';

// 使用单例模式创建 Supabase 客户端
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

export const supabase = getSupabaseClient();
