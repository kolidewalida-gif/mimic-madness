import * as React from "react";
import { motion } from "framer-motion";
import {
  Users,
  Swords,
  Brain,
  Phone,
  Image as ImageIcon,
  Landmark,
  UserX,
  Check,
  Lock,
  MousePointerClick,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LobbyGameMode } from "@/lib/gameModes";

interface NeverLikeThatModeShuffleProps {
  gameMode: LobbyGameMode;
  onGameModeChange: (mode: LobbyGameMode) => void;
  playerCount: number;
  isAdmin?: boolean;
  disabled?: boolean;
}

interface ModeDef {
  id: LobbyGameMode;
  name: string;
  subtitle: string;
  icon: typeof Users;
  minPlayers: number;
  gradient: string;
  glow: string;
}

const MODES: ModeDef[] = [
  { id: "normal", name: "Imitation", subtitle: "Imite le son ou le chanteur", icon: Users, minPlayers: 2, gradient: "from-sky-500 to-blue-600", glow: "56,189,248" },
  { id: "2v2", name: "2 vs 2", subtitle: "Combat en équipes", icon: Swords, minPlayers: 4, gradient: "from-amber-500 to-orange-600", glow: "251,191,36" },
  { id: "quiz", name: "Quiz", subtitle: "Culture générale", icon: Brain, minPlayers: 2, gradient: "from-fuchsia-500 to-pink-600", glow: "232,121,249" },
  { id: "audiophone", name: "Audio Phone", subtitle: "Téléphone arabe audio", icon: Phone, minPlayers: 2, gradient: "from-emerald-500 to-teal-600", glow: "52,211,153" },
  { id: "pixoguess", name: "BlurRush", subtitle: "Devine l'image au plus vite", icon: ImageIcon, minPlayers: 2, gradient: "from-violet-500 to-indigo-600", glow: "167,139,250" },
  { id: "monopoly", name: "Monopoly", subtitle: "Plateau 3D, achète et piège", icon: Landmark, minPlayers: 2, gradient: "from-green-500 to-emerald-600", glow: "74,222,128" },
  { id: "undercover", name: "Undercover", subtitle: "Trouve l'infiltré parmi vous", icon: UserX, minPlayers: 3, gradient: "from-rose-500 to-red-600", glow: "251,113,133" },
];

type Position = "front" | "middle" | "back";

function ModeCard({
  mode,
  position,
  selected,
  playable,
  disabled,
  onShuffle,
  onSelect,
}: {
  mode: ModeDef;
  position: Position;
  selected: boolean;
  playable: boolean;
  disabled: boolean;
  onShuffle: () => void;
  onSelect: () => void;
}) {
  const dragRef = React.useRef(0);
  const isFront = position === "front";
  const Icon = mode.icon;

  return (
    <motion.div
      style={{
        zIndex: position === "front" ? 3 : position === "middle" ? 2 : 1,
      }}
      animate={{
        rotate: position === "front" ? "-6deg" : position === "middle" ? "0deg" : "6deg",
        x: position === "front" ? "0%" : position === "middle" ? "33%" : "66%",
        opacity: position === "back" ? 0.7 : 1,
      }}
      drag={isFront && !disabled}
      dragElastic={0.35}
      dragListener={isFront && !disabled}
      dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
      onDragStart={(e: any) => {
        dragRef.current = e.clientX ?? 0;
      }}
      onDragEnd={(e: any) => {
        if (dragRef.current - (e.clientX ?? 0) > 120) onShuffle();
        dragRef.current = 0;
      }}
      onClick={() => {
        if (isFront) onSelect();
      }}
      transition={{ duration: 0.35 }}
      className={cn(
        "absolute left-0 top-0 grid h-[340px] w-[280px] select-none place-content-center gap-5 rounded-3xl border-2 p-6 shadow-2xl backdrop-blur-md",
        "bg-[hsl(240_24%_9%/0.85)]",
        selected ? "border-sky-400/70" : "border-white/10",
        isFront && !disabled ? "cursor-grab active:cursor-grabbing" : "",
      )}
    >
      {/* Glow */}
      <div
        className="absolute -inset-2 -z-10 rounded-3xl pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(${mode.glow},${selected ? 0.4 : 0.22}), transparent 70%)`,
          filter: "blur(22px)",
        }}
      />

      {/* Icon */}
      <div
        className={cn(
          "pointer-events-none mx-auto flex h-28 w-28 items-center justify-center rounded-full border-2 border-white/15 bg-gradient-to-br",
          mode.gradient,
        )}
        style={{ boxShadow: `0 8px 30px rgba(${mode.glow},0.4)` }}
      >
        <Icon className="h-12 w-12 text-white" strokeWidth={2} />
      </div>

      <div className="text-center">
        <p className="text-2xl font-black text-white leading-tight">{mode.name}</p>
        <p className="mt-1 text-sm text-white/55">{mode.subtitle}</p>
      </div>

      {/* Status pill */}
      <div className="flex justify-center">
        {selected ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-400/20 border border-sky-400/40 text-sky-200 text-xs font-bold">
            <Check className="w-3.5 h-3.5" /> Mode actif
          </span>
        ) : !playable ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/15 text-white/50 text-xs font-bold">
            <Lock className="w-3.5 h-3.5" /> Min. {mode.minPlayers} joueurs
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/15 text-white/70 text-xs font-bold">
            <MousePointerClick className="w-3.5 h-3.5" /> Clique pour choisir
          </span>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Game-mode selection as a draggable shuffle stack. The front card is the
 * focused mode: drag it to the left (or use the dots) to shuffle to the next
 * mode, click it to select. Inspired by the shuffle testimonial cards.
 */
export const NeverLikeThatModeShuffle = ({
  gameMode,
  onGameModeChange,
  playerCount,
  isAdmin = false,
  disabled = false,
}: NeverLikeThatModeShuffleProps) => {
  const n = MODES.length;
  const selectedIndex = Math.max(0, MODES.findIndex((m) => m.id === gameMode));
  const [activeIndex, setActiveIndex] = React.useState(selectedIndex);

  React.useEffect(() => {
    if (selectedIndex !== -1) setActiveIndex(selectedIndex);
  }, [selectedIndex]);

  const canPlay = (m: ModeDef) => isAdmin || playerCount >= m.minPlayers;

  const handleShuffle = () => {
    if (disabled) return;
    setActiveIndex((i) => (i + 1) % n);
  };

  // Visible cards: front, middle, back
  const visible: { mode: ModeDef; position: Position }[] = [
    { mode: MODES[activeIndex], position: "front" },
    { mode: MODES[(activeIndex + 1) % n], position: "middle" },
    { mode: MODES[(activeIndex + 2) % n], position: "back" },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-sky-300/70">Mode de jeu</p>
        <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">Choisis ton terrain</h3>
      </div>

      {/* Shuffle stage */}
      <div className="relative flex items-center justify-center" style={{ height: 360, width: 360 }}>
        <div className="relative h-[340px] w-[280px] -translate-x-[14%]">
          {visible.map(({ mode, position }) => (
            <ModeCard
              key={mode.id}
              mode={mode}
              position={position}
              selected={mode.id === gameMode}
              playable={canPlay(mode)}
              disabled={disabled}
              onShuffle={handleShuffle}
              onSelect={() => !disabled && canPlay(mode) && onGameModeChange(mode.id)}
            />
          ))}
        </div>
      </div>

      {/* Hint + dots */}
      <p className="text-xs text-white/45 mb-3">
        {disabled ? "L'hôte choisit le mode" : "Glisse la carte vers la gauche pour changer · clique pour choisir"}
      </p>
      <div className="flex items-center justify-center gap-1.5">
        {MODES.map((m, i) => (
          <button
            key={m.id}
            type="button"
            onClick={() => !disabled && setActiveIndex(i)}
            disabled={disabled}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === activeIndex ? "w-6 bg-sky-400" : "w-1.5 bg-white/20 hover:bg-white/40",
            )}
            aria-label={`Mode ${m.name}`}
          />
        ))}
      </div>
    </div>
  );
};
