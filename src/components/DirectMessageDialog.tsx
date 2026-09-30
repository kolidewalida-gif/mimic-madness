import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { DirectConversation, type Contact } from '@/components/messaging/Conversation';
import styles from '@/components/messaging/Messenger.module.css';

interface Props { open: boolean; onOpenChange: (open: boolean) => void; friend: Contact | null }
/** Legacy friend buttons now open the same reliable conversation as the inbox. */
export const DirectMessageDialog = ({ open, onOpenChange, friend }: Props) => {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const { user } = useAuth();
  useEffect(() => { setDrafts({}); }, [user?.id]);
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className={styles.dialog}>
      <DialogTitle className="sr-only">Conversation avec {friend?.display_name || 'un ami'}</DialogTitle>
      <DialogDescription className="sr-only">Vos messages privés et votre historique de conversation.</DialogDescription>
      {open && friend && <DirectConversation key={friend.user_id} friend={friend} subtitle="Conversation privée" draft={drafts[friend.user_id] || ''} onDraft={text => setDrafts(previous => ({ ...previous, [friend.user_id]: text }))} />}
    </DialogContent>
  </Dialog>;
};
