import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

interface Spec { key: string; prompt: string; duration: number }

const SPECS: Spec[] = [
  { key: "ink-home", duration: 75, prompt: "Dark stylish UK garage lounge loop for a party game main menu, inky black-and-red noir mood, warm sub bass, shuffled 2-step drums, soft rhodes chords, mysterious but inviting, instrumental, no vocals, seamless loop, 112 BPM" },
  { key: "ink-lobby", duration: 75, prompt: "Late night lounge waiting-room loop, mellow downtempo beat, muted electric piano, soft vinyl texture, friendly relaxed anticipation before a game starts, instrumental, no vocals, seamless loop, 96 BPM" },
  { key: "imitation", duration: 70, prompt: "Energetic breakbeat loop for a voice imitation mini-game, punchy drums, playful synth stabs, funny bouncy bassline, competitive fun, instrumental, no vocals, seamless loop, 128 BPM" },
  { key: "audiophone", duration: 70, prompt: "Quirky minimal electro loop, telephone-like blips, plucky synths, curious whimsical mood for a broken-telephone audio game, instrumental, no vocals, seamless loop, 104 BPM" },
  { key: "audiophone-rewind", duration: 70, prompt: "Reversed trip-hop loop, backwards cymbals and swells, hazy dusty texture, strange and dreamlike rewind atmosphere, instrumental, no vocals, seamless loop, 96 BPM" },
  { key: "team-showdown", duration: 70, prompt: "Peak-time club anthem loop for a team versus showdown, big four-on-the-floor drums, rising synth riff, hands-in-the-air energy, instrumental, no vocals, seamless loop, 128 BPM" },
  { key: "quiz", duration: 70, prompt: "Tense modern quiz show electro loop, ticking percussion, pulsing arpeggio, snare rolls, suspense mixed with excitement, instrumental, no vocals, seamless loop, 120 BPM" },
  { key: "pixoguess", duration: 70, prompt: "Driving tech-house loop for a pixel guessing race, tight hats, rolling bassline, focused hypnotic groove, instrumental, no vocals, seamless loop, 120 BPM" },
  { key: "undercover", duration: 70, prompt: "Noir trip-hop loop for a social deduction spy game, walking upright bass, muted trumpet, brushed drums, sneaky suspicious atmosphere, instrumental, no vocals, seamless loop, 96 BPM" },
  { key: "blindtest", duration: 70, prompt: "French house blindtest loop, filtered disco guitar, neon synth chords, groovy bass, fun radio party energy, instrumental, no vocals, seamless loop, 112 BPM" },
  { key: "mimic-waiting", duration: 70, prompt: "Nocturnal R&B backstage loop, soft keys, laid-back drums, warm bass, waiting under the spotlight before performing, instrumental, no vocals, seamless loop, 96 BPM" },
  { key: "mimic-results", duration: 45, prompt: "Uplifting club house results music, bright piano chords, euphoric synth lead, celebratory scoreboard reveal, instrumental, no vocals, 120 BPM" },
  { key: "monopoly", duration: 75, prompt: "Cool electronic jazz loop for a board game of deals and property, smooth double bass, soft brass stabs, laid-back drums, clever scheming mood, instrumental, no vocals, seamless loop, 104 BPM" },
  { key: "voting", duration: 60, prompt: "Suspense electro loop for a voting phase, low pulsing drone, ticking clock percussion, tense rising strings, decision under pressure, instrumental, no vocals, seamless loop, 96 BPM" },
  { key: "victory", duration: 30, prompt: "Euphoric house victory theme, triumphant chords, bright synth lead, confetti celebration energy, instrumental, no vocals, 120 BPM" },
  { key: "defeat", duration: 25, prompt: "Downtempo bittersweet defeat theme, slow dusty drums, melancholic keys, gentle humor, instrumental, no vocals, 88 BPM" },
  { key: "connection", duration: 45, prompt: "Calm ambient loop for a reconnecting screen, soft pads, distant bells, patient reassuring atmosphere, instrumental, no vocals, seamless loop, 80 BPM" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY missing");
    if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error("Supabase env missing");
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json().catch(() => ({}));
    const keys: string[] | undefined = body?.keys;
    const force = !!body?.force;
    const targets = keys?.length ? SPECS.filter((s) => keys.includes(s.key)) : SPECS;
    const results: Array<{ key: string; url: string; status: string }> = [];

    for (const spec of targets) {
      const path = `${spec.key}.mp3`;
      if (!force) {
        const { data: existing } = await supabase.storage.from("adaptive-music").list("", { search: path });
        if (existing?.some((f) => f.name === path)) {
          const { data: pub } = supabase.storage.from("adaptive-music").getPublicUrl(path);
          results.push({ key: spec.key, url: pub.publicUrl, status: "cached" });
          continue;
        }
      }
      const res = await fetch("https://api.elevenlabs.io/v1/music", {
        method: "POST",
        headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: spec.prompt, music_length_ms: spec.duration * 1000 }),
      });
      if (!res.ok) {
        results.push({ key: spec.key, url: "", status: `error ${res.status}: ${(await res.text()).slice(0, 200)}` });
        continue;
      }
      const buf = await res.arrayBuffer();
      const { error: upErr } = await supabase.storage.from("adaptive-music").upload(path, buf, { contentType: "audio/mpeg", upsert: true });
      if (upErr) { results.push({ key: spec.key, url: "", status: `upload error: ${upErr.message}` }); continue; }
      const { data: pub } = supabase.storage.from("adaptive-music").getPublicUrl(path);
      results.push({ key: spec.key, url: pub.publicUrl, status: "generated" });
    }
    return new Response(JSON.stringify({ ok: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
