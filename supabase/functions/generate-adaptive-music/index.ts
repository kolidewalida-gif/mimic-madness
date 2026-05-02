import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "@supabase/supabase-js";

interface SituationSpec {
  key: string;
  prompt: string;
  duration: number;
}

const SITUATIONS: SituationSpec[] = [
  { key: "lobby", duration: 60, prompt: "Upbeat playful cartoon party game lobby music, light bouncy ukulele, fun marimba, claps, brassy stabs, friendly and inviting, comic book vibe, looping, no vocals, instrumental, 90 BPM" },
  { key: "gameplay", duration: 60, prompt: "Energetic comedic party game background music, funky drums, brass hits, slap bass, cartoon adventure mood, optimistic and dynamic, no vocals, looping, 110 BPM" },
  { key: "vote", duration: 45, prompt: "Tense suspenseful cartoon detective music, ticking clock percussion, low pizzicato strings, mysterious clarinet, comic book stakeout vibe, building tension, no vocals, instrumental, 85 BPM" },
  { key: "victory", duration: 20, prompt: "Triumphant cartoon victory fanfare, bright brass, cheering trumpets, celebratory orchestral hit, fun and joyful, party game win jingle, no vocals, instrumental" },
  { key: "defeat", duration: 15, prompt: "Funny cartoon sad trombone defeat jingle, comedic descending wah-wah brass, slow lazy clarinet, loser music, short and humorous, no vocals, instrumental" },
  { key: "undercover", duration: 60, prompt: "Mysterious noir spy music with cartoon twist, walking double bass, muted trumpet, light hi-hat, sneaky and suspicious, party game undercover vibe, no vocals, looping, instrumental, 95 BPM" },
  { key: "audio-phone", duration: 60, prompt: "Quirky retro telephone game music, plucky pizzicato strings, telephone ring percussion, whimsical bells, comedic and curious cartoon mood, no vocals, looping, instrumental, 100 BPM" },
  { key: "quiz", duration: 60, prompt: "Bright energetic quiz show music, bouncy synth bass, snare rolls, fun game show stabs, brass hits, suspense and excitement mixed, no vocals, looping, instrumental, 120 BPM" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY missing");
    if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error("Supabase env missing");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json().catch(() => ({}));
    const onlyKey: string | undefined = body?.key;
    const force: boolean = !!body?.force;

    const targets = onlyKey ? SITUATIONS.filter((s) => s.key === onlyKey) : SITUATIONS;
    const results: Array<{ key: string; url: string; status: string }> = [];

    for (const spec of targets) {
      const path = `${spec.key}.mp3`;

      if (!force) {
        const { data: existing } = await supabase.storage
          .from("adaptive-music")
          .list("", { search: path });
        if (existing && existing.some((f) => f.name === path)) {
          const { data: pub } = supabase.storage.from("adaptive-music").getPublicUrl(path);
          results.push({ key: spec.key, url: pub.publicUrl, status: "cached" });
          continue;
        }
      }

      const elRes = await fetch("https://api.elevenlabs.io/v1/music", {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: spec.prompt,
          music_length_ms: spec.duration * 1000,
        }),
      });

      if (!elRes.ok) {
        const errText = await elRes.text();
        results.push({ key: spec.key, url: "", status: `error ${elRes.status}: ${errText.slice(0, 200)}` });
        continue;
      }

      const audioBuffer = await elRes.arrayBuffer();

      const { error: upErr } = await supabase.storage
        .from("adaptive-music")
        .upload(path, audioBuffer, {
          contentType: "audio/mpeg",
          upsert: true,
        });

      if (upErr) {
        results.push({ key: spec.key, url: "", status: `upload error: ${upErr.message}` });
        continue;
      }

      const { data: pub } = supabase.storage.from("adaptive-music").getPublicUrl(path);
      results.push({ key: spec.key, url: pub.publicUrl, status: "generated" });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});