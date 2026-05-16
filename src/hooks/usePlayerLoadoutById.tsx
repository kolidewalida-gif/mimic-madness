import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LEVEL_REWARDS, type LevelReward } from "@/hooks/usePlayerLevel";

type FrameTier = "none" | "bronze" | "silver" | "gold";
type EffectTier = "none" | "sparkle" | "glow";

const FRAME_PRIORITY: Record<FrameTier, number> = { none: 0, bronze: 1, silver: 2, gold: 3 };
const EFFECT_PRIORITY: Record<EffectTier, number> = { none: 0, sparkle: 1, glow: 2 };

const getFrameTier = (id: string): FrameTier =>
  id === "frame_gold" ? "gold" : id === "frame_silver" ? "silver" : id === "frame_bronze" ? "bronze" : "none";
const getEffectTier = (id: string): EffectTier =>
  id === "effect_glow" ? "glow" : id === "effect_sparkle" ? "sparkle" : "none";

// Tiny module-level cache so repeated mounts (lists of avatars) don't refetch.
const cache = new Map<string, { rewards: string[]; equippedId: string | null; ts: number }>();
const CACHE_TTL = 30_000;

export const usePlayerLoadoutById = (playerId?: string) => {
  const [rewards, setRewards] = useState<string[]>([]);
  const [equippedId, setEquippedId] = useState<string | null>(null);

  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;

    const hit = cache.get(playerId);
    if (hit && Date.now() - hit.ts < CACHE_TTL) {
      setRewards(hit.rewards);
      setEquippedId(hit.equippedId);
    }

    const load = async () => {
      const { data } = await supabase
        .from("player_rewards")
        .select("reward_id, is_equipped")
        .eq("user_id", playerId);
      if (cancelled || !data) return;
      const ids = data.map((r) => r.reward_id);
      const equipped = data.find((r) => r.is_equipped)?.reward_id ?? null;
      cache.set(playerId, { rewards: ids, equippedId: equipped, ts: Date.now() });
      setRewards(ids);
      setEquippedId(equipped);
    };

    load();

    const channel = supabase
      .channel(`player-loadout:${playerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "player_rewards", filter: `user_id=eq.${playerId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [playerId]);

  return useMemo(() => {
    let frameTier: FrameTier = "none";
    let effectTier: EffectTier = "none";
    let featuredBadge: LevelReward | null = null;
    let prestige = 0;

    for (const id of rewards) {
      const r = LEVEL_REWARDS.find((x) => x.id === id);
      if (!r) continue;
      prestige += r.rarity === "legendary" ? 8 : r.rarity === "epic" ? 5 : r.rarity === "rare" ? 3 : 1;
      const nf = getFrameTier(r.id);
      if (FRAME_PRIORITY[nf] > FRAME_PRIORITY[frameTier]) frameTier = nf;
      const ne = getEffectTier(r.id);
      if (EFFECT_PRIORITY[ne] > EFFECT_PRIORITY[effectTier]) effectTier = ne;
      if (r.type === "badge") {
        const score = (b: LevelReward) =>
          b.rarity === "legendary" ? 4 : b.rarity === "epic" ? 3 : b.rarity === "rare" ? 2 : 1;
        if (!featuredBadge || score(r) >= score(featuredBadge)) featuredBadge = r;
      }
    }

    const equippedTitle =
      equippedId ? LEVEL_REWARDS.find((r) => r.id === equippedId && r.type === "title") ?? null : null;

    return { equippedTitle, frameTier, effectTier, featuredBadge, prestige };
  }, [rewards, equippedId]);
};

export type { FrameTier, EffectTier };
