import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LIMIT_PER_HOUR = 20; // Rate limit for AI analysis

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization');
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || '' } },
    });

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting check
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from('ai_usage_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('function_name', 'analyze-recipe')
      .gte('created_at', oneHourAgo);

    if (countError) {
      console.error('Error checking rate limit:', countError);
    }

    if ((count || 0) >= LIMIT_PER_HOUR) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded', 
          message: `You've reached the limit of ${LIMIT_PER_HOUR} recipe analyses per hour. Please try again later.` 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { recipe, metrics, productType = 'gelato' } = await req.json();

    if (!recipe || !Array.isArray(recipe) || recipe.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid input: recipe array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing recipe for user ${user.id}, ${recipe.length} ingredients`);

    // Fetch ingredient details
    const ingredientIds = recipe.map((r: any) => r.ingredientId).filter(Boolean);
    const { data: ingredients } = await supabase
      .from('ingredients')
      .select('*')
      .in('id', ingredientIds);

    const ingMap = new Map(ingredients?.map(ing => [ing.id, ing]) || []);

    // Build recipe context for AI
    const recipeContext = recipe.map((r: any) => {
      const ing = ingMap.get(r.ingredientId);
      return ing ? `${ing.name}: ${r.grams}g` : null;
    }).filter(Boolean).join('\n');

    const metricsContext = metrics ? `
Recipe Metrics:
- Total Weight: ${metrics.total_g}g
- Fat: ${metrics.fat_pct?.toFixed(1)}%
- MSNF: ${metrics.msnf_pct?.toFixed(1)}%
- Total Sugars: ${metrics.totalSugars_pct?.toFixed(1)}%
- SP (Sweetness Power): ${metrics.sp?.toFixed(1)}
- PAC (Anti-Caking Power): ${metrics.pac?.toFixed(1)}
- FPDT: ${metrics.fpdt?.toFixed(2)}°C
- POD Index: ${metrics.pod_index?.toFixed(1)}
- Product Type: ${productType}
` : '';

    // Construct AI prompt
    const systemPrompt = `You are an expert gelato/ice cream formulation scientist with deep knowledge of:
- Recipe composition and balance
- Texture prediction based on ingredients
- Sugar spectrum optimization
- Fat and MSNF relationships
- Freezing point depression
- Ingredient interactions

Analyze the recipe and provide:
1. Success score (0-100) based on balance and target ranges
2. Predicted texture (e.g., "Creamy", "Smooth", "Dense", "Light")
3. Specific warnings about out-of-range parameters
4. Actionable suggestions for improvement

Be concise and specific. Focus on actionable insights.`;

    const userPrompt = `Analyze this ${productType} recipe:

${recipeContext}

${metricsContext}

Target ranges for ${productType}:
- Fat: 4-10%
- MSNF: 6-10%
- Total Sugars: 16-22%
- SP: 12-22
- PAC: 22-28

Provide your analysis in this exact format:
SUCCESS_SCORE: [0-100 number]
TEXTURE: [one word texture description]
WARNINGS: [bullet list of specific warnings, or "None"]
SUGGESTIONS: [bullet list of 2-3 specific, actionable suggestions]`;

    // Log AI usage
    await supabase.from('ai_usage_log').insert({
      user_id: user.id,
      function_name: 'analyze-recipe',
      tokens_used: 500, // Approximate
    });

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'AI service rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiText = aiData.choices?.[0]?.message?.content || '';

    console.log('AI Analysis:', aiText);

    // Parse AI response
    const parseValue = (key: string, defaultVal: any) => {
      const match = aiText.match(new RegExp(`${key}:\\s*(.+?)(?:\\n|$)`, 'i'));
      return match ? match[1].trim() : defaultVal;
    };

    const parseList = (key: string): string[] => {
      const match = aiText.match(new RegExp(`${key}:\\s*([\\s\\S]*?)(?:\\n\\n|$)`, 'i'));
      if (!match) return [];
      const text = match[1];
      return text.split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./))
        .map((line: string) => line.replace(/^[-•]\s*|\d+\.\s*/, '').trim())
        .filter(Boolean);
    };

    const successScore = parseInt(parseValue('SUCCESS_SCORE', '75')) || 75;
    const texturePredict = parseValue('TEXTURE', 'Creamy');
    const warnings = parseList('WARNINGS').filter((w: string) => w.toLowerCase() !== 'none');
    const suggestions = parseList('SUGGESTIONS');

    const result = {
      successScore: Math.max(0, Math.min(100, successScore)),
      texturePredict,
      warnings: warnings.length > 0 ? warnings : [],
      suggestions: suggestions.length > 0 ? suggestions : ['Recipe looks balanced'],
      confidence: 85,
      analysisTimestamp: new Date().toISOString(),
    };

    console.log('Parsed result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-recipe function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
