import { useBanStatus } from '@/hooks/useBanStatus';
import { BannedScreen } from './BannedScreen';
import { AnnouncementModal } from './AnnouncementModal';

export const AdminGateOverlays = () => {
  const { bans, isGlobalBanned, loading } = useBanStatus();
  if (loading) return <AnnouncementModal />;
  const globalBan = bans.find(b => b.ban_type === 'global');
  if (isGlobalBanned && globalBan) return <BannedScreen ban={globalBan} />;
  return <AnnouncementModal />;
};