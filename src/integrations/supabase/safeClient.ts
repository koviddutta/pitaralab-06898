// Safe, lazy Supabase client accessor to avoid runtime crashes when env is not yet loaded
// Do NOT import client.ts directly in components. Use this instead.

export async function getSupabase() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error('ENV_MISSING');
  }

  const mod = await import('./client');
  return mod.supabase;
}

export function isBackendReady() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
}
