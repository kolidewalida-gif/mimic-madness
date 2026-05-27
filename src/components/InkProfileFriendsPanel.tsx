import { memo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InkProfileSidebar } from '@/components/InkProfileSidebar';
import { InkFriendsSidebar } from '@/components/InkFriendsSidebar';
import { InkQuestsPanel } from '@/components/InkQuestsPanel';
import { InkChatColorPicker } from '@/components/InkChatColorPicker';

interface InkProfileFriendsPanelProps {
  onJoinFriend: (lobbyCode: string) => void;
}

const InkProfileFriendsPanelComponent = ({ onJoinFriend }: InkProfileFriendsPanelProps) => {
  return (
    <div className="w-full h-full bg-[#050505]/95 backdrop-blur-md border border-[#ff2b2b]/30 rounded-2xl overflow-hidden">
      <ScrollArea className="h-full w-full">
        <div className="flex flex-col gap-3 p-4">
          <InkProfileSidebar />
          <InkQuestsPanel />
          <InkChatColorPicker />
          <InkFriendsSidebar onJoinFriend={onJoinFriend} />
        </div>
      </ScrollArea>
    </div>
  );
};

export const InkProfileFriendsPanel = memo(InkProfileFriendsPanelComponent);
