import { InkFriendsSidebar } from '@/components/InkFriendsSidebar';
import { NeonHUDFrame } from './NeonHUDFrame';

interface NeonFriendsSidebarProps {
  onJoinFriend?: (lobbyCode: string) => void;
  currentLobbyCode?: string;
}

/**
 * Neon-styled friends sidebar — wraps the Ink friends sidebar inside the
 * HUD frame so it inherits the cyber-hub chrome. Logic (friends, invites,
 * presence, DM) untouched.
 */
export const NeonFriendsSidebar = ({ onJoinFriend, currentLobbyCode }: NeonFriendsSidebarProps) => {
  return (
    <NeonHUDFrame title="Réseau" badge="NET" innerClassName="p-0" variant="magenta">
      <div className="[&>div]:bg-transparent [&>div]:border-0 [&>div]:rounded-none">
        <InkFriendsSidebar onJoinFriend={onJoinFriend} currentLobbyCode={currentLobbyCode} />
      </div>
    </NeonHUDFrame>
  );
};