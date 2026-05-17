import { memo } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DeviceSettings } from '@/components/DeviceSettings';

const InkSettingsPanelComponent = () => {
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
          {/* DeviceSettings is rendered inline here. The carousel itself is the
              dismissal mechanism, so we intentionally do NOT pass an onClose. */}
          <DeviceSettings showPreview />
        </div>
      </ScrollArea>
    </div>
  );
};

export const InkSettingsPanel = memo(InkSettingsPanelComponent);
