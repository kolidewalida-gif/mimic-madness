import { ReactNode, useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';

interface ScreenTransitionProps {
  children: ReactNode;
  screenKey: string;
  className?: string;
}

type TransitionStyle = 
  | 'wipe' | 'zoom' | 'slide' | 'dissolve' 
  | 'glitch' | 'portal' | 'matrix' | 'shatter' 
  | 'liquid' | 'neon' | 'cube' | 'particles';

export const ScreenTransition = ({ children, screenKey, className }: ScreenTransitionProps) => {
  const [displayedKey, setDisplayedKey] = useState(screenKey);
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const [phase, setPhase] = useState<'idle' | 'exit' | 'transition' | 'enter'>('idle');
  const [transitionStyle, setTransitionStyle] = useState<TransitionStyle>('wipe');
  const isFirstRender = useRef(true);

  const getNextTransitionStyle = (): TransitionStyle => {
    const styles: TransitionStyle[] = [
      'wipe', 'zoom', 'slide', 'dissolve',
      'glitch', 'portal', 'matrix', 'shatter',
      'liquid', 'neon', 'cube', 'particles'
    ];
    return styles[Math.floor(Math.random() * styles.length)];
  };

  const getTransitionSound = (style: TransitionStyle) => {
    switch (style) {
      case 'glitch': return 'transitionGlitch';
      case 'portal': return 'transitionPortal';
      case 'matrix': return 'cyber';
      case 'shatter': return 'transitionImpact';
      case 'liquid': return 'transitionSwoosh';
      case 'neon': return 'powerUp';
      case 'cube': return 'whoosh';
      case 'particles': return 'reveal';
      default: return 'transition';
    }
  };

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setDisplayedKey(screenKey);
      setDisplayedChildren(children);
      return;
    }

    if (screenKey !== displayedKey) {
      const newStyle = getNextTransitionStyle();
      setTransitionStyle(newStyle);
      
      playSoundEffect('whoosh', 0.4);
      setPhase('exit');
      
      const exitTimer = setTimeout(() => {
        setPhase('transition');
        playSoundEffect(getTransitionSound(newStyle) as any, 0.5);
        
        const transitionTimer = setTimeout(() => {
          setDisplayedKey(screenKey);
          setDisplayedChildren(children);
          setPhase('enter');
          
          const enterTimer = setTimeout(() => {
            setPhase('idle');
          }, 600);
          
          return () => clearTimeout(enterTimer);
        }, 500);
        
        return () => clearTimeout(transitionTimer);
      }, 400);

      return () => clearTimeout(exitTimer);
    } else {
      setDisplayedChildren(children);
    }
  }, [screenKey, children, displayedKey]);

  const isActive = phase === 'exit' || phase === 'transition';

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* GLITCH Transition */}
      {transitionStyle === 'glitch' && (
        <div className={cn(
          "fixed inset-0 z-[60] pointer-events-none",
          isActive ? "opacity-100" : "opacity-0"
        )}>
          {/* RGB Split layers */}
          <div className={cn(
            "absolute inset-0 bg-primary/30 mix-blend-screen",
            isActive && "animate-glitch-r"
          )} />
          <div className={cn(
            "absolute inset-0 bg-cyan-500/30 mix-blend-screen",
            isActive && "animate-glitch-g"
          )} />
          <div className={cn(
            "absolute inset-0 bg-blue-500/30 mix-blend-screen",
            isActive && "animate-glitch-b"
          )} />
          {/* Scan lines */}
          <div className="absolute inset-0 bg-scanlines opacity-20" />
          {/* Glitch slices */}
          {isActive && [...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-full bg-background"
              style={{
                height: `${8 + Math.random() * 4}%`,
                top: `${i * 12.5}%`,
                transform: `translateX(${(Math.random() - 0.5) * 100}px)`,
                animation: `glitchSlice 0.1s ease ${i * 0.02}s infinite alternate`,
              }}
            />
          ))}
        </div>
      )}

      {/* PORTAL Transition */}
      {transitionStyle === 'portal' && (
        <div className={cn(
          "fixed inset-0 z-[60] pointer-events-none flex items-center justify-center",
          isActive ? "opacity-100" : "opacity-0"
        )}>
          {/* Concentric rings */}
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "absolute rounded-full border-4 transition-all duration-500",
                isActive ? "scale-100 opacity-100" : "scale-0 opacity-0"
              )}
              style={{
                width: `${(i + 1) * 200}px`,
                height: `${(i + 1) * 200}px`,
                borderColor: `hsl(${357 - i * 15} 92% ${47 + i * 8}%)`,
                animation: isActive ? `portalRing 0.8s ease-out ${i * 0.08}s forwards` : undefined,
                boxShadow: `0 0 30px hsl(${357 - i * 15} 92% ${47 + i * 8}% / 0.5)`,
              }}
            />
          ))}
          {/* Center vortex */}
          <div className={cn(
            "absolute w-24 h-24 rounded-full bg-primary transition-all duration-300",
            isActive && "animate-portalCore"
          )} style={{ boxShadow: '0 0 60px hsl(var(--primary))' }} />
          {/* Spiral particles */}
          {isActive && [...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-white"
              style={{
                animation: `spiralIn 0.6s ease-out ${i * 0.03}s forwards`,
                transformOrigin: 'center center',
              }}
            />
          ))}
        </div>
      )}

      {/* MATRIX Transition */}
      {transitionStyle === 'matrix' && (
        <div className={cn(
          "fixed inset-0 z-[60] pointer-events-none overflow-hidden",
          isActive ? "opacity-100" : "opacity-0",
          "bg-black/90"
        )}>
          {/* Matrix rain columns */}
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute top-0 text-primary font-mono text-sm leading-none"
              style={{
                left: `${(i / 30) * 100}%`,
                animation: isActive ? `matrixRain ${0.5 + Math.random() * 0.5}s linear ${Math.random() * 0.3}s` : undefined,
                textShadow: '0 0 10px hsl(var(--primary))',
              }}
            >
              {[...Array(20)].map((_, j) => (
                <div key={j} style={{ opacity: 1 - j * 0.05 }}>
                  {String.fromCharCode(0x30A0 + Math.random() * 96)}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* SHATTER Transition */}
      {transitionStyle === 'shatter' && (
        <div className={cn(
          "fixed inset-0 z-[60] pointer-events-none",
          isActive ? "opacity-100" : "opacity-0"
        )}>
          {/* Shattered pieces */}
          {isActive && [...Array(24)].map((_, i) => {
            const row = Math.floor(i / 6);
            const col = i % 6;
            return (
              <div
                key={i}
                className="absolute bg-gradient-to-br from-primary to-secondary"
                style={{
                  width: '17%',
                  height: '25%',
                  left: `${col * 16.67}%`,
                  top: `${row * 25}%`,
                  animation: `shatterPiece 0.6s ease-out ${i * 0.02}s forwards`,
                  transformOrigin: 'center center',
                  clipPath: 'polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%)',
                }}
              />
            );
          })}
          {/* Impact point flash */}
          <div className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            "w-32 h-32 rounded-full bg-white",
            isActive && "animate-impactFlash"
          )} />
        </div>
      )}

      {/* LIQUID Transition */}
      {transitionStyle === 'liquid' && (
        <div className={cn(
          "fixed inset-0 z-[60] pointer-events-none overflow-hidden",
          isActive ? "opacity-100" : "opacity-0"
        )}>
          {/* Liquid blobs */}
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-primary"
              style={{
                width: `${150 + i * 100}%`,
                height: `${150 + i * 100}%`,
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                animation: isActive ? `liquidMorph 0.7s ease-in-out ${i * 0.08}s forwards` : undefined,
                filter: 'blur(20px)',
                opacity: 0.8 - i * 0.15,
              }}
            />
          ))}
          {/* Surface tension effect */}
          <svg className="absolute inset-0 w-full h-full">
            <filter id="liquid-filter">
              <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale={isActive ? 100 : 0} />
            </filter>
          </svg>
        </div>
      )}

      {/* NEON Transition */}
      {transitionStyle === 'neon' && (
        <div className={cn(
          "fixed inset-0 z-[60] pointer-events-none overflow-hidden",
          isActive ? "opacity-100" : "opacity-0"
        )}>
          {/* Neon sweep bar */}
          <div
            className={cn(
              "absolute top-0 h-full w-8 bg-primary",
              isActive && "animate-neonSweep"
            )}
            style={{
              boxShadow: '0 0 60px 30px hsl(var(--primary)), 0 0 100px 60px hsl(var(--primary) / 0.5)',
            }}
          />
          {/* Trailing glow lines */}
          {isActive && [...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute top-0 h-full w-1 bg-white/50"
              style={{
                animation: `neonTrail 0.6s ease-out ${0.1 + i * 0.05}s forwards`,
                boxShadow: '0 0 20px 5px white',
              }}
            />
          ))}
          {/* Grid lines that light up */}
          <div className="absolute inset-0 grid grid-cols-12 grid-rows-8">
            {[...Array(96)].map((_, i) => (
              <div
                key={i}
                className="border border-primary/20"
                style={{
                  animation: isActive ? `gridLightUp 0.1s ease ${i * 0.01}s forwards` : undefined,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* CUBE Transition */}
      {transitionStyle === 'cube' && (
        <div className={cn(
          "fixed inset-0 z-[60] pointer-events-none perspective-1000",
          isActive ? "opacity-100" : "opacity-0"
        )} style={{ perspective: '1000px' }}>
          {/* 3D Cube faces */}
          <div className={cn(
            "absolute inset-0 preserve-3d transition-transform duration-700",
            isActive && "animate-cubeRotate"
          )} style={{ transformStyle: 'preserve-3d' }}>
            {/* Front */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary" 
                 style={{ transform: 'translateZ(50vh)' }} />
            {/* Back */}
            <div className="absolute inset-0 bg-gradient-to-br from-secondary to-primary" 
                 style={{ transform: 'translateZ(-50vh) rotateY(180deg)' }} />
            {/* Right */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-secondary/80" 
                 style={{ transform: 'translateX(50vh) rotateY(90deg)', transformOrigin: 'right center' }} />
          </div>
        </div>
      )}

      {/* PARTICLES Transition */}
      {transitionStyle === 'particles' && (
        <div className={cn(
          "fixed inset-0 z-[60] pointer-events-none overflow-hidden",
          isActive ? "opacity-100" : "opacity-0"
        )}>
          {/* Particle explosion from center */}
          {isActive && [...Array(60)].map((_, i) => {
            const angle = (i / 60) * Math.PI * 2;
            const distance = 100 + Math.random() * 50;
            return (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: `${4 + Math.random() * 12}px`,
                  height: `${4 + Math.random() * 12}px`,
                  left: '50%',
                  top: '50%',
                  background: `hsl(${357 + Math.random() * 30 - 15} 92% ${50 + Math.random() * 30}%)`,
                  boxShadow: `0 0 ${10 + Math.random() * 20}px currentColor`,
                  animation: `particleExplode 0.8s ease-out forwards`,
                  '--angle': `${angle}rad`,
                  '--distance': `${distance}vh`,
                } as any}
              />
            );
          })}
          {/* Central flash */}
          <div className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white",
            isActive && "animate-particleFlash"
          )} style={{ boxShadow: '0 0 100px 50px white' }} />
        </div>
      )}

      {/* WIPE Transition (enhanced) */}
      {transitionStyle === 'wipe' && (
        <div 
          className={cn(
            "fixed inset-0 z-[60] pointer-events-none origin-left",
            "bg-gradient-to-r from-primary via-secondary to-primary",
          )}
          style={{
            transform: phase === 'exit' ? 'translateX(-100%) scaleX(1)' : 
                      phase === 'transition' ? 'translateX(0%) scaleX(1)' :
                      phase === 'enter' ? 'translateX(100%) scaleX(1)' : 
                      'translateX(-100%) scaleX(1)',
            transition: 'transform 0.5s cubic-bezier(0.76, 0, 0.24, 1)'
          }}
        >
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="absolute h-full w-1 bg-white/30"
                style={{
                  left: `${(i + 1) * 10}%`,
                  animation: isActive ? `slideDown 0.3s ease-out ${i * 0.03}s` : undefined,
                }}
              />
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-pulse">
              <div className="w-12 h-12 rounded-full bg-white/30 animate-ping" />
            </div>
          </div>
        </div>
      )}

      {/* ZOOM Transition (enhanced) */}
      {transitionStyle === 'zoom' && (
        <div className={cn(
          "fixed inset-0 z-[60] pointer-events-none flex items-center justify-center",
          isActive ? "opacity-100" : "opacity-0"
        )}>
          <div className={cn(
            "rounded-full bg-primary transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
            phase === 'exit' && "w-0 h-0",
            phase === 'transition' && "w-[300vmax] h-[300vmax]",
            phase === 'enter' && "w-[300vmax] h-[300vmax] opacity-0",
            phase === 'idle' && "w-0 h-0"
          )}>
            <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-ping" />
            <div className="absolute inset-4 rounded-full border-2 border-white/10 animate-ping" style={{ animationDelay: '0.1s' }} />
          </div>
        </div>
      )}

      {/* SLIDE Transition (enhanced) */}
      {transitionStyle === 'slide' && (
        <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute top-0 h-full bg-gradient-to-b from-primary to-secondary"
              style={{
                width: '25%',
                left: `${i * 25}%`,
                transform: isActive ? 'translateY(0%)' : i % 2 === 0 ? 'translateY(-100%)' : 'translateY(100%)',
                transition: `transform 0.5s cubic-bezier(0.76, 0, 0.24, 1) ${i * 0.05}s`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
            </div>
          ))}
        </div>
      )}

      {/* DISSOLVE Transition (enhanced) */}
      {transitionStyle === 'dissolve' && (
        <div className={cn(
          "fixed inset-0 z-[60] pointer-events-none",
          isActive ? "opacity-100" : "opacity-0"
        )}>
          <div className="absolute inset-0 grid grid-cols-10 grid-rows-8">
            {[...Array(80)].map((_, i) => (
              <div
                key={i}
                className="transition-all duration-300"
                style={{
                  background: `linear-gradient(135deg, hsl(var(--primary)) ${Math.random() * 50}%, hsl(var(--secondary)) 100%)`,
                  opacity: isActive ? 1 : 0,
                  transform: isActive ? 'scale(1)' : 'scale(0)',
                  transitionDelay: `${Math.random() * 0.3}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Content container */}
      <div
        className={cn(
          "transition-all duration-500",
          phase === 'exit' && "opacity-0 scale-95 blur-sm",
          phase === 'transition' && "opacity-0",
          phase === 'enter' && "opacity-100 scale-100 blur-0 animate-fade-in",
          phase === 'idle' && "opacity-100 scale-100 blur-0",
          className
        )}
      >
        {displayedChildren}
      </div>

      {/* Enhanced floating particles */}
      {(phase === 'exit' || phase === 'transition' || phase === 'enter') && (
        <div className="fixed inset-0 pointer-events-none z-[55] overflow-hidden">
          {[...Array(40)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-floatParticle"
              style={{
                width: `${3 + Math.random() * 10}px`,
                height: `${3 + Math.random() * 10}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: i % 3 === 0 ? 'hsl(var(--primary))' : i % 3 === 1 ? 'hsl(var(--secondary))' : 'white',
                boxShadow: `0 0 ${10 + Math.random() * 20}px currentColor`,
                animationDuration: `${0.8 + Math.random() * 1.5}s`,
                animationDelay: `${Math.random() * 0.4}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};