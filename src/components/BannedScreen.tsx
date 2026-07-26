import { motion } from 'framer-motion';
import { ShieldAlert, Clock, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { BanRow } from '@/hooks/useBanStatus';

const fmtRemaining = (iso: string | null) => {
  if (!iso) return 'Permanent';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Expiré';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}j ${h % 24}h`;
  if (h >= 1) return `${h}h ${m}m`;
  return `${m}m`;
};

export const BannedScreen = ({ ban }: { ban: BanRow }) => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full bg-card border-2 border-destructive rounded-2xl p-8 shadow-2xl text-center"
      >
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-destructive/20 flex items-center justify-center">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-destructive mb-2">Compte suspendu</h1>
        <p className="text-muted-foreground mb-6">
          Votre accès à l'application a été temporairement suspendu par un administrateur.
        </p>

        {ban.reason && (
          <div className="text-left bg-muted/40 rounded-lg p-4 mb-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Motif</div>
            <div className="text-sm text-foreground">{ban.reason}</div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
          <Clock className="w-4 h-4" />
          <span>Durée restante : <b className="text-foreground">{fmtRemaining(ban.expires_at)}</b></span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="menu-focus w-full py-3 rounded-lg bg-destructive text-destructive-foreground font-semibold hover:bg-destructive/90 transition flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" /> Se déconnecter
        </button>
      </motion.div>
    </div>
  );
};