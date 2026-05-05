import { cn } from '@/lib/utils';

interface MorphingBackgroundProps {
  type?: 'blob' | 'gradient' | 'aurora' | 'mesh';
  colors?: string[];
  speed?: 'slow' | 'medium' | 'fast';
  className?: string;
}

export const MorphingBackground = ({
  type = 'blob',
  colors = ['hsl(var(--primary) / 0.3)', 'hsl(270 70% 50% / 0.2)', 'hsl(200 100% 50% / 0.2)'],
  speed = 'medium',
  className = ''
}: MorphingBackgroundProps) => {
  const speedMap = { slow: '20s', medium: '12s', fast: '6s' };
  const animDuration = speedMap[speed];

  if (type === 'blob') {
    return (
      <div className={cn('absolute inset-0 overflow-hidden -z-10', className)}>
        {colors.map((color, i) => (
          <div
            key={i}
            className="absolute w-96 h-96 rounded-full blur-3xl animate-morphBlob gpu-accelerated"
            style={{
              background: color,
              left: `${20 + i * 25}%`,
              top: `${20 + i * 15}%`,
              animationDuration: animDuration,
              animationDelay: `${i * 2}s`
            }}
          />
        ))}
      </div>
    );
  }

  if (type === 'aurora') {
    return (
      <div className={cn('absolute inset-0 overflow-hidden -z-10', className)}>
        <div
          className="absolute inset-0 animate-auroraEffect gpu-accelerated"
          style={{
            background: `linear-gradient(135deg, ${colors.join(', ')})`,
            animationDuration: animDuration
          }}
        />
      </div>
    );
  }

  if (type === 'mesh') {
    return (
      <div className={cn('absolute inset-0 overflow-hidden -z-10', className)}>
        <div
          className="absolute inset-0 animate-meshGradient gpu-accelerated"
          style={{
            background: `
              radial-gradient(at 40% 20%, ${colors[0]} 0px, transparent 50%),
              radial-gradient(at 80% 0%, ${colors[1] || colors[0]} 0px, transparent 50%),
              radial-gradient(at 0% 50%, ${colors[2] || colors[0]} 0px, transparent 50%),
              radial-gradient(at 80% 50%, ${colors[0]} 0px, transparent 50%),
              radial-gradient(at 0% 100%, ${colors[1] || colors[0]} 0px, transparent 50%)
            `,
            backgroundSize: '200% 200%',
            animationDuration: animDuration
          }}
        />
      </div>
    );
  }

  return (
    <div className={cn('absolute inset-0 overflow-hidden -z-10', className)}>
      <div
        className="absolute inset-0 animate-gradientWave gpu-accelerated"
        style={{
          background: `linear-gradient(135deg, ${colors.join(', ')})`,
          backgroundSize: '200% 200%',
          animationDuration: animDuration
        }}
      />
    </div>
  );
};
