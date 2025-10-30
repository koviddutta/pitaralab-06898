import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { csvPreview, availableIngredients } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `You are an expert CSV analysis agent for recipe data extraction. Your job is to:

1. Analyze the CSV structure and identify:
   - Recipe names
   - Ingredient names
   - Quantities/amounts
   - Any nutritional data (sugars, fats, MSNF, etc.)

2. Return a structured analysis with:
   - Detected format type (side-by-side, simple, grouped, etc.)
   - Column mappings (which columns contain what data)
   - Recipe boundaries (where recipes start/end)
   - Ingredient matching suggestions

3. Match ingredients from the CSV to the available ingredient database provided.

4. Handle various formats:
   - Multiple recipes in columns (side-by-side)
   - Single recipe per row
   - Grouped recipes with headers
   - Complex multi-section layouts

Return your analysis as JSON with this structure:
{
  "format_type": "side-by-side" | "simple" | "grouped" | "complex",
  "column_mappings": {
    "recipe_name": [column indices or patterns],
    "ingredient": [column indices],
    "quantity": [column indices],
    "sugars": [column indices],
    "fat": [column indices],
    "msnf": [column indices],
    "other_solids": [column indices]
  },
  "recipes": [
    {
      "name": "Recipe Name",
      "start_row": 0,
      "end_row": 10,
      "ingredients": [
        {
          "raw_name": "ingredient from CSV",
          "matched_id": "id from database",
          "matched_name": "matched ingredient name",
          "confidence": 0.95,
          "quantity": 100
        }
      ]
    }
  ],
  "parsing_notes": "Any important observations or warnings"
}`;

    const userPrompt = `Analyze this CSV data and extract recipes:

CSV Preview (first 15 rows):
${csvPreview}

Available ingredients in database:
${JSON.stringify(availableIngredients.map((i: any) => ({ id: i.id, name: i.name, category: i.category })), null, 2)}

Please analyze the structure and return the structured JSON analysis.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_csv_structure",
              description: "Return structured analysis of CSV recipe data",
              parameters: {
                type: "object",
                properties: {
                  format_type: {
                    type: "string",
                    enum: ["side-by-side", "simple", "grouped", "complex"]
                  },
                  column_mappings: {
                    type: "object",
                    properties: {
                      recipe_name: { type: "array", items: { type: "number" } },
                      ingredient: { type: "array", items: { type: "number" } },
                      quantity: { type: "array", items: { type: "number" } },
                      sugars: { type: "array", items: { type: "number" } },
                      fat: { type: "array", items: { type: "number" } },
                      msnf: { type: "array", items: { type: "number" } },
                      other_solids: { type: "array", items: { type: "number" } }
                    }
                  },
                  recipes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        start_row: { type: "number" },
                        end_row: { type: "number" },
                        ingredients: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              raw_name: { type: "string" },
                              matched_id: { type: "string" },
                              matched_name: { type: "string" },
                              confidence: { type: "number" },
                              quantity: { type: "number" }
                            }
                          }
                        }
                      }
                    }
                  },
                  parsing_notes: { type: "string" }
                },
                required: ["format_type", "recipes"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_csv_structure" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No structured output received from AI");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("CSV analysis error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
