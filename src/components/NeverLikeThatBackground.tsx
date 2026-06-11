import { SplineScene } from '@/components/ui/splite';
import { Spotlight } from '@/components/ui/spotlight';

/**
 * Animated 3D background for the "Never Like That" theme.
 * Renders an interactive Spline scene behind the app with a spotlight sweep
 * and dark gradient vignettes so the foreground UI stays readable.
 *
 * The scene wrapper is pointer-events-none so the 3D layer never blocks the
 * game UI on top of it.
 */
export const NeverLikeThatBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#05060f]">
      {/* Ambient color orbs */}
      <div
        className="absolute -top-1/4 left-1/4 w-[60vw] h-[60vw] rounded-full opacity-40 blur-[120px]"
        style={{ background: 'radial-gradient(circle, hsl(217 91% 60% / 0.5), transparent 70%)' }}
      />
      <div
        className="absolute bottom-0 right-0 w-[50vw] h-[50vw] rounded-full opacity-30 blur-[120px]"
        style={{ background: 'radial-gradient(circle, hsl(270 95% 65% / 0.45), transparent 70%)' }}
      />

      {/* Spotlight sweep */}
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

      {/* Interactive 3D scene (non-blocking) */}
      <div className="absolute inset-0 pointer-events-none">
        <SplineScene
          scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
          className="w-full h-full"
        />
      </div>

      {/* Dark vignette so UI stays legible */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#05060f] via-[#05060f]/30 to-[#05060f]/60" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,#05060f_95%)]" />
    </div>
  );
};
