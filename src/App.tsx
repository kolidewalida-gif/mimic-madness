import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BackgroundMusicProvider } from "@/hooks/useBackgroundMusic";
import { SoundEffectsVolumeProvider } from "@/hooks/useSoundEffectsVolume";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider } from "@/hooks/useAuth";
import { XpProvider } from "@/contexts/XpContext";
import { XpGainPopup } from "@/components/XpGainPopup";
import { RewardNotification } from "@/components/RewardNotification";
import { AdminPanel } from "@/components/AdminPanel";
import { AdminGateOverlays } from "@/components/AdminGateOverlays";
import { GameCursor } from "@/components/GameCursor";
import { InkCursorParticles } from "@/components/InkCursorParticles";
import { JuiceFxHost } from "@/components/JuiceFxHost";
import { PerfHud } from "@/components/PerfHud";
import { GamepadNavigation } from "@/hooks/useGamepadNavigation";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <BackgroundMusicProvider>
          <SoundEffectsVolumeProvider>
            <XpProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                {/* Global XP and Reward notifications */}
                <XpGainPopup />
                <RewardNotification />
                <GameCursor />
                <InkCursorParticles />
                <JuiceFxHost />
                <AdminPanel />
                <AdminGateOverlays />
                <PerfHud />
                <GamepadNavigation />
                <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </XpProvider>
          </SoundEffectsVolumeProvider>
        </BackgroundMusicProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
