import { memo } from 'react';
import { Users } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InkProfileSidebar } from '@/components/InkProfileSidebar';
import { InkFriendsSidebar } from '@/components/InkFriendsSidebar';
import { INK_PANEL_GLASS_STYLE } from '@/components/ink-panel-styles';

interface InkProfileFriendsPanelProps {
  onJoinFriend: (lobbyCode: string) => void;
}

const InkProfileFriendsPanelComponent = ({ onJoinFriend }: InkProfileFriendsPanelProps) => {
  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col"
      style={INK_PANEL_GLASS_STYLE}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#ff2b2b]/20 flex items-center gap-3 flex-shrink-0">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{
            background: 'rgba(255,43,43,0.15)',
            border: '1px solid rgba(255,43,43,0.3)',
            boxShadow: '0 0 10px rgba(255,43,43,0.2)',
          }}
        >
          <Users className="h-4 w-4" style={{ color: '#ff2b2b' }} />
        </div>
        <h2
          className="text-xl font-bold"
          style={{
            fontFamily: "'Caveat', cursive",
            color: '#ff2b2b',
            textShadow: '0 0 10px rgba(255,43,43,0.5)',
          }}
        >
          AMIS EN LIGNE
        </h2>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-3 p-3">
          <InkProfileSidebar />
          <InkFriendsSidebar onJoinFriend={onJoinFriend} />
        </div>
      </ScrollArea>
    </div>
  );
};

export const InkProfileFriendsPanel = memo(InkProfileFriendsPanelComponent);
