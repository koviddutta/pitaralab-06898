

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabase, isBackendReady } from "@/integrations/supabase/safeClient";
import { Session, User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import RecipeCalculatorV2 from "@/components/RecipeCalculatorV2";
import BaseRecipeSelector from "@/components/BaseRecipeSelector";
import UnitConverter from "@/components/UnitConverter";
import CostCalculator from "@/components/CostCalculator";
import FlavourEngine from "@/components/FlavourEngine";
import MobileRecipeInput from "@/components/MobileRecipeInput";
import EnhancedCalculator from "@/components/EnhancedCalculator";
import PasteStudio from "@/components/PasteStudio";
import { CostingModule } from "@/components/CostingModule";
import CopyProtection from "@/components/CopyProtection";
import WelcomeModal from "@/components/WelcomeModal";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Card, CardContent } from "@/components/ui/card";
import { Smartphone, Monitor, LogOut, User as UserIcon } from "lucide-react";
import { migratePinProfiles } from "@/lib/migratePinProfiles";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isMobile, setIsMobile] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const supabase = await getSupabase();
        // Set up auth state listener FIRST
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        });
        unsubscribe = () => subscription.unsubscribe();

        // THEN check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Redirect to auth if not logged in
        if (!session) {
          navigate("/auth");
        }
      } catch (e) {
        console.warn("Backend not ready yet; running in offline mode until env loads.");
        setLoading(false);
      }
    })();

    return () => { if (unsubscribe) unsubscribe(); };
  }, [navigate]);

  useEffect(() => {
    // Initialize migrations
    migratePinProfiles();
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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

  // Redirect to auth if not logged in (additional safety check)
  if (!session || !user) {
    return null;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <CopyProtection />
        <WelcomeModal />
        <div className="container mx-auto px-2 md:px-4 py-4 md:py-8">
        <div className="flex justify-end mb-4">
          <Card className="inline-flex items-center gap-2 p-2">
            <UserIcon className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-gray-600">{user.email}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-1"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </Card>
        </div>

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
            ML-powered recipe development tools with predictive analysis for artisan ice cream makers
          </p>
          {isMobile && (
            <Card className="mt-4 mx-4">
              <CardContent className="p-3">
                <p className="text-xs text-blue-600">
                  📱 Mobile-optimized interface active. Swipe through tabs for the best experience.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <Tabs defaultValue="calculator" className="w-full">
          <TabsList className={isMobile 
            ? "w-full h-auto flex flex-nowrap gap-1 overflow-x-auto overflow-y-hidden scrollbar-hide p-2" 
            : "w-full h-auto flex flex-wrap gap-2 p-2"
          }>
            <TabsTrigger 
              value="calculator" 
              className={isMobile ? 'text-xs px-3 py-2 flex-shrink-0 min-w-[100px]' : 'flex-1 min-w-[140px]'}
            >
              {isMobile ? '📊' : '📊'} Calculator
            </TabsTrigger>
            <TabsTrigger 
              value="flavour-engine" 
              className={isMobile ? 'text-xs px-3 py-2 flex-shrink-0 min-w-[100px]' : 'flex-1 min-w-[140px]'}
            >
              {isMobile ? '🤖' : '🤖'} AI Engine
            </TabsTrigger>
            {isMobile && (
              <TabsTrigger value="mobile-input" className="text-xs px-3 py-2 flex-shrink-0 min-w-[100px]">
                ➕ Quick Add
              </TabsTrigger>
            )}
            {!isMobile && (
              <>
                <TabsTrigger value="enhanced" className="flex-1 min-w-[140px]">
                  🆕 Enhanced
                </TabsTrigger>
                <TabsTrigger value="paste-studio" className="flex-1 min-w-[140px]">
                  ✨ Paste Studio
                </TabsTrigger>
                <TabsTrigger value="costing" className="flex-1 min-w-[140px]">
                  💰 Costing
                </TabsTrigger>
                <TabsTrigger value="base-recipes" className="flex-1 min-w-[140px]">
                  📚 Base Recipes
                </TabsTrigger>
                <TabsTrigger value="converter" className="flex-1 min-w-[140px]">
                  🔄 Converter
                </TabsTrigger>
                <TabsTrigger value="cost" className="flex-1 min-w-[140px]">
                  💵 Cost Calc
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="calculator" className="mt-4 md:mt-6">
            <RecipeCalculatorV2 />
          </TabsContent>

          <TabsContent value="enhanced" className="mt-4 md:mt-6">
            <EnhancedCalculator />
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

          {isMobile && (
            <TabsContent value="mobile-input" className="mt-4">
              <MobileRecipeInput onRecipeCreated={handleMobileRecipeCreated} />
            </TabsContent>
          )}

          {!isMobile && (
            <>
              <TabsContent value="base-recipes" className="mt-6">
                <BaseRecipeSelector />
              </TabsContent>

              <TabsContent value="converter" className="mt-6">
                <UnitConverter />
              </TabsContent>

              <TabsContent value="cost" className="mt-6">
                <CostCalculator />
              </TabsContent>
            </>
          )}
        </Tabs>

        {/* Mobile-specific navigation help */}
        {isMobile && (
          <Card className="mt-6 mx-4">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-2">Mobile Features:</h3>
              <div className="space-y-1 text-xs text-gray-600">
                <p>• 📱 Touch-optimized ingredient input with quick adjustments</p>
                <p>• 🎤 Voice input for hands-free recipe creation (Quick Add tab)</p>
                <p>• 📸 Photo recognition for ingredient detection (coming soon)</p>
                <p>• 🔄 Real-time parameter evaluation and validation</p>
                <p>• 📊 Mobile-friendly charts and nutritional analysis</p>
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


