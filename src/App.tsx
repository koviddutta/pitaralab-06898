import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import ErrorBoundary from "./components/ui/error-boundary";

const queryClient = new QueryClient();

// Lazy-load all routes that may import the Supabase client
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const ReverseEngineer = lazy(() => import("./components/ReverseEngineer"));

const App = () => {
  // Lovable Cloud projects have auto-managed environment variables
  // No need for blocking env checks - let components handle backend availability gracefully
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<div style={{padding:'2rem'}}>Loading…</div>}>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<Index />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/reverse-engineer" element={<ReverseEngineer palette={[]} />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

export default App;
