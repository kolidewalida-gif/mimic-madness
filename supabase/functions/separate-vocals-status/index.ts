const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StatusRequest {
  id: string;
}

interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  error?: string;
  output?: {
    stems?: Array<{ name: string; audio: string }>;
  } | null;
}

/**
 * Interroge le statut d'un job de séparation vocale Replicate.
 * Retourne le statut et, si succès, l'URL de la piste instrumentale (sans voix).
 * 
 * Input : { id: string } — ID de prédiction Replicate retourné par `separate-vocals`.
 * Output : { status, instrumentalUrl?, error? }
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const replicateToken = Deno.env.get('REPLICATE_API_TOKEN');
    if (!replicateToken) {
      console.error('[separate-vocals-status] REPLICATE_API_TOKEN manquant');
      return new Response(
        JSON.stringify({ error: 'Configuration serveur manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body: StatusRequest = await req.json();
    const { id } = body;

    if (!id || typeof id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Poll Replicate
    const replicateRes = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: {
        'Authorization': `Bearer ${replicateToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!replicateRes.ok) {
      const errText = await replicateRes.text();
      console.error('[separate-vocals-status] Replicate erreur', replicateRes.status, errText);
      return new Response(
        JSON.stringify({ error: 'Échec de récupération du statut', details: errText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const prediction: ReplicatePrediction = await replicateRes.json();

    // États terminaux
    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      console.error('[separate-vocals-status] Job échoué/annulé', id, prediction.error);
      return new Response(
        JSON.stringify({
          status: prediction.status,
          error: prediction.error || 'Job échoué',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // En cours
    if (prediction.status === 'starting' || prediction.status === 'processing') {
      return new Response(
        JSON.stringify({ status: prediction.status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Succès : extraire la piste instrumentale
    if (prediction.status === 'succeeded' && prediction.output?.stems) {
      const stems = prediction.output.stems;
      
      // Demucs avec stem:'none' renvoie 4 stems : vocals, drums, bass, other
      // On veut tout sauf vocals => on cherche les 3 autres et on prend "other"
      // (qui contient déjà drums+bass+autres instruments combinés par Demucs)
      // OU on peut renvoyer l'URL "other" qui est l'accompaniment complet
      
      // Stratégie : chercher le stem "other" qui est l'accompaniment
      const otherStem = stems.find(s => s.name === 'other');
      
      if (otherStem?.audio) {
        console.info('[separate-vocals-status] Instrumental prêt', id, otherStem.audio);
        return new Response(
          JSON.stringify({
            status: 'succeeded',
            instrumentalUrl: otherStem.audio,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Fallback : si "other" n'existe pas (ne devrait jamais arriver), chercher "no_vocals"
      // (certaines versions de Demucs ont ce nom pour l'accompaniment)
      const noVocalsStem = stems.find(s => s.name === 'no_vocals' || s.name === 'accompaniment');
      if (noVocalsStem?.audio) {
        console.info('[separate-vocals-status] Instrumental (no_vocals) prêt', id, noVocalsStem.audio);
        return new Response(
          JSON.stringify({
            status: 'succeeded',
            instrumentalUrl: noVocalsStem.audio,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Si aucun stem ne correspond, logger tous les stems disponibles et échouer
      console.error('[separate-vocals-status] Aucun stem instrumental trouvé', id, stems.map(s => s.name));
      return new Response(
        JSON.stringify({
          status: 'failed',
          error: 'Aucune piste instrumentale dans le résultat',
          availableStems: stems.map(s => s.name),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // État inattendu
    console.warn('[separate-vocals-status] État inattendu', id, prediction.status);
    return new Response(
      JSON.stringify({ status: prediction.status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[separate-vocals-status] Erreur serveur', error);
    return new Response(
      JSON.stringify({ error: 'Erreur interne', message: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
