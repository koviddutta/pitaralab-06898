// Safe, lazy Supabase client accessor to avoid runtime crashes when env is not yet loaded
// Do NOT import client.ts directly in components. Use this instead.

export async function getSupabase() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  console.log('🔍 Checking Supabase env vars:', { 
    url: url ? 'SET' : 'MISSING', 
    key: key ? 'SET' : 'MISSING' 
  });

  if (!url || !key) {
    console.error('❌ Supabase env vars not found. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set.');
    throw new Error('ENV_MISSING');
  }

  try {
    const mod = await import('./client');
    console.log('✅ Supabase client loaded successfully');
    return mod.supabase;
  } catch (error) {
    console.error('❌ Failed to load Supabase client:', error);
    throw error;
  }
}

export function isBackendReady() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
}
