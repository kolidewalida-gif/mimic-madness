import { useRef, useState } from 'react';
import { Check, ImagePlus, Palette, Trash2, Upload, X } from 'lucide-react';
import { useGlobalPlayerAvatar } from '@/hooks/useGlobalPlayerAvatar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import styles from '@/components/settings/BubbleSettings.module.css';

interface AvatarSettingsProps { playerId: string; playerName: string; onClose?: () => void; }
export const AvatarSettings = ({ playerId, playerName, onClose }: AvatarSettingsProps) => {
  const { avatarData, isLoading, setAvatarImage, setAvatarColor, clearAvatar, DEFAULT_COLORS } = useGlobalPlayerAvatar(playerId);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      toast({ title: 'Format non supporté', description: 'Choisis un JPG, PNG, GIF ou WebP.', variant: 'destructive' }); return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Image trop volumineuse', description: 'Choisis une image de moins de 2 Mo.', variant: 'destructive' }); return;
    }
    setIsUploading(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Lecture impossible'));
        reader.readAsDataURL(file);
      });
      if (!await setAvatarImage(data)) throw new Error('Enregistrement impossible');
      toast({ title: 'C’est toi !', description: 'Ton nouvel avatar a été enregistré.' });
    } catch {
      toast({ title: 'Image non enregistrée', description: 'Réessaie avec une autre image.', variant: 'destructive' });
    } finally { setIsUploading(false); }
  };
  const busy = isUploading || isLoading;
  return (
    <div className={styles.avatarRoot}>
      <section className={cn(styles.card, styles.avatarPreview)}>
        <span className={styles.kicker}>Ta place dans la bande</span>
        <span className={styles.portrait} style={{ background: avatarData.backgroundColor }}>
          {avatarData.type === 'image' && avatarData.imageUrl ? <img src={avatarData.imageUrl} alt={'Avatar de ' + playerName} /> : playerName.slice(0, 2).toUpperCase()}
        </span>
        <strong className={styles.avatarName}>{playerName}</strong>
        <p>Ton avatar te suit dans tous les salons.</p>
        <span className={styles.note}>Aperçu en direct</span>
      </section>
      <div className={styles.stack}>
        <section className={styles.card}>
          <div className={styles.cardHeading}><span className={cn(styles.iconBubble, styles.mint)}><ImagePlus /></span><div><h3>Montre ta vraie tête.</h3><p>Une photo, un dessin ou ton GIF préféré.</p></div></div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleFileSelect} className="sr-only" tabIndex={-1} aria-label="Image de l’avatar" />
          <button className={styles.upload} type="button" onClick={() => fileInputRef.current?.click()} disabled={busy} aria-busy={isUploading}>
            <Upload />{isUploading ? 'Enregistrement…' : 'Choisir une image ou un GIF'}
          </button>
          <p className={styles.note}>JPG, PNG, GIF ou WebP · 2 Mo maximum. La photo remplit tout le rond.</p>
          <div className={styles.filterHeading}><Palette aria-hidden="true" /><strong>Ta couleur signature</strong></div>
          <p className={styles.note}>Le fond de ton avatar à initiales.</p>
          <div className={styles.swatches}>{DEFAULT_COLORS.map((color, i) => <button key={color} type="button" className={styles.swatch}
            style={{ background: color }} aria-label={'Couleur de fond ' + (i + 1)} aria-pressed={avatarData.backgroundColor === color} disabled={busy}
            onClick={() => void setAvatarColor(color)}>
            {avatarData.backgroundColor === color && <Check aria-hidden="true" />}
          </button>)}</div>
          {(avatarData.type === 'image' || avatarData.backgroundColor) && <button type="button" className={styles.reset} disabled={busy} onClick={() => void clearAvatar()}><Trash2 />Revenir à l’avatar par défaut</button>}
        </section>
        {onClose && <button type="button" className={styles.secondary} onClick={onClose}><X />Fermer la personnalisation</button>}
      </div>
    </div>
  );
};
