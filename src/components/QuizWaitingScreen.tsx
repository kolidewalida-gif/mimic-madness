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
import { DoodleBorder, DoodleOval, DoodleStage } from '@/components/doodle/Doodle';
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

const ACCENT = '#38bdf8';

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
      <DoodleStage accent={ACCENT}>
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-start px-5 py-8 pb-[120px]">
          {/* HEADER */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 relative">
              <DoodleBorder color={ACCENT} filled />
              <Brain className="relative w-3.5 h-3.5" style={{ color: ACCENT }} />
              <span
                className="relative text-xs font-bold uppercase tracking-[0.25em]"
                style={{ color: ACCENT, fontFamily: "'Caveat', cursive" }}
              >
                Mode Quiz
              </span>
            </div>

            <h1
              className="text-4xl md:text-6xl font-black tracking-tight leading-none mb-2 text-white"
              style={{
                fontFamily: "'Caveat', cursive",
                textShadow: `0 0 20px ${ACCENT}33, 0 2px 8px rgba(0,0,0,0.5)`,
              }}
            >
              Quiz Time !
            </h1>
            <p className="text-sm text-white/55 max-w-md mx-auto">
              <span style={{ color: ACCENT }} className="font-bold">
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
            className="w-full max-w-2xl mb-8"
          >
            <div className="flex items-center gap-2 justify-center mb-4">
              <Users className="w-3.5 h-3.5 text-white/50" />
              <span
                className="text-xs uppercase tracking-[0.25em] font-bold text-white/50"
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
                    animate={{ opacity: 1, scale: 1, rotate: idx % 2 === 0 ? -2 : 2 }}
                    transition={{ delay: idx * 0.05, type: 'spring', stiffness: 220, damping: 14 }}
                    className="relative w-20"
                  >
                    <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                      <DoodleOval color={isMe ? ACCENT : 'rgba(255,255,255,0.3)'} filled={isMe} />
                      {hasImage ? (
                        <img
                          src={av.imageUrl}
                          alt={p.name}
                          className="relative w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <span
                          className="relative text-2xl font-black"
                          style={{
                            fontFamily: "'Caveat', cursive",
                            color: isMe ? ACCENT : 'white',
                          }}
                        >
                          {p.name[0]?.toUpperCase()}
                        </span>
                      )}
                      {p.isHost && (
                        <Crown
                          className="absolute -top-2 -right-1 w-4 h-4 text-amber-400"
                          fill="currentColor"
                          style={{ transform: 'rotate(15deg)' }}
                        />
                      )}
                    </div>
                    <p
                      className="text-center text-sm font-bold text-white truncate mt-1"
                      style={{ fontFamily: "'Caveat', cursive" }}
                    >
                      {p.name}
                    </p>
                    {isMe && (
                      <span className="block text-[9px] uppercase tracking-wider font-bold text-cyan-400 text-center">
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
              className="w-full max-w-2xl space-y-4 mb-8"
            >
              <div className="relative px-5 py-4">
                <DoodleBorder color="rgba(255,255,255,0.18)" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                    <span
                      className="text-xs uppercase tracking-[0.2em] font-bold"
                      style={{ color: ACCENT, fontFamily: "'Caveat', cursive" }}
                    >
                      Catégorie
                    </span>
                  </div>
                  <QuizCategorySelector
                    selectedCategory={selectedCategory}
                    onCategoryChange={onCategoryChange}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="relative px-5 py-4">
                <DoodleBorder color="rgba(255,255,255,0.18)" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <SettingsIcon className="w-3.5 h-3.5 text-white/60" />
                    <span
                      className="text-xs uppercase tracking-[0.2em] font-bold text-white/70"
                      style={{ fontFamily: "'Caveat', cursive" }}
                    >
                      Options
                    </span>
                  </div>
                  <QuizSettingsPanel
                    settings={hostSettings}
                    onChange={onSettingsChange}
                    disabled={isLoading}
                  />
                </div>
              </div>
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
                whileHover={!isLoading ? { scale: 1.03, y: -2 } : undefined}
                whileTap={!isLoading ? { scale: 0.97 } : undefined}
                animate={
                  !isLoading
                    ? {
                        boxShadow: [
                          `0 4px 20px ${ACCENT}55`,
                          `0 4px 30px ${ACCENT}88`,
                          `0 4px 20px ${ACCENT}55`,
                        ],
                      }
                    : undefined
                }
                transition={
                  !isLoading
                    ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                    : undefined
                }
                className="relative w-full px-6 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <DoodleBorder color={ACCENT} filled rotation={-1} thick />
                <div className="relative flex items-center justify-center gap-3">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span
                        className="text-2xl font-black"
                        style={{ fontFamily: "'Caveat', cursive", color: 'white' }}
                      >
                        Chargement…
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" style={{ color: ACCENT }} />
                      <span
                        className="text-2xl md:text-3xl font-black"
                        style={{ fontFamily: "'Caveat', cursive", color: ACCENT }}
                      >
                        Lancer le quiz
                      </span>
                      <ArrowRight className="w-5 h-5" style={{ color: ACCENT }} />
                    </>
                  )}
                </div>
              </motion.button>
            ) : (
              <div className="relative px-6 py-4">
                <DoodleBorder color="rgba(255,255,255,0.2)" />
                <div className="relative flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-white/60" />
                  <span
                    className="text-xl font-black text-white/70"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    En attente de l'hôte…
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onLeave}
              className="relative w-full px-4 py-2.5 group"
            >
              <DoodleBorder color="rgba(255,255,255,0.15)" />
              <div className="relative flex items-center justify-center gap-2 text-white/60 group-hover:text-white transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span
                  className="text-sm font-bold uppercase tracking-wider"
                  style={{ fontFamily: "'Caveat', cursive" }}
                >
                  Quitter
                </span>
              </div>
            </button>
          </motion.div>
        </div>
      </DoodleStage>
    );
  },
);

QuizWaitingScreen.displayName = 'QuizWaitingScreen';
