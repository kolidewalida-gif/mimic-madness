import { memo, useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import {
  ArrowRight,
  ChevronLeft,
  Hash,
  Phone,
  Copy,
  Swords,
  Brain,
  Zap,
  UserX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { VolumeControl } from '@/components/VolumeControl';
import { SoundEffectsVolumeControl } from '@/components/SoundEffectsVolumeControl';
import { LobbyGameMode } from '@/lib/gameModes';
import { InkPatchNoteModal, CURRENT_VERSION } from '@/components/InkPatchNoteModal';

// NOTE: The Settings cog button that used to open DeviceSettings as a modal
// has been removed. The carousel's left panel (InkSettingsPanel) is the new
// in-app entry point for device settings. The "Notes de version" button
// remains here at the bottom of the center panel.

interface InkHomeCenterPanelProps {
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  lobbyCode: string;
  onLobbyCodeChange: (code: string) => void;
  onCreateGame: (playerName: string, gameMode?: LobbyGameMode) => void;
  onJoinGame: (playerName: string, lobbyCode: string) => void;
}

type ViewMode = 'home' | 'join';

interface GameModeInfo {
  id: LobbyGameMode;
  name: string;
  icon: React.ReactNode;
  description: string;
  rules: string[];
}

const GAME_MODES: GameModeInfo[] = [
  {
    id: 'audiophone',
    name: 'Audiophone',
    icon: <Phone className="w-5 h-5" />,
    description: 'Le téléphone arabe version audio inversé',
    rules: [
      'Enregistrez une phrase qui sera automatiquement inversée',
      "Les autres joueurs écoutent et imitent ce qu'ils entendent",
      'Fou rires garantis lors de la révélation finale!',
    ],
  },
  {
    id: 'normal',
    name: 'Imitation',
    icon: <Copy className="w-5 h-5" />,
    description: 'Imitez les défis vidéo des autres joueurs',
    rules: [
      'Un joueur lance un défi vidéo',
      "Les autres doivent l'imiter le plus fidèlement possible",
      'Votez pour la meilleure imitation!',
    ],
  },
  {
    id: '2v2',
    name: '2v2',
    icon: <Swords className="w-5 h-5" />,
    description: 'Affrontement en équipes de 2',
    rules: [
      'Formez des équipes de 2 joueurs',
      'Collaborez pour réaliser les défis ensemble',
      "L'équipe avec le plus de points gagne!",
    ],
  },
  {
    id: 'quiz',
    name: 'Quiz',
    icon: <Brain className="w-5 h-5" />,
    description: 'Testez vos connaissances en temps réel',
    rules: [
      'Questions variées: culture générale, jeux, films...',
      'Répondez le plus vite possible pour plus de points',
      'Le plus rapide et précis gagne!',
    ],
  },
  {
    id: 'pixoguess',
    name: 'Blurrush',
    icon: <Zap className="w-5 h-5" />,
    description: "Devinez l'image pixelisée",
    rules: [
      'Une image se dépixelise progressivement',
      "Soyez le premier à deviner ce que c'est",
      'Plus vous êtes rapide, plus vous gagnez de points!',
    ],
  },
  {
    id: 'undercover',
    name: 'Undercover',
    icon: <UserX className="w-5 h-5" />,
    description: "Trouvez l'infiltré parmi les joueurs",
    rules: [
      'Chaque joueur reçoit un mot secret',
      "L'Undercover a un mot similaire mais différent",
      'Donnez des indices et votez pour éliminer le suspect!',
    ],
  },
];

const InkHomeCenterPanelComponent = ({
  playerName,
  onPlayerNameChange,
  lobbyCode,
  onLobbyCodeChange,
  onCreateGame,
  onJoinGame,
}: InkHomeCenterPanelProps) => {
  const { profile } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [showPatchNote, setShowPatchNote] = useState(false);
  const [selectedMode, setSelectedMode] = useState<LobbyGameMode>('audiophone');
  const { play } = useBackgroundMusic();

  useEffect(() => {
    if (profile?.display_name && !playerName) {
      onPlayerNameChange(profile.display_name);
    }
  }, [profile?.display_name, playerName, onPlayerNameChange]);

  const handleCreateGame = useCallback(() => {
    if (playerName.trim()) {
      play();
      playInkSound('inkSuccess', 0.5);
      onCreateGame(playerName.trim(), selectedMode || 'normal');
    }
  }, [playerName, selectedMode, play, onCreateGame]);

  const handleJoinGame = useCallback(() => {
    if (playerName.trim() && lobbyCode.trim()) {
      play();
      playInkSound('inkSuccess', 0.5);
      onJoinGame(playerName.trim(), lobbyCode.trim().toUpperCase());
    }
  }, [playerName, lobbyCode, play, onJoinGame]);

  const handleSelectMode = (mode: GameModeInfo) => {
    playInkSound('brushTap', 0.4);
    setSelectedMode(mode.id);
  };

  const selectedModeInfo = GAME_MODES.find((m) => m.id === selectedMode);

  return (
    <div className="h-full flex flex-col lg:flex-row gap-3 min-w-0">
      {/* Game Modes List */}
      <div className="lg:w-[160px] flex-shrink-0">
        <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-primary/20 p-2">
          <h3
            className="text-xs font-bold text-primary uppercase tracking-wider px-2 py-1 mb-1"
            style={{ fontFamily: "'Caveat', cursive" }}
          >
            Mode de Jeu
          </h3>
          <div className="space-y-0.5">
            {GAME_MODES.map((mode, index) => (
              <motion.button
                key={mode.id}
                onClick={() => handleSelectMode(mode)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg transition-all duration-200',
                  'border-l-2 text-sm',
                  selectedMode === mode.id
                    ? 'border-primary bg-primary/15 text-primary font-semibold'
                    : 'border-transparent text-foreground/70 hover:text-foreground hover:bg-primary/5 hover:border-primary/50'
                )}
              >
                <span className="flex items-center gap-2">
                  {mode.icon}
                  {mode.name}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Center - Username + Mode Description + Actions */}
      <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0">
        {/* Username Input */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="w-full max-w-md mx-auto flex-shrink-0"
        >
          <Input
            placeholder="Entrez votre pseudo..."
            value={playerName}
            onChange={(e) => onPlayerNameChange(e.target.value)}
            className="h-11 bg-card/50 border border-primary/30 rounded-xl text-center text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </motion.div>

        {/* Mode Description Card */}
        <AnimatePresence mode="wait">
          {selectedModeInfo && (
            <motion.div
              key={selectedMode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md mx-auto flex-shrink-0"
            >
              <div className="absolute inset-0 bg-primary/20 rounded-xl blur-sm" />
              <div className="relative bg-card/80 backdrop-blur-sm border border-primary/40 rounded-xl p-4 shadow-lg shadow-primary/10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-primary/20 rounded-lg text-primary">
                    {selectedModeInfo.icon}
                  </div>
                  <h3
                    className="text-lg font-bold text-primary"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    {selectedModeInfo.name}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedModeInfo.description}
                </p>
                <ul className="mt-2 space-y-1">
                  {selectedModeInfo.rules.slice(0, 2).map((rule, i) => (
                    <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                      <span className="text-primary">•</span>
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="w-full max-w-md mx-auto space-y-2 flex-shrink-0">
          <AnimatePresence mode="wait" initial={false}>
            {viewMode === 'home' ? (
              <motion.div
                key="home-actions"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="space-y-2"
              >
                <motion.button
                  onClick={handleCreateGame}
                  disabled={!playerName.trim()}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={cn(
                    'w-full py-3 px-5 rounded-xl font-bold text-base transition-all duration-200',
                    'border-2 border-primary bg-primary/10 text-primary',
                    'hover:bg-primary hover:text-primary-foreground',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'shadow-lg shadow-primary/20'
                  )}
                >
                  <span className="flex items-center justify-center gap-2">
                    Créer une partie
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </motion.button>

                <motion.button
                  onClick={() => {
                    playInkSound('brushTap', 0.3);
                    setViewMode('join');
                  }}
                  disabled={!playerName.trim()}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={cn(
                    'w-full py-3 px-5 rounded-xl font-semibold text-base transition-all duration-200',
                    'border border-border text-foreground/80',
                    'hover:border-primary hover:text-primary',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  Rejoindre une partie
                </motion.button>

                {/* Audio Controls */}
                <div className="pt-3 space-y-2 border-t border-border/30">
                  <VolumeControl />
                  <SoundEffectsVolumeControl />
                </div>

                <button
                  onClick={() => {
                    playInkSound('brushTap', 0.2);
                    setShowPatchNote(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-muted-foreground/60 hover:text-primary/70 transition-colors text-xs"
                >
                  <span className="text-[10px] font-mono opacity-60">v{CURRENT_VERSION}</span>
                  Notes de version
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="join-actions"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="space-y-3"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
                    <Hash className="h-3 w-3" />
                    Code du Lobby
                  </label>
                  <Input
                    placeholder="XXXX"
                    value={lobbyCode}
                    onChange={(e) => onLobbyCodeChange(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
                    maxLength={4}
                    className="text-center text-2xl tracking-[0.3em] uppercase font-bold h-14 bg-card/50 border-2 border-primary/50 rounded-xl focus:border-primary"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      playInkSound('brushTap', 0.3);
                      setViewMode('home');
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-border text-foreground/80 hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-1 text-sm"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Retour
                  </button>
                  <button
                    onClick={handleJoinGame}
                    disabled={!playerName.trim() || lobbyCode.length !== 4}
                    className={cn(
                      'flex-1 py-2.5 px-4 rounded-xl font-semibold transition-all text-sm',
                      'bg-primary text-primary-foreground hover:bg-primary/90',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    Rejoindre
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Patch Note Modal — auto-opens on new version, or manually via button */}
      <InkPatchNoteModal
        forceOpen={showPatchNote}
        onClose={() => setShowPatchNote(false)}
      />
    </div>
  );
};

export const InkHomeCenterPanel = memo(InkHomeCenterPanelComponent);
