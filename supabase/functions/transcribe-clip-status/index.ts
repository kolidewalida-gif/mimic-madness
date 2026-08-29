/**
 * Interroge l'état d'une transcription AssemblyAI et renvoie les mots minutés.
 *
 * Pendant du dépôt fait par `transcribe-clip` : le client appelle celle-ci en
 * boucle jusqu'à un statut terminal. Elle ne renvoie que ce dont la bande
 * rythmo a besoin, jamais la réponse brute du fournisseur.
 *
 * Attention aux unités : AssemblyAI donne `start`/`end` en MILLISECONDES,
 * la conversion en secondes est faite côté client (`assemblyai.ts`).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeadersFor, guardOpenFunction } from "../_shared/guard.ts";

/* Voir `_shared/guard.ts` : l'origine `*` autorisait tout le web à consommer
 * notre crédit AssemblyAI depuis un navigateur. */
let corsHeaders: Record<string, string> = {};

const API_BASE = "https://api.eu.assemblyai.com";

/** Garde-fou de taille : ~10 h de parole tiennent largement en dessous. */
const MAX_WORDS = 20_000;

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Les identifiants AssemblyAI sont alphanumériques avec des tirets. */
const isValidId = (id: string): boolean => /^[A-Za-z0-9_-]{8,64}$/.test(id);

interface RawWord {
  text?: unknown;
  start?: unknown;
  end?: unknown;
  confidence?: unknown;
}

serve(async (req) => {
  corsHeaders = corsHeadersFor(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  /*
   * Le client interroge cette fonction en boucle jusqu'à un statut terminal, le
   * plafond doit donc être généreux : cent appels par minute laissent tourner
   * plusieurs transcriptions de front sans jamais gêner.
   */
  const verdict = await guardOpenFunction(req, {
    bucket: "transcribe-clip-status",
    limit: 100,
    windowSeconds: 60,
  });
  if (!verdict.allowed) return verdict.response!;

  try {
    const body = await req.json().catch(() => null);
    const id = typeof body?.id === "string" ? body.id.trim() : "";

    if (!id || !isValidId(id)) {
      return json({ ok: false, reason: "invalid-request", message: "id invalide." });
    }

    const apiKey = Deno.env.get("ASSEMBLYAI_API_KEY");
    if (!apiKey) {
      return json({ ok: false, reason: "not-configured" });
    }

    const response = await fetch(`${API_BASE}/v2/transcript/${id}`, {
      // Clé brute, sans `Bearer`.
      headers: { Authorization: apiKey },
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("transcribe-clip-status failed:", response.status, detail.slice(0, 500));
      return json({
        ok: false,
        reason: response.status === 401 || response.status === 403 ? "unauthorized" : "provider",
        status: response.status,
      });
    }

    const transcript = await response.json();
    const status = typeof transcript?.status === "string" ? transcript.status : "unknown";

    if (status === "error") {
      const message = typeof transcript?.error === "string" ? transcript.error : "Transcription échouée.";
      console.error("transcribe-clip-status: transcription en erreur:", message);
      return json({ ok: true, status: "error", message });
    }

    // `queued` / `processing` : rien à renvoyer, le client repollera.
    if (status !== "completed") {
      return json({ ok: true, status });
    }

    const rawWords: RawWord[] = Array.isArray(transcript?.words) ? transcript.words : [];
    const words = rawWords
      .slice(0, MAX_WORDS)
      .filter(
        (word): word is { text: string; start: number; end: number } =>
          typeof word?.text === "string" &&
          typeof word?.start === "number" &&
          typeof word?.end === "number" &&
          Number.isFinite(word.start) &&
          Number.isFinite(word.end),
      )
      .map((word) => ({ text: word.text, startMs: word.start, endMs: word.end }));

    return json({
      ok: true,
      status: "completed",
      words,
      language: typeof transcript?.language_code === "string" ? transcript.language_code : undefined,
      audioDuration: typeof transcript?.audio_duration === "number" ? transcript.audio_duration : undefined,
    });
  } catch (error) {
    console.error("transcribe-clip-status error:", error);
    return json({ ok: false, reason: "provider" });
  }
});
