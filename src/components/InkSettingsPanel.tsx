import { memo, useEffect, useRef, useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DeviceSettings } from '@/components/DeviceSettings';
import { VolumeControl } from '@/components/VolumeControl';
import { SoundEffectsVolumeControl } from '@/components/SoundEffectsVolumeControl';

interface InkSettingsPanelProps {
  isActive: boolean;
}

const InkSettingsPanelComponent = ({ isActive }: InkSettingsPanelProps) => {
  // Lazy-mount DeviceSettings to avoid triggering getUserMedia on carousel load.
  const hasOpenedRef = useRef(false);
  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    if (isActive && !hasOpenedRef.current) {
      hasOpenedRef.current = true;
      setShouldMount(true);
    }
  }, [isActive]);

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,43,43,0.3)',
        boxShadow: '0 0 30px rgba(255,43,43,0.15), inset 0 0 30px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#ff2b2b]/20 flex items-center gap-3 flex-shrink-0">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{
            background: 'rgba(255,43,43,0.15)',
            border: '1px solid rgba(255,43,43,0.3)',
            boxShadow: '0 0 10px rgba(255,43,43,0.2)',
          }}
        >
          <SettingsIcon className="h-4 w-4" style={{ color: '#ff2b2b' }} />
        </div>
        <h2
          className="text-xl font-bold"
          style={{
            fontFamily: "'Caveat', cursive",
            color: '#ff2b2b',
            textShadow: '0 0 10px rgba(255,43,43,0.5)',
          }}
        >
          PARAMETRES
        </h2>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {/* Volume controls */}
          <div className="space-y-3">
            <VolumeControl />
            <SoundEffectsVolumeControl />
          </div>

          {/* Device settings */}
          <div className="border-t border-[#ff2b2b]/10 pt-4">
            {shouldMount ? (
              <DeviceSettings showPreview />
            ) : (
              <div className="p-6 text-sm text-gray-500 text-center">
                Ouvrez ce panneau pour configurer vos appareils audio et video.
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export const InkSettingsPanel = memo(InkSettingsPanelComponent);
