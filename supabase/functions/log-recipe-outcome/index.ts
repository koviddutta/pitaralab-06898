import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Log recipe outcomes for future ML training
 * Collects user feedback on recipe performance
 */
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { 
      recipeId, 
      outcome, // 'success' | 'needs_improvement' | 'failed'
      texture, // actual texture achieved
      notes,
      metrics 
    } = await req.json();

    if (!recipeId || !outcome) {
      return new Response(
        JSON.stringify({ error: 'recipeId and outcome are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Logging outcome for recipe ${recipeId}: ${outcome}`);

    // Store outcome in training data table
    const { data, error } = await supabase
      .from('recipe_outcomes')
      .insert({
        user_id: user.id,
        recipe_id: recipeId,
        outcome,
        actual_texture: texture,
        notes,
        metrics,
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging outcome:', error);
      throw error;
    }

    console.log('Outcome logged successfully:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Recipe outcome logged for ML training',
        id: data.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in log-recipe-outcome function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
