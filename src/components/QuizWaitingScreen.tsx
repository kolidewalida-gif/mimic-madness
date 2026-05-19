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
}

const ACCENT = '#84cc16'; // green/lime — matches the QUIZ card color
const GRAFFITI_TEXT_SHADOW =
  '2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810, 1.5px 1.5px 0 #0a0810';
const GRAFFITI_TEXT_SHADOW_SM =
  '1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810, 1px 1px 0 #0a0810';

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
  }: QuizWaitingScreenProps) => {
    const playerIds = useMemo(() => players.map((p) => p.id), [players]);
    const { getAvatar } = useMultiplePlayerAvatars(playerIds);

    return (
      <div className="min-h-screen bg-[#0a0510] text-white relative overflow-hidden">
        {/* BACKGROUND */}
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

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-start px-5 py-8 pb-[200px]">
          {/* HEADER */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-6 space-y-2"
          >
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: -2 }}
              transition={{ type: 'spring', stiffness: 280, damping: 16 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                background: `linear-gradient(180deg, ${ACCENT}, ${ACCENT}cc)`,
                border: '3px solid #0a0810',
                boxShadow: '0 4px 0 #0a0810',
              }}
            >
              <Brain className="w-4 h-4 text-white" strokeWidth={2.5} />
              <span
                className="text-sm font-black uppercase tracking-wider text-white leading-none"
                style={{
                  fontFamily: "'Caveat', cursive",
                  textShadow: GRAFFITI_TEXT_SHADOW_SM,
                }}
              >
                Mode Quiz
              </span>
            </motion.div>

            <h1
              className="text-6xl md:text-7xl font-black tracking-tight leading-none text-white"
              style={{
                fontFamily: "'Caveat', cursive",
                textShadow: GRAFFITI_TEXT_SHADOW,
              }}
            >
              Quiz Time !
            </h1>
            <p
              className="text-base text-white/70 max-w-md mx-auto font-bold"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              <span
                className="text-lime-300"
                style={{ textShadow: `0 2px 8px ${ACCENT}88` }}
              >
                {totalRounds} questions
              </span>{' '}
              · 30 secondes chacune. Le plus rapide gagne !
            </p>
          </motion.div>

          {/* PLAYERS */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="w-full max-w-2xl mb-6"
          >
            <div className="flex items-center gap-2 justify-center mb-3">
              <Users className="w-3.5 h-3.5 text-white/55" />
              <span
                className="text-xs uppercase tracking-[0.25em] font-black text-white/65"
                style={{ fontFamily: "'Caveat', cursive" }}
              >
                {players.length} joueur{players.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
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
                    className="relative w-24"
                  >
                    <div
                      className="relative w-16 h-16 mx-auto rounded-full flex items-center justify-center"
                      style={{
                        background: isMe
                          ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`
                          : 'linear-gradient(135deg, #a855f7, #6b21a8)',
                        border: '3.5px solid #0a0810',
                        boxShadow: '0 4px 0 #0a0810',
                      }}
                    >
                      {hasImage ? (
                        <img
                          src={av.imageUrl}
                          alt={p.name}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-[#0a0810]"
                        />
                      ) : (
                        <span
                          className="text-2xl font-black text-white leading-none"
                          style={{
                            fontFamily: "'Caveat', cursive",
                            textShadow: GRAFFITI_TEXT_SHADOW_SM,
                          }}
                        >
                          {p.name[0]?.toUpperCase()}
                        </span>
                      )}
                      {p.isHost && (
                        <Crown
                          className="absolute -top-2 -right-1 w-4 h-4 text-amber-400"
                          fill="currentColor"
                          style={{
                            transform: 'rotate(15deg)',
                            filter: 'drop-shadow(1.5px 1.5px 0 #0a0810)',
                          }}
                        />
                      )}
                    </div>
                    <p
                      className="text-center text-base font-black text-white truncate mt-1.5 leading-none"
                      style={{
                        fontFamily: "'Caveat', cursive",
                        textShadow: GRAFFITI_TEXT_SHADOW_SM,
                      }}
                    >
                      {p.name}
                    </p>
                    {isMe && (
                      <span
                        className="block text-[10px] uppercase tracking-wider font-black text-lime-300 text-center"
                        style={{ fontFamily: "'Caveat', cursive" }}
                      >
                        Vous
                      </span>
                    )}
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
              className="w-full max-w-2xl space-y-4 mb-6"
            >
              {/* Category */}
              <CartoonSection
                icon={Sparkles}
                title="Catégorie"
                accent={ACCENT}
              >
                <QuizCategorySelector
                  selectedCategory={selectedCategory}
                  onCategoryChange={onCategoryChange}
                  disabled={isLoading}
                />
              </CartoonSection>

              {/* Settings */}
              <CartoonSection
                icon={SettingsIcon}
                title="Options"
                accent="#a855f7"
              >
                <QuizSettingsPanel
                  settings={hostSettings}
                  onChange={onSettingsChange}
                  disabled={isLoading}
                />
              </CartoonSection>
            </motion.div>
          )}

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full max-w-md space-y-3"
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
                  'relative w-full py-4 rounded-2xl flex items-center justify-center gap-3',
                  isLoading && 'opacity-50 cursor-not-allowed',
                )}
                style={{
                  background: `linear-gradient(180deg, ${ACCENT}, ${ACCENT}cc)`,
                  border: '4px solid #0a0810',
                  boxShadow:
                    '0 6px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.25)',
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                    <span
                      className="text-2xl font-black text-white leading-none"
                      style={{
                        fontFamily: "'Caveat', cursive",
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
                      className="text-3xl font-black text-white leading-none"
                      style={{
                        fontFamily: "'Caveat', cursive",
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
                  border: '3px solid #0a0810',
                  boxShadow: '0 4px 0 #0a0810',
                }}
              >
                <Loader2 className="w-4 h-4 animate-spin text-white/60" />
                <span
                  className="text-xl font-black text-white/75 leading-none"
                  style={{
                    fontFamily: "'Caveat', cursive",
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
              className="relative w-full py-2.5 rounded-2xl flex items-center justify-center gap-2"
              style={{
                background:
                  'linear-gradient(180deg, rgba(239,68,68,0.18), rgba(127,29,29,0.05))',
                border: '2.5px solid #0a0810',
                boxShadow: '0 3px 0 #0a0810',
                color: 'white',
              }}
            >
              <ArrowLeft className="w-4 h-4 text-red-300" strokeWidth={2.5} />
              <span
                className="text-base font-black uppercase tracking-wider text-red-300 leading-none"
                style={{
                  fontFamily: "'Caveat', cursive",
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
   Reusable cartoon section
============================================================ */
const CartoonSection = ({
  icon: Icon,
  title,
  accent,
  children,
}: {
  icon: any;
  title: string;
  accent: string;
  children: React.ReactNode;
}) => (
  <motion.section
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="relative rounded-2xl p-4"
    style={{
      background:
        'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
      border: '3px solid #0a0810',
      boxShadow: '0 4px 0 #0a0810, inset 0 1px 0 rgba(255,255,255,0.06)',
    }}
  >
    <div
      className="absolute inset-0 pointer-events-none opacity-25 rounded-2xl"
      style={{
        background: `radial-gradient(circle at top, ${accent}55, transparent 70%)`,
      }}
    />
    <Sparkles
      className="absolute -top-2 -right-2 w-4 h-4"
      style={{
        color: accent,
        filter: 'drop-shadow(1px 1px 0 #0a0810)',
      }}
    />
    <header className="relative flex items-center gap-2 mb-3">
      <motion.div
        animate={{ rotate: [-3, 3, -3] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        className="w-8 h-8 rounded-xl flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${accent}, ${accent}aa)`,
          border: '2.5px solid #0a0810',
          boxShadow: '0 2px 0 #0a0810',
        }}
      >
        <Icon className="h-4 w-4 text-white" strokeWidth={2.5} />
      </motion.div>
      <span
        className="text-xl font-black uppercase tracking-wider text-white leading-none"
        style={{
          fontFamily: "'Caveat', cursive",
          textShadow: GRAFFITI_TEXT_SHADOW_SM,
        }}
      >
        {title}
      </span>
    </header>
    <div className="relative">{children}</div>
  </motion.section>
);
