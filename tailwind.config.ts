import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ['Space Grotesk', 'Outfit', 'sans-serif'],
        body: ['Outfit', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        "background-secondary": "hsl(var(--background-secondary))",
        "background-accent": "hsl(var(--background-accent))",
        foreground: "hsl(var(--foreground))",
        "foreground-secondary": "hsl(var(--foreground-secondary))",
        "foreground-muted": "hsl(var(--foreground-muted))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          hover: "hsl(var(--primary-hover))",
          light: "hsl(var(--primary-light))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          hover: "hsl(var(--secondary-hover))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        card: {
          DEFAULT: "hsl(var(--card))",
          hover: "hsl(var(--card-hover))",
          foreground: "hsl(var(--card-foreground))",
        },
        glass: "hsl(var(--card))",
        "glass-border": "hsl(var(--border))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "calc(var(--radius) + 16px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        gradient: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 20px hsl(var(--primary) / 0.3)" },
          "50%": { boxShadow: "0 0 40px hsl(var(--primary) / 0.6)" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInLeft: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        fadeInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        zoomIn: {
          "0%": { opacity: "0", transform: "scale(0.8)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        zoomInBounce: {
          "0%": { opacity: "0", transform: "scale(0.5)" },
          "50%": { transform: "scale(1.05)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-50px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(50px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInUp: {
          "0%": { opacity: "0", transform: "translateY(50px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInDown: {
          "0%": { opacity: "0", transform: "translateY(-50px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        bounceIn: {
          "0%": { opacity: "0", transform: "scale(0.3)" },
          "50%": { transform: "scale(1.1)" },
          "70%": { transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 10px hsl(var(--primary) / 0.4)" },
          "50%": { boxShadow: "0 0 30px hsl(var(--primary) / 0.8)" },
        },
        pulseSlow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        bounceSlow: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        spinSlow: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        countdownPulse: {
          "0%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.2)", opacity: "0.8" },
          "100%": { transform: "scale(0.8)", opacity: "0" },
        },
        revealGlow: {
          "0%": { boxShadow: "0 0 0 rgba(34, 197, 94, 0)" },
          "50%": { boxShadow: "0 0 60px rgba(34, 197, 94, 0.6)" },
          "100%": { boxShadow: "0 0 30px rgba(34, 197, 94, 0.3)" },
        },
        scorePopIn: {
          "0%": { transform: "scale(0) rotate(-180deg)", opacity: "0" },
          "60%": { transform: "scale(1.2) rotate(10deg)" },
          "100%": { transform: "scale(1) rotate(0)", opacity: "1" },
        },
        confettiFall: {
          "0%": { transform: "translateY(-100vh) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(100vh) rotate(720deg)", opacity: "0" },
        },
        progressBar: {
          "0%": { width: "0%" },
          "100%": { width: "100%" },
        },
        timerUrgent: {
          "0%, 100%": { transform: "scale(1)", color: "hsl(var(--destructive))" },
          "50%": { transform: "scale(1.1)" },
        },
        floatUp: {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-50px)" },
        },
        textGlow: {
          "0%, 100%": { textShadow: "0 0 10px hsl(var(--primary) / 0.5)" },
          "50%": { textShadow: "0 0 30px hsl(var(--primary) / 0.8), 0 0 60px hsl(var(--primary) / 0.4)" },
        },
        borderGlow: {
          "0%, 100%": { borderColor: "hsl(var(--primary) / 0.5)" },
          "50%": { borderColor: "hsl(var(--primary))" },
        },
        podiumRise: {
          "0%": { transform: "translateY(100px)", opacity: "0" },
          "60%": { transform: "translateY(-10px)" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        crownBounce: {
          "0%, 100%": { transform: "translateY(0) rotate(-5deg)" },
          "25%": { transform: "translateY(-10px) rotate(5deg)" },
          "50%": { transform: "translateY(0) rotate(-5deg)" },
          "75%": { transform: "translateY(-5px) rotate(5deg)" },
        },
        ringExpand: {
          "0%": { transform: "scale(0.8)", opacity: "1" },
          "100%": { transform: "scale(2)", opacity: "0" },
        },
        optionAppear: {
          "0%": { opacity: "0", transform: "translateY(20px) scale(0.9)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        correctPulse: {
          "0%": { boxShadow: "0 0 0 0 rgba(34, 197, 94, 0.7)" },
          "70%": { boxShadow: "0 0 0 20px rgba(34, 197, 94, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(34, 197, 94, 0)" },
        },
        wrongShake: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-8px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(8px)" },
        },
        spotlight: {
          "0%": { opacity: "0", transform: "translate(-72%, -62%) scale(0.5)" },
          "100%": { opacity: "1", transform: "translate(-50%, -40%) scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s linear infinite",
        gradient: "gradient 3s ease infinite",
        float: "float 3s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite",
        fadeIn: "fadeIn 0.5s ease-out forwards",
        fadeInDown: "fadeInDown 0.5s ease-out forwards",
        fadeInUp: "fadeInUp 0.5s ease-out forwards",
        fadeInLeft: "fadeInLeft 0.5s ease-out forwards",
        fadeInRight: "fadeInRight 0.5s ease-out forwards",
        zoomIn: "zoomIn 0.4s ease-out forwards",
        zoomInBounce: "zoomInBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards",
        slideInLeft: "slideInLeft 0.5s ease-out forwards",
        slideInRight: "slideInRight 0.5s ease-out forwards",
        slideInUp: "slideInUp 0.5s ease-out forwards",
        slideInDown: "slideInDown 0.5s ease-out forwards",
        bounceIn: "bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "pulse-slow": "pulseSlow 3s ease-in-out infinite",
        "bounce-slow": "bounceSlow 2s ease-in-out infinite",
        "spin-slow": "spinSlow 8s linear infinite",
        shake: "shake 0.5s ease-in-out",
        wiggle: "wiggle 0.5s ease-in-out infinite",
        scaleIn: "scaleIn 0.3s ease-out forwards",
        countdownPulse: "countdownPulse 1s ease-out forwards",
        revealGlow: "revealGlow 1s ease-out forwards",
        scorePopIn: "scorePopIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards",
        confettiFall: "confettiFall 3s linear forwards",
        progressBar: "progressBar 30s linear forwards",
        timerUrgent: "timerUrgent 0.5s ease-in-out infinite",
        floatUp: "floatUp 1s ease-out forwards",
        "text-glow": "textGlow 2s ease-in-out infinite",
        "border-glow": "borderGlow 2s ease-in-out infinite",
        podiumRise: "podiumRise 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards",
        crownBounce: "crownBounce 2s ease-in-out infinite",
        ringExpand: "ringExpand 1.5s ease-out infinite",
        optionAppear: "optionAppear 0.4s ease-out forwards",
        correctPulse: "correctPulse 1s ease-out",
        wrongShake: "wrongShake 0.6s ease-in-out",
        spotlight: "spotlight 2s ease 0.75s 1 forwards",
      },
      boxShadow: {
        glow: "0 0 40px rgba(139, 92, 246, 0.4)",
        "glow-lg": "0 0 60px rgba(139, 92, 246, 0.5)",
        "glow-cyan": "0 0 40px rgba(0, 255, 255, 0.3)",
        "glow-success": "0 0 40px rgba(34, 197, 94, 0.4)",
        "glow-destructive": "0 0 40px rgba(239, 68, 68, 0.4)",
        card: "0 8px 30px rgba(0, 0, 0, 0.4)",
        "card-hover": "0 20px 60px rgba(0, 0, 0, 0.5)",
        "premium": "0 25px 80px -12px rgba(139, 92, 246, 0.35)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;