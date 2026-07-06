import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

const ACTIONS = [
  "list_lobbies",
  "get_lobby",
  "get_leaderboard",
  "get_profile",
  "search_profiles",
  "get_player_stats",
  "list_recent_posts",
  "get_post",
  "list_post_comments",
  "list_quiz_top_scores",
  "list_video_clips",
  "count_table",
] as const;

export default defineTool({
  name: "do_anything",
  title: "Do anything (Mimic Madness)",
  description:
    "Swiss-army read tool for Mimic Madness. Pick an `action` and pass the matching `params` object. Available actions: " +
    ACTIONS.join(", ") +
    ". All actions are read-only.",
  inputSchema: {
    action: z.enum(ACTIONS).describe("Which operation to run"),
    params: z
      .record(z.string(), z.unknown())
      .default({})
      .describe(
        "Parameters for the action. Common: limit (number), user_id (uuid), lobby_id (uuid), post_id (uuid), query (string), table (string)",
      ),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ action, params }) => {
    const p = (params ?? {}) as Record<string, any>;
    const limit = Math.min(Math.max(Number(p.limit ?? 20), 1), 100);
    const supabase = sb();
    const ok = (data: unknown) => ({
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      structuredContent: { data },
    });
    const err = (msg: string) => ({
      content: [{ type: "text" as const, text: msg }],
      isError: true,
    });

    try {
      switch (action) {
        case "list_lobbies": {
          const { data, error } = await supabase
            .from("lobbies")
            .select("id, code, game_mode, game_phase, created_at, host_id")
            .order("created_at", { ascending: false })
            .limit(limit);
          return error ? err(error.message) : ok(data);
        }
        case "get_lobby": {
          if (!p.lobby_id && !p.code) return err("params.lobby_id or params.code required");
          const q = supabase.from("lobbies").select("*").limit(1);
          const { data, error } = p.lobby_id
            ? await q.eq("id", p.lobby_id)
            : await q.eq("code", p.code);
          return error ? err(error.message) : ok(data?.[0] ?? null);
        }
        case "get_leaderboard": {
          const { data, error } = await supabase
            .from("player_stats")
            .select("user_id, total_xp, level, games_played, games_won")
            .order("total_xp", { ascending: false })
            .limit(limit);
          return error ? err(error.message) : ok(data);
        }
        case "get_profile": {
          if (!p.user_id) return err("params.user_id required");
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", p.user_id)
            .maybeSingle();
          return error ? err(error.message) : ok(data);
        }
        case "search_profiles": {
          if (!p.query) return err("params.query required");
          const { data, error } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url")
            .ilike("display_name", `%${String(p.query)}%`)
            .limit(limit);
          return error ? err(error.message) : ok(data);
        }
        case "get_player_stats": {
          if (!p.user_id) return err("params.user_id required");
          const { data, error } = await supabase
            .from("player_stats")
            .select("*")
            .eq("user_id", p.user_id)
            .maybeSingle();
          return error ? err(error.message) : ok(data);
        }
        case "list_recent_posts": {
          const { data, error } = await supabase
            .from("social_posts")
            .select("id, owner_id, owner_name, caption, likes_count, comments_count, created_at")
            .eq("is_hidden", false)
            .order("created_at", { ascending: false })
            .limit(limit);
          return error ? err(error.message) : ok(data);
        }
        case "get_post": {
          if (!p.post_id) return err("params.post_id required");
          const { data, error } = await supabase
            .from("social_posts")
            .select("*")
            .eq("id", p.post_id)
            .maybeSingle();
          return error ? err(error.message) : ok(data);
        }
        case "list_post_comments": {
          if (!p.post_id) return err("params.post_id required");
          const { data, error } = await supabase
            .from("social_post_comments")
            .select("*")
            .eq("post_id", p.post_id)
            .order("created_at", { ascending: true })
            .limit(limit);
          return error ? err(error.message) : ok(data);
        }
        case "list_quiz_top_scores": {
          const { data, error } = await supabase
            .from("quiz_scores")
            .select("*")
            .order("score", { ascending: false })
            .limit(limit);
          return error ? err(error.message) : ok(data);
        }
        case "list_video_clips": {
          let q = supabase
            .from("video_clips")
            .select("id, player_id, created_at, game_mode")
            .order("created_at", { ascending: false })
            .limit(limit);
          if (p.player_id) q = q.eq("player_id", p.player_id);
          const { data, error } = await q;
          return error ? err(error.message) : ok(data);
        }
        case "count_table": {
          const allowed = new Set([
            "lobbies",
            "profiles",
            "player_stats",
            "social_posts",
            "video_clips",
            "quiz_scores",
          ]);
          const table = String(p.table ?? "");
          if (!allowed.has(table)) return err(`params.table must be one of ${[...allowed].join(", ")}`);
          const { count, error } = await supabase
            .from(table)
            .select("*", { count: "exact", head: true });
          return error ? err(error.message) : ok({ table, count });
        }
      }
    } catch (e: any) {
      return err(e?.message ?? "unknown error");
    }
    return err(`Unknown action: ${action}`);
  },
});