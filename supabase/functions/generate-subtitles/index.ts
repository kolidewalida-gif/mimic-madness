import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Build the subtitle prompt shared by both providers.
function buildPrompts(safeDuration: number, safeDesc: string) {
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

  return { systemPrompt, userPrompt };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Call one Gemini model once. Returns the raw text, or throws with .status set.
async function callGeminiModel(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 1.0 },
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    const err = new Error(`Gemini error: ${response.status}`);
    (err as { status?: number }).status = response.status;
    console.error("Gemini API error:", model, response.status, errText);
    throw err;
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
}

// Google Gemini (Google AI Studio) — free tier, no card. Preferred provider.
// Flash gets overloaded (503) on the free tier, so we retry and then fall back
// to flash-lite, which has higher free limits and is rarely saturated.
async function generateWithGemini(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
  let lastError: unknown;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await callGeminiModel(apiKey, model, systemPrompt, userPrompt);
      } catch (error) {
        lastError = error;
        const status = (error as { status?: number })?.status;
        // Only retry/fall back on transient overload/limit errors.
        if (status === 503 || status === 429 || status === 500) {
          await sleep(600 * (attempt + 1));
          continue;
        }
        throw error;
      }
    }
  }
  throw lastError;
}

// Lovable AI gateway — kept as a fallback when only LOVABLE_API_KEY is present.
async function generateWithLovable(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
    const errText = await response.text();
    const err = new Error(`AI gateway error: ${response.status}`);
    (err as { status?: number }).status = response.status;
    console.error("AI gateway error:", response.status, errText);
    throw err;
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? "[]";
}

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

    const { systemPrompt, userPrompt } = buildPrompts(safeDuration, safeDesc);

    // Prefer a key you own (Google AI Studio, free). Fall back to Lovable's
    // managed gateway when only LOVABLE_API_KEY is available.
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GOOGLE_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    let content: string;
    try {
      if (GEMINI_API_KEY) {
        content = await generateWithGemini(GEMINI_API_KEY, systemPrompt, userPrompt);
      } else if (LOVABLE_API_KEY) {
        content = await generateWithLovable(LOVABLE_API_KEY, systemPrompt, userPrompt);
      } else {
        throw new Error("No AI key configured (set GEMINI_API_KEY)");
      }
    } catch (providerError) {
      const status = (providerError as { status?: number })?.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte, réessayez plus tard." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA insuffisants." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw providerError;
    }

    // Parse the JSON from the response
    let subtitles;
    try {
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
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("generate-subtitles error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
