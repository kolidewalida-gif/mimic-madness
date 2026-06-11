import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Swords,
  Brain,
  Phone,
  Image as ImageIcon,
  Landmark,
  UserX,
  ChevronLeft,
  ChevronRight,
  Check,
  Lock,
  Play,
} from "lucide-react";
import { DisplayCard } from "@/components/ui/display-cards";
import { cn } from "@/lib/utils";
import { LobbyGameMode } from "@/lib/gameModes";

interface NeverLikeThatModeCarouselProps {
  gameMode: LobbyGameMode;
  onGameModeChange: (mode: LobbyGameMode) => void;
  playerCount: number;
  isAdmin?: boolean;
  disabled?: boolean;
  /** Bigger, centerpiece layout for the dedicated lobby */
  large?: boolean;
}

interface ModeDef {
  id: LobbyGameMode;
  name: string;
  subtitle: string;
  description: string;
  icon: typeof Users;
  minPlayers: number;
  accent: string; // tailwind text/border color hint
  glow: string;
}

/**
 * Game-mode selection as an interactive 3D card carousel, built on the
 * DisplayCard component. Designed for the "Never Like That" theme:
 * skewed glassy blue cards, spotlight glow, prev/next navigation.
 */
export const NeverLikeThatModeCarousel = ({
  gameMode,
  onGameModeChange,
  playerCount,
  isAdmin = false,
  disabled = false,
  large = false,
}: NeverLikeThatModeCarouselProps) => {
  const modes = useMemo<ModeDef[]>(
    () => [
      { id: "normal", name: "Imitation", subtitle: "Mode classique", description: "Imite le son ou le chanteur", icon: Users, minPlayers: 2, accent: "text-sky-300", glow: "56,189,248" },
      { id: "2v2", name: "2 vs 2", subtitle: "Combat en équipes", description: "Affronte l'équipe adverse", icon: Swords, minPlayers: 4, accent: "text-amber-300", glow: "251,191,36" },
      { id: "quiz", name: "Quiz", subtitle: "Culture générale", description: "Réponds le plus vite", icon: Brain, minPlayers: 2, accent: "text-fuchsia-300", glow: "232,121,249" },
      { id: "audiophone", name: "Audio Phone", subtitle: "Téléphone arabe audio", description: "La chaîne sonore déraille", icon: Phone, minPlayers: 2, accent: "text-emerald-300", glow: "52,211,153" },
      { id: "pixoguess", name: "BlurRush", subtitle: "Devine vite !", description: "L'image se dévoile peu à peu", icon: ImageIcon, minPlayers: 2, accent: "text-violet-300", glow: "167,139,250" },
      { id: "monopoly", name: "Monopoly", subtitle: "Plateau 3D", description: "Achète, piège, gagne", icon: Landmark, minPlayers: 2, accent: "text-green-300", glow: "74,222,128" },
      { id: "undercover", name: "Undercover", subtitle: "Trouve l'infiltré", description: "Démasque l'imposteur", icon: UserX, minPlayers: 3, accent: "text-rose-300", glow: "251,113,133" },
    ],
    [],
  );

  const selectedIndex = Math.max(0, modes.findIndex((m) => m.id === gameMode));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  // Keep carousel in sync if the mode changes from the backend (other host action)
  useEffect(() => {
    if (selectedIndex !== -1) setActiveIndex(selectedIndex);
  }, [selectedIndex]);

  const canPlay = (m: ModeDef) => isAdmin || playerCount >= m.minPlayers;

  const go = (dir: -1 | 1) => {
    if (disabled) return;
    setActiveIndex((i) => (i + dir + modes.length) % modes.length);
  };

  const active = modes[activeIndex];
  const Icon = active.icon;
  const playable = canPlay(active);
  const isSelected = active.id === gameMode;

  const prev = modes[(activeIndex - 1 + modes.length) % modes.length];
  const next = modes[(activeIndex + 1) % modes.length];

  const handleSelect = () => {
    if (disabled || !playable) return;
    onGameModeChange(active.id);
  };

  return (
    <div
      className={cn("relative rounded-3xl overflow-hidden", large ? "p-6 sm:p-8" : "p-5")}
      style={{
        background: "linear-gradient(160deg, hsl(240 22% 9% / 0.85), hsl(240 28% 5% / 0.9))",
        border: "1px solid hsl(217 91% 60% / 0.25)",
        boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.06), 0 18px 40px hsl(240 50% 2% / 0.5)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className={cn("font-bold uppercase tracking-[0.25em] text-sky-300/70", large ? "text-xs" : "text-[11px]")}>
            Mode de jeu
          </p>
          <h3 className={cn("font-black text-white leading-tight", large ? "text-2xl sm:text-4xl" : "text-xl")}>
            Choisis ton terrain
          </h3>
        </div>
        <span className={cn("font-semibold text-white/50", large ? "text-sm" : "text-xs")}>
          {activeIndex + 1} / {modes.length}
        </span>
      </div>

      {/* Carousel stage */}
      <div className={cn("relative flex items-center justify-center gap-2 sm:gap-5 py-6", large ? "min-h-[320px]" : "min-h-[210px]")}>
        {/* Prev arrow */}
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={disabled}
          className={cn(
            "z-30 flex-shrink-0 rounded-full flex items-center justify-center bg-white/5 border border-white/15 text-white/80 hover:bg-sky-500/20 hover:border-sky-400/40 hover:text-white transition-all disabled:opacity-30",
            large ? "w-12 h-12" : "w-10 h-10",
          )}
          aria-label="Mode précédent"
        >
          <ChevronLeft className={large ? "w-6 h-6" : "w-5 h-5"} />
        </button>

        {/* Card deck */}
        <div className={cn("relative flex-1 flex items-center justify-center", large ? "h-[280px]" : "h-[180px]")}>
          {/* Back peek cards */}
          <DisplayCard
            title={prev.name}
            description={prev.subtitle}
            date={`Min. ${prev.minPlayers}`}
            icon={<prev.icon className="size-4 text-sky-200" />}
            titleClassName="text-sky-200/70"
            className="absolute left-1/2 top-1/2 -translate-x-[78%] -translate-y-1/2 scale-[0.82] opacity-40 blur-[1px] !bg-muted/40 border-white/5 pointer-events-none hidden sm:flex"
          />
          <DisplayCard
            title={next.name}
            description={next.subtitle}
            date={`Min. ${next.minPlayers}`}
            icon={<next.icon className="size-4 text-sky-200" />}
            titleClassName="text-sky-200/70"
            className="absolute left-1/2 top-1/2 -translate-x-[22%] -translate-y-1/2 scale-[0.82] opacity-40 blur-[1px] !bg-muted/40 border-white/5 pointer-events-none hidden sm:flex"
          />

          {/* Active featured card */}
          <AnimatePresence mode="popLayout">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 20, rotateY: -15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, rotateY: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ type: "spring", damping: 22, stiffness: 240 }}
              className="relative z-20"
            >
              <DisplayCard
                onClick={handleSelect}
                title={active.name}
                description={active.subtitle}
                date={playable ? (isSelected ? "✓ Mode actif" : "Clique pour choisir") : `Min. ${active.minPlayers} joueurs`}
                icon={<Icon className={cn(large ? "size-6" : "size-4", active.accent)} />}
                titleClassName="text-white"
                className={cn(
                  "!skew-y-0 !bg-[hsl(240_22%_11%/0.9)] !backdrop-blur-md transition-all",
                  large ? "!w-[26rem] !h-[240px] !px-6 !py-5 [&_p]:text-xl [&>div_p]:text-3xl" : "!w-[20rem] !h-[170px]",
                  isSelected
                    ? "border-sky-400/70"
                    : "border-white/10 hover:border-sky-400/40",
                  !playable && "opacity-60",
                )}
              />
              {/* Glow halo */}
              <div
                className="absolute -inset-3 -z-10 rounded-3xl pointer-events-none transition-opacity"
                style={{
                  background: `radial-gradient(circle, rgba(${active.glow},0.35), transparent 70%)`,
                  opacity: isSelected ? 1 : 0.5,
                  filter: "blur(20px)",
                }}
              />
              {/* Selected badge */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 z-30 w-7 h-7 rounded-full bg-sky-400 flex items-center justify-center border-2 border-[#05060f] shadow-lg">
                  <Check className="w-4 h-4 text-[#05060f]" strokeWidth={3} />
                </div>
              )}
              {/* Lock badge */}
              {!playable && (
                <div className="absolute top-2 right-2 z-30 w-7 h-7 rounded-full bg-black/70 border border-white/20 flex items-center justify-center">
                  <Lock className="w-3.5 h-3.5 text-white/70" />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Next arrow */}
        <button
          type="button"
          onClick={() => go(1)}
          disabled={disabled}
          className={cn(
            "z-30 flex-shrink-0 rounded-full flex items-center justify-center bg-white/5 border border-white/15 text-white/80 hover:bg-sky-500/20 hover:border-sky-400/40 hover:text-white transition-all disabled:opacity-30",
            large ? "w-12 h-12" : "w-10 h-10",
          )}
          aria-label="Mode suivant"
        >
          <ChevronRight className={large ? "w-6 h-6" : "w-5 h-5"} />
        </button>
      </div>

      {/* Description + select action */}
      <div className="mt-2 flex items-center justify-between gap-4">
        <p className={cn("text-white/60 flex-1", large ? "text-lg" : "text-sm")}>{active.description}</p>
        {!disabled && (
          <button
            type="button"
            onClick={handleSelect}
            disabled={!playable}
            className={cn(
              "flex items-center gap-2 rounded-xl font-bold transition-all flex-shrink-0",
              large ? "px-6 py-3 text-base" : "px-4 py-2 text-sm",
              isSelected
                ? "bg-sky-400/20 text-sky-200 border border-sky-400/40 cursor-default"
                : playable
                  ? "bg-gradient-to-r from-sky-500 to-violet-500 text-white hover:brightness-110 shadow-lg shadow-sky-500/30"
                  : "bg-white/5 text-white/40 border border-white/10 cursor-not-allowed",
            )}
          >
            {isSelected ? (
              <>
                <Check className={large ? "w-5 h-5" : "w-4 h-4"} /> Sélectionné
              </>
            ) : (
              <>
                <Play className={large ? "w-5 h-5" : "w-4 h-4"} /> Choisir
              </>
            )}
          </button>
        )}
      </div>

      {/* Dots */}
      <div className="mt-4 flex items-center justify-center gap-1.5">
        {modes.map((m, i) => (
          <button
            key={m.id}
            type="button"
            onClick={() => !disabled && setActiveIndex(i)}
            disabled={disabled}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === activeIndex ? "w-6 bg-sky-400" : "w-1.5 bg-white/20 hover:bg-white/40",
            )}
            aria-label={`Aller au mode ${m.name}`}
          />
        ))}
      </div>
    </div>
  );
};
