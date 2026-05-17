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
    <div className="w-full h-full bg-card/80 backdrop-blur-sm border border-primary/30 rounded-xl overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-primary/20 bg-primary/5 flex items-center gap-2 flex-shrink-0">
        <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
          <SettingsIcon className="h-4 w-4 text-primary" />
        </div>
        <h2
          className="text-xl font-bold text-primary"
          style={{ fontFamily: "'Caveat', cursive" }}
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
              Chargement des paramètres...
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export const InkSettingsPanel = memo(InkSettingsPanelComponent);
