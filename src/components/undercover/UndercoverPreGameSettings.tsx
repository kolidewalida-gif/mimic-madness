import { memo, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Crown,
  Eye,
  Loader2,
  Minus,
  Plus,
  Sparkles,
  UserX,
  Users,
  Trophy,
  Settings as SettingsIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const GRAFFITI_TEXT_SHADOW =
  '2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810, 1.5px 1.5px 0 #0a0810';
const GRAFFITI_TEXT_SHADOW_SM =
  '1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810, 1px 1px 0 #0a0810';

interface UndercoverPreGameSettingsProps {
  totalPlayers: number;
  isHost: boolean;
  initialNumUndercover: number;
  initialTotalRounds: number;
  initialEnableMrWhite: boolean;
  onConfirm: (settings: {
    numUndercover: number;
    totalRounds: number;
    enableMrWhite: boolean;
  }) => Promise<void> | void;
  isLaunching?: boolean;
}

const ROUND_PRESETS: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Bo1' },
  { value: 3, label: 'Bo3' },
  { value: 5, label: 'Bo5' },
  { value: 99, label: '∞' },
];

const CartoonCard = ({
  className,
  accent,
  children,
  innerAccent = true,
}: {
  className?: string;
  accent?: string;
  children: React.ReactNode;
  innerAccent?: boolean;
}) => (
  <div
    className={cn('relative rounded-3xl overflow-hidden', className)}
    style={{
      background:
        'linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)',
      border: '4px solid #0a0810',
      boxShadow:
        '0 8px 0 #0a0810, 0 14px 30px rgba(0,0,0,0.45), inset 0 2px 0 rgba(255,255,255,0.06)',
    }}
  >
    {innerAccent && accent && (
      <div
        className="absolute inset-1.5 rounded-[1.3rem] pointer-events-none"
        style={{ border: `2px solid ${accent}66` }}
      />
    )}
    {children}
  </div>
);

const StepperButton = ({
  onClick,
  disabled,
  children,
  color,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  color: string;
}) => (
  <motion.button
    type="button"
    onClick={onClick}
    disabled={disabled}
    whileHover={!disabled ? { scale: 1.08, rotate: -3 } : undefined}
    whileTap={!disabled ? { scale: 0.92 } : undefined}
    className={cn(
      'w-12 h-12 rounded-2xl flex items-center justify-center transition-opacity',
      disabled && 'opacity-40 cursor-not-allowed',
    )}
    style={{
      background: `linear-gradient(180deg, ${color}, ${color}cc)`,
      border: '3px solid #0a0810',
      boxShadow: '0 4px 0 #0a0810, inset 0 1px 0 rgba(255,255,255,0.25)',
      color: 'white',
    }}
  >
    {children}
  </motion.button>
);

const Pill = ({
  active,
  onClick,
  children,
  color,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color: string;
}) => (
  <motion.button
    type="button"
    onClick={onClick}
    whileHover={{ scale: 1.05, rotate: -1.5 }}
    whileTap={{ scale: 0.95 }}
    className="relative px-4 py-2 rounded-2xl"
    style={{
      background: active
        ? `linear-gradient(180deg, ${color}, ${color}cc)`
        : 'rgba(255,255,255,0.05)',
      border: active ? '3px solid #0a0810' : '3px solid rgba(255,255,255,0.15)',
      boxShadow: active
        ? '0 4px 0 #0a0810, inset 0 1px 0 rgba(255,255,255,0.25)'
        : 'none',
    }}
  >
    <span
      className="text-xl font-black leading-none text-white"
      style={{
        fontFamily: "'Caveat', cursive",
        textShadow: active ? GRAFFITI_TEXT_SHADOW_SM : undefined,
      }}
    >
      {children}
    </span>
  </motion.button>
);

const ToggleSwitch = ({
  active,
  onClick,
  color,
}: {
  active: boolean;
  onClick: () => void;
  color: string;
}) => (
  <motion.button
    type="button"
    onClick={onClick}
    whileTap={{ scale: 0.95 }}
    className="relative w-16 h-9 rounded-full"
    style={{
      background: active
        ? `linear-gradient(180deg, ${color}, ${color}cc)`
        : 'rgba(255,255,255,0.08)',
      border: '3px solid #0a0810',
      boxShadow: '0 3px 0 #0a0810, inset 0 1px 0 rgba(255,255,255,0.18)',
    }}
  >
    <motion.div
      animate={{ x: active ? 26 : 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className="absolute top-[1px] left-[1px] w-6 h-6 rounded-full"
      style={{
        background: 'linear-gradient(180deg, #fff, #e5e7eb)',
        border: '2px solid #0a0810',
        boxShadow: '0 2px 0 #0a0810',
      }}
    />
  </motion.button>
);

export const UndercoverPreGameSettings = memo(function UndercoverPreGameSettings({
  totalPlayers,
  isHost,
  initialNumUndercover,
  initialTotalRounds,
  initialEnableMrWhite,
  onConfirm,
  isLaunching = false,
}: UndercoverPreGameSettingsProps) {
  const accent = '#a855f7';
  const [numUndercover, setNumUndercover] = useState(initialNumUndercover);
  const [totalRounds, setTotalRounds] = useState(initialTotalRounds);
  const [enableMrWhite, setEnableMrWhite] = useState(initialEnableMrWhite);
  const [submitting, setSubmitting] = useState(false);

  const maxUndercover = useMemo(() => {
    // Keep at least 2 civilians (incl. Mr White not counted as civilian)
    const reserved = enableMrWhite ? 1 : 0;
    return Math.max(1, Math.min(3, totalPlayers - reserved - 2));
  }, [totalPlayers, enableMrWhite]);

  const canEnableMrWhite = totalPlayers >= 4;

  const handleLaunch = async () => {
    if (!isHost || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm({
        numUndercover: Math.min(numUndercover, maxUndercover),
        totalRounds,
        enableMrWhite: canEnableMrWhite ? enableMrWhite : false,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0510] text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0820] via-[#0a0510] to-[#160a26]" />
        <motion.div
          animate={{ opacity: [0.3, 0.55, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full"
          style={{
            background: `radial-gradient(ellipse, ${accent}55 0%, transparent 70%)`,
            filter: 'blur(100px)',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-5 py-6 space-y-5">
        {/* HEADER */}
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [-6, 6, -6] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
              border: '4px solid #0a0810',
              boxShadow: '0 5px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.25)',
            }}
          >
            <SettingsIcon className="w-7 h-7 text-white" strokeWidth={2.5} />
          </motion.div>
          <div>
            <p
              className="text-[11px] uppercase tracking-[0.3em] text-white/55 font-black"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              Avant de jouer
            </p>
            <h1
              className="text-4xl font-black leading-none text-white"
              style={{
                fontFamily: "'Caveat', cursive",
                textShadow: GRAFFITI_TEXT_SHADOW,
              }}
            >
              Paramètres
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div
              className="px-3 py-1.5 rounded-2xl flex items-center gap-2"
              style={{
                background:
                  'linear-gradient(180deg, rgba(6,182,212,0.18), rgba(8,145,178,0.05))',
                border: '2.5px solid #0a0810',
                boxShadow: '0 3px 0 #0a0810',
              }}
            >
              <Users className="w-4 h-4 text-cyan-300" strokeWidth={2.5} />
              <span
                className="text-base font-black leading-none text-cyan-300"
                style={{
                  fontFamily: "'Caveat', cursive",
                  textShadow: GRAFFITI_TEXT_SHADOW_SM,
                }}
              >
                {totalPlayers}
              </span>
            </div>
          </div>
        </div>

        {/* NUM UNDERCOVER */}
        <CartoonCard accent="#ef4444" className="px-5 py-4">
          <Sparkles
            className="absolute top-3 right-3 w-4 h-4 z-10"
            style={{ color: '#ef4444', filter: 'drop-shadow(1px 1px 0 #0a0810)' }}
          />
          <div className="relative space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                  border: '2.5px solid #0a0810',
                  boxShadow: '0 3px 0 #0a0810',
                }}
              >
                <UserX className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p
                  className="text-2xl font-black leading-none text-white"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    textShadow: GRAFFITI_TEXT_SHADOW_SM,
                  }}
                >
                  Undercovers
                </p>
                <p
                  className="text-xs text-white/55 font-bold leading-none"
                  style={{ fontFamily: "'Caveat', cursive" }}
                >
                  Combien d'imposteurs dans la partie ?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 py-2">
              <StepperButton
                color="#ef4444"
                onClick={() => setNumUndercover((n) => Math.max(1, n - 1))}
                disabled={!isHost || numUndercover <= 1}
              >
                <Minus className="w-5 h-5" strokeWidth={3} />
              </StepperButton>
              <motion.div
                key={numUndercover}
                initial={{ scale: 0.6, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 360, damping: 14 }}
                className="w-20 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'rgba(0,0,0,0.45)',
                  border: '3px solid #0a0810',
                  boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)',
                }}
              >
                <span
                  className="text-5xl font-black leading-none text-white"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    textShadow: GRAFFITI_TEXT_SHADOW,
                  }}
                >
                  {numUndercover}
                </span>
              </motion.div>
              <StepperButton
                color="#ef4444"
                onClick={() => setNumUndercover((n) => Math.min(maxUndercover, n + 1))}
                disabled={!isHost || numUndercover >= maxUndercover}
              >
                <Plus className="w-5 h-5" strokeWidth={3} />
              </StepperButton>
            </div>
            <p
              className="text-center text-xs text-white/40 italic font-bold"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              max {maxUndercover} pour {totalPlayers} joueurs
            </p>
          </div>
        </CartoonCard>

        {/* ROUNDS */}
        <CartoonCard accent="#fbbf24" className="px-5 py-4">
          <Sparkles
            className="absolute top-3 right-3 w-4 h-4 z-10"
            style={{ color: '#fbbf24', filter: 'drop-shadow(1px 1px 0 #0a0810)' }}
          />
          <div className="relative space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #fbbf24, #d97706)',
                  border: '2.5px solid #0a0810',
                  boxShadow: '0 3px 0 #0a0810',
                }}
              >
                <Trophy className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p
                  className="text-2xl font-black leading-none text-white"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    textShadow: GRAFFITI_TEXT_SHADOW_SM,
                  }}
                >
                  Manches
                </p>
                <p
                  className="text-xs text-white/55 font-bold leading-none"
                  style={{ fontFamily: "'Caveat', cursive" }}
                >
                  Best of (jusqu'à éliminer tous les undercovers)
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 py-1">
              {ROUND_PRESETS.map((p) => (
                <Pill
                  key={p.value}
                  active={totalRounds === p.value}
                  onClick={() => isHost && setTotalRounds(p.value)}
                  color="#fbbf24"
                >
                  {p.label}
                </Pill>
              ))}
            </div>
          </div>
        </CartoonCard>

        {/* MR WHITE TOGGLE */}
        <CartoonCard accent="#06b6d4" className="px-5 py-4">
          <Sparkles
            className="absolute top-3 right-3 w-4 h-4 z-10"
            style={{ color: '#06b6d4', filter: 'drop-shadow(1px 1px 0 #0a0810)' }}
          />
          <div className="relative flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #0e7490)',
                border: '2.5px solid #0a0810',
                boxShadow: '0 3px 0 #0a0810',
              }}
            >
              <Eye className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <p
                className="text-2xl font-black leading-none text-white"
                style={{
                  fontFamily: "'Caveat', cursive",
                  textShadow: GRAFFITI_TEXT_SHADOW_SM,
                }}
              >
                Mr White
              </p>
              <p
                className="text-xs text-white/55 font-bold leading-none"
                style={{ fontFamily: "'Caveat', cursive" }}
              >
                {canEnableMrWhite
                  ? "Joueur sans mot, doit improviser"
                  : 'Min. 4 joueurs requis'}
              </p>
            </div>
            <ToggleSwitch
              active={canEnableMrWhite && enableMrWhite}
              onClick={() => isHost && canEnableMrWhite && setEnableMrWhite((v) => !v)}
              color="#06b6d4"
            />
          </div>
        </CartoonCard>

        {/* LAUNCH BUTTON */}
        <div className="pt-2">
          {isHost ? (
            <motion.button
              type="button"
              onClick={handleLaunch}
              disabled={submitting || isLaunching}
              whileHover={
                !submitting && !isLaunching
                  ? { scale: 1.03, rotate: -1 }
                  : undefined
              }
              whileTap={!submitting && !isLaunching ? { scale: 0.97 } : undefined}
              className={cn(
                'relative w-full px-6 py-5 rounded-2xl',
                (submitting || isLaunching) && 'opacity-70 cursor-not-allowed',
              )}
              style={{
                background: `linear-gradient(180deg, ${accent}, ${accent}cc)`,
                border: '4px solid #0a0810',
                boxShadow:
                  '0 6px 0 #0a0810, 0 10px 24px rgba(0,0,0,0.4), inset 0 2px 0 rgba(255,255,255,0.25)',
              }}
            >
              <div className="relative flex items-center justify-center gap-3">
                {submitting || isLaunching ? (
                  <Loader2
                    className="w-6 h-6 text-white animate-spin"
                    strokeWidth={2.5}
                  />
                ) : (
                  <Crown className="w-6 h-6 text-white" strokeWidth={2.5} />
                )}
                <span
                  className="text-3xl font-black text-white leading-none"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    textShadow: GRAFFITI_TEXT_SHADOW,
                  }}
                >
                  {submitting || isLaunching
                    ? 'Lancement…'
                    : 'Lancer la partie'}
                </span>
              </div>
            </motion.button>
          ) : (
            <CartoonCard accent={accent} className="px-5 py-4 text-center">
              <p
                className="text-2xl font-black leading-none text-white"
                style={{
                  fontFamily: "'Caveat', cursive",
                  textShadow: GRAFFITI_TEXT_SHADOW_SM,
                }}
              >
                En attente de l'hôte…
              </p>
              <p
                className="mt-1 text-sm text-white/55 italic font-bold"
                style={{ fontFamily: "'Caveat', cursive" }}
              >
                Les paramètres se règlent côté admin.
              </p>
            </CartoonCard>
          )}
        </div>
      </div>
    </div>
  );
});
