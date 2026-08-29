/**
 * Soumet un clip à AssemblyAI pour transcription (mode pré-enregistré).
 *
 * Cette fonction ne fait que *déposer* le travail : elle renvoie l'identifiant
 * de transcription, et le client interroge ensuite `transcribe-clip-status`.
 * Découper en deux évite le timeout d'une edge function (~150 s), qu'une
 * transcription de clip long dépasserait si on attendait la fin ici.
 *
 * La clé n'existe que côté serveur, dans le secret `ASSEMBLYAI_API_KEY`.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeadersFor, guardOpenFunction } from "../_shared/guard.ts";

/*
 * L'ancien `Access-Control-Allow-Origin: "*"` autorisait tout site du web à
 * appeler cette fonction depuis le navigateur de ses visiteurs, alors qu'elle
 * consomme du crédit AssemblyAI. Les en-têtes sont maintenant construits par
 * requête, et ne portent l'autorisation que pour les origines du jeu.
 */
let corsHeaders: Record<string, string> = {};

/** Région Europe : résidence des données dans l'UE. */
const API_BASE = "https://api.eu.assemblyai.com";

/**
 * Liste ORDONNÉE de repli. `universal-3-5-pro` couvre 18 langues avec du
 * code-switching natif ; si la langue détectée n'y est pas, AssemblyAI bascule
 * seul sur `universal-2` (99 langues). Les clips importés étant arbitraires,
 * ce repli n'est pas optionnel.
 */
const SPEECH_MODELS = ["universal-3-5-pro", "universal-2"];

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Anti-SSRF : la clé du projet ne doit pas pouvoir servir à transcrire une URL
 * arbitraire choisie par un client. On n'accepte que les objets du Storage de
 * ce projet Supabase.
 */
function isAllowedAudioUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) return false;

  let expectedHost: string;
  try {
    expectedHost = new URL(supabaseUrl).host;
  } catch {
    return false;
  }

  return parsed.host === expectedHost && parsed.pathname.startsWith("/storage/v1/object/");
}

/** Retente uniquement ce qui est retentable : 429 et 5xx. */
async function submitWithRetry(apiKey: string, body: unknown): Promise<Response> {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${API_BASE}/v2/transcript`, {
      method: "POST",
      headers: {
        // Clé brute, sans préfixe `Bearer` : c'est la convention de l'API
        // AssemblyAI (seule la Voice Agent API utilise `Bearer`).
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.ok) return response;

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable) return response;

    lastResponse = response;
    await sleep(500 * (attempt + 1));
  }

  return lastResponse!;
}

serve(async (req) => {
  corsHeaders = corsHeadersFor(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  /*
   * Une transcription est une opération lourde et payante. Dix soumissions par
   * minute et par adresse laissent largement de quoi travailler sur ses clips à
   * plusieurs derrière la même connexion, et coupent net une boucle.
   */
  const verdict = await guardOpenFunction(req, {
    bucket: "transcribe-clip",
    limit: 10,
    windowSeconds: 60,
  });
  if (!verdict.allowed) return verdict.response!;

  try {
    const body = await req.json().catch(() => null);
    const audioUrl = typeof body?.audioUrl === "string" ? body.audioUrl.trim() : "";
    const languageCode = typeof body?.languageCode === "string" ? body.languageCode.trim() : "";

    if (!audioUrl) {
      return json({ ok: false, reason: "invalid-request", message: "audioUrl manquant." });
    }
    if (!isAllowedAudioUrl(audioUrl)) {
      return json({
        ok: false,
        reason: "invalid-request",
        message: "audioUrl doit pointer vers le Storage de ce projet.",
      });
    }

    const apiKey = Deno.env.get("ASSEMBLYAI_API_KEY");
    if (!apiKey) {
      // Pas de clé configurée : le client bascule sur Whisper local.
      return json({ ok: false, reason: "not-configured" });
    }

    const payload: Record<string, unknown> = {
      audio_url: audioUrl,
      speech_models: SPEECH_MODELS,
      punctuate: true,
      format_text: true,
    };

    // Langue explicite si le client en impose une, sinon détection automatique
    // (les clips importés peuvent être dans n'importe quelle langue).
    if (languageCode) payload.language_code = languageCode;
    else payload.language_detection = true;

    const response = await submitWithRetry(apiKey, payload);

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("transcribe-clip submit failed:", response.status, detail.slice(0, 500));
      return json({
        ok: false,
        reason: response.status === 401 || response.status === 403 ? "unauthorized" : "provider",
        status: response.status,
      });
    }

    const created = await response.json();
    const id = typeof created?.id === "string" ? created.id : "";
    if (!id) {
      console.error("transcribe-clip: réponse sans id", created);
      return json({ ok: false, reason: "provider" });
    }

    return json({ ok: true, id, status: created?.status ?? "queued" });
  } catch (error) {
    console.error("transcribe-clip error:", error);
    return json({ ok: false, reason: "provider" });
  }
});
