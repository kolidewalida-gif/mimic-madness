"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface GalleryItem {
  common: string;
  binomial: string;
  photo: {
    url: string;
    text?: string;
    pos?: string;
    by?: string;
  };
  /** When provided, a muted video thumbnail is rendered instead of an image */
  videoUrl?: string;
}

interface CircularGalleryProps {
  items: GalleryItem[];
  initialIndex?: number;
  /** Fired when the focused (centered) card is clicked */
  onItemClick?: (index: number) => void;
  /** Fired when the centered card changes (after a drag snap or a side click) */
  onActiveChange?: (index: number) => void;
  /** Indices that should be highlighted as selected */
  selectedIndices?: number[];
  /** Optional badge node per index (e.g. selection slot number) */
  badges?: Record<number, React.ReactNode>;
  className?: string;
  /** Stage height in px */
  height?: number;
}

const SPACING = 168; // horizontal px between adjacent card centers

export function CircularGallery({
  items,
  initialIndex = 0,
  onItemClick,
  onActiveChange,
  selectedIndices = [],
  badges,
  className,
  height = 320,
}: CircularGalleryProps) {
  const n = items.length;
  const [pos, setPos] = React.useState(initialIndex);
  const [dragging, setDragging] = React.useState(false);
  const posRef = React.useRef(initialIndex);
  const startXRef = React.useRef(0);
  const startPosRef = React.useRef(0);
  const movedRef = React.useRef(false);
  const activeRef = React.useRef(Math.round(initialIndex));

  const clamp = React.useCallback((v: number) => Math.max(0, Math.min(n - 1, v)), [n]);

  React.useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  const commitActive = React.useCallback(
    (idx: number) => {
      if (idx !== activeRef.current) {
        activeRef.current = idx;
        onActiveChange?.(idx);
      }
    },
    [onActiveChange],
  );

  // Window-level drag so it keeps working outside the stage
  React.useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - startXRef.current;
      if (Math.abs(dx) > 4) movedRef.current = true;
      setPos(clamp(startPosRef.current - dx / SPACING));
    };
    const onUp = () => {
      setDragging(false);
      const snapped = clamp(Math.round(posRef.current));
      setPos(snapped);
      commitActive(snapped);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, clamp, commitActive]);

  const onPointerDown = (e: React.PointerEvent) => {
    movedRef.current = false;
    startXRef.current = e.clientX;
    startPosRef.current = posRef.current;
    setDragging(true);
  };

  const handleCardClick = (i: number) => {
    if (movedRef.current) return; // it was a drag
    const active = Math.round(posRef.current);
    if (i === active) {
      onItemClick?.(i);
    } else {
      setPos(clamp(i));
      commitActive(clamp(i));
    }
  };

  if (!n) return null;

  return (
    <div
      className={cn("relative w-full select-none", className)}
      style={{ height, perspective: "1400px", touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}
      onPointerDown={onPointerDown}
    >
      <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
        {items.map((item, i) => {
          const d = i - pos;
          const abs = Math.abs(d);
          if (abs > 3.6) return null;
          const translateX = d * SPACING;
          const rotateY = Math.max(-52, Math.min(52, -d * 42));
          const translateZ = -abs * 90;
          const scale = Math.max(0.5, 1 - abs * 0.16);
          const opacity = Math.max(0, 1 - abs * 0.3);
          const zIndex = 1000 - Math.round(abs * 10);
          const isSelected = selectedIndices.includes(i);
          const isCenter = Math.round(pos) === i;

          return (
            <div
              key={i}
              onClick={() => handleCardClick(i)}
              className="absolute left-1/2 top-1/2 rounded-2xl overflow-hidden"
              style={{
                width: 300,
                height: 178,
                marginLeft: -150,
                marginTop: -89,
                transform: `translate3d(${translateX}px,0,${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                opacity,
                zIndex,
                transition: dragging ? "none" : "transform 0.45s cubic-bezier(.22,.61,.36,1), opacity 0.45s",
                border: isSelected ? "3px solid #fbbf24" : "3px solid var(--ink-line)",
                boxShadow: isSelected
                  ? "0 10px 30px rgba(0,0,0,0.6), 0 0 22px rgba(251,191,36,0.55)"
                  : "0 12px 34px rgba(0,0,0,0.6)",
                background: "#0a0510",
                cursor: "pointer",
              }}
            >
              {/* media */}
              {item.videoUrl ? (
                <video
                  /**
                   * Seule la carte centrale télécharge des octets.
                   *
                   * Charger toutes les vignettes en même temps ouvrait autant de
                   * téléchargements vidéo concurrents que de clips. Sur des
                   * fichiers de plusieurs dizaines de Mo, et surtout dans
                   * l'aperçu Lovable (iframe, requêtes vers Supabase bridées et
                   * partitionnées par le navigateur), ces transferts saturaient
                   * les connexions disponibles : les lectures du salon
                   * expiraient et les écritures n'obtenaient jamais de
                   * connexion. Une seule vidéo à la fois suffit à l'aperçu.
                   */
                  src={isCenter ? `${item.videoUrl}#t=0.5` : undefined}
                  className="pointer-events-none absolute inset-0 w-full h-full object-cover"
                  style={{ objectPosition: item.photo.pos || "center" }}
                  muted
                  playsInline
                  preload={isCenter ? "metadata" : "none"}
                  draggable={false}
                />
              ) : (
                <img
                  src={item.photo.url}
                  alt={item.photo.text || item.common}
                  className="pointer-events-none absolute inset-0 w-full h-full object-cover"
                  style={{ objectPosition: item.photo.pos || "center" }}
                  draggable={false}
                  loading="lazy"
                />
              )}

              {/* dim non-center cards a touch */}
              {!isCenter && <div className="absolute inset-0 bg-black/30 pointer-events-none" />}

              {/* label */}
              <div className="absolute inset-x-0 bottom-0 p-2.5 pt-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none">
                <p className="text-sm font-black text-white truncate" style={{ fontFamily: "'Outfit', sans-serif", textShadow: 'none' }}>
                  {item.common}
                </p>
                {item.binomial && <p className="text-[11px] text-white/60 truncate">{item.binomial}</p>}
              </div>

              {/* selection badge */}
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 z-10 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(180deg,#fbbf24,#d97706)", border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                  {badges?.[i] ?? (
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CircularGallery;
