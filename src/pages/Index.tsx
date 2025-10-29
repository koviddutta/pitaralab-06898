

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabase, isBackendReady } from "@/integrations/supabase/safeClient";
import { Session, User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import SmartCalculator from "@/components/SmartCalculator";
import { BaseRecipeManager } from "@/components/BaseRecipeManager";
import UnitConverter from "@/components/UnitConverter";
import CostCalculator from "@/components/CostCalculator";
import FlavourEngine from "@/components/FlavourEngine";
import MobileRecipeInput from "@/components/MobileRecipeInput";
import PasteStudio from "@/components/PasteStudio";
import { CostingModule } from "@/components/CostingModule";
import ProductionPlanner from "@/components/ProductionPlanner";
import { RecipeImporter } from "@/components/RecipeImporter";
import { AutoTrainingMonitor } from "@/components/AutoTrainingMonitor";
import CopyProtection from "@/components/CopyProtection";
import { WelcomeTour, showTourAgain } from "@/components/WelcomeTour";
import { DiagnosticsPanel } from "@/components/DiagnosticsPanel";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Card, CardContent } from "@/components/ui/card";
import { Smartphone, Monitor, LogOut, User as UserIcon, HelpCircle, Wrench } from "lucide-react";
import { migratePinProfiles } from "@/lib/migratePinProfiles";
import { mlScheduler } from "@/lib/mlTrainingScheduler";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isMobile, setIsMobile] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendReady, setBackendReady] = useState(false);
  const [currentTab, setCurrentTab] = useState("calculator");

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    (async () => {
      // Check if backend is ready before attempting connection
      if (!isBackendReady()) {
        console.log("⚠️ Backend env vars not configured - running in offline mode");
        setBackendReady(false);
        setLoading(false);
        return;
      }

      try {
        console.log('🚀 Initializing Supabase connection...');
        const supabase = await getSupabase();
        console.log('✅ Supabase connection established');
        setBackendReady(true);
        
        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.log('🔐 Auth state changed:', event, session ? 'User logged in' : 'No session');
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        });
        unsubscribe = () => subscription.unsubscribe();

        // Check for existing session
        console.log('🔍 Checking for existing session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('❌ Error getting session:', error);
        }
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Redirect to auth if not logged in
        if (!session) {
          console.log('⚠️ No session found, redirecting to auth...');
          navigate("/auth");
        } else {
          console.log('✅ User authenticated:', session.user.email);
        }
      } catch (e: any) {
        console.error('❌ Backend initialization failed:', e);
        console.log("Running in offline mode - backend features disabled");
        setBackendReady(false);
        setLoading(false);
      }
    })();

    return () => { if (unsubscribe) unsubscribe(); };
  }, [navigate]);

  useEffect(() => {
    // Initialize migrations
    migratePinProfiles();
    
    // Start ML training scheduler
    mlScheduler.start();
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      mlScheduler.stop();
    };
  }, []);

  const handleMobileRecipeCreated = (recipe: { name: string; ingredients: any[] }) => {
    console.log('Mobile recipe created:', recipe);
    // Here you could switch to the calculator tab and populate it with the recipe
  };

  const handleSignOut = async () => {
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Sign out failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Signed out",
          description: "You have been successfully signed out.",
        });
        navigate("/auth");
      }
    } catch (e: any) {
      toast({
        title: "Sign out failed",
        description: e?.message || "Backend not ready",
        variant: "destructive",
      });
    }
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <CopyProtection />
        <WelcomeTour />
        <div className="container mx-auto px-2 md:px-4 py-4 md:py-8">
        {backendReady && user && (
          <div className="flex justify-end mb-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <UserIcon className="h-4 w-4" />
                  <span className="text-sm">{user.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={showTourAgain}>
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Show Tour Again
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrentTab('diagnostics')}>
                  <Wrench className="h-4 w-4 mr-2" />
                  System Diagnostics
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        
        {backendReady && user && (
          <div className="mb-4">
            <AutoTrainingMonitor />
          </div>
        )}

        {!backendReady && (
          <div className="mb-4">
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Backend Connection Issue</h3>
                <p className="text-sm text-yellow-700 mb-3">
                  The app is running in offline mode. Backend features (save, auth, AI) are temporarily unavailable.
                </p>
                <details className="text-xs text-yellow-600">
                  <summary className="cursor-pointer font-medium mb-2">Troubleshooting Steps</summary>
                  <ol className="list-decimal ml-4 space-y-1 mt-2">
                    <li>Open browser console (F12) to check for connection errors</li>
                    <li>Look for logs starting with 🔍 or ❌ emojis</li>
                    <li>Verify environment variables are set (should show "SET" not "MISSING")</li>
                    <li>Try refreshing the page</li>
                    <li>If using Lovable Cloud, the connection should auto-resolve</li>
                    <li>Check TROUBLESHOOTING.md file for detailed help</li>
                  </ol>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 w-full"
                    onClick={() => setCurrentTab('diagnostics')}
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Open System Diagnostics
                  </Button>
                </details>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="text-center mb-4 md:mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            {isMobile ? (
              <Smartphone className="h-6 w-6 text-gray-600" />
            ) : (
              <Monitor className="h-6 w-6 text-gray-600" />
            )}
            <h1 className="text-2xl md:text-4xl font-bold text-gray-800">
              MeethaPitara Recipe Calculator
            </h1>
          </div>
          <p className="text-gray-600 text-sm md:text-lg px-4">
            🤖 AI-Powered · 🧠 Self-Learning · 📊 Real-time Predictions
          </p>
          {isMobile && (
            <Card className="mt-4 mx-4 bg-info-light border-info/20">
              <CardContent className="p-3">
                <p className="text-xs text-info-foreground font-medium">
                  📱 Mobile mode: Swipe left/right to see all tabs →
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          {/* Unified tab list - scrollable on mobile, wrapped on desktop */}
          <TabsList className={isMobile 
            ? "w-full h-auto flex flex-nowrap gap-1.5 overflow-x-auto overflow-y-hidden py-3 bg-background/80 backdrop-blur-sm shadow-sm" 
            : "w-full h-auto flex flex-wrap gap-2 p-2 bg-background/80 backdrop-blur-sm"
          }
          style={isMobile ? {
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch'
          } : undefined}
          >
            <TabsTrigger 
              value="calculator" 
              className={isMobile 
                ? 'text-xs px-4 py-2.5 flex-shrink-0 whitespace-nowrap font-medium ml-2' 
                : 'flex-1 min-w-[140px] font-medium'}
              style={isMobile ? { scrollSnapAlign: 'start' } : undefined}
            >
              🤖 Smart Calculator
            </TabsTrigger>
            <TabsTrigger 
              value="flavour-engine" 
              className={isMobile 
                ? 'text-xs px-4 py-2.5 flex-shrink-0 whitespace-nowrap font-medium' 
                : 'flex-1 min-w-[140px] font-medium'}
              style={isMobile ? { scrollSnapAlign: 'start' } : undefined}
            >
              ⚗️ Flavour Engine
            </TabsTrigger>
            <TabsTrigger 
              value="paste-studio" 
              className={isMobile 
                ? 'text-xs px-4 py-2.5 flex-shrink-0 whitespace-nowrap font-medium scroll-snap-align-start' 
                : 'flex-1 min-w-[140px] font-medium'}
              style={isMobile ? { scrollSnapAlign: 'start' } : undefined}
            >
              ✨ Paste Studio
            </TabsTrigger>
            <TabsTrigger 
              value="costing" 
              className={isMobile 
                ? 'text-xs px-4 py-2.5 flex-shrink-0 whitespace-nowrap font-medium scroll-snap-align-start' 
                : 'flex-1 min-w-[140px] font-medium'}
              style={isMobile ? { scrollSnapAlign: 'start' } : undefined}
            >
              💰 Costing
            </TabsTrigger>
            <TabsTrigger 
              value="base-recipes" 
              className={isMobile 
                ? 'text-xs px-4 py-2.5 flex-shrink-0 whitespace-nowrap font-medium scroll-snap-align-start' 
                : 'flex-1 min-w-[140px] font-medium'}
              style={isMobile ? { scrollSnapAlign: 'start' } : undefined}
            >
              📚 Base Recipes
            </TabsTrigger>
            <TabsTrigger 
              value="converter" 
              className={isMobile 
                ? 'text-xs px-4 py-2.5 flex-shrink-0 whitespace-nowrap font-medium scroll-snap-align-start' 
                : 'flex-1 min-w-[140px] font-medium'}
              style={isMobile ? { scrollSnapAlign: 'start' } : undefined}
            >
              🔄 Converter
            </TabsTrigger>
            <TabsTrigger 
              value="cost" 
              className={isMobile 
                ? 'text-xs px-4 py-2.5 flex-shrink-0 whitespace-nowrap font-medium scroll-snap-align-start' 
                : 'flex-1 min-w-[140px] font-medium'}
              style={isMobile ? { scrollSnapAlign: 'start' } : undefined}
            >
              💵 Cost Calc
            </TabsTrigger>
            <TabsTrigger 
              value="production" 
              className={isMobile 
                ? 'text-xs px-4 py-2.5 flex-shrink-0 whitespace-nowrap font-medium scroll-snap-align-start' 
                : 'flex-1 min-w-[140px] font-medium'}
              style={isMobile ? { scrollSnapAlign: 'start' } : undefined}
            >
              🏭 Production
            </TabsTrigger>
            <TabsTrigger 
              value="import" 
              className={isMobile 
                ? 'text-xs px-4 py-2.5 flex-shrink-0 whitespace-nowrap font-medium scroll-snap-align-start' 
                : 'flex-1 min-w-[140px] font-medium'}
              style={isMobile ? { scrollSnapAlign: 'start' } : undefined}
            >
              📥 Import
            </TabsTrigger>
            <TabsTrigger 
              value="ml-training" 
              className={isMobile 
                ? 'text-xs px-4 py-2.5 flex-shrink-0 whitespace-nowrap font-medium scroll-snap-align-start' 
                : 'flex-1 min-w-[140px] font-medium'}
              style={isMobile ? { scrollSnapAlign: 'start' } : undefined}
            >
              🧠 ML Training
            </TabsTrigger>
            <TabsTrigger 
              value="diagnostics" 
              className={isMobile 
                ? 'text-xs px-4 py-2.5 flex-shrink-0 whitespace-nowrap font-medium scroll-snap-align-start' 
                : 'flex-1 min-w-[140px] font-medium'}
              style={isMobile ? { scrollSnapAlign: 'start' } : undefined}
            >
              🔧 Diagnostics
            </TabsTrigger>
            {isMobile && (
              <TabsTrigger 
                value="mobile-input" 
                className="text-xs px-4 py-2.5 flex-shrink-0 whitespace-nowrap font-medium scroll-snap-align-start mr-2"
                style={{ scrollSnapAlign: 'start' }}
              >
                ➕ Quick Add
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="calculator" className="mt-4 md:mt-6">
            <SmartCalculator />
          </TabsContent>

          <TabsContent value="paste-studio" className="mt-4 md:mt-6">
            <PasteStudio />
          </TabsContent>

          <TabsContent value="costing" className="mt-4 md:mt-6">
            <CostingModule 
              ingredients={[
                { name: "Milk", weight: 600, costPerKg: 65 },
                { name: "Cream", weight: 250, costPerKg: 450 },
                { name: "Sugar", weight: 180, costPerKg: 50 },
                { name: "Egg Yolk", weight: 50, costPerKg: 800 },
                { name: "Vanilla Extract", weight: 5, costPerKg: 12000 },
              ]}
              recipeName="Sample Gelato Recipe"
            />
          </TabsContent>

          <TabsContent value="flavour-engine" className="mt-4 md:mt-6">
            <FlavourEngine />
          </TabsContent>

          {/* All tab content available on all devices */}
          <TabsContent value="base-recipes" className="mt-4 md:mt-6">
            <BaseRecipeManager />
          </TabsContent>

          <TabsContent value="converter" className="mt-4 md:mt-6">
            <UnitConverter />
          </TabsContent>

          <TabsContent value="cost" className="mt-4 md:mt-6">
            <CostCalculator />
          </TabsContent>

          <TabsContent value="production" className="mt-4 md:mt-6">
            <ProductionPlanner />
          </TabsContent>

          <TabsContent value="import" className="mt-4 md:mt-6">
            <RecipeImporter />
          </TabsContent>

          <TabsContent value="ml-training" className="mt-4 md:mt-6">
            <Card className="p-6">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold">Database & ML Training</h3>
                <p className="text-muted-foreground">Manage recipes, import data, and train ML models</p>
                <Button onClick={() => navigate('/database')}>
                  Open Database Manager
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="diagnostics" className="mt-4 md:mt-6">
            <DiagnosticsPanel />
          </TabsContent>

          {isMobile && (
            <TabsContent value="mobile-input" className="mt-4">
              <MobileRecipeInput onRecipeCreated={handleMobileRecipeCreated} />
            </TabsContent>
          )}
        </Tabs>

        {/* Mobile-specific navigation help */}
        {isMobile && (
          <Card className="mt-6 mx-4 bg-card-secondary border-border/50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-2 text-foreground">📱 Mobile Features:</h3>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>• All 12 tabs available - swipe to access</p>
                <p>• Touch-optimized ingredient input</p>
                <p>• Voice input for hands-free recipe creation</p>
                <p>• Real-time parameter evaluation</p>
                <p>• Mobile-friendly charts and analysis</p>
                <p>• Recipe import from Excel/CSV</p>
                <p>• ML training dashboard with model testing</p>
                <p>• System diagnostics in 🔧 Diagnostics tab</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
};

export default Index;


