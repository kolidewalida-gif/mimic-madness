import { InkProfileSidebar } from '@/components/InkProfileSidebar';
import { NeonHUDFrame } from './NeonHUDFrame';

/**
 * Neon-styled profile sidebar — wraps the Ink profile sidebar's logic
 * inside the HUD frame so it inherits the cyber-hub chrome while keeping
 * all auth, XP, achievements and avatar wiring intact.
 */
export const NeonProfileSidebar = () => {
  return (
    <NeonHUDFrame title="Joueur" badge="ID" innerClassName="p-0" variant="cyan">
      <div className="[&>div]:bg-transparent [&>div]:border-0 [&>div]:rounded-none">
        <InkProfileSidebar />
      </div>
    </NeonHUDFrame>
  );
};