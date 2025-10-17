import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Leighton table data for freezing point depression lookup
const leightonTable = [
  { sucrose: 0, fpd: 0 },
  { sucrose: 5, fpd: 0.28 },
  { sucrose: 10, fpd: 0.56 },
  { sucrose: 15, fpd: 0.86 },
  { sucrose: 20, fpd: 1.17 },
  { sucrose: 25, fpd: 1.49 },
  { sucrose: 30, fpd: 1.82 },
  { sucrose: 35, fpd: 2.17 },
  { sucrose: 40, fpd: 2.54 },
  { sucrose: 45, fpd: 2.92 },
  { sucrose: 50, fpd: 3.33 },
  { sucrose: 55, fpd: 3.77 },
  { sucrose: 60, fpd: 4.24 },
  { sucrose: 65, fpd: 4.75 },
  { sucrose: 70, fpd: 5.32 }
];

function leightonLookup(sucrosePerWater: number): number {
  if (sucrosePerWater <= leightonTable[0].sucrose) return leightonTable[0].fpd;
  if (sucrosePerWater >= leightonTable[leightonTable.length - 1].sucrose) {
    return leightonTable[leightonTable.length - 1].fpd;
  }
  
  for (let i = 0; i < leightonTable.length - 1; i++) {
    if (sucrosePerWater >= leightonTable[i].sucrose && sucrosePerWater <= leightonTable[i + 1].sucrose) {
      const x0 = leightonTable[i].sucrose;
      const x1 = leightonTable[i + 1].sucrose;
      const y0 = leightonTable[i].fpd;
      const y1 = leightonTable[i + 1].fpd;
      return y0 + ((sucrosePerWater - x0) * (y1 - y0)) / (x1 - x0);
    }
  }
  return 0;
}

function estimateFrozenWater(waterPct: number, pac: number, tempC: number): number {
  // Guard against invalid inputs
  if (waterPct <= 0 || pac <= 0) return 0;
  if (tempC > 0) return 0; // No freezing above 0°C
  
  // Calculate with numerical stability
  const absPAC = Math.min(pac / waterPct, 100); // Cap to prevent overflow
  const T_ifp = -0.54 * (pac / 100);
  const alpha = 0.25 + 2.0 * absPAC;
  
  // Prevent exponential overflow
  const exponent = alpha * (tempC - T_ifp);
  if (exponent < -50) return 100; // Fully frozen
  if (exponent > 50) return 0; // Not frozen
  
  const F = 1 - Math.exp(exponent);
  return Math.max(0, Math.min(1, F)) * 100;
}

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

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { rows, mode = 'gelato', serveTempC = -12 } = await req.json();

    if (!rows || !Array.isArray(rows)) {
      return new Response(
        JSON.stringify({ error: 'Invalid input: rows array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${rows.length} ingredient rows for user ${user.id}`);

    // Fetch all ingredient data
    const ingredientIds = rows.map((r: any) => r.ing_id).filter(Boolean);
    const { data: ingredients, error: ingError } = await supabase
      .from('ingredients')
      .select('*')
      .in('id', ingredientIds);

    if (ingError) {
      console.error('Error fetching ingredients:', ingError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch ingredients' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create ingredient lookup
    const ingMap = new Map(ingredients?.map(ing => [ing.id, ing]) || []);

    // Calculate base metrics
    let totalWater = 0;
    let totalSugars = 0;
    let totalSE = 0;
    let totalHardeningEffect = 0;
    let totalWeight = 0;

    rows.forEach((row: any) => {
      const ing = ingMap.get(row.ing_id);
      if (!ing) return;

      const grams = row.grams || 0;
      const factor = grams / 100;

      totalWater += (ing.water_pct || 0) * factor;
      totalSugars += (ing.sugars_pct || 0) * factor;
      totalWeight += grams;

      // Calculate sucrose equivalent contribution
      const spCoeff = ing.sp_coeff || 1.0;
      const pacCoeff = ing.pac_coeff || 1.0;
      const sugarContribution = (ing.sugars_pct || 0) * factor;
      totalSE += sugarContribution * spCoeff;

      // Calculate hardening effect
      const hardeningFactor = ing.hardening_factor || 0;
      if (hardeningFactor > 0) {
        const fatContribution = (ing.fat_pct || 0) * factor;
        totalHardeningEffect += fatContribution * hardeningFactor;
      }
    });

    // Base calculations
    const baseSEper100gWater = totalWater > 0 ? (totalSE / totalWater) * 100 : 0;
    const baseFPDT = leightonLookup(baseSEper100gWater);
    const waterPct = (totalWater / totalWeight) * 100;
    const basePAC = baseSEper100gWater; // Simplified PAC approximation
    const baseWaterFrozen = estimateFrozenWater(waterPct, basePAC, serveTempC);

    // Adjusted calculations with hardening factor
    // Get configurable K multiplier from environment (default: 1.0)
    const K = Number(Deno.env.get("HF_K") ?? "1.0");
    const deltaPAC = totalHardeningEffect * K;
    const adjustedSE = totalSE + deltaPAC;
    const adjustedSEper100gWater = totalWater > 0 ? (adjustedSE / totalWater) * 100 : 0;
    const adjustedFPDT = leightonLookup(adjustedSEper100gWater);
    const adjustedPAC = adjustedSEper100gWater;
    const adjustedWaterFrozen = estimateFrozenWater(waterPct, adjustedPAC, serveTempC);

    console.log(`Hardening calculation: totalEffect=${totalHardeningEffect.toFixed(2)}, K=${K}, deltaPAC=${deltaPAC.toFixed(2)}`);

    const result = {
      base: {
        SEper100gWater: Math.round(baseSEper100gWater * 100) / 100,
        FPDT: Math.round(baseFPDT * 100) / 100,
        waterFrozenPct: Math.round(baseWaterFrozen * 100) / 100,
        totalWater: Math.round(totalWater * 100) / 100,
        totalSugars: Math.round(totalSugars * 100) / 100,
      },
      adjusted: {
        SEper100gWater: Math.round(adjustedSEper100gWater * 100) / 100,
        FPDT: Math.round(adjustedFPDT * 100) / 100,
        waterFrozenPct: Math.round(adjustedWaterFrozen * 100) / 100,
        hardeningEffect: Math.round(totalHardeningEffect * 100) / 100,
      },
      serveTempC,
      mode,
    };

    console.log('Thermo-metrics calculated:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in thermo-metrics function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
