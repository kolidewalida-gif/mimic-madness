import { defineMcp } from "@lovable.dev/mcp-js";
import listActiveLobbies from "./tools/list-active-lobbies";
import getLeaderboard from "./tools/get-leaderboard";
import getRecentSocialPosts from "./tools/get-recent-social-posts";
import doAnything from "./tools/do-anything";

export default defineMcp({
  name: "mimic-madness-mcp",
  title: "Mimic Madness MCP",
  version: "0.1.0",
  instructions:
    "Tools to explore the Mimic Madness party game: browse active lobbies, view the global XP leaderboard, and read recent social feed posts.",
  tools: [doAnything, listActiveLobbies, getLeaderboard, getRecentSocialPosts],
});