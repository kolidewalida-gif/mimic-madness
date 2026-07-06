import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_active_lobbies",
  title: "List active lobbies",
  description: "List currently active public game lobbies (waiting or playing).",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(20).describe("Max lobbies to return"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await supabase
      .from("lobbies")
      .select("id, code, game_mode, game_phase, created_at, host_id")
      .in("game_phase", ["lobby", "playing", "waiting"])
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { lobbies: data ?? [] },
    };
  },
});