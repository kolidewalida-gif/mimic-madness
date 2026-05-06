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
import { GameCursor } from "@/components/GameCursor";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
                <AdminPanel />
                <BrowserRouter>
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
