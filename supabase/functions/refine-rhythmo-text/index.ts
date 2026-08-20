import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_WORDS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function buildPrompts(words: string[], language?: string) {
  const systemPrompt = `Tu corriges une transcription automatique destinée à une "bande rythmo" (karaoké de doublage).
On te donne la liste ORDONNÉE des mots tels que transcrits par un moteur vocal.
Ta tâche : corriger uniquement l'orthographe, les accents, la casse et la ponctuation attachée à chaque mot.
RÈGLES ABSOLUES :
- Renvoie EXACTEMENT le même nombre d'éléments que l'entrée, dans le même ordre.
- Ne fusionne pas deux mots, ne sépare pas un mot, n'ajoute rien, ne supprime rien.
- Si un mot est déjà correct, renvoie-le tel quel.
- Chaque élément de sortie correspond au mot d'entrée de même position.
Réponds UNIQUEMENT en JSON: {"words": ["...", "..."]}${language ? `\nLangue: ${language}` : ""}`;

  const userPrompt = JSON.stringify({ words });
  return { systemPrompt, userPrompt };
}

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
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0 },
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    const err = new Error(`Gemini error: ${response.status}`);
    (err as { status?: number }).status = response.status;
    console.error("Gemini refine error:", model, response.status, errText);
    throw err;
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function refineWithGemini(
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
        if (status === 503 || status === 429 || status === 500) {
          await sleep(500 * (attempt + 1));
          continue;
        }
        throw error;
      }
    }
  }
  throw lastError;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let words: string[] = [];
  try {
    const body = await req.json();
    words = Array.isArray(body?.words) ? body.words : [];
    const language: string | undefined =
      typeof body?.language === "string" ? body.language : undefined;

    // Validate: a non-empty, bounded list of strings.
    if (words.length === 0 || words.length > MAX_WORDS || !words.every((w) => typeof w === "string")) {
      return new Response(JSON.stringify({ words, refined: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GOOGLE_API_KEY");
    if (!GEMINI_API_KEY) {
      // No key configured: return the input unchanged so Whisper text is used.
      return new Response(JSON.stringify({ words, refined: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { systemPrompt, userPrompt } = buildPrompts(words, language);
    const raw = await refineWithGemini(GEMINI_API_KEY, systemPrompt, userPrompt);

    let parsed: unknown;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : raw);
    } catch {
      parsed = null;
    }

    const corrected = (parsed as { words?: unknown })?.words;

    // Strict safety: only accept a same-length array of strings. Otherwise the
    // word-to-timing mapping would break, so we keep the original Whisper text.
    if (
      Array.isArray(corrected) &&
      corrected.length === words.length &&
      corrected.every((w) => typeof w === "string")
    ) {
      const cleaned = corrected.map((w, i) => {
        const value = (w as string).trim();
        return value.length > 0 ? value : words[i];
      });
      return new Response(JSON.stringify({ words: cleaned, refined: true, model: "gemini-2.5-flash" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ words, refined: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("refine-rhythmo-text error:", error);
    // On any failure, echo the original words so the caller falls back cleanly.
    return new Response(JSON.stringify({ words, refined: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
