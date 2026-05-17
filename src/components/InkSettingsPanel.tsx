import { memo, useEffect, useRef, useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DeviceSettings } from '@/components/DeviceSettings';

interface InkSettingsPanelProps {
  /** True when the settings panel is the active carousel view. */
  isActive: boolean;
}

const InkSettingsPanelComponent = ({ isActive }: InkSettingsPanelProps) => {
  // useMediaDevices unconditionally calls getUserMedia({audio,video}) on
  // mount, which would trigger the browser permission prompt as soon as the
  // carousel renders. We defer mounting DeviceSettings until the user opens
  // the Settings panel for the first time (review issue #6). Once mounted we
  // keep it alive so toggling away and back doesn't re-prompt.
  const hasOpenedRef = useRef(false);
  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    if (isActive && !hasOpenedRef.current) {
      hasOpenedRef.current = true;
      setShouldMount(true);
    }
  }, [isActive]);

  return (
    <div className="w-full h-full bg-[#050505]/95 backdrop-blur-md border border-[#ff2b2b]/30 rounded-2xl overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-[#ff2b2b]/20 bg-[#ff2b2b]/5 flex items-center gap-3 flex-shrink-0">
        <div className="w-10 h-10 rounded-lg bg-[#ff2b2b]/20 flex items-center justify-center border border-[#ff2b2b]/40">
          <SettingsIcon className="h-5 w-5 text-[#ff2b2b]" />
        </div>
        <h2
          className="text-2xl font-bold text-[#ff2b2b]"
          style={{ 
            fontFamily: "'Caveat', cursive",
            textShadow: '0 0 20px rgba(255, 43, 43, 0.4)',
          }}
        >
          Paramètres
        </h2>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3">
          {shouldMount ? (
            // DeviceSettings is rendered inline here. The carousel itself is
            // the dismissal mechanism, so we intentionally do NOT pass an
            // onClose.
            <DeviceSettings showPreview />
          ) : (
            <div className="p-6 text-sm text-muted-foreground text-center">
              Ouvrez ce panneau pour configurer vos appareils audio et vidéo.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export const InkSettingsPanel = memo(InkSettingsPanelComponent);
