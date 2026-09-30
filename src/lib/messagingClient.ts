import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';

export type GroupMessage = { id: string; group_id: string; sender_id: string; content: string; created_at: string };
export interface MessageGroup {
  id: string; name: string; owner_id: string; created_at: string;
  members: { user_id: string; display_name: string | null; avatar_url: string | null }[];
  last_message: Pick<GroupMessage, 'id' | 'sender_id' | 'content' | 'created_at'> | null;
  unread_count: number;
}
// Kept separate from generated schema until remote types are regenerated.
type MessagingDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Tables' | 'Functions'> & {
    Tables: Database['public']['Tables'] & {
      group_messages: { Row: GroupMessage; Insert: Omit<GroupMessage, 'id' | 'created_at'>; Update: never; Relationships: [] };
    };
    Functions: Database['public']['Functions'] & {
      get_message_groups: { Args: Record<string, never>; Returns: Json };
      create_message_group: { Args: { p_name: string; p_member_ids: string[] }; Returns: string };
      update_message_group: { Args: { p_group_id: string; p_name: string; p_add_members?: string[] }; Returns: undefined };
      leave_message_group: { Args: { p_group_id: string }; Returns: undefined };
      mark_message_group_read: { Args: { p_group_id: string; p_read_until: string }; Returns: undefined };
    };
  };
};
export const messagingClient = supabase as unknown as SupabaseClient<MessagingDatabase>;
