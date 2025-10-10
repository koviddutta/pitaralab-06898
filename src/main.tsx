import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'

// Configure React Query with persistence-ready settings
// Note: Add @tanstack/react-query-persist-client for localStorage caching if needed
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - cache remains fresh
      gcTime: 1000 * 60 * 30, // 30 minutes - cache kept in memory
      refetchOnWindowFocus: true, // Revalidate from Supabase on focus
      refetchOnMount: true, // Revalidate from Supabase on mount
      retry: 1
    }
  }
})

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
