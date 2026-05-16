import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

/** Conversation with a single friend (or null = inbox-wide). */
export function useDirectMessages(friendUserId?: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from("direct_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(200);
    if (friendUserId) {
      query = query.or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${friendUserId}),and(sender_id.eq.${friendUserId},receiver_id.eq.${user.id})`
      );
    }
    const { data, error } = await query;
    if (!error && data) setMessages(data as DirectMessage[]);
    setLoading(false);
  }, [user, friendUserId]);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dm-${user.id}-${friendUserId ?? "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages" },
        (payload: any) => {
          const row = (payload.new ?? payload.old) as DirectMessage;
          if (!row) return;
          // Only consider rows that involve the current user
          if (row.sender_id !== user.id && row.receiver_id !== user.id) return;
          // Filter by friend when scoped
          if (friendUserId) {
            const inThread =
              (row.sender_id === user.id && row.receiver_id === friendUserId) ||
              (row.sender_id === friendUserId && row.receiver_id === user.id);
            if (!inThread) return;
          }
          if (payload.eventType === "INSERT") {
            setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          } else if (payload.eventType === "UPDATE") {
            setMessages((prev) => prev.map((m) => (m.id === row.id ? row : m)));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, friendUserId]);

  const send = useCallback(
    async (content: string) => {
      const text = content.trim();
      if (!user || !friendUserId || !text) return;
      const { data, error } = await supabase
        .from("direct_messages")
        .insert({ sender_id: user.id, receiver_id: friendUserId, content: text })
        .select()
        .single();
      if (!error && data) {
        setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as DirectMessage]));
      }
      return { data, error };
    },
    [user, friendUserId]
  );

  const markRead = useCallback(async () => {
    if (!user || !friendUserId) return;
    await supabase
      .from("direct_messages")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null)
      .eq("receiver_id", user.id)
      .eq("sender_id", friendUserId);
  }, [user, friendUserId]);

  const unreadFromFriend = useMemo(
    () => messages.filter((m) => m.receiver_id === user?.id && !m.read_at).length,
    [messages, user]
  );

  return { messages, loading, send, markRead, unreadFromFriend, refresh: load };
}

/** Per-friend unread counters for the sidebar badges. */
export function useUnreadCounts() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("direct_messages")
      .select("sender_id")
      .eq("receiver_id", user.id)
      .is("read_at", null);
    if (!data) return;
    const next: Record<string, number> = {};
    for (const row of data as { sender_id: string }[]) {
      next[row.sender_id] = (next[row.sender_id] ?? 0) + 1;
    }
    setCounts(next);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dm-unread-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages" },
        () => { load(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  return counts;
}
