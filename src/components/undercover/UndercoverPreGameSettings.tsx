import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Crown,
  Eye,
  Loader2,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
  UserRound,
  UserX,
  Users,
} from 'lucide-react';
import { computeMaxUndercover } from '@/lib/undercoverLogic';
import { cn } from '@/lib/utils';

interface PlayerPreview {
  id: string;
  name: string;
  isHost: boolean;
}

interface UndercoverPreGameSettingsProps {
  players: PlayerPreview[];
  isHost: boolean;
  initialNumUndercover: number;
  initialTotalRounds: number;
  initialEnableMrWhite: boolean;
  onConfirm: (settings: {
    numUndercover: number;
    totalRounds: number;
    enableMrWhite: boolean;
  }) => Promise<boolean | void> | boolean | void;
  isLaunching?: boolean;
}

const ROUND_PRESETS = [
  { value: 1, label: '1', detail: 'Express' },
  { value: 3, label: '3', detail: 'Classique' },
  { value: 5, label: '5', detail: 'Longue' },
  { value: 99, label: '∞', detail: 'Sans limite' },
] as const;

const Panel = ({
  children,
  className,
  accent = 'rgba(255,255,255,.12)',
}: {
  children: ReactNode;
  className?: string;
  accent?: string;
}) => (
  <section
    className={cn('relative min-w-0 overflow-hidden rounded-[1.75rem] border bg-[#12091f]/90', className)}
    style={{ borderColor: accent, boxShadow: '0 22px 60px rgba(0,0,0,.25)' }}
  >
    <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
    {children}
  </section>
);

const StepButton = ({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <motion.button
    type="button"
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
    whileHover={!disabled ? { scale: 1.04 } : undefined}
    whileTap={!disabled ? { scale: 0.94 } : undefined}
    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
  >
    {children}
  </motion.button>
);

export const UndercoverPreGameSettings = memo(function UndercoverPreGameSettings({
  players,
  isHost,
  initialNumUndercover,
  initialTotalRounds,
  initialEnableMrWhite,
  onConfirm,
  isLaunching = false,
}: UndercoverPreGameSettingsProps) {
  const totalPlayers = players.length;
  const [numUndercover, setNumUndercover] = useState(initialNumUndercover);
  const [totalRounds, setTotalRounds] = useState(initialTotalRounds);
  const [enableMrWhite, setEnableMrWhite] = useState(initialEnableMrWhite);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canEnableMrWhite = totalPlayers >= 4;
  const maxUndercover = useMemo(
    () => computeMaxUndercover(totalPlayers, canEnableMrWhite && enableMrWhite),
    [canEnableMrWhite, enableMrWhite, totalPlayers],
  );

  useEffect(() => {
    setNumUndercover((value) => Math.min(value, maxUndercover));
  }, [maxUndercover]);

  const composition = useMemo(() => {
    const undercover = Math.min(numUndercover, maxUndercover);
    const mrWhite = canEnableMrWhite && enableMrWhite ? 1 : 0;
    return {
      civilian: Math.max(0, totalPlayers - undercover - mrWhite),
      undercover,
      mrWhite,
    };
  }, [canEnableMrWhite, enableMrWhite, maxUndercover, numUndercover, totalPlayers]);

  const handleLaunch = async () => {
    if (!isHost || submitting || isLaunching) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const launched = await onConfirm({
        numUndercover: composition.undercover,
        totalRounds,
        enableMrWhite: canEnableMrWhite && enableMrWhite,
      });
      if (launched === false) {
        setSubmitError("Le lancement n'a pas abouti. Vérifie la connexion puis réessaie.");
      }
    } catch (cause) {
      console.error('[Undercover] Lancement impossible', cause);
      setSubmitError("Le lancement n'a pas abouti. Vérifie la connexion puis réessaie.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="menu-screen-safe relative h-[100dvh] min-h-0 overflow-y-auto overflow-x-hidden bg-[#09050f] text-white overscroll-contain">
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center opacity-35"
        style={{ backgroundImage: "url('/undercovermenu/background.png')" }}
      />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,75,135,.22),transparent_34%),radial-gradient(circle_at_82%_75%,rgba(114,72,255,.18),transparent_34%),linear-gradient(135deg,rgba(8,4,14,.74),rgba(13,6,24,.94))]" />

      <main className="relative z-10 mx-auto grid w-full max-w-[100rem] min-w-0 gap-4 px-3 py-4 pb-24 sm:gap-5 sm:px-5 sm:py-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(22rem,.75fr)] lg:items-start xl:gap-7 xl:px-8">
        <header className="flex min-w-0 flex-wrap items-center gap-3 lg:col-span-2">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-pink-300/25 bg-pink-500/15 sm:h-14 sm:w-14">
            <ShieldCheck className="h-7 w-7 text-pink-300" strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[.32em] text-pink-200/65 sm:text-xs">
              Salle d’opération
            </p>
            <h1 className="truncate text-3xl font-black leading-none sm:text-4xl xl:text-5xl">
              Prépare l’infiltration
            </h1>
          </div>
          <div className="ml-auto flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-black/35 px-3 text-sm font-black text-white/80 sm:px-4 sm:text-base">
            <Users className="h-5 w-5 text-cyan-300" />
            {totalPlayers} agents
          </div>
        </header>

        <div className="min-w-0 space-y-4 sm:space-y-5">
          <Panel className="p-5 sm:p-7 xl:p-9" accent="rgba(244,114,182,.28)">
            <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-pink-500/15 blur-3xl" />
            <div className="relative grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
              <div className="min-w-0">
                <div className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-full border border-pink-300/20 bg-pink-400/10 px-3 text-xs font-black uppercase tracking-[.18em] text-pink-200">
                  <Sparkles className="h-4 w-4" /> Partie sociale
                </div>
                <h2 className="max-w-3xl text-3xl font-black leading-[.98] sm:text-5xl xl:text-6xl">
                  Un mot presque identique. Un mensonge de trop.
                </h2>
                <p className="mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-white/58 sm:text-base">
                  Observe les indices, protège ton identité et démasque les joueurs qui ne possèdent pas le même mot que le groupe.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3 xl:w-[25rem]">
                {[
                  { label: 'Civils', count: composition.civilian, color: '#34d399', icon: '◉' },
                  { label: 'Infiltrés', count: composition.undercover, color: '#fb7185', icon: '◆' },
                  { label: 'Mr White', count: composition.mrWhite, color: '#f8fafc', icon: '○' },
                ].map((role) => (
                  <motion.div
                    layout
                    key={role.label}
                    className="min-w-0 rounded-2xl border bg-black/30 px-2 py-3 text-center sm:px-3 sm:py-4"
                    style={{ borderColor: `${role.color}45` }}
                  >
                    <span className="text-lg" style={{ color: role.color }}>{role.icon}</span>
                    <strong className="mt-1 block text-2xl font-black sm:text-3xl">{role.count}</strong>
                    <span className="block truncate text-[10px] font-black uppercase tracking-wider text-white/45 sm:text-xs">
                      {role.label}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel className="p-4 sm:p-6" accent="rgba(103,232,249,.2)">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.25em] text-cyan-200/65">Roster</p>
                <h2 className="text-xl font-black sm:text-2xl">Agents connectés</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/45">
                Rôles redistribués à chaque manche
              </span>
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {players.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.035 }}
                  className="flex min-h-14 min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[.045] px-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-sm font-black text-cyan-100">
                    {player.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-extrabold">{player.name}</span>
                  {player.isHost && <Crown className="h-4 w-4 shrink-0 text-amber-300" aria-label="Hôte" />}
                </motion.div>
              ))}
            </div>
          </Panel>
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-5">
          <Panel className="p-4 sm:p-5" accent="rgba(251,113,133,.28)">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-400/15 text-rose-300">
                <UserX className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-black">Infiltrés</h2>
                <p className="text-xs font-semibold text-white/45">Au moins deux civils restent dans le groupe.</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 p-2">
              <StepButton
                label="Retirer un infiltré"
                disabled={!isHost || numUndercover <= 1}
                onClick={() => setNumUndercover((value) => Math.max(1, value - 1))}
              >
                <Minus className="h-5 w-5" strokeWidth={3} />
              </StepButton>
              <motion.strong
                key={numUndercover}
                initial={{ scale: .75 }}
                animate={{ scale: 1 }}
                className="text-4xl font-black tabular-nums"
              >
                {numUndercover}
              </motion.strong>
              <StepButton
                label="Ajouter un infiltré"
                disabled={!isHost || numUndercover >= maxUndercover}
                onClick={() => setNumUndercover((value) => Math.min(maxUndercover, value + 1))}
              >
                <Plus className="h-5 w-5" strokeWidth={3} />
              </StepButton>
            </div>
          </Panel>

          <Panel className="p-4 sm:p-5" accent="rgba(251,191,36,.25)">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-300/15 text-amber-300">
                <Crown className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-black">Nombre de manches</h2>
                <p className="text-xs font-semibold text-white/45">Chaque manche redistribue mots et rôles.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ROUND_PRESETS.map((preset) => {
                const active = totalRounds === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    aria-pressed={active}
                    disabled={!isHost}
                    onClick={() => setTotalRounds(preset.value)}
                    className={cn(
                      'min-h-14 rounded-2xl border px-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55',
                      active
                        ? 'border-amber-300/55 bg-amber-300/15 text-amber-100'
                        : 'border-white/10 bg-white/[.04] text-white/65 hover:bg-white/[.08]',
                    )}
                  >
                    <span className="mr-2 text-xl font-black">{preset.label}</span>
                    <span className="text-[10px] font-black uppercase tracking-wide opacity-60">{preset.detail}</span>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel className="p-4 sm:p-5" accent="rgba(226,232,240,.2)">
            <button
              type="button"
              role="switch"
              aria-checked={canEnableMrWhite && enableMrWhite}
              disabled={!isHost || !canEnableMrWhite}
              onClick={() => setEnableMrWhite((value) => !value)}
              className="flex min-h-16 w-full items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-45"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
                <Eye className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-xl font-black">Mr White</strong>
                <span className="block text-xs font-semibold text-white/45">
                  {canEnableMrWhite ? 'Aucun mot : il doit improviser.' : 'Disponible dès 4 joueurs.'}
                </span>
              </span>
              <span
                className={cn(
                  'relative h-8 w-14 shrink-0 rounded-full border transition-colors',
                  enableMrWhite && canEnableMrWhite
                    ? 'border-white/35 bg-white/35'
                    : 'border-white/15 bg-black/30',
                )}
              >
                <motion.span
                  animate={{ x: enableMrWhite && canEnableMrWhite ? 25 : 3 }}
                  className="absolute top-[3px] h-6 w-6 rounded-full bg-white shadow"
                />
              </span>
            </button>
          </Panel>

          {submitError && (
            <p role="alert" className="rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
              {submitError}
            </p>
          )}

          {isHost ? (
            <motion.button
              type="button"
              disabled={submitting || isLaunching || totalPlayers < 3}
              onClick={handleLaunch}
              whileHover={!submitting && !isLaunching ? { scale: 1.015 } : undefined}
              whileTap={!submitting && !isLaunching ? { scale: .98 } : undefined}
              className="flex min-h-16 w-full items-center justify-center gap-3 rounded-[1.4rem] border border-pink-200/35 bg-gradient-to-r from-pink-500 to-violet-600 px-5 text-xl font-black shadow-[0_18px_45px_rgba(219,39,119,.22)] disabled:cursor-not-allowed disabled:opacity-55 sm:text-2xl"
            >
              {submitting || isLaunching
                ? <Loader2 className="h-6 w-6 animate-spin" />
                : <UserRound className="h-6 w-6" />}
              {submitting || isLaunching ? 'Déploiement…' : 'Distribuer les rôles'}
            </motion.button>
          ) : (
            <div className="flex min-h-16 items-center justify-center gap-3 rounded-[1.4rem] border border-white/10 bg-black/35 px-5 text-center font-black text-white/70">
              <Loader2 className="h-5 w-5 animate-spin text-pink-300" />
              L’hôte prépare la mission…
            </div>
          )}
        </aside>
      </main>
    </div>
  );
});
