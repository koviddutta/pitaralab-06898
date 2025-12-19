import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const OutcomeSchema = z.object({
  recipeId: z.string().uuid(),
  outcome: z.enum(['success', 'needs_improvement', 'failed']),
  texture: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  metrics: z.record(z.unknown()).optional(),
});

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
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    const rawBody = await req.json();
    const parseResult = OutcomeSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      console.error('Validation error:', parseResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: parseResult.error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { recipeId, outcome, texture, notes } = parseResult.data;

    console.log(`Logging outcome for recipe ${recipeId}: ${outcome}`);

    // Verify recipe exists and belongs to user
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('id')
      .eq('id', recipeId)
      .eq('user_id', user.id)
      .single();

    if (recipeError || !recipe) {
      console.error('Recipe not found or not owned by user:', recipeError);
      return new Response(
        JSON.stringify({ error: 'Recipe not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store outcome in training data table
    const { data, error } = await supabase
      .from('recipe_outcomes')
      .insert({
        user_id: user.id,
        recipe_id: recipeId,
        outcome,
        actual_texture: texture,
        notes,
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging outcome:', error);
      throw error;
    }

    console.log('Outcome logged successfully:', data.id);

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
