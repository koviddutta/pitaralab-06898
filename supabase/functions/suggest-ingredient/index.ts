import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting: Check requests in last 60 seconds
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { data: recentUsage, error: usageError } = await supabase
      .from("ai_usage_log")
      .select("id")
      .eq("user_id", user.id)
      .eq("function_name", "suggest-ingredient")
      .gte("created_at", oneMinuteAgo);

    if (usageError) {
      console.error("Usage check error:", usageError);
    }

    // Allow 5 requests per minute
    if (recentUsage && recentUsage.length >= 5) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded. Please wait a moment before trying again.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log this usage
    await supabase.from("ai_usage_log").insert({
      user_id: user.id,
      function_name: "suggest-ingredient",
    });

    const { rows, mode } = await req.json();

    // Build context about current recipe
    const ingredientList = rows
      .map((r: any) => `${r.ingredientId}: ${r.grams}g`)
      .join(", ");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Call Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert gelato scientist specializing in ${mode} recipes. Analyze the current recipe and suggest 3 possible ingredients to add next. Consider balance of fat, MSNF, sugars, and freezing point. Be creative but scientifically sound.`,
          },
          {
            role: "user",
            content: `Current ${mode} recipe: ${ingredientList}\n\nSuggest 3 ingredients to add next with brief reasons (max 30 words each). Format as JSON array: [{"ingredient": "name", "grams": number, "reason": "brief explanation"}]`,
          },
        ],
        temperature: 0.7,
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_ingredients",
              description: "Suggest 3 ingredients to add to the recipe",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        ingredient: { type: "string" },
                        grams: { type: "number" },
                        reason: { type: "string" },
                      },
                      required: ["ingredient", "grams", "reason"],
                    },
                    minItems: 3,
                    maxItems: 3,
                  },
                },
                required: ["suggestions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_ingredients" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI service rate limit exceeded. Please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please contact support." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No suggestions returned from AI");
    }

    const suggestions = JSON.parse(toolCall.function.arguments).suggestions;

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in suggest-ingredient:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
