import { useMemo, useState, useEffect } from "react";
import {
  Users,
  Swords,
  Brain,
  Phone,
  Image as ImageIcon,
  Landmark,
  UserX,
} from "lucide-react";
import { DisplayCard } from "@/components/ui/display-cards";
import { cn } from "@/lib/utils";
import { LobbyGameMode } from "@/lib/gameModes";

interface NeverLikeThatModeDeckProps {
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
  accent: string;
}

const MODES: ModeDef[] = [
  { id: "normal", name: "Imitation", subtitle: "Mode classique", icon: Users, minPlayers: 2, accent: "text-sky-300" },
  { id: "2v2", name: "2 vs 2", subtitle: "Combat en équipes", icon: Swords, minPlayers: 4, accent: "text-amber-300" },
  { id: "quiz", name: "Quiz", subtitle: "Culture générale", icon: Brain, minPlayers: 2, accent: "text-fuchsia-300" },
  { id: "audiophone", name: "Audio Phone", subtitle: "Téléphone arabe audio", icon: Phone, minPlayers: 2, accent: "text-emerald-300" },
  { id: "pixoguess", name: "BlurRush", subtitle: "Devine vite !", icon: ImageIcon, minPlayers: 2, accent: "text-violet-300" },
  { id: "monopoly", name: "Monopoly", subtitle: "Plateau 3D", icon: Landmark, minPlayers: 2, accent: "text-green-300" },
  { id: "undercover", name: "Undercover", subtitle: "Trouve l'infiltré", icon: UserX, minPlayers: 3, accent: "text-rose-300" },
];

/**
 * Game-mode selection presented as a fanned hand of 3 cards (DisplayCards style),
 * as if the robot is offering the modes. The front card is the active mode and is
 * clickable to select; the two cards behind are the neighbouring modes and bring
 * themselves to front when clicked.
 */
export const NeverLikeThatModeDeck = ({
  gameMode,
  onGameModeChange,
  playerCount,
  isAdmin = false,
  disabled = false,
}: NeverLikeThatModeDeckProps) => {
  const n = MODES.length;
  const selectedIndex = Math.max(0, MODES.findIndex((m) => m.id === gameMode));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  useEffect(() => {
    if (selectedIndex !== -1) setActiveIndex(selectedIndex);
  }, [selectedIndex]);

  const canPlay = (m: ModeDef) => isAdmin || playerCount >= m.minPlayers;

  const active = MODES[activeIndex];
  const prev = MODES[(activeIndex - 1 + n) % n];
  const next = MODES[(activeIndex + 1) % n];

  const goTo = (m: ModeDef) => {
    if (disabled) return;
    setActiveIndex(MODES.findIndex((x) => x.id === m.id));
  };

  const select = (m: ModeDef) => {
    if (disabled || !canPlay(m)) return;
    onGameModeChange(m.id);
  };

  const activeSelected = active.id === gameMode;
  const activePlayable = canPlay(active);

  const blueGlass = "!bg-[hsl(240_22%_11%/0.92)] !backdrop-blur-md border-white/10";

  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-sky-300/70">Mode de jeu</p>
        <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">Choisis ton terrain</h3>
      </div>

      {/* Fanned hand of cards */}
      <div className="grid [grid-template-areas:'stack'] place-items-center opacity-100 animate-in fade-in-0 duration-700 py-8 scale-90 sm:scale-100">
        {/* BACK card — previous mode */}
        <DisplayCard
          onClick={() => goTo(prev)}
          icon={<prev.icon className={cn("size-4", prev.accent)} />}
          title={prev.name}
          description={prev.subtitle}
          date={`Min. ${prev.minPlayers}`}
          titleClassName="text-white/90"
          className={cn(
            blueGlass,
            "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
          )}
        />
        {/* MID card — next mode */}
        <DisplayCard
          onClick={() => goTo(next)}
          icon={<next.icon className={cn("size-4", next.accent)} />}
          title={next.name}
          description={next.subtitle}
          date={`Min. ${next.minPlayers}`}
          titleClassName="text-white/90"
          className={cn(
            blueGlass,
            "[grid-area:stack] translate-x-12 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
          )}
        />
        {/* FRONT card — active mode (selectable) */}
        <DisplayCard
          onClick={() => select(active)}
          icon={<active.icon className={cn("size-4", active.accent)} />}
          title={active.name}
          description={active.subtitle}
          date={
            activeSelected
              ? "✓ Mode actif"
              : activePlayable
                ? "Clique pour choisir"
                : `Min. ${active.minPlayers} joueurs`
          }
          titleClassName="text-white"
          className={cn(
            blueGlass,
            "[grid-area:stack] translate-x-24 translate-y-20 hover:translate-y-10",
            activeSelected && "!border-sky-400/70 shadow-[0_0_30px_hsl(217_91%_60%/0.45)]",
            !activePlayable && "opacity-70",
          )}
        />
      </div>

      {/* Dots */}
      <div className="mt-2 flex items-center justify-center gap-1.5">
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
