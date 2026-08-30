import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Users,
  Loader2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Crown,
  Settings as SettingsIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuizCategorySelector } from './QuizCategorySelector';
import { QuizSettingsPanel, type QuizSettings } from './QuizSettingsPanel';
import { useMultiplePlayerAvatars } from '@/hooks/useGlobalPlayerAvatar';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface QuizWaitingScreenProps {
  isHost: boolean;
  isLoading: boolean;
  totalRounds: number;
  players: Player[];
  currentPlayerId: string;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  hostSettings: QuizSettings;
  onSettingsChange: (s: QuizSettings) => void;
  onStart: () => void;
  onLeave: () => void;
  variant?: 'default' | 'inkBeta';
}

const ACCENT = '#84cc16'; // green/lime — matches the QUIZ card color
const GRAFFITI_TEXT_SHADOW =
  'none';
const GRAFFITI_TEXT_SHADOW_SM =
  'none';

export const QuizWaitingScreen = memo(
  ({
    isHost,
    isLoading,
    totalRounds,
    players,
    currentPlayerId,
    selectedCategory,
    onCategoryChange,
    hostSettings,
    onSettingsChange,
    onStart,
    onLeave,
    variant = 'default',
  }: QuizWaitingScreenProps) => {
    const isInkBeta = variant === 'inkBeta';
    const playerIds = useMemo(() => players.map((p) => p.id), [players]);
    const { getAvatar } = useMultiplePlayerAvatars(playerIds);

    return (
      <div
        className={isInkBeta
          ? 'contents'
          : 'menu-screen-safe relative h-[100dvh] min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain bg-[#0a0510] text-white'}
      >
        {/* BACKGROUND — la beta a déjà ses couches de scène. */}
        {!isInkBeta && (
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f1c08] via-[#0a0510] to-[#0e1c0a]" />
          <div
            className="absolute top-0 left-1/3 w-[700px] h-[400px] rounded-full opacity-30"
            style={{
              background: `radial-gradient(ellipse, ${ACCENT}66, transparent 70%)`,
              filter: 'blur(100px)',
            }}
          />
          <div
            className="absolute bottom-0 right-1/4 w-[500px] h-[300px] rounded-full opacity-20"
            style={{
              background: `radial-gradient(ellipse, ${ACCENT}55, transparent 70%)`,
              filter: 'blur(80px)',
            }}
          />
        </div>
        )}

        <div
          className={isInkBeta
            ? 'ik-gpanel is-featured'
            : 'relative z-10 h-full min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain flex flex-col items-center justify-start px-4 py-5 pb-24 sm:px-5 sm:py-8 sm:pb-24'}
        >
          {/* HEADER */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={isInkBeta ? 'ik-gpanel-head' : 'text-center mb-4 sm:mb-6 space-y-2'}
          >
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: -2 }}
              transition={{ type: 'spring', stiffness: 280, damping: 16 }}
              className={isInkBeta ? 'hidden' : 'inline-flex items-center gap-2 px-4 py-2 rounded-full'}
              style={{
                background: `linear-gradient(180deg, ${ACCENT}, ${ACCENT}cc)`,
                border: '1px solid var(--ink-line)',
                boxShadow: 'none',
              }}
            >
              <Brain className="w-4 h-4 text-white" strokeWidth={2.5} />
              <span
                className="text-sm font-black uppercase tracking-wider text-white leading-none"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  textShadow: GRAFFITI_TEXT_SHADOW_SM,
                }}
              >
                Mode Quiz
              </span>
            </motion.div>

            <h1
              className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-none text-white"
              style={{
                fontFamily: "'Outfit', sans-serif",
                textShadow: GRAFFITI_TEXT_SHADOW,
              }}
            >
              Quiz Time !
            </h1>
            {/*
              Durée réelle et non plus « 30 secondes » codées en dur : elle est
              réglable par l'hôte, et l'annoncer fausse était trompeur.
            */}
            <p
              className={isInkBeta ? 'ik-game-lead' : 'text-base text-white/70 max-w-md mx-auto font-bold'}
              style={isInkBeta ? undefined : { fontFamily: "'Outfit', sans-serif" }}
            >
              <strong
                className={isInkBeta ? undefined : 'text-lime-300'}
                style={isInkBeta ? undefined : { textShadow: `0 2px 8px ${ACCENT}88` }}
              >
                {totalRounds} questions
              </strong>{' '}
              · {Math.round(hostSettings.answerDurationMs / 1000)} secondes chacune. Le plus rapide gagne !
            </p>
          </motion.div>

          {/* PLAYERS */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={isInkBeta ? 'ik-gpanel-body' : 'w-full max-w-2xl mb-4 sm:mb-6'}
          >
            <div className={isInkBeta ? 'hidden' : 'flex items-center gap-2 justify-center mb-3'}>
              <Users className="w-3.5 h-3.5 text-white/55" />
              <span
                className="text-xs uppercase tracking-[0.25em] font-black text-white/65"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                {players.length} joueur{players.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className={isInkBeta ? 'ik-seats custom-scrollbar' : 'flex flex-wrap justify-center gap-3'}>
              {players.map((p, idx) => {
                const isMe = p.id === currentPlayerId;
                const av = getAvatar(p.id);
                const hasImage = av.type === 'image' && av.imageUrl;
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, scale: 0.85, rotate: -5 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      rotate: idx % 2 === 0 ? -2 : 2,
                    }}
                    transition={{
                      delay: idx * 0.05,
                      type: 'spring',
                      stiffness: 220,
                      damping: 14,
                    }}
                    className={cn(
                      isInkBeta ? 'ik-seat' : 'relative w-20 sm:w-24',
                      isInkBeta && isMe && 'is-self',
                    )}
                  >
                    <div
                      className={cn(
                        isInkBeta
                          ? 'ik-seat-avatar'
                          : 'relative w-16 h-16 mx-auto rounded-full flex items-center justify-center',
                        isInkBeta && hasImage && 'has-portrait',
                      )}
                      style={isInkBeta ? undefined : {
                        background: isMe
                          ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`
                          : 'var(--ink-accent)',
                        border: '1px solid var(--ink-line)',
                        boxShadow: 'none',
                      }}
                    >
                      {hasImage ? (
                        <img
                          src={av.imageUrl}
                          alt={p.name}
                          className={isInkBeta ? undefined : 'w-12 h-12 rounded-full object-cover ring-2 ring-[var(--ink-line)]'}
                        />
                      ) : (
                        <span
                          className="text-2xl font-black text-white leading-none"
                          style={{
                            fontFamily: "'Outfit', sans-serif",
                            textShadow: GRAFFITI_TEXT_SHADOW_SM,
                          }}
                        >
                          {p.name[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    {p.isHost && (
                      <Crown
                        className={isInkBeta ? 'ik-seat-crown' : 'absolute -top-2 -right-1 w-4 h-4 text-amber-400'}
                        fill="currentColor"
                        aria-label="Hôte"
                        style={isInkBeta ? undefined : {
                          transform: 'rotate(15deg)',
                          filter: 'none',
                        }}
                      />
                    )}
                    <p
                      className={isInkBeta
                        ? 'ik-seat-name'
                        : 'text-center text-base font-black text-white truncate mt-1.5 leading-none'}
                      style={isInkBeta ? undefined : {
                        fontFamily: "'Outfit', sans-serif",
                        textShadow: GRAFFITI_TEXT_SHADOW_SM,
                      }}
                    >
                      {p.name}
                    </p>
                    <span
                      className={isInkBeta
                        ? 'ik-seat-meta'
                        : cn(
                          'block text-[10px] uppercase tracking-wider font-black text-lime-300 text-center',
                          !isMe && 'invisible',
                        )}
                      style={isInkBeta ? undefined : { fontFamily: "'Outfit', sans-serif" }}
                    >
                      {isMe ? 'Vous' : 'Prêt'}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* HOST CONFIG (Category + Settings) */}
          {isHost && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className={isInkBeta
                ? 'ik-gpanel-body'
                : 'w-full max-w-2xl space-y-3 mb-4 sm:space-y-4 sm:mb-6'}
            >
              {/* Category */}
              <InkBetaSection
                icon={Sparkles}
                title="Catégorie"
                accent={ACCENT}
                isInkBeta={isInkBeta}
              >
                <QuizCategorySelector
                  selectedCategory={selectedCategory}
                  onCategoryChange={onCategoryChange}
                  disabled={isLoading}
                />
              </InkBetaSection>

              {/* Settings */}
              <InkBetaSection
                icon={SettingsIcon}
                title="Options"
                accent="var(--ink-accent)"
                isInkBeta={isInkBeta}
              >
                <QuizSettingsPanel
                  settings={hostSettings}
                  onChange={onSettingsChange}
                  disabled={isLoading}
                />
              </InkBetaSection>
            </motion.div>
          )}

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={isInkBeta ? 'ik-game-actions' : 'w-full max-w-md space-y-3 pb-1'}
          >
            {isHost ? (
              <motion.button
                type="button"
                onClick={onStart}
                disabled={isLoading}
                whileHover={
                  !isLoading ? { scale: 1.04, rotate: -1.5 } : undefined
                }
                whileTap={!isLoading ? { scale: 0.96 } : undefined}
                className={cn(
                  isInkBeta
                    ? 'ik-primary-action menu-focus'
                    : 'relative w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 sm:gap-3 sm:py-4',
                  isLoading && 'opacity-50 cursor-not-allowed',
                )}
                style={isInkBeta ? undefined : {
                  background: `linear-gradient(180deg, ${ACCENT}, ${ACCENT}cc)`,
                  border: '1px solid var(--ink-line)',
                  boxShadow:
                    'none',
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                    <span
                      className="text-2xl font-black text-white leading-none"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        textShadow: GRAFFITI_TEXT_SHADOW,
                      }}
                    >
                      Chargement…
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6 text-white" strokeWidth={2.5} />
                    <span
                      className="text-2xl sm:text-3xl font-black text-white leading-none"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        textShadow: GRAFFITI_TEXT_SHADOW,
                      }}
                    >
                      Lancer le quiz
                    </span>
                    <ArrowRight
                      className="w-6 h-6 text-white"
                      strokeWidth={2.5}
                    />
                  </>
                )}
              </motion.button>
            ) : (
              <div
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-2"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                  border: '1px solid var(--ink-line)',
                  boxShadow: 'none',
                }}
              >
                <Loader2 className="w-4 h-4 animate-spin text-white/60" />
                <span
                  className="text-xl font-black text-white/75 leading-none"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    textShadow: GRAFFITI_TEXT_SHADOW_SM,
                  }}
                >
                  En attente de l'hôte…
                </span>
              </div>
            )}

            <motion.button
              type="button"
              onClick={onLeave}
              whileHover={{ scale: 1.02, rotate: -1 }}
              whileTap={{ scale: 0.98 }}
              className={isInkBeta
                ? 'ik-secondary-action menu-focus'
                : 'relative w-full py-2.5 rounded-2xl flex items-center justify-center gap-2'}
              style={isInkBeta ? undefined : {
                background:
                  'linear-gradient(180deg, rgba(239,68,68,0.18), rgba(127,29,29,0.05))',
                border: '1px solid var(--ink-line)',
                boxShadow: 'none',
                color: 'white',
              }}
            >
              <ArrowLeft className={isInkBeta ? undefined : 'w-4 h-4 text-red-300'} strokeWidth={2.5} />
              <span
                className={isInkBeta
                  ? undefined
                  : 'text-base font-black uppercase tracking-wider text-red-300 leading-none'}
                style={isInkBeta ? undefined : {
                  fontFamily: "'Outfit', sans-serif",
                  textShadow: GRAFFITI_TEXT_SHADOW_SM,
                }}
              >
                Quitter
              </span>
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  },
);

QuizWaitingScreen.displayName = 'QuizWaitingScreen';

/* ============================================================
   Reusable Ink Beta section
============================================================ */
const InkBetaSection = ({
  icon: Icon,
  title,
  accent,
  children,
  isInkBeta = false,
}: {
  icon: any;
  title: string;
  accent: string;
  children: React.ReactNode;
  isInkBeta?: boolean;
}) => (
  <motion.section
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className={isInkBeta ? 'ik-quiz-section' : 'relative rounded-2xl p-4'}
    style={isInkBeta ? undefined : {
      background:
        'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
      border: '1px solid var(--ink-line)',
      boxShadow: 'none',
    }}
  >
    {!isInkBeta && (
    <div
      className="absolute inset-0 pointer-events-none opacity-25 rounded-2xl"
      style={{
        background: `radial-gradient(circle at top, ${accent}55, transparent 70%)`,
      }}
    />
    )}
    {!isInkBeta && (
    <Sparkles
      className="absolute -top-2 -right-2 w-4 h-4"
      style={{
        color: accent,
        filter: 'none',
      }}
    />
    )}
    <header className="relative flex items-center gap-2 mb-3">
      <motion.div
        animate={{ rotate: [-3, 3, -3] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        className="w-8 h-8 rounded-xl flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${accent}, ${accent}aa)`,
          border: '1px solid var(--ink-line)',
          boxShadow: 'none',
        }}
      >
        <Icon className="h-4 w-4 text-white" strokeWidth={2.5} />
      </motion.div>
      <span
        className="text-xl font-black uppercase tracking-wider text-white leading-none"
        style={{
          fontFamily: "'Outfit', sans-serif",
          textShadow: GRAFFITI_TEXT_SHADOW_SM,
        }}
      >
        {title}
      </span>
    </header>
    <div className="relative">{children}</div>
  </motion.section>
);
