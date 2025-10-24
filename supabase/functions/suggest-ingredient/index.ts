import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LIMIT_PER_HOUR = 10;
type Row = { ingredientId: string; grams: number };
type Body = { rows: Row[]; mode: "gelato" | "kulfi" };

interface Suggestion {
  ingredient: string;
  grams: number;
  reason: string;
  suggestedPctRange?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple validation function
function validateRequest(body: any): body is Body {
  if (!body || typeof body !== 'object') return false;
  if (!Array.isArray(body.rows)) return false;
  if (body.rows.length === 0 || body.rows.length > 50) return false;
  
  for (const row of body.rows) {
    if (typeof row.ingredientId !== 'string') return false;
    if (typeof row.grams !== 'number' || row.grams < 0 || row.grams > 100000) return false;
  }
  
  if (!['gelato', 'kulfi', 'sorbet', 'ice-cream'].includes(body.mode)) return false;
  
  return true;
}

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

    const body = await req.json();
    
    // Validate input
    if (!validateRequest(body)) {
      console.error("Invalid request body:", body);
      return j({ error: "Invalid request: check rows format, grams range (0-100000), and mode" }, 400);
    }

    // Log usage
    await supabase.from("ai_usage_log").insert({ user_id: userId, function_name: fn });

    // Calculate total batch size for percentage-based suggestions
    const totalGrams = body.rows.reduce((sum, r) => sum + r.grams, 0);

    // Fetch ingredient library to build context
    const { data: ingredients } = await supabase
      .from("ingredients")
      .select("id, name, category, water_pct, sugars_pct, fat_pct, msnf_pct, other_solids_pct, sp_coeff, pac_coeff")
      .in("id", body.rows.map(r => r.ingredientId));

    if (!ingredients || ingredients.length === 0) {
      console.error("No ingredients found for the provided IDs");
      return j({ error: "Invalid ingredient IDs" }, 400);
    }

    // Build recipe context for AI
    const recipeContext = body.rows.map(row => {
      const ing = ingredients.find(i => i.id === row.ingredientId);
      return ing ? `${ing.name}: ${row.grams}g (${ing.category})` : null;
    }).filter(Boolean).join(", ");

    // Call Lovable AI Gateway for intelligent suggestions
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY not configured");
      return j({ error: "AI service not configured" }, 500);
    }

    const systemPrompt = `You are a gelato formulation expert. Analyze the recipe and suggest 3 intelligent ingredient additions or modifications that will improve the formulation for ${body.mode} production.

Consider:
- Freezing point depression (FPDT) targets: gelato 2.5-3.5°C, kulfi 2.0-2.5°C
- Total solids targets: gelato 36-45%, kulfi 38-42%
- Fat content: gelato 6-9%, kulfi 10-12%
- Sugar balance and POD index (80-120 ideal)
- Texture, scoopability, and mouthfeel
- Stabilizer balance

Provide practical suggestions with specific gram amounts and clear scientific reasoning.`;

    const userPrompt = `Current ${body.mode} recipe (total: ${totalGrams}g):
${recipeContext}

Suggest 3 specific ingredients to add or modify to improve this formulation.`;

    try {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          tools: [{
            type: "function",
            function: {
              name: "suggest_ingredients",
              description: "Suggest ingredient additions or modifications for gelato/kulfi formulation",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    maxItems: 3,
                    items: {
                      type: "object",
                      properties: {
                        ingredient: { 
                          type: "string",
                          description: "Name of the ingredient to add or modify"
                        },
                        grams: { 
                          type: "number",
                          description: "Amount in grams to add"
                        },
                        reason: { 
                          type: "string",
                          description: "Scientific explanation of why this improves the formulation"
                        },
                        suggestedPctRange: {
                          type: "string",
                          description: "Recommended percentage range (e.g., '2-4%' or '0.25-0.5%')"
                        }
                      },
                      required: ["ingredient", "grams", "reason"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["suggestions"],
                additionalProperties: false
              }
            }
          }],
          tool_choice: { type: "function", function: { name: "suggest_ingredients" } }
        })
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("AI Gateway error:", aiResponse.status, errorText);
        
        if (aiResponse.status === 429) {
          return j({ error: "AI service rate limit exceeded. Please try again later." }, 429);
        }
        if (aiResponse.status === 402) {
          return j({ error: "AI service credits exhausted. Please contact support." }, 402);
        }
        
        return j({ error: "AI service temporarily unavailable" }, 503);
      }

      const aiData = await aiResponse.json();
      
      // Extract suggestions from tool call
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        console.error("No tool call found in AI response");
        return j({ error: "Failed to generate suggestions" }, 500);
      }

      const parsedArgs = JSON.parse(toolCall.function.arguments);
      const suggestions: Suggestion[] = parsedArgs.suggestions || [];

      console.log(`✅ AI generated ${suggestions.length} suggestions for user ${userId}`);
      
      return j({ suggestions }, 200);

    } catch (aiError) {
      console.error("AI processing error:", aiError);
      
      // Fallback to rule-based suggestions
      console.log("Falling back to rule-based suggestions");
      const fallbackSuggestions: Suggestion[] = [
        { 
          ingredient: "Dextrose (Glucose)", 
          grams: Math.round(totalGrams * 0.02),
          reason: "Lowers freezing point (PAC≈1.9) to improve scoopability without adding excessive sweetness.",
          suggestedPctRange: "2-4%"
        },
        { 
          ingredient: "Glucose Syrup DE60", 
          grams: Math.round(totalGrams * 0.035),
          reason: "Adds body and reduces ice crystal growth while maintaining balanced sweetness.",
          suggestedPctRange: "3-5%"
        },
        { 
          ingredient: "Locust Bean Gum (LBG)", 
          grams: Math.round(totalGrams * 0.0025),
          reason: "Improves body and meltdown resistance; works synergistically with other stabilizers.",
          suggestedPctRange: "0.2-0.3%"
        }
      ];
      
      return j({ suggestions: fallbackSuggestions }, 200);
    }
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
