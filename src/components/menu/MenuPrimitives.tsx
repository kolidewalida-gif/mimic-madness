import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const MenuShell = ({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('ibs-shell menu-surface menu-screen-safe', className)} {...props}>{children}</div>
);

export const MenuPanel = ({ children, className, accent, ...props }: HTMLAttributes<HTMLDivElement> & { accent?: string }) => (
  <section className={cn('ibs-panel', className)} style={accent ? { '--menu-accent': accent } as CSSProperties : undefined} {...props}>
    {children}
  </section>
);

export const StatusBadge = ({ children, tone = 'neutral', className }: {
  children: ReactNode;
  tone?: 'neutral' | 'online' | 'network' | 'host' | 'danger';
  className?: string;
}) => <span className={cn('ibs-status', `ibs-status--${tone}`, className)}>{children}</span>;

interface MenuButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'primary' | 'host' | 'neutral' | 'danger';
  busy?: boolean;
  icon?: ReactNode;
}

export const MenuButton = ({ children, tone = 'primary', busy = false, icon, className, disabled, ...props }: MenuButtonProps) => (
  <button
    type="button"
    className={cn('ibs-button menu-focus menu-action', `ibs-button--${tone}`, className)}
    disabled={disabled || busy}
    aria-busy={busy}
    {...props}
  >
    {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : icon}
    <span>{children}</span>
  </button>
);

export const MenuIconButton = ({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button type="button" className={cn('ibs-icon-button menu-focus menu-icon-control', className)} {...props}>{children}</button>
);

export const SetupSection = ({ eyebrow, title, children, className }: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  className?: string;
}) => (
  <section className={cn('ibs-setup-section', className)}>
    <header className="ibs-section-heading">
      {eyebrow && <span>{eyebrow}</span>}
      <h3>{title}</h3>
    </header>
    {children}
  </section>
);