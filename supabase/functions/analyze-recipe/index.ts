import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipe, metrics, productType = 'ice_cream' } = await req.json();
    console.log('🔍 Analyzing recipe:', { recipe, metrics, productType });

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Log AI usage
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        await supabase.from('ai_usage_log').insert({
          user_id: user.id,
          function_name: 'analyze-recipe',
        });
      }
    }

    // Build detailed recipe description with ingredient properties
    let recipeDesc = '';
    
    if (Array.isArray(recipe)) {
      recipeDesc = recipe.map((r: any) => 
        `${r.ingredient || r.ingredientId}: ${r.quantity_g || r.grams}g`
      ).join(', ');
    } else if (recipe.rows) {
      recipeDesc = recipe.rows.map((r: any) => 
        `${r.ingredient}: ${r.quantity_g}g`
      ).join(', ');
    }

    // Create expert-level prompt
    const prompt = `You are a world-class ice cream scientist and formulator with 20+ years experience. Analyze this ${productType} recipe in EXTREME DETAIL:

**RECIPE COMPOSITION:**
${recipeDesc}

**CALCULATED METRICS:**
- Sugars: ${metrics?.sugars_pct?.toFixed(2) || 'N/A'}% ${metrics?.sugars_pct ? (metrics.sugars_pct < 18 ? '(LOW - may freeze too hard)' : metrics.sugars_pct > 28 ? '(HIGH - may be too soft)' : '(GOOD)') : ''}
- Fat: ${metrics?.fat_pct?.toFixed(2) || 'N/A'}% ${metrics?.fat_pct ? (metrics.fat_pct < 4 ? '(LOW - icy texture risk)' : metrics.fat_pct > 16 ? '(HIGH - heavy mouthfeel)' : '(GOOD)') : ''}
- MSNF: ${metrics?.msnf_pct?.toFixed(2) || 'N/A'}% ${metrics?.msnf_pct ? (metrics.msnf_pct < 8 ? '(LOW - weak body)' : metrics.msnf_pct > 14 ? '(HIGH - sandy texture risk)' : '(GOOD)') : ''}
- Total Solids: ${metrics?.total_solids_pct?.toFixed(2) || 'N/A'}%
- SP (Sweetness Power): ${metrics?.sp?.toFixed(1) || 'N/A'} ${metrics?.sp ? (metrics.sp < 16 ? '(too low)' : metrics.sp > 22 ? '(too high)' : '(ideal)') : ''}
- PAC (Anti-freeze): ${metrics?.pac?.toFixed(1) || 'N/A'} ${metrics?.pac ? (metrics.pac < 180 ? '(will freeze too hard)' : metrics.pac > 280 ? '(will be too soft)' : '(good)') : ''}
- FPDT: ${metrics?.fpdt?.toFixed(2) || 'N/A'}°C

**YOUR ANALYSIS MUST INCLUDE:**

1. **Balance Assessment** (3-4 sentences):
   - Evaluate sugar/fat/MSNF ratios against ideal ranges for ${productType}
   - Identify if composition is balanced or skewed
   - Rate overall formulation quality (poor/fair/good/excellent)

2. **Texture Prediction** (specific prediction):
   - Based on PAC value, predict exact texture: "Rock hard" / "Very firm" / "Firm but scoopable" / "Soft and creamy" / "Too soft" / "Melts too fast"
   - Based on fat%, predict mouthfeel: "Icy" / "Light" / "Creamy" / "Rich" / "Heavy"
   - Predict scoopability at -18°C: "Very difficult" / "Requires warm scoop" / "Easy" / "Too easy (melts fast)"

3. **Optimization Suggestions** (3-5 specific actions):
   - Give EXACT numbers: "Increase fat from ${metrics?.fat_pct?.toFixed(1)}% to 8% by adding 30g cream"
   - Suggest specific ingredients: "Replace 50g sucrose with 30g dextrose + 20g fructose to increase PAC"
   - Address any imbalances with precise fixes

4. **Risk Warnings** (if any issues exist):
   - Highlight specific problems: "PAC of ${metrics?.pac?.toFixed(1)} is too high - product will be too soft"
   - Warn about texture issues: "Low fat will cause icy texture"
   - Flag freezing problems: "FPDT too low - will freeze rock hard"

5. **Recommended Adjustments** (3-5 concrete changes):
   - Ingredient swaps with quantities: "Replace 100g whole milk with 50g cream + 50g skim milk powder"
   - Addition suggestions: "Add 5g stabilizer to improve texture and prevent iciness"
   - Removal suggestions: "Reduce sugar by 20g to prevent excessive softness"

BE EXTREMELY SPECIFIC. Use exact numbers, ingredient names, and technical terms. No generic advice like "adjust sugar" - say "Reduce sucrose from 180g to 160g and add 20g trehalose".`;

    console.log('📤 Sending to AI with detailed prompt');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert ice cream scientist with deep knowledge of formulation, freezing point depression, texture optimization, and ingredient functionality. You give precise, actionable, technical advice with specific numbers and ingredient recommendations.' 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please wait before analyzing another recipe.');
      }
      if (aiResponse.status === 402) {
        throw new Error('AI credits depleted. Please add credits to continue using AI features.');
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices[0].message.content;

    console.log('✅ AI analysis received:', analysisText.substring(0, 200) + '...');

    // Parse the AI response into structured format
    const result = {
      balance_assessment: extractSection(analysisText, 'Balance Assessment') || 'Analysis in progress...',
      texture_prediction: extractSection(analysisText, 'Texture Prediction') || 'Evaluating texture...',
      optimization_suggestions: extractList(analysisText, 'Optimization Suggestions'),
      risk_warnings: extractList(analysisText, 'Risk Warnings'),
      recommended_adjustments: extractList(analysisText, 'Recommended Adjustments'),
      raw_analysis: analysisText,
    };

    console.log('📊 Structured result:', JSON.stringify(result, null, 2));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Error in analyze-recipe:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        balance_assessment: `Analysis failed: ${error.message}`,
        texture_prediction: 'Unable to predict',
        optimization_suggestions: [],
        risk_warnings: [`Error: ${error.message}`],
        recommended_adjustments: [],
      }),
      {
        status: error.message.includes('Rate limit') ? 429 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function extractSection(text: string, sectionName: string): string {
  // Try multiple patterns to find the section
  const patterns = [
    new RegExp(`\\*\\*${sectionName}[:\\*]*\\*\\*[\\s]*([\\s\\S]*?)(?=\\n\\n\\*\\*|$)`, 'i'),
    new RegExp(`#{1,3}\\s*${sectionName}[:\\s]*([\\s\\S]*?)(?=\\n#{1,3}|$)`, 'i'),
    new RegExp(`${sectionName}[:\\s]*([\\s\\S]*?)(?=\\n\\n|$)`, 'i'),
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 10) {
      return match[1].trim();
    }
  }
  
  return '';
}

function extractList(text: string, sectionName: string): string[] {
  const section = extractSection(text, sectionName);
  if (!section) return [];
  
  const lines = section.split('\n').filter(line => line.trim());
  const listItems = lines
    .filter(line => line.match(/^[\s]*[-*•\d.]+[\s]/))
    .map(line => line.replace(/^[\s]*[-*•\d.]+[\s]*/, '').trim())
    .filter(line => line.length > 5);
  
  // If no list items found, try to split by sentences
  if (listItems.length === 0) {
    return section.split(/[.!]\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 10 && s.length < 300)
      .slice(0, 5);
  }
  
  return listItems;
}
