import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage, languageConfig, type LanguageCode } from '@/hooks/useLanguage';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LanguageMenuProps {
  /** Extra classes for the trigger button (sizing/positioning in a toolbar). */
  className?: string;
  /** Where the dropdown opens relative to the trigger. Defaults to "end". */
  align?: 'start' | 'center' | 'end';
}

/**
 * Language picker button. Cosmetic for now — the game's UI text stays in
 * French — but it's a real, fully keyboard- and screen-reader-accessible
 * control (Radix DropdownMenu gives us roving focus, arrow-key navigation,
 * Escape-to-close and `role="menu"`/`role="menuitemradio"` for free) so
 * players who need assistive tech aren't stuck with a decorative button.
 * The chosen language is persisted and applied to <html lang> immediately.
 */
export const LanguageMenu = ({ className, align = 'end' }: LanguageMenuProps) => {
  const { language, setLanguage, languages } = useLanguage();
  const current = languageConfig[language];

  const handlePick = (code: LanguageCode) => {
    if (code === language) return;
    playInkSound('inkClick', 0.3);
    setLanguage(code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Langue : ${current.name}. Ouvrir le sélecteur de langue`}
          title="Langue"
          className={cn(
            'if-icon-btn menu-icon-control menu-focus min-h-[44px] min-w-[44px]',
            className,
          )}
        >
          <span className="text-base leading-none" aria-hidden="true">
            {current.flag}
          </span>
          <span className="sr-only">Langue actuelle : {current.name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        role="menu"
        aria-label="Choisir la langue du jeu"
        className="z-[9420] min-w-[13rem]"
      >
        <DropdownMenuLabel className="flex items-center gap-2">
          <Languages className="h-4 w-4" aria-hidden="true" />
          Langue
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {languages.map((code) => {
          const config = languageConfig[code];
          const isSelected = code === language;
          return (
            <DropdownMenuItem
              key={code}
              role="menuitemradio"
              aria-checked={isSelected}
              onSelect={() => handlePick(code)}
              className={cn(
                'flex min-h-[44px] cursor-pointer items-center justify-between gap-3 text-base font-semibold',
                isSelected && 'bg-accent/60',
              )}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-lg leading-none" aria-hidden="true">
                  {config.flag}
                </span>
                {config.name}
              </span>
              {isSelected && <span aria-hidden="true">✓</span>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
