/**
 * Actions de modération à la portée de tout joueur : sourdine et signalement.
 *
 * Le menu d'un siège n'offrait que les pouvoirs de l'hôte — transférer la main,
 * exclure. Un joueur ordinaire qui subissait un comportement abusif n'avait donc
 * aucun recours dans l'appli : il ne pouvait ni se protéger ni prévenir qui que
 * ce soit. Ces deux actions comblent ce vide, et elles sont volontairement
 * disponibles pour tout le monde, hôte ou pas.
 *
 * La sourdine est locale et instantanée : elle coupe les messages du joueur visé
 * sans rien demander à personne. Le signalement, lui, part au serveur avec la
 * preuve qu'on est assis dans le salon, et alimente la file de tri des
 * administrateurs.
 */
import { useState } from 'react';
import { Flag, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';

import {
  REPORT_REASONS,
  type ReportReason,
  isPlayerMuted,
  reportLobbyPlayer,
  togglePlayerMute,
} from '@/lib/playerModeration';

interface PlayerModerationActionsProps {
  lobbyId: string | null;
  playerId: string;
  playerName: string;
  /** Appelé quand une action aboutit, pour refermer le menu du siège. */
  onDone?: () => void;
  /** Rend des icônes plus petites, pour la variante compacte du salon. */
  compact?: boolean;
}

export const PlayerModerationActions = ({
  lobbyId,
  playerId,
  playerName,
  onDone,
  compact = false,
}: PlayerModerationActionsProps) => {
  const [muted, setMuted] = useState(() => isPlayerMuted(playerId));
  const [showReport, setShowReport] = useState(false);
  const [reason, setReason] = useState<ReportReason>('harcelement');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  const iconClass = compact ? 'h-3.5 w-3.5' : undefined;

  const handleMute = () => {
    const nowMuted = togglePlayerMute(playerId);
    setMuted(nowMuted);
    toast.success(
      nowMuted
        ? `${playerName} est en sourdine. Tu ne verras plus ses messages.`
        : `${playerName} n'est plus en sourdine.`,
    );
    onDone?.();
  };

  const handleReport = async () => {
    if (!lobbyId) return;
    setSending(true);
    try {
      await reportLobbyPlayer({ lobbyId, targetPlayerId: playerId, reason, details });
      toast.success('Signalement envoyé. Merci, on regarde ça.');
      setShowReport(false);
      setDetails('');
      onDone?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Le signalement a échoué.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button type="button" className="menu-focus" onClick={handleMute}>
        {muted ? (
          <>
            <Volume2 className={iconClass} aria-hidden="true" /> Réactiver le son
          </>
        ) : (
          <>
            <VolumeX className={iconClass} aria-hidden="true" /> Mettre en sourdine
          </>
        )}
      </button>

      <button
        type="button"
        className="menu-focus"
        onClick={() => setShowReport(true)}
        disabled={!lobbyId}
      >
        <Flag className={iconClass} aria-hidden="true" /> Signaler
      </button>

      {showReport && (
        <div
          className="custom-scrollbar fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-black/70 p-4"
          onClick={(event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) setShowReport(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Signaler ${playerName}`}
            className="if-panel if-fade menu-dialog custom-scrollbar max-h-full w-full max-w-sm space-y-3 overflow-y-auto p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="if-h2">Signaler {playerName}</h2>
            <p className="if-muted text-sm">
              Dis-nous ce qui s'est passé. Le signalement part à l'équipe, il n'est pas visible
              par les autres joueurs.
            </p>

            <fieldset className="space-y-1.5">
              <legend className="sr-only">Motif du signalement</legend>
              {REPORT_REASONS.map((option) => (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="radio"
                    name="mimic-report-reason"
                    value={option.id}
                    checked={reason === option.id}
                    onChange={() => setReason(option.id)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </fieldset>

            <label className="block space-y-1 text-sm">
              <span className="if-muted">Détails (facultatif)</span>
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value.slice(0, 500))}
                maxLength={500}
                rows={3}
                className="w-full rounded-[var(--ink-radius-sm)] border border-white/15 bg-black/25 p-2 text-sm"
                placeholder="Ce qui a été dit ou fait…"
              />
            </label>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowReport(false)}
                disabled={sending}
                className="if-btn if-btn--ghost menu-focus flex-1"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleReport}
                disabled={sending}
                aria-busy={sending}
                className="if-btn if-btn--primary menu-focus flex-1"
              >
                {sending ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>

            {!muted && (
              <p className="if-muted text-xs">
                Tu peux aussi le mettre en sourdine tout de suite, sans attendre notre réponse.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};
