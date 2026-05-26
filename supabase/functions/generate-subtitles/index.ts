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
    const { videoDescription, duration } = await req.json();

    // Validate and sanitize inputs to prevent prompt injection / abuse
    const safeDuration = Math.max(1, Math.min(600, Number(duration) || 10));
    const rawDesc = typeof videoDescription === "string" ? videoDescription : "";
    const safeDesc = rawDesc
      .slice(0, 200)
      .replace(/[\r\n]+/g, " ")
      .replace(/[\[\]{}`]/g, "")
      .trim();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Tu es un expert en création de sous-titres et bandes rythmo pour le doublage cinématographique.
Tu dois générer des sous-titres dynamiques et amusants pour des vidéos de défis d'imitation.
Les sous-titres doivent être:
- Courts et percutants (max 10 mots par ligne)
- Synchronisés avec le timing donné
- Amusants et engageants pour un jeu multijoueur
- Formatés en JSON avec timestamp de début et fin

Retourne UNIQUEMENT un tableau JSON valide, sans texte autour.`;

    const userPrompt = `Génère des sous-titres pour une vidéo de ${safeDuration} secondes.
Description/contexte: ${safeDesc || "Vidéo de défi d'imitation amusant"}

Génère 3 à 6 sous-titres répartis sur la durée de la vidéo.
Format attendu:
[
  {"start": 0, "end": 2, "text": "Texte du sous-titre"},
  {"start": 2, "end": 4, "text": "Suite..."}
]`;

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
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte, réessayez plus tard." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA insuffisants." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Parse the JSON from the response
    let subtitles;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        subtitles = JSON.parse(jsonMatch[0]);
      } else {
        subtitles = JSON.parse(content);
      }
    } catch (parseError) {
      console.error("Failed to parse subtitles:", parseError, content);
      // Return default subtitles if parsing fails
      subtitles = [
        { start: 0, end: safeDuration * 0.3, text: "🎬 Action !" },
        { start: safeDuration * 0.3, end: safeDuration * 0.7, text: "C'est parti !" },
        { start: safeDuration * 0.7, end: safeDuration, text: "🔥 Incroyable !" },
      ];
    }

    return new Response(
      JSON.stringify({ subtitles }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-subtitles error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});