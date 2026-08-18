import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket,
  Users,
  Settings,
  ArrowLeft,
  Hash,
  X,
  Sparkles,
  Play,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { useToast } from "@/hooks/use-toast";
import { DisplayCard } from "@/components/ui/display-cards";
import { DeviceSettings } from "@/components/DeviceSettings";
import { cn } from "@/lib/utils";

interface NeverLikeThatHomeScreenProps {
  onCreateGame: (playerName: string) => void;
  onJoinGame: (playerName: string, lobbyCode: string) => void;
}

type View = "menu" | "join";

export const NeverLikeThatHomeScreen = ({
  onCreateGame,
  onJoinGame,
}: NeverLikeThatHomeScreenProps) => {
  const { profile } = useAuth();
  const { play } = useBackgroundMusic();
  const { toast } = useToast();

  const [playerName, setPlayerName] = useState("");
  const [lobbyCode, setLobbyCode] = useState("");
  const [view, setView] = useState<View>("menu");
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (profile?.display_name && !playerName) setPlayerName(profile.display_name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.display_name]);

  const requireName = useCallback(() => {
    if (!playerName.trim()) {
      toast({ title: "Pseudo requis", description: "Entre ton pseudo avant de continuer", variant: "destructive" });
      return false;
    }
    return true;
  }, [playerName, toast]);

  const handleCreate = useCallback(() => {
    if (!requireName()) return;
    play();
    onCreateGame(playerName.trim());
  }, [requireName, play, onCreateGame, playerName]);

  const handleJoin = useCallback(() => {
    if (!requireName()) return;
    if (!lobbyCode.trim()) {
      toast({ title: "Code requis", description: "Entre le code du lobby", variant: "destructive" });
      return;
    }
    play();
    onJoinGame(playerName.trim(), lobbyCode.trim().toUpperCase());
  }, [requireName, lobbyCode, play, onJoinGame, playerName, toast]);

  const blueGlass = "!bg-[hsl(240_22%_11%/0.92)] !backdrop-blur-md border-white/10 hover:!border-sky-400/40 cursor-pointer";

  return (
    <div className="h-screen w-full flex flex-col items-center text-white relative overflow-hidden">
      {/* Title */}
      <div className="relative z-10 text-center pt-10 sm:pt-14 flex-shrink-0">
        <motion.h1
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl sm:text-7xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white via-sky-200 to-sky-400 drop-shadow-[0_0_30px_rgba(56,189,248,0.4)]"
        >
          MIMIC MASTER
        </motion.h1>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-xs uppercase tracking-[0.35em] text-sky-300/70 font-bold">
            Never Like That
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
        </div>
      </div>

      {/* Center stage */}
      <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-center gap-8 px-4 min-h-0">
        {/* Pseudo input */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-sm"
        >
          <label className="block text-[11px] uppercase tracking-[0.25em] text-sky-300/70 font-bold mb-2 text-center">
            Ton pseudo
          </label>
          <div className="relative">
            <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-300/60" />
            <input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Entre ton pseudo…"
              maxLength={20}
              className="w-full h-14 pl-11 pr-4 rounded-2xl bg-[hsl(240_22%_10%/0.85)] backdrop-blur-md border border-sky-400/25 text-center text-xl font-bold text-white placeholder:text-white/30 outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20 transition-all"
            />
          </div>
        </motion.div>

        {/* Menu fan / Join view */}
        <AnimatePresence mode="wait">
          {view === "menu" ? (
            <motion.div
              key="menu"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid [grid-template-areas:'stack'] place-items-center py-6 scale-90 sm:scale-100"
            >
              {/* Create */}
              <DisplayCard
                onClick={handleCreate}
                icon={<Rocket className="size-4 text-sky-300" />}
                title="Créer une partie"
                description="Lance ton lobby"
                date="Tu es l'hôte"
                titleClassName="text-white"
                className={cn(
                  blueGlass,
                  "[grid-area:stack] hover:z-50 hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
                )}
              />
              {/* Join */}
              <DisplayCard
                onClick={() => setView("join")}
                icon={<Users className="size-4 text-emerald-300" />}
                title="Rejoindre une partie"
                description="Entre un code lobby"
                date="Mode invité"
                titleClassName="text-white"
                className={cn(
                  blueGlass,
                  "[grid-area:stack] translate-x-12 translate-y-10 hover:z-50 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
                )}
              />
              {/* Settings */}
              <DisplayCard
                onClick={() => setShowSettings(true)}
                icon={<Settings className="size-4 text-[var(--ink-accent-text)]" />}
                title="Réglages"
                description="Audio · Thème · Avatar"
                date="Personnalise"
                titleClassName="text-white"
                className={cn(
                  blueGlass,
                  "[grid-area:stack] translate-x-24 translate-y-20 hover:z-50 hover:translate-y-10",
                )}
              />
            </motion.div>
          ) : (
            <motion.div
              key="join"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="w-full max-w-md rounded-3xl p-6 backdrop-blur-md"
              style={{
                background: "linear-gradient(160deg, hsl(240 22% 9% / 0.88), hsl(240 28% 5% / 0.9))",
                border: "1px solid hsl(217 91% 60% / 0.25)",
              }}
            >
              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={() => setView("menu")}
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/15 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-2xl font-black text-white">Rejoindre une partie</h2>
              </div>

              <label className="block text-[11px] uppercase tracking-[0.25em] text-sky-300/70 font-bold mb-2">
                Code du lobby
              </label>
              <div className="relative mb-5">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-300/60" />
                <input
                  value={lobbyCode}
                  onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  placeholder="XXXX"
                  maxLength={6}
                  className="w-full h-16 pl-12 pr-4 rounded-2xl bg-black/40 border border-white/10 text-center text-3xl font-black tracking-[0.4em] text-white placeholder:text-white/20 outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20 transition-all"
                />
              </div>

              <button
                onClick={handleJoin}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-lg font-black bg-gradient-to-r from-sky-500 to-[var(--ink-accent-strong)] text-white hover:brightness-110 shadow-[0_0_24px_hsl(217_91%_60%/0.4)] transition-all"
              >
                <Play className="w-5 h-5" /> Rejoindre
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SETTINGS MODAL */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              className="relative w-full max-w-2xl max-h-[calc(100dvh-2rem)] flex flex-col rounded-3xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "linear-gradient(180deg, hsl(240 24% 8%), hsl(240 30% 4%))",
                border: "1px solid hsl(217 91% 60% / 0.3)",
                boxShadow: "0 24px 60px hsl(240 60% 2% / 0.7)",
              }}
            >
              <button
                onClick={() => setShowSettings(false)}
                className="absolute top-4 right-4 z-10 w-9 h-9 rounded-xl bg-white/5 border border-white/15 flex items-center justify-center text-white/70 hover:text-white hover:bg-rose-500/20"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex flex-col min-h-0 flex-1">
                <DeviceSettings showPreview onClose={() => setShowSettings(false)} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
