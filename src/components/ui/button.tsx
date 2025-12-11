import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { playSoundEffect } from "@/hooks/useSoundEffects";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold font-body transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover active:scale-[0.98]",
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover active:scale-[0.98]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary-hover active:scale-[0.98]",
        outline: "border border-border bg-transparent text-foreground hover:bg-muted hover:border-foreground-muted active:scale-[0.98]",
        ghost: "text-foreground-secondary hover:text-foreground hover:bg-muted active:scale-[0.98]",
        glass: "bg-card border border-border text-foreground hover:bg-card-hover active:scale-[0.98]",
        hero: "bg-primary text-primary-foreground font-bold hover:bg-primary-hover hover:shadow-glow active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-hover",
        accent: "bg-accent text-accent-foreground hover:bg-accent/90 active:scale-[0.98]",
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, soundEffect = 'click', onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (soundEffect !== 'none' && !props.disabled) {
        playSoundEffect(soundEffect);
      }
      onClick?.(e);
    };
    
    return (
      <Comp 
        className={cn(buttonVariants({ variant, size, className }))} 
        ref={ref} 
        onClick={handleClick}
        {...props} 
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
