import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LIMIT_PER_HOUR = 10;
type Row = { ingredientId: string; grams: number };
type Body = { rows: Row[]; mode: "gelato" | "kulfi" };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) {
      console.error("Unauthorized access attempt");
      return j({ error: "Unauthorized" }, 401);
    }
    
    const userId = userRes.user.id;
    const fn = "suggest-ingredient";

    // Check rate limit: count requests in the last hour
    const since = new Date(Date.now() - 60*60*1000).toISOString();
    const { count } = await supabase.from("ai_usage_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("function_name", fn)
      .gt("created_at", since);
    
    if ((count ?? 0) >= LIMIT_PER_HOUR) {
      console.warn(`Rate limit exceeded for user ${userId}`);
      return j({ error: `Rate limit exceeded. Try again in ~1 hour.` }, 429);
    }

    const body = (await req.json()) as Body;
    if (!Array.isArray(body?.rows) || !body?.mode) {
      console.error("Invalid request body");
      return j({ error: "Bad request" }, 400);
    }

    // Log usage
    await supabase.from("ai_usage_log").insert({ user_id: userId, function_name: fn });

    // Calculate total batch size for percentage-based suggestions
    const totalGrams = body.rows.reduce((sum, r) => sum + r.grams, 0);

    // Return hardcoded suggestions based on mode with calculated grams
    const suggestions = [
      { 
        ingredient: "Dextrose (Glucose)", 
        grams: Math.round(totalGrams * 0.02), // 2% of total
        reason: "Lowers FP (PAC≈1.9) to soften texture; swap a part of sucrose."
      },
      { 
        ingredient: "Glucose Syrup DE60", 
        grams: Math.round(totalGrams * 0.035), // 3.5% of total
        reason: "Adds body with lower sweetness; tunes FPDT without oversweetening."
      },
      { 
        ingredient: "Locust Bean Gum (LBG)", 
        grams: Math.round(totalGrams * 0.0025), // 0.25% of total
        reason: "Improves body & meltdown; pair with guar for stability."
      }
    ];
    
    console.log(`Generated ${suggestions.length} suggestions for user ${userId}`);
    
    return j({ suggestions }, 200);
  } catch (e) {
    console.error("Error in suggest-ingredient function:", e);
    return j({ error: String(e) }, 500);
  }
});

function j(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { 
    status, 
    headers: { ...corsHeaders, "Content-Type": "application/json" } 
  });
}
