import { Check, Loader2 } from 'lucide-react';
import { formatMasterPoints, type MasterAvailability, type MasterScore } from '@/lib/mimicMaster';
import s from './MimicMaster.module.css';

/** Own-brand vector seal: Mimo in a plush gold bubble, not a copied Buddy logo. */
export function MimicMasterLogo() {
  return <svg className={s.seal} viewBox="0 0 110 120" aria-hidden="true" focusable="false">
    <circle cx="55" cy="67" r="43" fill="#d9a343" stroke="#2d193d" strokeWidth="4" />
    <circle cx="55" cy="64" r="42" fill="#ffe5a1" stroke="#fff6d6" strokeWidth="3" />
    <path d="M27 58C27 24 84 24 84 58v29c0 18-13 17-18 11-6 9-16 9-22 0-6 7-17 5-17-11Z" fill="#ae85dc" stroke="#342043" strokeWidth="3" />
    <path d="M30 47q24-24 48 0" fill="none" stroke="#e7c7ff" strokeWidth="6" strokeLinecap="round" />
    <path d="m31 28-5-20 18 12L55 3l11 17L84 8l-5 20Z" fill="#ffcf70" stroke="#392347" strokeWidth="3" strokeLinejoin="round" />
    <path d="m34 23 43 0" stroke="#fff2c7" strokeWidth="3" strokeLinecap="round" />
    <path d="m55 14 4 5-4 5-4-5Z" fill="#83ebc8" />
    <rect x="19" y="57" width="13" height="24" rx="6" fill="#89e5cd" stroke="#342043" strokeWidth="3" />
    <rect x="79" y="57" width="13" height="24" rx="6" fill="#89e5cd" stroke="#342043" strokeWidth="3" />
    <ellipse cx="43" cy="60" rx="11" ry="13" fill="#fff5fb" stroke="#392347" strokeWidth="2" />
    <ellipse cx="67" cy="60" rx="11" ry="13" fill="#fff5fb" stroke="#392347" strokeWidth="2" />
    <ellipse cx="46" cy="61" rx="5" ry="7" fill="#392347" /><ellipse cx="64" cy="61" rx="5" ry="7" fill="#392347" />
    <circle cx="47" cy="58" r="2" fill="white" /><circle cx="65" cy="58" r="2" fill="white" />
    <path d="M43 80q12 15 24 0" fill="#f6a8c7" stroke="#392347" strokeWidth="3" strokeLinecap="round" />
    <path d="m28 91 13 6 14-5 14 5 12-6" fill="none" stroke="#89e5cd" strokeWidth="7" strokeLinejoin="round" />
    <path d="m91 34 3-7 3 7 7 3-7 3-3 7-3-7-7-3Z" fill="#fff2c7" />
  </svg>;
}

export interface MimicMasterButtonProps {
  availability: MasterAvailability;
  status: 'loading' | 'ready' | 'unavailable' | 'error';
  pending: boolean;
  targetName: string;
  chosenName?: string;
  teamMode?: boolean;
  onChoose: () => void;
  onRetry: () => void;
}

export function MimicMasterButton({ availability, status, pending, targetName, chosenName,
  teamMode = false, onChoose, onRetry }: MimicMasterButtonProps) {
  const awarded = availability === 'selected' || availability === 'used';
  const available = availability === 'available' && status === 'ready' && !pending;
  let state = status === 'loading' ? 'On retrouve ton coup de cœur…'
    : status === 'unavailable' ? 'Les Mimic Masters ne sont pas encore activés dans ce salon.'
    : status === 'error' ? 'Impossible de vérifier ton choix. Réessaie avant de le décerner.'
    : availability === 'selected' ? `Mimic Master décerné à ${chosenName || targetName} !`
    : availability === 'used' ? `Ton Mimic Master : ${chosenName || 'ton favori'}. Choix définitif.`
    : availability === 'own' ? `Garde-le pour ${teamMode ? 'un duo adverse' : 'un autre joueur'}.`
    : availability === 'no-audio' ? 'Pas de prise à écouter, pas de coup de cœur à décerner.'
    : availability === 'not-ready' ? 'Le vote se synchronise…' : '';
  if (pending) state = 'On enregistre ton Mimic Master…';
  const label = status === 'error' ? 'Réessayer la connexion Mimic Master'
    : available ? `Décerner mon Mimic Master à ${targetName}`
    : state || 'Mimic Master indisponible';
  const rules = `Un seul par joueur et par manche. Choix définitif. +1 point ${teamMode ? 'au duo favori' : 'au favori'}, et la moitié de son score de votes en bonus pour ${teamMode ? 'ton duo' : 'toi'} (bonus négatif possible).`;
  return <div className={s.control}>
    <button type="button" className={s.round} data-awarded={availability === 'selected'}
      data-used={availability === 'used'} aria-label={label}
      aria-pressed={availability === 'selected'} title={`${label}\n${rules}`}
      disabled={!(available || (status === 'error' && !pending))}
      onClick={status === 'error' ? onRetry : onChoose}>
      <MimicMasterLogo />
      <span className={s.roundName} aria-hidden="true">MIMIC<br />MASTER</span>
      <span className={s.counter} aria-hidden="true">{pending ? <Loader2 className="animate-spin" /> : availability === 'selected' ? <Check /> : awarded ? '0' : status === 'error' ? '!' : '1'}</span>
    </button>
    {state && <span className={s.srOnly} role="status">{state}</span>}
  </div>;
}

export function MimicMasterRecap({ scores, labels }: { scores: MasterScore[]; labels: Record<string, string> }) {
  const relevant = scores.filter(score => score.masterCount || score.predictionBonus !== 0);
  if (!relevant.length) return null;
  return <section className={s.recap} aria-label="Les bonus Mimic Master">
    <header><MimicMasterLogo /><div><h2>Les Mimic Masters</h2><p>Ces bonus sont déjà inclus dans le classement.</p></div></header>
    <ul>{relevant.map(score => <li key={score.key}><strong>{labels[score.key] || score.key}</strong>
      <span>{score.masterCount ? `${score.masterCount} couronne${score.masterCount > 1 ? 's' : ''} reçue${score.masterCount > 1 ? 's' : ''}` : 'Le flair du jury'}</span>
      <dl><div><dt>Votes</dt><dd>{formatMasterPoints(score.baseScore)}</dd></div><div><dt>Couronnes</dt><dd>{formatMasterPoints(score.masterCount)}</dd></div><div><dt>Ton flair</dt><dd>{formatMasterPoints(score.predictionBonus)}</dd></div><div><dt>Total</dt><dd>{formatMasterPoints(score.score)}</dd></div></dl>
    </li>)}</ul>
  </section>;
}
