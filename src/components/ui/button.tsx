import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold font-display tracking-wide transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 uppercase",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover hover:shadow-neon active:scale-95",
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover hover:shadow-neon active:scale-95",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary-hover hover:shadow-neon-pink active:scale-95",
        outline: "border-2 border-primary/50 bg-transparent text-primary hover:bg-primary/10 hover:border-primary hover:shadow-neon active:scale-95",
        ghost: "text-foreground-secondary hover:text-primary hover:bg-primary/10 active:scale-95",
        glass: "glass border border-glass-border text-foreground hover:bg-card-hover hover:shadow-neon/50 active:scale-95",
        hero: "bg-gradient-neon text-primary-foreground font-bold hover:scale-105 hover:shadow-neon shadow-lg active:scale-100",
        destructive: "bg-destructive text-white hover:bg-destructive/90 hover:shadow-[0_0_20px_hsl(0_100%_60%/0.5)] active:scale-95",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-hover",
        accent: "bg-accent text-accent-foreground hover:bg-accent/90 hover:shadow-neon-purple active:scale-95",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 rounded-lg px-4 text-xs",
        lg: "h-14 rounded-xl px-8 text-base",
        xl: "h-16 rounded-2xl px-10 text-lg",
        icon: "h-12 w-12 rounded-xl",
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };