import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { playSoundEffect } from "@/hooks/useSoundEffects";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold font-body transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden group",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/30 active:scale-[0.97]",
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/30 active:scale-[0.97]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary-hover hover:shadow-md active:scale-[0.97]",
        outline: "border-2 border-border bg-transparent text-foreground hover:bg-muted hover:border-foreground-muted hover:shadow-md active:scale-[0.97]",
        ghost: "text-foreground-secondary hover:text-foreground hover:bg-muted/80 active:scale-[0.97]",
        glass: "bg-card/80 backdrop-blur-sm border border-border text-foreground hover:bg-card-hover hover:shadow-lg active:scale-[0.97]",
        hero: "bg-gradient-to-r from-primary to-primary-light text-primary-foreground font-bold hover:shadow-glow hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-lg hover:shadow-destructive/30 active:scale-[0.97]",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-hover",
        accent: "bg-accent text-accent-foreground hover:bg-accent/90 hover:shadow-lg active:scale-[0.97]",
        premium: "bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:from-purple-600 hover:to-pink-600 hover:shadow-lg hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]",
        success: "bg-success text-white hover:bg-success/90 hover:shadow-lg hover:shadow-success/30 active:scale-[0.97]",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-md px-4 text-xs",
        lg: "h-12 rounded-md px-6 text-base",
        xl: "h-14 rounded-lg px-8 text-lg",
        icon: "h-10 w-10 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  soundEffect?: 'click' | 'success' | 'vote' | 'transition' | 'countdown' | 'error' | 'whoosh' | 'message' | 'none';
  hoverSound?: boolean;
  ripple?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, soundEffect = 'click', hoverSound = true, ripple = true, onClick, onMouseEnter, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const [ripples, setRipples] = React.useState<{ x: number; y: number; id: number }[]>([]);
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (soundEffect !== 'none' && !props.disabled) {
        playSoundEffect(soundEffect);
      }
      
      // Add ripple effect
      if (ripple && !props.disabled) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = Date.now();
        
        setRipples(prev => [...prev, { x, y, id }]);
        
        // Remove ripple after animation
        setTimeout(() => {
          setRipples(prev => prev.filter(r => r.id !== id));
        }, 600);
      }
      
      onClick?.(e);
    };
    
    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (hoverSound && !props.disabled) {
        playSoundEffect('hover', 0.12);
      }
      onMouseEnter?.(e);
    };
    
    return (
      <Comp 
        className={cn(buttonVariants({ variant, size, className }))} 
        ref={ref} 
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        {...props} 
      >
        {/* Shimmer effect on hover */}
        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
        
        {/* Ripple effects */}
        {ripples.map(ripple => (
          <span
            key={ripple.id}
            className="absolute rounded-full bg-white/30 animate-[rippleEffect_0.6s_linear]"
            style={{
              left: ripple.x - 10,
              top: ripple.y - 10,
              width: 20,
              height: 20,
            }}
          />
        ))}
        
        {/* Content */}
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
