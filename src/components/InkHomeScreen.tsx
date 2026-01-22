import { useState, memo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { 
  Play, Users, Settings, User, ArrowRight, ChevronLeft, Hash,
  Phone, Copy, Swords, Brain, Zap, X, Volume2, Mic
} from "lucide-react";
import { cn } from "@/lib/utils";
import { playSoundEffect } from "@/hooks/useSoundEffects";
import { VolumeControl } from "@/components/VolumeControl";
import { SoundEffectsVolumeControl } from "@/components/SoundEffectsVolumeControl";
import { DeviceSettings } from "@/components/DeviceSettings";
import { ProfileSidebar } from "@/components/ProfileSidebar";
import { FriendsSidebar } from "@/components/FriendsSidebar";
import { LobbyGameMode } from "@/lib/gameModes";

interface InkHomeScreenProps {
  onCreateGame: (playerName: string, gameMode?: LobbyGameMode) => void;
  onJoinGame: (playerName: string, lobbyCode: string) => void;
}

type ViewMode = "home" | "join";

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
    icon: <Phone className="w-6 h-6" />,
    description: 'Le téléphone arabe version audio inversé',
    rules: [
      "Enregistrez une phrase qui sera automatiquement inversée",
      "Les autres joueurs écoutent et imitent ce qu'ils entendent",
      "Fou rires garantis lors de la révélation finale!"
    ]
  },
  {
    id: 'normal',
    name: 'Imitation',
    icon: <Copy className="w-6 h-6" />,
    description: 'Imitez les défis vidéo des autres joueurs',
    rules: [
      "Un joueur lance un défi vidéo",
      "Les autres doivent l'imiter le plus fidèlement possible",
      "Votez pour la meilleure imitation!"
    ]
  },
  {
    id: '2v2',
    name: '2v2',
    icon: <Swords className="w-6 h-6" />,
    description: 'Affrontement en équipes de 2',
    rules: [
      "Formez des équipes de 2 joueurs",
      "Collaborez pour réaliser les défis ensemble",
      "L'équipe avec le plus de points gagne!"
    ]
  },
  {
    id: 'quiz',
    name: 'Quiz',
    icon: <Brain className="w-6 h-6" />,
    description: 'Testez vos connaissances en temps réel',
    rules: [
      "Questions variées: culture générale, jeux, films...",
      "Répondez le plus vite possible pour plus de points",
      "Le plus rapide et précis gagne!"
    ]
  },
  {
    id: 'pixoguess',
    name: 'BlurRush',
    icon: <Zap className="w-6 h-6" />,
    description: 'Devinez l\'image pixelisée',
    rules: [
      "Une image se dépixelise progressivement",
      "Soyez le premier à deviner ce que c'est",
      "Plus vous êtes rapide, plus vous gagnez de points!"
    ]
  }
];

const InkHomeScreenComponent = ({ onCreateGame, onJoinGame }: InkHomeScreenProps) => {
  const { profile } = useAuth();
  const [playerName, setPlayerName] = useState("");
  const [lobbyCode, setLobbyCode] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [showSettings, setShowSettings] = useState(false);
  const [selectedMode, setSelectedMode] = useState<LobbyGameMode | null>(null);
  const [hoveredMode, setHoveredMode] = useState<GameModeInfo | null>(null);
  const { play } = useBackgroundMusic();

  useEffect(() => {
    if (profile?.display_name && !playerName) {
      setPlayerName(profile.display_name);
    }
  }, [profile?.display_name]);

  const handleCreateGame = useCallback(() => {
    if (playerName.trim()) {
      play();
      playSoundEffect('success', 0.5);
      onCreateGame(playerName.trim(), selectedMode || 'normal');
    }
  }, [playerName, selectedMode, play, onCreateGame]);

  const handleJoinGame = useCallback(() => {
    if (playerName.trim() && lobbyCode.trim()) {
      play();
      playSoundEffect('success', 0.5);
      onJoinGame(playerName.trim(), lobbyCode.trim().toUpperCase());
    }
  }, [playerName, lobbyCode, play, onJoinGame]);

  const handleSelectMode = (mode: GameModeInfo) => {
    playSoundEffect('click', 0.3);
    setSelectedMode(mode.id);
  };

  return (
    <div className="min-h-screen bg-white text-black flex">
      {/* Left Panel - Game Modes */}
      <div className="w-64 lg:w-80 border-r border-black/10 p-6 flex flex-col gap-4 relative">
        <h2 className="font-display text-lg font-bold tracking-wider uppercase mb-4">
          Modes de Jeu
        </h2>
        
        {GAME_MODES.map((mode) => (
          <motion.button
            key={mode.id}
            onClick={() => handleSelectMode(mode)}
            onMouseEnter={() => setHoveredMode(mode)}
            onMouseLeave={() => setHoveredMode(null)}
            className={cn(
              "relative flex items-center gap-3 p-4 rounded-lg text-left transition-all duration-300",
              "border-2 hover:border-black",
              selectedMode === mode.id 
                ? "border-black bg-black text-white" 
                : "border-transparent bg-black/5"
            )}
            whileHover={{ x: 8 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className={cn(
              "p-2 rounded-lg",
              selectedMode === mode.id ? "bg-white/20" : "bg-black/10"
            )}>
              {mode.icon}
            </div>
            <span className="font-semibold">{mode.name}</span>
          </motion.button>
        ))}

        {/* Hover Info Panel - Diagonal */}
        <AnimatePresence>
          {hoveredMode && (
            <motion.div
              initial={{ opacity: 0, x: -20, rotate: -2 }}
              animate={{ opacity: 1, x: 0, rotate: -2 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute left-full top-20 ml-4 w-72 p-6 bg-black text-white rounded-lg shadow-2xl z-50"
              style={{ transformOrigin: 'left center' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  {hoveredMode.icon}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{hoveredMode.name}</h3>
                  <p className="text-sm text-white/70">{hoveredMode.description}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-xs uppercase tracking-wider text-white/50 font-semibold">
                  Règles
                </h4>
                <ul className="space-y-2">
                  {hoveredMode.rules.map((rule, i) => (
                    <li key={i} className="flex gap-2 text-sm text-white/80">
                      <span className="text-white/40">•</span>
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Arrow pointer */}
              <div className="absolute left-0 top-8 -ml-2 w-4 h-4 bg-black transform rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Center Content */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Ink splash decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
          <div className="absolute top-10 left-10 w-32 h-32 bg-black rounded-full blur-xl" />
          <div className="absolute bottom-20 right-20 w-48 h-48 bg-black rounded-full blur-2xl" />
          <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-black rounded-full blur-lg" />
        </div>

        <div className="w-full max-w-md space-y-8 relative z-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.h1 
              className="font-display text-5xl md:text-6xl font-black tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              MIMIC MASTER
            </motion.h1>
            <p className="text-black/50 mt-2 text-sm tracking-wider uppercase">
              Le jeu de party ultime
            </p>
          </div>

          {/* Main Card */}
          <motion.div 
            className="bg-white border-2 border-black rounded-2xl p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="space-y-5">
              {/* Player Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <User className="h-3.5 w-3.5" />
                  Votre pseudo
                </label>
                <Input
                  placeholder="Entrez votre pseudo..."
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="h-12 bg-black/5 border-2 border-black/20 rounded-xl focus:border-black transition-colors"
                />
              </div>

              {viewMode === "home" && (
                <div className="space-y-3">
                  {selectedMode && (
                    <div className="p-3 bg-black/5 rounded-lg flex items-center gap-2 text-sm">
                      <span className="font-medium">Mode sélectionné:</span>
                      <span className="font-bold">{GAME_MODES.find(m => m.id === selectedMode)?.name}</span>
                    </div>
                  )}
                  
                  <Button
                    onClick={handleCreateGame}
                    disabled={!playerName.trim()}
                    className="w-full h-14 bg-black text-white hover:bg-black/80 rounded-xl text-lg font-bold shadow-[4px_4px_0_0_rgba(0,0,0,0.2)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                  >
                    <Play className="h-5 w-5 mr-2" fill="currentColor" />
                    Créer une Partie
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                  
                  <Button
                    onClick={() => setViewMode("join")}
                    disabled={!playerName.trim()}
                    variant="outline"
                    className="w-full h-12 border-2 border-black hover:bg-black hover:text-white rounded-xl font-semibold transition-all"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Rejoindre une Partie
                  </Button>
                </div>
              )}

              {viewMode === "join" && (
                <motion.div 
                  className="space-y-4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                      <Hash className="h-3.5 w-3.5" />
                      Code du Lobby
                    </label>
                    <Input
                      placeholder="XXXX"
                      value={lobbyCode}
                      onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                      onKeyPress={(e) => e.key === "Enter" && handleJoinGame()}
                      maxLength={4}
                      className="text-center text-4xl tracking-[0.3em] uppercase font-bold h-20 bg-black/5 border-2 border-black rounded-xl"
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setViewMode("home")}
                      variant="outline"
                      className="flex-1 border-2 border-black/30 hover:border-black rounded-xl"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Retour
                    </Button>
                    <Button
                      onClick={handleJoinGame}
                      disabled={!playerName.trim() || lobbyCode.length !== 4}
                      className="flex-1 bg-black text-white hover:bg-black/80 rounded-xl font-semibold"
                    >
                      Rejoindre
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Audio Controls */}
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <VolumeControl />
            <SoundEffectsVolumeControl />
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Settings */}
      <div className="w-16 border-l border-black/10 flex flex-col items-center py-6 gap-4">
        <button
          onClick={() => {
            playSoundEffect('click', 0.3);
            setShowSettings(!showSettings);
          }}
          className={cn(
            "p-3 rounded-xl transition-all duration-300",
            showSettings 
              ? "bg-black text-white" 
              : "bg-black/5 hover:bg-black/10"
          )}
        >
          <Settings className="w-5 h-5" />
        </button>
        
        <button className="p-3 rounded-xl bg-black/5 hover:bg-black/10 transition-all">
          <Volume2 className="w-5 h-5" />
        </button>
        
        <button className="p-3 rounded-xl bg-black/5 hover:bg-black/10 transition-all">
          <Mic className="w-5 h-5" />
        </button>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border-2 border-black"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Paramètres</h2>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-black/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <DeviceSettings showPreview={true} onClose={() => setShowSettings(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const InkHomeScreen = memo(InkHomeScreenComponent);
