import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SeparateVocalsRequest {
  audioUrl: string;
}

interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  error?: string;
  output?: {
    stems?: Array<{ name: string; audio: string }>;
  };
}

/**
 * Démarre un job de séparation vocale via Replicate Demucs (htdemucs).
 * Retourne immédiatement un prediction_id que le client peut ensuite
 * poller avec `separate-vocals-status`.
 * 
 * Input : { audioUrl: string } — URL publique du clip vidéo dans le Storage Supabase.
 * Output : { id: string } — ID de la prédiction Replicate.
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const replicateToken = Deno.env.get('REPLICATE_API_TOKEN');
    if (!replicateToken) {
      console.error('[separate-vocals] REPLICATE_API_TOKEN manquant');
      return new Response(
        JSON.stringify({ error: 'Configuration serveur manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Vérifie que l'utilisateur est authentifié
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body: SeparateVocalsRequest = await req.json();
    const { audioUrl } = body;

    if (!audioUrl || typeof audioUrl !== 'string') {
      return new Response(
        JSON.stringify({ error: 'audioUrl requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Anti-SSRF : vérifie que l'URL pointe vers le Storage du projet
    const urlObj = new URL(audioUrl);
    const projectHost = new URL(supabaseUrl).host;
    if (!urlObj.host.includes(projectHost) && !audioUrl.includes('supabase.co/storage')) {
      console.error('[separate-vocals] URL refusée (anti-SSRF)', audioUrl);
      return new Response(
        JSON.stringify({ error: 'URL non autorisée' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.info('[separate-vocals] Soumission Demucs', { audioUrl, user: user.id });

    // Soumet le job à Replicate Demucs v4 (htdemucs, modèle par défaut)
    // https://replicate.com/ryan5453/demucs
    const replicateRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait=0', // mode async, retourne immédiatement
      },
      body: JSON.stringify({
        version: 'bfc15c4c736da916143bf747f175ecf446b0242bd07837836c096d228866afbc', // ryan5453/demucs htdemucs
        input: {
          audio: audioUrl,
          model: 'htdemucs',      // modèle par défaut (rapide, bon)
          stem: 'none',           // renvoie tous les stems séparés (vocals, drums, bass, other)
          output_format: 'mp3',
          mp3_bitrate: 192,       // qualité raisonnable, taille correcte
          mp3_preset: 2,
          clip_mode: 'rescale',
          shifts: 1,
          overlap: 0.25,
          split: true,
        },
      }),
    });

    if (!replicateRes.ok) {
      const errText = await replicateRes.text();
      console.error('[separate-vocals] Replicate erreur', replicateRes.status, errText);
      return new Response(
        JSON.stringify({ error: 'Échec de soumission Replicate', details: errText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const prediction: ReplicatePrediction = await replicateRes.json();
    console.info('[separate-vocals] Job créé', prediction.id, prediction.status);

    return new Response(
      JSON.stringify({ id: prediction.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[separate-vocals] Erreur serveur', error);
    return new Response(
      JSON.stringify({ error: 'Erreur interne', message: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
