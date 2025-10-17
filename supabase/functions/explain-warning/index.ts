import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = { 
  warning: string;
  mode: "gelato" | "kulfi";
  metrics?: Record<string, any>;
};

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
    const fn = "explain-warning";

    const body = (await req.json()) as Body;
    if (!body?.warning) {
      console.error("Invalid request body - missing warning");
      return j({ error: "Bad request: missing warning" }, 400);
    }

    // Log usage
    await supabase.from("ai_usage_log").insert({ user_id: userId, function_name: fn });

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY not configured");
      return j({ error: "AI service not configured" }, 500);
    }

    const systemPrompt = `You are an expert gelato and kulfi formulation scientist. Explain formulation warnings in clear, practical terms that help users understand the science and fix issues.

Your explanations should:
- Start with the core problem and why it matters for texture/quality
- Include the science (freezing point depression, protein aggregation, crystallization, etc.)
- Provide 2-3 specific, actionable fixes with ingredient amounts or percentages
- Reference relevant quality parameters (FPDT, POD, PAC, MSNF, etc.)
- Be concise but thorough (3-4 sentences max)`;

    const metricsContext = body.metrics 
      ? `\n\nCurrent metrics: ${JSON.stringify(body.metrics, null, 2)}`
      : '';

    const userPrompt = `Explain this ${body.mode} formulation warning and provide actionable fixes:

"${body.warning}"${metricsContext}`;

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
          ]
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
      const explanation = aiData.choices?.[0]?.message?.content || "Unable to generate explanation";

      console.log(`Generated explanation for user ${userId}`);
      
      return j({ explanation }, 200);

    } catch (aiError) {
      console.error("AI processing error:", aiError);
      return j({ error: "Failed to generate explanation" }, 500);
    }

  } catch (e) {
    console.error("Error in explain-warning function:", e);
    return j({ error: String(e) }, 500);
  }
});

function j(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { 
    status, 
    headers: { ...corsHeaders, "Content-Type": "application/json" } 
  });
}
