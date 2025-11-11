import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ML_SERVICE_URL = Deno.env.get('ML_SERVICE_URL');
    const ML_SERVICE_SECRET = Deno.env.get('ML_SERVICE_SECRET');

    if (!ML_SERVICE_URL || !ML_SERVICE_SECRET) {
      console.error('❌ Missing ML service configuration');
      return new Response(
        JSON.stringify({ 
          error: 'ML service not configured',
          fallback: true 
        }),
        { 
          status: 200, // Return 200 so frontend can fallback gracefully
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { metrics, product_type } = await req.json();

    if (!metrics || !product_type) {
      throw new Error('Missing metrics or product_type');
    }

    console.log('🤖 Calling Python ML service for prediction...');
    
    // Call Python ML service
    const mlResponse = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ML_SERVICE_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metrics,
        product_type
      })
    });

    if (!mlResponse.ok) {
      const errorText = await mlResponse.text();
      console.error('❌ ML service error:', mlResponse.status, errorText);
      
      // If ML service fails, return fallback flag
      return new Response(
        JSON.stringify({ 
          error: 'ML service unavailable',
          fallback: true,
          details: errorText
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const prediction = await mlResponse.json();
    
    console.log('✅ ML prediction:', prediction);

    return new Response(
      JSON.stringify({
        ...prediction,
        source: 'python-ml',
        fallback: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Edge function error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        fallback: true 
      }),
      { 
        status: 200, // Return 200 for graceful fallback
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
