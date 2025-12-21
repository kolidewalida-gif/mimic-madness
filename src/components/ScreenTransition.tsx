import { ReactNode, useEffect, useState, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';

interface ScreenTransitionProps {
  children: ReactNode;
  screenKey: string;
  className?: string;
}

// 200 TRANSITIONS 3D FLUIDES
type TransitionStyle = 
  // Original (16)
  | 'wipe' | 'zoom' | 'slide' | 'dissolve' 
  | 'glitch' | 'portal' | 'matrix' | 'shatter' 
  | 'liquid' | 'neon' | 'cube' | 'particles'
  | 'vortex' | 'electric' | 'morph' | 'hologram'
  // 3D Rotations (20)
  | 'flipX' | 'flipY' | 'flipDiagonal' | 'rotateRoom' | 'cubeLeft' | 'cubeRight' | 'cubeUp' | 'cubeDown'
  | 'carouselLeft' | 'carouselRight' | 'carouselUp' | 'carouselDown' | 'fold' | 'unfold' | 'origami' | 'book'
  | 'turnPage' | 'revolve' | 'swing' | 'pivot'
  // Zoom Effects (20)
  | 'zoomOut' | 'zoomIn' | 'zoomRotate' | 'zoomBlur' | 'zoomBounce' | 'zoomSplit' | 'zoomSlide'
  | 'telescope' | 'microscope' | 'magnify' | 'shrink' | 'expand' | 'punch' | 'implode' | 'explode'
  | 'supernova' | 'blackHole' | 'wormhole' | 'dimensionGate' | 'hyperspace'
  // Slide Variations (25)
  | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'slideDiagonalTL' | 'slideDiagonalTR'
  | 'slideDiagonalBL' | 'slideDiagonalBR' | 'slideAndScale' | 'slideAndRotate' | 'slideAndFade'
  | 'slideElastic' | 'slideBounce' | 'slideSpring' | 'slideSnap' | 'slidePush' | 'slidePull'
  | 'slideReveal' | 'slideCover' | 'slideUncover' | 'slidePeek' | 'slideWave' | 'slideRipple'
  | 'slideZigzag' | 'slideSpiral'
  // Wipe Variations (20)
  | 'wipeLeft' | 'wipeRight' | 'wipeUp' | 'wipeDown' | 'wipeDiagonal' | 'wipeReverse'
  | 'wipeCircle' | 'wipeSquare' | 'wipeDiamond' | 'wipeHeart' | 'wipeStar' | 'wipeClock'
  | 'wipeRadial' | 'wipeBlinds' | 'wipeVenetian' | 'wipeChecker' | 'wipeMosaic' | 'wipePixelate'
  | 'wipeDissolve' | 'wipeFade'
  // Split Effects (15)
  | 'splitHorizontal' | 'splitVertical' | 'splitDiagonal' | 'splitQuad' | 'splitHex'
  | 'splitBars' | 'splitColumns' | 'splitRows' | 'splitGrid' | 'splitRandom'
  | 'splitZoom' | 'splitRotate' | 'splitFold' | 'splitPeel' | 'splitShatter'
  // Fade Variations (15)
  | 'fadeBlur' | 'fadeScale' | 'fadeRotate' | 'fadeSlide' | 'fadeColor' | 'fadeGradient'
  | 'fadeRipple' | 'fadeWave' | 'fadeSparkle' | 'fadeGlow' | 'fadeFlicker' | 'fadeStrobe'
  | 'fadePulse' | 'fadeBreathe' | 'fadeMelt'
  // Reveal Effects (20)
  | 'revealCenter' | 'revealEdges' | 'revealCorners' | 'revealSpiral' | 'revealRandom'
  | 'revealLines' | 'revealDots' | 'revealSquares' | 'revealCircles' | 'revealHexagons'
  | 'curtainOpen' | 'curtainClose' | 'blindsOpen' | 'blindsClose' | 'doorOpen' | 'doorClose'
  | 'gateOpen' | 'gateClose' | 'irisOpen' | 'irisClose'
  // Morph Effects (15)
  | 'morphBlob' | 'morphLiquid' | 'morphWave' | 'morphRipple' | 'morphDistort'
  | 'morphStretch' | 'morphSquish' | 'morphTwist' | 'morphBend' | 'morphWarp'
  | 'morphGlitch' | 'morphPixel' | 'morphNoise' | 'morphStatic' | 'morphDNA'
  // Particle Effects (20)
  | 'particleExplode' | 'particleImplode' | 'particleVortex' | 'particleSpiral' | 'particleRain'
  | 'particleSnow' | 'particleFire' | 'particleSmoke' | 'particleDust' | 'particleSparkle'
  | 'particleBubbles' | 'particleConfetti' | 'particleStars' | 'particleHearts' | 'particleEmoji'
  | 'particleCode' | 'particleNumbers' | 'particleShapes' | 'particleOrbs' | 'particleEnergy'
  // Special Effects (14)
  | 'glitchHeavy' | 'glitchRGB' | 'glitchScan' | 'glitchWave' | 'neonPulse' | 'neonFlicker'
  | 'laserScan' | 'radarSweep' | 'sonarPulse' | 'shockwave' | 'earthquake' | 'thunder'
  | 'lightning' | 'cosmic';

// All 200 transitions
const ALL_TRANSITIONS: TransitionStyle[] = [
  // Original (16)
  'wipe', 'zoom', 'slide', 'dissolve', 'glitch', 'portal', 'matrix', 'shatter',
  'liquid', 'neon', 'cube', 'particles', 'vortex', 'electric', 'morph', 'hologram',
  // 3D Rotations (20)
  'flipX', 'flipY', 'flipDiagonal', 'rotateRoom', 'cubeLeft', 'cubeRight', 'cubeUp', 'cubeDown',
  'carouselLeft', 'carouselRight', 'carouselUp', 'carouselDown', 'fold', 'unfold', 'origami', 'book',
  'turnPage', 'revolve', 'swing', 'pivot',
  // Zoom Effects (20)
  'zoomOut', 'zoomIn', 'zoomRotate', 'zoomBlur', 'zoomBounce', 'zoomSplit', 'zoomSlide',
  'telescope', 'microscope', 'magnify', 'shrink', 'expand', 'punch', 'implode', 'explode',
  'supernova', 'blackHole', 'wormhole', 'dimensionGate', 'hyperspace',
  // Slide Variations (25)
  'slideLeft', 'slideRight', 'slideUp', 'slideDown', 'slideDiagonalTL', 'slideDiagonalTR',
  'slideDiagonalBL', 'slideDiagonalBR', 'slideAndScale', 'slideAndRotate', 'slideAndFade',
  'slideElastic', 'slideBounce', 'slideSpring', 'slideSnap', 'slidePush', 'slidePull',
  'slideReveal', 'slideCover', 'slideUncover', 'slidePeek', 'slideWave', 'slideRipple',
  'slideZigzag', 'slideSpiral',
  // Wipe Variations (20)
  'wipeLeft', 'wipeRight', 'wipeUp', 'wipeDown', 'wipeDiagonal', 'wipeReverse',
  'wipeCircle', 'wipeSquare', 'wipeDiamond', 'wipeHeart', 'wipeStar', 'wipeClock',
  'wipeRadial', 'wipeBlinds', 'wipeVenetian', 'wipeChecker', 'wipeMosaic', 'wipePixelate',
  'wipeDissolve', 'wipeFade',
  // Split Effects (15)
  'splitHorizontal', 'splitVertical', 'splitDiagonal', 'splitQuad', 'splitHex',
  'splitBars', 'splitColumns', 'splitRows', 'splitGrid', 'splitRandom',
  'splitZoom', 'splitRotate', 'splitFold', 'splitPeel', 'splitShatter',
  // Fade Variations (15)
  'fadeBlur', 'fadeScale', 'fadeRotate', 'fadeSlide', 'fadeColor', 'fadeGradient',
  'fadeRipple', 'fadeWave', 'fadeSparkle', 'fadeGlow', 'fadeFlicker', 'fadeStrobe',
  'fadePulse', 'fadeBreathe', 'fadeMelt',
  // Reveal Effects (20)
  'revealCenter', 'revealEdges', 'revealCorners', 'revealSpiral', 'revealRandom',
  'revealLines', 'revealDots', 'revealSquares', 'revealCircles', 'revealHexagons',
  'curtainOpen', 'curtainClose', 'blindsOpen', 'blindsClose', 'doorOpen', 'doorClose',
  'gateOpen', 'gateClose', 'irisOpen', 'irisClose',
  // Morph Effects (15)
  'morphBlob', 'morphLiquid', 'morphWave', 'morphRipple', 'morphDistort',
  'morphStretch', 'morphSquish', 'morphTwist', 'morphBend', 'morphWarp',
  'morphGlitch', 'morphPixel', 'morphNoise', 'morphStatic', 'morphDNA',
  // Particle Effects (20)
  'particleExplode', 'particleImplode', 'particleVortex', 'particleSpiral', 'particleRain',
  'particleSnow', 'particleFire', 'particleSmoke', 'particleDust', 'particleSparkle',
  'particleBubbles', 'particleConfetti', 'particleStars', 'particleHearts', 'particleEmoji',
  'particleCode', 'particleNumbers', 'particleShapes', 'particleOrbs', 'particleEnergy',
  // Special Effects (14)
  'glitchHeavy', 'glitchRGB', 'glitchScan', 'glitchWave', 'neonPulse', 'neonFlicker',
  'laserScan', 'radarSweep', 'sonarPulse', 'shockwave', 'earthquake', 'thunder',
  'lightning', 'cosmic'
];

// Categorize transitions for sound mapping
const getTransitionSound = (style: TransitionStyle): string => {
  // 3D Rotations
  if (['flipX', 'flipY', 'flipDiagonal', 'cubeLeft', 'cubeRight', 'cubeUp', 'cubeDown', 
       'carouselLeft', 'carouselRight', 'carouselUp', 'carouselDown', 'book', 'turnPage'].includes(style)) {
    return 'whoosh';
  }
  // Portal/Wormhole effects
  if (['portal', 'wormhole', 'dimensionGate', 'hyperspace', 'vortex', 'blackHole'].includes(style)) {
    return 'transitionPortal';
  }
  // Glitch effects
  if (['glitch', 'glitchHeavy', 'glitchRGB', 'glitchScan', 'glitchWave', 'morphGlitch'].includes(style)) {
    return 'transitionGlitch';
  }
  // Particle effects
  if (style.startsWith('particle')) {
    return 'reveal';
  }
  // Electric/Energy effects
  if (['electric', 'neon', 'neonPulse', 'neonFlicker', 'lightning', 'thunder', 'shockwave', 'laserScan'].includes(style)) {
    return 'powerUp';
  }
  // Explosion effects
  if (['explode', 'supernova', 'shatter', 'splitShatter', 'earthquake'].includes(style)) {
    return 'transitionImpact';
  }
  // Zoom effects
  if (style.startsWith('zoom') || ['telescope', 'microscope', 'magnify', 'shrink', 'expand'].includes(style)) {
    return 'transitionWoosh';
  }
  // Liquid/Morph effects
  if (['liquid', 'morphBlob', 'morphLiquid', 'morphWave', 'morphRipple', 'fadeMelt'].includes(style)) {
    return 'transitionSwoosh';
  }
  // Matrix/Code effects
  if (['matrix', 'particleCode', 'particleNumbers'].includes(style)) {
    return 'cyber';
  }
  // Cosmic effects
  if (['cosmic', 'particleStars', 'hologram', 'radarSweep', 'sonarPulse'].includes(style)) {
    return 'hologram';
  }
  return 'transition';
};

export const ScreenTransition = ({ children, screenKey, className }: ScreenTransitionProps) => {
  const [displayedKey, setDisplayedKey] = useState(screenKey);
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const [phase, setPhase] = useState<'idle' | 'exit' | 'transition' | 'enter'>('idle');
  const [transitionStyle, setTransitionStyle] = useState<TransitionStyle>('wipe');
  const isFirstRender = useRef(true);
  const transitionIndex = useRef(0);

  const getNextTransitionStyle = (): TransitionStyle => {
    // Cycle through all transitions for variety
    const style = ALL_TRANSITIONS[transitionIndex.current % ALL_TRANSITIONS.length];
    transitionIndex.current++;
    return style;
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

  // Generate random particles for effects
  const particles = useMemo(() => 
    [...Array(80)].map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 8,
      delay: Math.random() * 0.5,
      duration: 0.5 + Math.random() * 1,
      angle: (i / 80) * Math.PI * 2,
      color: ['hsl(var(--primary))', 'hsl(var(--secondary))', 'white', 'hsl(186 100% 50%)', 'hsl(280 100% 60%)'][Math.floor(Math.random() * 5)]
    }))
  , [phase]);

  // 3D FLIP X TRANSITION
  const renderFlipX = () => (
    <div 
      className={cn(
        "fixed inset-0 z-[60] pointer-events-none",
        isActive ? "opacity-100" : "opacity-0"
      )}
      style={{ perspective: '2000px' }}
    >
      <div 
        className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-primary"
        style={{
          transformStyle: 'preserve-3d',
          transform: isActive ? 'rotateX(180deg)' : 'rotateX(0deg)',
          transition: 'transform 0.7s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          backfaceVisibility: 'hidden',
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 rounded-full bg-white/20 animate-pulse" />
        </div>
      </div>
    </div>
  );

  // 3D FLIP Y TRANSITION
  const renderFlipY = () => (
    <div 
      className={cn(
        "fixed inset-0 z-[60] pointer-events-none",
        isActive ? "opacity-100" : "opacity-0"
      )}
      style={{ perspective: '2000px' }}
    >
      <div 
        className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-secondary"
        style={{
          transformStyle: 'preserve-3d',
          transform: isActive ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 0.7s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        }}
      />
    </div>
  );

  // 3D CUBE ROTATION LEFT
  const renderCubeLeft = () => (
    <div 
      className={cn(
        "fixed inset-0 z-[60] pointer-events-none overflow-hidden",
        isActive ? "opacity-100" : "opacity-0"
      )}
      style={{ perspective: '1500px' }}
    >
      <div 
        className="absolute inset-0"
        style={{
          transformStyle: 'preserve-3d',
          transform: isActive ? 'translateZ(-50vw) rotateY(-90deg)' : 'translateZ(0) rotateY(0deg)',
          transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          transformOrigin: 'center center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary" 
             style={{ transform: 'translateZ(50vw)' }} />
        <div className="absolute inset-0 bg-gradient-to-br from-secondary to-primary" 
             style={{ transform: 'rotateY(90deg) translateZ(50vw)', transformOrigin: 'left center' }} />
      </div>
    </div>
  );

  // 3D CUBE ROTATION RIGHT
  const renderCubeRight = () => (
    <div 
      className={cn(
        "fixed inset-0 z-[60] pointer-events-none overflow-hidden",
        isActive ? "opacity-100" : "opacity-0"
      )}
      style={{ perspective: '1500px' }}
    >
      <div 
        className="absolute inset-0"
        style={{
          transformStyle: 'preserve-3d',
          transform: isActive ? 'translateZ(-50vw) rotateY(90deg)' : 'translateZ(0) rotateY(0deg)',
          transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent" 
             style={{ transform: 'translateZ(50vw)' }} />
        <div className="absolute inset-0 bg-gradient-to-br from-accent to-primary" 
             style={{ transform: 'rotateY(-90deg) translateZ(50vw)', transformOrigin: 'right center' }} />
      </div>
    </div>
  );

  // 3D CAROUSEL EFFECT
  const renderCarousel = (direction: 'left' | 'right' | 'up' | 'down') => {
    const rotations = {
      left: 'rotateY(-45deg) translateX(-30%)',
      right: 'rotateY(45deg) translateX(30%)',
      up: 'rotateX(45deg) translateY(-30%)',
      down: 'rotateX(-45deg) translateY(30%)',
    };
    return (
      <div 
        className={cn(
          "fixed inset-0 z-[60] pointer-events-none overflow-hidden",
          isActive ? "opacity-100" : "opacity-0"
        )}
        style={{ perspective: '1200px' }}
      >
        <div 
          className="absolute inset-0 bg-gradient-radial from-primary/80 to-background"
          style={{
            transformStyle: 'preserve-3d',
            transform: isActive ? rotations[direction] : 'rotateY(0deg) translateX(0)',
            transition: 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
            transformOrigin: 'center center',
          }}
        />
      </div>
    );
  };

  // BOOK PAGE TURN
  const renderBook = () => (
    <div 
      className={cn(
        "fixed inset-0 z-[60] pointer-events-none overflow-hidden",
        isActive ? "opacity-100" : "opacity-0"
      )}
      style={{ perspective: '2000px' }}
    >
      <div 
        className="absolute inset-0 bg-gradient-to-r from-background via-primary/20 to-primary"
        style={{
          transformStyle: 'preserve-3d',
          transform: isActive ? 'rotateY(-150deg)' : 'rotateY(0deg)',
          transition: 'transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
          transformOrigin: 'left center',
          boxShadow: isActive ? '-10px 0 50px rgba(0,0,0,0.5)' : 'none',
        }}
      />
      <div 
        className="absolute inset-0 bg-gradient-to-l from-background via-secondary/20 to-secondary"
        style={{
          transformStyle: 'preserve-3d',
          transform: isActive ? 'rotateY(-10deg)' : 'rotateY(0deg)',
          transition: 'transform 0.9s cubic-bezier(0.4, 0, 0.2, 1) 0.1s',
          transformOrigin: 'left center',
        }}
      />
    </div>
  );

  // ORIGAMI FOLD
  const renderOrigami = () => (
    <div className={cn(
      "fixed inset-0 z-[60] pointer-events-none grid grid-cols-2 grid-rows-2",
      isActive ? "opacity-100" : "opacity-0"
    )} style={{ perspective: '1000px' }}>
      {[0, 1, 2, 3].map((i) => {
        const origins = ['bottom right', 'bottom left', 'top right', 'top left'];
        const rotations = ['rotateX(90deg) rotateZ(45deg)', 'rotateX(90deg) rotateZ(-45deg)', 
                          'rotateX(-90deg) rotateZ(-45deg)', 'rotateX(-90deg) rotateZ(45deg)'];
        return (
          <div
            key={i}
            className="bg-gradient-to-br from-primary to-secondary"
            style={{
              transformStyle: 'preserve-3d',
              transform: isActive ? rotations[i] : 'rotateX(0deg)',
              transition: `transform 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${i * 0.1}s`,
              transformOrigin: origins[i],
            }}
          />
        );
      })}
    </div>
  );

  // ZOOM WITH ROTATION
  const renderZoomRotate = () => (
    <div className={cn(
      "fixed inset-0 z-[60] pointer-events-none flex items-center justify-center",
      isActive ? "opacity-100" : "opacity-0"
    )}>
      <div 
        className="w-0 h-0 rounded-full bg-gradient-conic from-primary via-secondary via-accent to-primary"
        style={{
          width: isActive ? '300vmax' : '0',
          height: isActive ? '300vmax' : '0',
          transform: isActive ? 'rotate(720deg)' : 'rotate(0deg)',
          transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </div>
  );

  // BLACK HOLE EFFECT
  const renderBlackHole = () => (
    <div className={cn(
      "fixed inset-0 z-[60] pointer-events-none flex items-center justify-center",
      isActive ? "opacity-100" : "opacity-0"
    )}>
      {/* Accretion disk */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full border-2"
          style={{
            width: `${(i + 1) * 100}px`,
            height: `${(i + 1) * 60}px`,
            borderColor: `hsl(${280 + i * 20} 100% ${60 - i * 5}%)`,
            transform: isActive ? `rotate(${i * 45}deg) scale(${1 + i * 0.5})` : 'rotate(0deg) scale(0)',
            transition: `all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${i * 0.05}s`,
            boxShadow: `0 0 ${20 + i * 10}px hsl(${280 + i * 20} 100% 50%)`,
          }}
        />
      ))}
      {/* Event horizon */}
      <div 
        className="absolute rounded-full bg-black"
        style={{
          width: isActive ? '200px' : '0',
          height: isActive ? '200px' : '0',
          boxShadow: '0 0 100px 50px rgba(0,0,0,0.9), inset 0 0 50px rgba(128,0,255,0.5)',
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </div>
  );

  // WORMHOLE TUNNEL
  const renderWormhole = () => (
    <div className={cn(
      "fixed inset-0 z-[60] pointer-events-none flex items-center justify-center overflow-hidden",
      isActive ? "opacity-100" : "opacity-0"
    )}>
      {/* Tunnel rings */}
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full border-4"
          style={{
            width: `${(20 - i) * 80}px`,
            height: `${(20 - i) * 80}px`,
            borderColor: `hsl(186 100% ${50 + i * 2}%)`,
            transform: isActive ? `translateZ(${i * -100}px) scale(${1 - i * 0.04})` : 'translateZ(0) scale(1)',
            opacity: 1 - i * 0.04,
            transition: `all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${i * 0.03}s`,
            boxShadow: `0 0 ${30 - i}px hsl(186 100% 50%)`,
          }}
        />
      ))}
    </div>
  );

  // HYPERSPACE JUMP
  const renderHyperspace = () => (
    <div className={cn(
      "fixed inset-0 z-[60] pointer-events-none overflow-hidden",
      isActive ? "opacity-100 bg-black" : "opacity-0"
    )}>
      {/* Star streaks */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute bg-white rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: isActive ? '3px' : '2px',
            height: isActive ? `${50 + p.size * 20}px` : '2px',
            transform: `rotate(${Math.atan2(p.y - 50, p.x - 50)}rad)`,
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            transitionDelay: `${p.delay * 0.3}s`,
            boxShadow: '0 0 10px white, 0 0 20px white',
          }}
        />
      ))}
      {/* Center flash */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
        style={{
          width: isActive ? '100px' : '0',
          height: isActive ? '100px' : '0',
          boxShadow: '0 0 100px 50px white',
          transition: 'all 0.3s ease-out',
        }}
      />
    </div>
  );

  // SPLIT HORIZONTAL
  const renderSplitHorizontal = () => (
    <div className={cn(
      "fixed inset-0 z-[60] pointer-events-none",
      isActive ? "opacity-100" : "opacity-0"
    )}>
      <div 
        className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-primary to-secondary"
        style={{
          transform: isActive ? 'translateY(-100%)' : 'translateY(0)',
          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
      <div 
        className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-primary to-secondary"
        style={{
          transform: isActive ? 'translateY(100%)' : 'translateY(0)',
          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </div>
  );

  // SPLIT VERTICAL
  const renderSplitVertical = () => (
    <div className={cn(
      "fixed inset-0 z-[60] pointer-events-none",
      isActive ? "opacity-100" : "opacity-0"
    )}>
      <div 
        className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-primary to-secondary"
        style={{
          transform: isActive ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
      <div 
        className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary to-secondary"
        style={{
          transform: isActive ? 'translateX(100%)' : 'translateX(0)',
          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </div>
  );

  // IRIS OPEN/CLOSE
  const renderIris = (open: boolean) => (
    <div className={cn(
      "fixed inset-0 z-[60] pointer-events-none flex items-center justify-center",
      isActive ? "opacity-100" : "opacity-0"
    )}>
      <div 
        className="rounded-full bg-gradient-radial from-transparent via-primary/50 to-primary"
        style={{
          width: isActive ? (open ? '300vmax' : '0') : (open ? '0' : '300vmax'),
          height: isActive ? (open ? '300vmax' : '0') : (open ? '0' : '300vmax'),
          transition: 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 0 100px 50px hsl(var(--primary))',
        }}
      />
    </div>
  );

  // CURTAIN EFFECT
  const renderCurtain = (direction: 'open' | 'close') => (
    <div className={cn(
      "fixed inset-0 z-[60] pointer-events-none flex",
      isActive ? "opacity-100" : "opacity-0"
    )}>
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="flex-1 bg-gradient-to-b from-primary via-secondary to-primary"
          style={{
            transform: isActive 
              ? direction === 'open' 
                ? `scaleY(0) translateY(${i % 2 === 0 ? '-100%' : '100%'})` 
                : 'scaleY(1) translateY(0)'
              : direction === 'open'
                ? 'scaleY(1) translateY(0)'
                : 'scaleY(0)',
            transition: `transform 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${i * 0.05}s`,
            transformOrigin: i % 2 === 0 ? 'top' : 'bottom',
          }}
        />
      ))}
    </div>
  );

  // SHOCKWAVE EFFECT
  const renderShockwave = () => (
    <div className={cn(
      "fixed inset-0 z-[60] pointer-events-none flex items-center justify-center",
      isActive ? "opacity-100" : "opacity-0"
    )}>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full border-4 border-white/50"
          style={{
            width: isActive ? `${(i + 1) * 400}px` : '0',
            height: isActive ? `${(i + 1) * 400}px` : '0',
            opacity: isActive ? 0 : 1,
            transition: `all ${0.8 + i * 0.1}s cubic-bezier(0.4, 0, 0.2, 1) ${i * 0.1}s`,
            boxShadow: `0 0 ${50 - i * 10}px white`,
          }}
        />
      ))}
      <div 
        className="absolute w-20 h-20 rounded-full bg-white"
        style={{
          transform: isActive ? 'scale(2)' : 'scale(0)',
          opacity: isActive ? 0 : 1,
          transition: 'all 0.3s ease-out',
          boxShadow: '0 0 100px 50px white',
        }}
      />
    </div>
  );

  // LIGHTNING EFFECT
  const renderLightning = () => (
    <div className={cn(
      "fixed inset-0 z-[60] pointer-events-none",
      isActive ? "opacity-100" : "opacity-0"
    )}>
      {/* Multiple lightning bolts */}
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          className="absolute w-full h-full"
          style={{
            opacity: isActive ? 1 : 0,
            transition: `opacity 0.1s ease ${i * 0.1}s`,
          }}
        >
          <path
            d={`M${30 + i * 15}% 0 L${35 + i * 15}% 30% L${25 + i * 15}% 35% L${40 + i * 15}% 70% L${30 + i * 15}% 75% L${45 + i * 15}% 100%`}
            stroke="white"
            strokeWidth="4"
            fill="none"
            style={{
              filter: 'drop-shadow(0 0 20px white) drop-shadow(0 0 40px hsl(186 100% 50%))',
            }}
          />
        </svg>
      ))}
      {/* Flash overlay */}
      <div 
        className="absolute inset-0 bg-white"
        style={{
          opacity: isActive ? 0.8 : 0,
          transition: 'opacity 0.05s ease',
          animation: isActive ? 'lightningFlash 0.5s ease-out' : 'none',
        }}
      />
    </div>
  );

  // COSMIC DUST
  const renderCosmic = () => (
    <div className={cn(
      "fixed inset-0 z-[60] pointer-events-none overflow-hidden",
      isActive ? "opacity-100 bg-black/80" : "opacity-0"
    )}>
      {/* Nebula clouds */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${200 + i * 100}px`,
            height: `${200 + i * 100}px`,
            left: `${10 + i * 15}%`,
            top: `${10 + i * 12}%`,
            background: `radial-gradient(circle, hsl(${280 + i * 30} 100% 50% / 0.4), transparent)`,
            filter: 'blur(40px)',
            transform: isActive ? 'scale(1.5)' : 'scale(0)',
            transition: `transform 0.8s cubic-bezier(0.4, 0, 0.2, 1) ${i * 0.1}s`,
          }}
        />
      ))}
      {/* Stars */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: isActive ? 1 : 0,
            transform: isActive ? 'scale(1)' : 'scale(0)',
            transition: `all 0.5s ease ${p.delay}s`,
            boxShadow: '0 0 10px white',
          }}
        />
      ))}
    </div>
  );

  // PARTICLE CONFETTI
  const renderParticleConfetti = () => (
    <div className={cn(
      "fixed inset-0 z-[60] pointer-events-none overflow-hidden",
      isActive ? "opacity-100" : "opacity-0"
    )}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: '-5%',
            width: `${p.size + 5}px`,
            height: `${p.size + 8}px`,
            background: p.color,
            transform: isActive 
              ? `translateY(110vh) rotate(${360 + p.angle * 180}deg)` 
              : 'translateY(0) rotate(0deg)',
            transition: `all ${1.5 + p.duration}s cubic-bezier(0.1, 0.9, 0.2, 1) ${p.delay}s`,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
          }}
        />
      ))}
    </div>
  );

  // PARTICLE FIRE
  const renderParticleFire = () => (
    <div className={cn(
      "fixed inset-0 z-[60] pointer-events-none overflow-hidden",
      isActive ? "opacity-100" : "opacity-0"
    )}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            bottom: '-10%',
            width: `${p.size * 2}px`,
            height: `${p.size * 3}px`,
            background: `radial-gradient(ellipse, hsl(${30 + p.size * 5} 100% 50%), transparent)`,
            transform: isActive 
              ? `translateY(-120vh) scale(${0.5 + Math.random()})` 
              : 'translateY(0) scale(1)',
            opacity: isActive ? 0 : 1,
            transition: `all ${1 + p.duration}s ease-out ${p.delay * 0.5}s`,
            filter: 'blur(2px)',
          }}
        />
      ))}
      {/* Base fire glow */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1/3"
        style={{
          background: 'linear-gradient(to top, hsl(15 100% 50%), transparent)',
          opacity: isActive ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />
    </div>
  );

  // PARTICLE ENERGY ORBS
  const renderParticleEnergy = () => (
    <div className={cn(
      "fixed inset-0 z-[60] pointer-events-none flex items-center justify-center",
      isActive ? "opacity-100" : "opacity-0"
    )}>
      {particles.slice(0, 30).map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: `${p.size * 3}px`,
            height: `${p.size * 3}px`,
            background: `radial-gradient(circle, ${p.color}, transparent)`,
            transform: isActive 
              ? `translate(${Math.cos(p.angle) * 50}vw, ${Math.sin(p.angle) * 50}vh)` 
              : 'translate(0, 0)',
            transition: `transform ${0.6 + p.duration * 0.3}s cubic-bezier(0.4, 0, 0.2, 1) ${p.delay * 0.5}s`,
            boxShadow: `0 0 ${20 + p.size * 5}px ${p.color}`,
          }}
        />
      ))}
    </div>
  );

  // GLITCH RGB SPLIT
  const renderGlitchRGB = () => (
    <div className={cn(
      "fixed inset-0 z-[60] pointer-events-none",
      isActive ? "opacity-100" : "opacity-0"
    )}>
      {/* Red channel */}
      <div 
        className="absolute inset-0 bg-red-500/40 mix-blend-screen"
        style={{
          transform: isActive ? 'translateX(-10px)' : 'translateX(0)',
          animation: isActive ? 'glitchChannel 0.15s ease-in-out infinite alternate' : 'none',
        }}
      />
      {/* Green channel */}
      <div 
        className="absolute inset-0 bg-green-500/40 mix-blend-screen"
        style={{
          transform: isActive ? 'translateX(10px)' : 'translateX(0)',
          animation: isActive ? 'glitchChannel 0.12s ease-in-out infinite alternate-reverse' : 'none',
        }}
      />
      {/* Blue channel */}
      <div 
        className="absolute inset-0 bg-blue-500/40 mix-blend-screen"
        style={{
          transform: isActive ? 'translateY(5px)' : 'translateY(0)',
          animation: isActive ? 'glitchChannel 0.18s ease-in-out infinite alternate' : 'none',
        }}
      />
      {/* Scan lines */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }}
      />
    </div>
  );

  // LASER SCAN
  const renderLaserScan = () => (
    <div className={cn(
      "fixed inset-0 z-[60] pointer-events-none overflow-hidden",
      isActive ? "opacity-100" : "opacity-0"
    )}>
      <div 
        className="absolute left-0 right-0 h-1 bg-red-500"
        style={{
          top: isActive ? '100%' : '0%',
          transition: 'top 0.8s linear',
          boxShadow: '0 0 30px 10px red, 0 0 60px 20px red',
        }}
      />
      {/* Grid effect that reveals */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, 
            transparent 0%, 
            transparent ${isActive ? '100%' : '0%'}, 
            rgba(255,0,0,0.1) ${isActive ? '100%' : '0%'}, 
            rgba(255,0,0,0.1) 100%)`,
          transition: 'background 0.8s linear',
        }}
      />
    </div>
  );

  // RADAR SWEEP
  const renderRadarSweep = () => (
    <div className={cn(
      "fixed inset-0 z-[60] pointer-events-none flex items-center justify-center",
      isActive ? "opacity-100" : "opacity-0"
    )}>
      {/* Radar circles */}
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full border border-green-500/30"
          style={{
            width: `${(i + 1) * 200}px`,
            height: `${(i + 1) * 200}px`,
          }}
        />
      ))}
      {/* Sweep arm */}
      <div 
        className="absolute w-1/2 h-1 origin-left"
        style={{
          background: 'linear-gradient(to right, hsl(120 100% 50%), transparent)',
          transform: isActive ? 'rotate(360deg)' : 'rotate(0deg)',
          transition: 'transform 1s linear',
          boxShadow: '0 0 20px hsl(120 100% 50%)',
        }}
      />
      {/* Trailing glow */}
      <div 
        className="absolute w-1/2 h-full origin-left"
        style={{
          background: 'conic-gradient(from -90deg, transparent, hsl(120 100% 50% / 0.3), transparent)',
          transform: isActive ? 'rotate(360deg)' : 'rotate(0deg)',
          transition: 'transform 1s linear',
        }}
      />
    </div>
  );

  // NEON PULSE
  const renderNeonPulse = () => (
    <div className={cn(
      "fixed inset-0 z-[60] pointer-events-none",
      isActive ? "opacity-100" : "opacity-0"
    )}>
      {/* Pulsing neon border */}
      <div 
        className="absolute inset-4 border-4 rounded-3xl"
        style={{
          borderColor: 'hsl(var(--primary))',
          boxShadow: isActive 
            ? '0 0 30px hsl(var(--primary)), inset 0 0 30px hsl(var(--primary)), 0 0 60px hsl(var(--primary))' 
            : 'none',
          animation: isActive ? 'neonPulse 0.3s ease-in-out infinite alternate' : 'none',
        }}
      />
      {/* Corner accents */}
      {['top-4 left-4', 'top-4 right-4', 'bottom-4 left-4', 'bottom-4 right-4'].map((pos, i) => (
        <div
          key={i}
          className={`absolute ${pos} w-20 h-20`}
          style={{
            borderLeft: i % 2 === 0 ? '4px solid hsl(186 100% 50%)' : 'none',
            borderRight: i % 2 === 1 ? '4px solid hsl(186 100% 50%)' : 'none',
            borderTop: i < 2 ? '4px solid hsl(186 100% 50%)' : 'none',
            borderBottom: i >= 2 ? '4px solid hsl(186 100% 50%)' : 'none',
            boxShadow: '0 0 20px hsl(186 100% 50%)',
            opacity: isActive ? 1 : 0,
            transition: `opacity 0.3s ease ${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );

  // DIMENSION GATE
  const renderDimensionGate = () => (
    <div className={cn(
      "fixed inset-0 z-[60] pointer-events-none flex items-center justify-center",
      isActive ? "opacity-100" : "opacity-0"
    )} style={{ perspective: '1000px' }}>
      {/* Gate frame */}
      <div 
        className="relative w-64 h-96 border-8 rounded-t-full"
        style={{
          borderColor: 'hsl(280 100% 50%)',
          boxShadow: '0 0 50px hsl(280 100% 50%), inset 0 0 50px hsl(280 100% 50%)',
          transform: isActive ? 'rotateY(0deg) scale(4)' : 'rotateY(90deg) scale(1)',
          transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Portal interior */}
        <div 
          className="absolute inset-2 rounded-t-full bg-gradient-radial from-purple-900 via-violet-600 to-transparent"
          style={{
            animation: isActive ? 'portalSwirl 2s linear infinite' : 'none',
          }}
        />
        {/* Runes */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute text-2xl"
            style={{
              left: `${10 + (i % 4) * 25}%`,
              top: `${20 + Math.floor(i / 4) * 50}%`,
              color: 'hsl(186 100% 50%)',
              textShadow: '0 0 10px currentColor',
              opacity: isActive ? 1 : 0,
              transition: `opacity 0.3s ease ${i * 0.1}s`,
            }}
          >
            ◆
          </div>
        ))}
      </div>
    </div>
  );

  // Main render - determine which transition to show
  const renderTransition = () => {
    switch (transitionStyle) {
      case 'flipX': return renderFlipX();
      case 'flipY': return renderFlipY();
      case 'cubeLeft': return renderCubeLeft();
      case 'cubeRight': return renderCubeRight();
      case 'carouselLeft': return renderCarousel('left');
      case 'carouselRight': return renderCarousel('right');
      case 'carouselUp': return renderCarousel('up');
      case 'carouselDown': return renderCarousel('down');
      case 'book':
      case 'turnPage': return renderBook();
      case 'origami':
      case 'fold': return renderOrigami();
      case 'zoomRotate': return renderZoomRotate();
      case 'blackHole': return renderBlackHole();
      case 'wormhole': return renderWormhole();
      case 'hyperspace': return renderHyperspace();
      case 'splitHorizontal': return renderSplitHorizontal();
      case 'splitVertical': return renderSplitVertical();
      case 'irisOpen': return renderIris(true);
      case 'irisClose': return renderIris(false);
      case 'curtainOpen': return renderCurtain('open');
      case 'curtainClose': return renderCurtain('close');
      case 'shockwave': return renderShockwave();
      case 'lightning':
      case 'thunder': return renderLightning();
      case 'cosmic': return renderCosmic();
      case 'particleConfetti': return renderParticleConfetti();
      case 'particleFire': return renderParticleFire();
      case 'particleEnergy':
      case 'particleOrbs': return renderParticleEnergy();
      case 'glitchRGB':
      case 'glitchHeavy': return renderGlitchRGB();
      case 'laserScan': return renderLaserScan();
      case 'radarSweep': return renderRadarSweep();
      case 'neonPulse':
      case 'neonFlicker': return renderNeonPulse();
      case 'dimensionGate': return renderDimensionGate();
      
      // Original transitions - simplified versions
      case 'glitch': return (
        <div className={cn("fixed inset-0 z-[60] pointer-events-none", isActive ? "opacity-100" : "opacity-0")}>
          <div className={cn("absolute inset-0 bg-primary/30 mix-blend-screen", isActive && "animate-glitch-r")} />
          <div className={cn("absolute inset-0 bg-cyan-500/30 mix-blend-screen", isActive && "animate-glitch-g")} />
          <div className={cn("absolute inset-0 bg-blue-500/30 mix-blend-screen", isActive && "animate-glitch-b")} />
        </div>
      );
      
      case 'portal': return (
        <div className={cn("fixed inset-0 z-[60] pointer-events-none flex items-center justify-center", isActive ? "opacity-100" : "opacity-0")}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full border-4 transition-all duration-500"
              style={{
                width: `${(i + 1) * 200}px`,
                height: `${(i + 1) * 200}px`,
                borderColor: `hsl(${357 - i * 15} 92% ${47 + i * 8}%)`,
                transform: isActive ? 'scale(1)' : 'scale(0)',
                transitionDelay: `${i * 0.08}s`,
                boxShadow: `0 0 30px hsl(${357 - i * 15} 92% ${47 + i * 8}% / 0.5)`,
              }}
            />
          ))}
        </div>
      );

      case 'matrix': return (
        <div className={cn("fixed inset-0 z-[60] pointer-events-none overflow-hidden bg-black/90", isActive ? "opacity-100" : "opacity-0")}>
          {[...Array(30)].map((_, i) => (
            <div key={i} className="absolute top-0 text-primary font-mono text-sm"
              style={{
                left: `${(i / 30) * 100}%`,
                animation: isActive ? `matrixRain ${0.5 + Math.random() * 0.5}s linear` : undefined,
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
      );

      case 'particles':
      case 'particleExplode': return (
        <div className={cn("fixed inset-0 z-[60] pointer-events-none overflow-hidden", isActive ? "opacity-100" : "opacity-0")}>
          {particles.slice(0, 60).map((p) => (
            <div key={p.id} className="absolute rounded-full"
              style={{
                left: '50%',
                top: '50%',
                width: `${p.size}px`,
                height: `${p.size}px`,
                background: p.color,
                transform: isActive 
                  ? `translate(${Math.cos(p.angle) * 100}vw, ${Math.sin(p.angle) * 100}vh)` 
                  : 'translate(-50%, -50%)',
                transition: `transform 0.8s ease-out ${p.delay}s`,
                boxShadow: `0 0 ${10 + p.size}px ${p.color}`,
              }}
            />
          ))}
        </div>
      );

      // Default wipe for remaining transitions
      default: return (
        <div 
          className={cn("fixed inset-0 z-[60] pointer-events-none origin-left", "bg-gradient-to-r from-primary via-secondary to-primary")}
          style={{
            transform: phase === 'exit' ? 'translateX(-100%)' : 
                      phase === 'transition' ? 'translateX(0%)' :
                      phase === 'enter' ? 'translateX(100%)' : 
                      'translateX(-100%)',
            transition: 'transform 0.5s cubic-bezier(0.76, 0, 0.24, 1)'
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm animate-pulse">
              <div className="w-12 h-12 rounded-full bg-white/30 animate-ping m-auto" />
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Transition Effect */}
      {renderTransition()}

      {/* Content container */}
      <div
        className={cn(
          "transition-all duration-500 gpu-accelerated",
          phase === 'exit' && "opacity-0 scale-95 blur-sm",
          phase === 'transition' && "opacity-0",
          phase === 'enter' && "opacity-100 scale-100 blur-0 animate-fade-in",
          phase === 'idle' && "opacity-100 scale-100 blur-0",
          className
        )}
      >
        {displayedChildren}
      </div>

      {/* Enhanced floating particles during transitions */}
      {(phase === 'exit' || phase === 'transition' || phase === 'enter') && (
        <div className="fixed inset-0 pointer-events-none z-[55] overflow-hidden">
          {particles.slice(0, 40).map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full animate-floatParticle"
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                left: `${p.x}%`,
                top: `${p.y}%`,
                background: p.color,
                boxShadow: `0 0 ${10 + p.size * 2}px ${p.color}`,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
