/**
 * Mode MIMIC — couverture complète.
 *
 *  - mécaniques : moteur de score karaoké, détection de hauteur, paroles
 *  - passage au tour suivant : sélection de chanson sans répétition
 *  - synchro entre joueurs : maillage voix chanteur -> auditeurs (offre/réponse/ICE)
 *  - reconnexion : ICE reçu avant la description distante, changement de chanteur
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MimicAnalyzer,
  detectPitch,
  mimicComment,
  type MimicResult,
  type SubScores,
} from '@/components/mimic/mimicScore';
import { MIMIC_SONGS, pickRandomSong } from '@/components/mimic/mimicSongs';
import { pickExtractLines, type LyricLine } from '@/components/mimic/mimicLyrics';

// ── Outils ─────────────────────────────────────────────────────────────────

/** Onde sinusoïdale : sert à valider la détection de hauteur. */
const sine = (freq: number, sampleRate: number, length = 2048, amplitude = 0.5): Float32Array => {
  const buffer = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    buffer[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / sampleRate);
  }
  return buffer;
};

const silence = (length = 2048): Float32Array => new Float32Array(length);

const sub = (overrides: Partial<SubScores> = {}): SubScores => ({
  paroles: 50,
  justesse: 50,
  rythme: 50,
  synchro: 50,
  dynamique: 50,
  stabilite: 50,
  ...overrides,
});

const result = (mimic: number, overrides: Partial<SubScores> = {}): MimicResult => ({
  mimic,
  sub: sub(overrides),
});

/** Remplit un analyseur avec une performance chantée crédible. */
const singWell = (analyzer: MimicAnalyzer, frames = 60): void => {
  for (let i = 0; i < frames; i += 1) {
    // Voix qui va et vient (phrasé) avec une hauteur qui bouge.
    const phrasing = i % 8 < 6;
    analyzer.push({
      voice: phrasing ? 0.16 + (i % 3) * 0.05 : 0.01,
      music: 0.3,
      pitch: phrasing ? 200 + (i % 5) * 25 : 0,
      t: i * 66,
    });
  }
};

/** Performance muette : le joueur ne chante pas du tout. */
const staySilent = (analyzer: MimicAnalyzer, frames = 60): void => {
  for (let i = 0; i < frames; i += 1) {
    analyzer.push({ voice: 0, music: 0.3, pitch: 0, t: i * 66 });
  }
};

/** Triche : un son tenu, parfaitement plat. */
const holdFlatTone = (analyzer: MimicAnalyzer, frames = 60): void => {
  for (let i = 0; i < frames; i += 1) {
    analyzer.push({ voice: 0.12, music: 0.3, pitch: 220, t: i * 66 });
  }
};

// ── 1. Détection de hauteur ────────────────────────────────────────────────

describe('mimic — détection de hauteur', () => {
  it('ne détecte rien dans le silence', () => {
    expect(detectPitch(silence(), 44_100)).toBe(0);
  });

  it('ne détecte rien sur un signal trop faible', () => {
    expect(detectPitch(sine(220, 44_100, 2048, 0.002), 44_100)).toBe(0);
  });

  it('détecte une note dans la plage vocale', () => {
    expect(detectPitch(sine(220, 44_100), 44_100)).toBeGreaterThan(0);
  });

  it('reste proche de la fréquence jouée pour un la3', () => {
    const detected = detectPitch(sine(220, 44_100), 44_100);
    expect(Math.abs(detected - 220)).toBeLessThan(25);
  });

  it('reste proche de la fréquence jouée pour un la4', () => {
    const detected = detectPitch(sine(440, 44_100), 44_100);
    expect(Math.abs(detected - 440)).toBeLessThan(50);
  });

  it('détecte une voix grave', () => {
    expect(detectPitch(sine(110, 44_100, 4096), 44_100)).toBeGreaterThan(0);
  });

  it('rejette une fréquence sous la plage humaine', () => {
    expect(detectPitch(sine(30, 44_100, 8192), 44_100)).toBe(0);
  });

  it('rejette une fréquence au-dessus de la plage chantée', () => {
    expect(detectPitch(sine(3_000, 44_100), 44_100)).toBe(0);
  });

  it('ne renvoie jamais de valeur négative', () => {
    for (const freq of [80, 150, 300, 600, 900]) {
      expect(detectPitch(sine(freq, 44_100, 4096), 44_100)).toBeGreaterThanOrEqual(0);
    }
  });

  it('reste déterministe pour un même tampon', () => {
    const buffer = sine(330, 44_100);
    expect(detectPitch(buffer, 44_100)).toBe(detectPitch(buffer, 44_100));
  });

  it('gère un tampon minuscule sans planter', () => {
    expect(() => detectPitch(new Float32Array(2), 44_100)).not.toThrow();
  });

  it('gère un tampon vide sans planter', () => {
    expect(() => detectPitch(new Float32Array(0), 44_100)).not.toThrow();
  });

  it('suit un autre taux d’échantillonnage', () => {
    expect(detectPitch(sine(220, 48_000, 4096), 48_000)).toBeGreaterThan(0);
  });

  it('ne détecte rien sur du bruit sans période', () => {
    const noise = new Float32Array(2048);
    let seed = 7;
    for (let i = 0; i < noise.length; i += 1) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      noise[i] = (seed / 2147483648) * 0.02 - 0.01;
    }
    expect(detectPitch(noise, 44_100)).toBe(0);
  });
});

// ── 2. Moteur de score : valeurs neutres ───────────────────────────────────

describe('mimic — score au démarrage', () => {
  let analyzer: MimicAnalyzer;
  beforeEach(() => {
    analyzer = new MimicAnalyzer();
  });

  it('renvoie des sous-scores neutres sans assez de trames', () => {
    analyzer.push({ voice: 0.2, music: 0.3, pitch: 220, t: 0 });
    const { sub: scores } = analyzer.finalize();
    expect(scores).toEqual({
      paroles: 60,
      justesse: 60,
      rythme: 60,
      synchro: 60,
      dynamique: 60,
      stabilite: 60,
    });
  });

  it('produit un score global neutre sans trame', () => {
    expect(analyzer.finalize().mimic).toBe(60);
  });

  it('reste neutre à trois trames', () => {
    for (let i = 0; i < 3; i += 1) {
      analyzer.push({ voice: 0.2, music: 0.3, pitch: 220, t: i * 66 });
    }
    expect(analyzer.finalize().sub.paroles).toBe(60);
  });

  it('calcule réellement à partir de quatre trames', () => {
    staySilent(analyzer, 8);
    expect(analyzer.finalize().sub.paroles).not.toBe(60);
  });

  it('démarre le score live à une valeur agréable', () => {
    expect(analyzer.live()).toBeGreaterThanOrEqual(60);
  });

  it('borne le score global entre 0 et 100', () => {
    singWell(analyzer);
    const { mimic } = analyzer.finalize();
    expect(mimic).toBeGreaterThanOrEqual(0);
    expect(mimic).toBeLessThanOrEqual(100);
  });

  it('borne chaque sous-score entre 0 et 100', () => {
    singWell(analyzer);
    for (const value of Object.values(analyzer.finalize().sub)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  it('renvoie un score global entier', () => {
    singWell(analyzer);
    expect(Number.isInteger(analyzer.finalize().mimic)).toBe(true);
  });

  it('expose les six sous-scores attendus', () => {
    singWell(analyzer);
    expect(Object.keys(analyzer.finalize().sub).sort()).toEqual([
      'dynamique', 'justesse', 'paroles', 'rythme', 'stabilite', 'synchro',
    ]);
  });
});

// ── 3. Moteur de score : comportement ──────────────────────────────────────

describe('mimic — le score récompense le chant réel', () => {
  it('note mieux une vraie performance qu’un silence', () => {
    const chante = new MimicAnalyzer();
    const muet = new MimicAnalyzer();
    singWell(chante);
    staySilent(muet);
    expect(chante.finalize().mimic).toBeGreaterThan(muet.finalize().mimic);
  });

  it('donne une couverture de paroles faible au joueur muet', () => {
    const muet = new MimicAnalyzer();
    staySilent(muet);
    expect(muet.finalize().sub.paroles).toBeLessThan(45);
  });

  it('donne une bonne couverture de paroles au joueur qui chante', () => {
    const chante = new MimicAnalyzer();
    singWell(chante);
    expect(chante.finalize().sub.paroles).toBeGreaterThan(70);
  });

  it('pénalise la stabilité sur un son tenu parfaitement plat', () => {
    const triche = new MimicAnalyzer();
    holdFlatTone(triche);
    expect(triche.finalize().sub.stabilite).toBeLessThanOrEqual(25);
  });

  it('note la triche plate en dessous d’une vraie performance', () => {
    const triche = new MimicAnalyzer();
    const chante = new MimicAnalyzer();
    holdFlatTone(triche);
    singWell(chante);
    expect(triche.finalize().mimic).toBeLessThan(chante.finalize().mimic);
  });

  it('récompense le mouvement de hauteur sur la justesse', () => {
    const plat = new MimicAnalyzer();
    const mouvant = new MimicAnalyzer();
    for (let i = 0; i < 40; i += 1) {
      plat.push({ voice: 0.15, music: 0.3, pitch: 220, t: i * 66 });
      mouvant.push({ voice: 0.15, music: 0.3, pitch: 190 + (i % 7) * 20, t: i * 66 });
    }
    expect(mouvant.finalize().sub.justesse).toBeGreaterThan(plat.finalize().sub.justesse);
  });

  it('baisse la justesse quand aucune hauteur n’est détectée', () => {
    const sansHauteur = new MimicAnalyzer();
    for (let i = 0; i < 40; i += 1) {
      sansHauteur.push({ voice: 0.15, music: 0.3, pitch: 0, t: i * 66 });
    }
    expect(sansHauteur.finalize().sub.justesse).toBeLessThan(70);
  });

  it('récompense le phrasé sur le rythme', () => {
    const phrase = new MimicAnalyzer();
    for (let i = 0; i < 90; i += 1) {
      phrase.push({ voice: i % 6 < 3 ? 0.2 : 0.0, music: 0.3, pitch: 220, t: i * 66 });
    }
    expect(phrase.finalize().sub.rythme).toBeGreaterThan(60);
  });

  it('donne un rythme faible sans aucune attaque', () => {
    const rien = new MimicAnalyzer();
    staySilent(rien, 90);
    expect(rien.finalize().sub.rythme).toBeLessThanOrEqual(40);
  });

  it('récompense une énergie saine sur la dynamique', () => {
    const fort = new MimicAnalyzer();
    const faible = new MimicAnalyzer();
    for (let i = 0; i < 40; i += 1) {
      fort.push({ voice: 0.22 + (i % 4) * 0.04, music: 0.3, pitch: 220, t: i * 66 });
      faible.push({ voice: 0.05, music: 0.3, pitch: 220, t: i * 66 });
    }
    expect(fort.finalize().sub.dynamique).toBeGreaterThan(faible.finalize().sub.dynamique);
  });

  it('pénalise le chant hors musique sur la synchro', () => {
    const horsMusique = new MimicAnalyzer();
    for (let i = 0; i < 40; i += 1) {
      // Musique active mais le joueur chante seulement au tout début.
      horsMusique.push({ voice: i < 4 ? 0.2 : 0, music: 0.3, pitch: 220, t: i * 66 });
    }
    expect(horsMusique.finalize().sub.synchro).toBeLessThan(60);
  });

  it('récompense le chant pendant la musique sur la synchro', () => {
    const dansMusique = new MimicAnalyzer();
    for (let i = 0; i < 40; i += 1) {
      dansMusique.push({ voice: 0.18, music: 0.3, pitch: 200 + (i % 4) * 20, t: i * 66 });
    }
    expect(dansMusique.finalize().sub.synchro).toBeGreaterThan(70);
  });

  it('reste déterministe pour des trames identiques', () => {
    const a = new MimicAnalyzer();
    const b = new MimicAnalyzer();
    singWell(a);
    singWell(b);
    expect(a.finalize()).toEqual(b.finalize());
  });

  it('remet tout à zéro après reset', () => {
    const analyzer = new MimicAnalyzer();
    singWell(analyzer);
    const avant = analyzer.finalize().mimic;
    analyzer.reset();
    expect(analyzer.finalize().mimic).toBe(60);
    expect(avant).not.toBe(60);
  });

  it('permet une nouvelle performance après reset', () => {
    const analyzer = new MimicAnalyzer();
    holdFlatTone(analyzer);
    analyzer.reset();
    singWell(analyzer);
    expect(analyzer.finalize().sub.stabilite).toBeGreaterThan(25);
  });

  it('ignore la musique absente en se rabattant sur le ratio de voix', () => {
    const sansMusique = new MimicAnalyzer();
    for (let i = 0; i < 40; i += 1) {
      sansMusique.push({ voice: 0.18, music: 0, pitch: 220, t: i * 66 });
    }
    expect(sansMusique.finalize().sub.paroles).toBeGreaterThan(60);
  });

  it('gère des horodatages identiques sans division par zéro', () => {
    const analyzer = new MimicAnalyzer();
    for (let i = 0; i < 20; i += 1) {
      analyzer.push({ voice: 0.2, music: 0.3, pitch: 220, t: 0 });
    }
    expect(Number.isFinite(analyzer.finalize().mimic)).toBe(true);
  });

  it('supporte une performance très longue', () => {
    const analyzer = new MimicAnalyzer();
    singWell(analyzer, 900);
    const { mimic } = analyzer.finalize();
    expect(mimic).toBeGreaterThan(0);
    expect(mimic).toBeLessThanOrEqual(100);
  });
});

// ── 4. Score live : lissage ────────────────────────────────────────────────

describe('mimic — score live lissé', () => {
  it('renvoie un entier', () => {
    const analyzer = new MimicAnalyzer();
    singWell(analyzer);
    expect(Number.isInteger(analyzer.live())).toBe(true);
  });

  it('reste dans les bornes', () => {
    const analyzer = new MimicAnalyzer();
    singWell(analyzer);
    for (let i = 0; i < 30; i += 1) {
      const value = analyzer.live();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  it('ne saute pas brutalement d’une image à l’autre', () => {
    const analyzer = new MimicAnalyzer();
    staySilent(analyzer, 40);
    const first = analyzer.live();
    const second = analyzer.live();
    expect(Math.abs(second - first)).toBeLessThan(15);
  });

  it('converge vers le score réel au fil des appels', () => {
    const analyzer = new MimicAnalyzer();
    staySilent(analyzer, 60);
    let last = analyzer.live();
    for (let i = 0; i < 80; i += 1) last = analyzer.live();
    expect(last).toBeLessThan(60);
  });

  it('monte vers le haut pour une bonne performance', () => {
    const analyzer = new MimicAnalyzer();
    singWell(analyzer, 120);
    let last = analyzer.live();
    for (let i = 0; i < 80; i += 1) last = analyzer.live();
    expect(last).toBeGreaterThan(60);
  });

  it('repart de la valeur de départ après reset', () => {
    const analyzer = new MimicAnalyzer();
    staySilent(analyzer, 60);
    for (let i = 0; i < 50; i += 1) analyzer.live();
    analyzer.reset();
    expect(analyzer.live()).toBeGreaterThanOrEqual(60);
  });

  it('n’altère pas le résultat final', () => {
    const avecLive = new MimicAnalyzer();
    const sansLive = new MimicAnalyzer();
    singWell(avecLive);
    singWell(sansLive);
    for (let i = 0; i < 20; i += 1) avecLive.live();
    expect(avecLive.finalize()).toEqual(sansLive.finalize());
  });
});

// ── 5. Commentaire de fin ──────────────────────────────────────────────────

describe('mimic — commentaire de résultat', () => {
  it('félicite une performance exceptionnelle', () => {
    expect(mimicComment(result(95))).toContain('exceptionnelle');
  });

  it('félicite exactement au seuil de 92', () => {
    expect(mimicComment(result(92))).toContain('exceptionnelle');
  });

  it('salue une superbe performance à 80', () => {
    expect(mimicComment(result(80))).toContain('Superbe');
  });

  it('salue une superbe performance à 91', () => {
    expect(mimicComment(result(91))).toContain('Superbe');
  });

  it('encourage entre 60 et 79 en citant le point fort', () => {
    const comment = mimicComment(result(70, { rythme: 95 }));
    expect(comment).toContain('Bien joué');
    expect(comment).toContain('le rythme');
  });

  it('encourage sous 60 en citant le point fort', () => {
    const comment = mimicComment(result(40, { justesse: 90 }));
    expect(comment).toContain('Continue');
    expect(comment).toContain('la justesse');
  });

  it('cite les paroles quand c’est le meilleur sous-score', () => {
    expect(mimicComment(result(65, { paroles: 99 }))).toContain('les paroles');
  });

  it('cite la synchro quand c’est le meilleur sous-score', () => {
    expect(mimicComment(result(65, { synchro: 99 }))).toContain('la synchro');
  });

  it('cite l’énergie quand la dynamique domine', () => {
    expect(mimicComment(result(65, { dynamique: 99 }))).toContain("l'énergie");
  });

  it('cite la stabilité quand elle domine', () => {
    expect(mimicComment(result(65, { stabilite: 99 }))).toContain('la stabilité');
  });

  it('renvoie toujours un texte non vide', () => {
    for (const score of [0, 25, 59, 60, 79, 80, 91, 92, 100]) {
      expect(mimicComment(result(score)).length).toBeGreaterThan(0);
    }
  });

  it('reste positif même à zéro', () => {
    expect(mimicComment(result(0))).toContain('Continue');
  });

  it('ne cite aucun sous-score au-dessus de 80', () => {
    const comment = mimicComment(result(85, { paroles: 99 }));
    expect(comment).not.toContain('les paroles');
  });
});

// ── 6. Passage au tour suivant : choix de la chanson ───────────────────────

describe('mimic — choix de la chanson au tour suivant', () => {
  it('propose un catalogue non vide', () => {
    expect(MIMIC_SONGS.length).toBeGreaterThan(0);
  });

  it('donne un titre, un artiste et une requête à chaque chanson', () => {
    for (const song of MIMIC_SONGS) {
      expect(song.title.length).toBeGreaterThan(0);
      expect(song.artist.length).toBeGreaterThan(0);
      expect(song.query.length).toBeGreaterThan(0);
    }
  });

  it('n’a aucun titre en doublon', () => {
    const titles = MIMIC_SONGS.map((s) => s.title.toLowerCase());
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('renvoie une chanson du catalogue', () => {
    expect(MIMIC_SONGS).toContain(pickRandomSong());
  });

  it('évite une chanson déjà jouée', () => {
    const exclude = new Set([MIMIC_SONGS[0].title.toLowerCase()]);
    for (let i = 0; i < 30; i += 1) {
      expect(pickRandomSong(exclude).title).not.toBe(MIMIC_SONGS[0].title);
    }
  });

  it('évite plusieurs chansons déjà jouées', () => {
    const played = MIMIC_SONGS.slice(0, 3).map((s) => s.title.toLowerCase());
    const exclude = new Set(played);
    for (let i = 0; i < 30; i += 1) {
      expect(played).not.toContain(pickRandomSong(exclude).title.toLowerCase());
    }
  });

  it('recycle le catalogue quand tout a été joué', () => {
    const exclude = new Set(MIMIC_SONGS.map((s) => s.title.toLowerCase()));
    expect(MIMIC_SONGS).toContain(pickRandomSong(exclude));
  });

  it('reste utilisable avec un ensemble vide', () => {
    expect(pickRandomSong(new Set())).toBeDefined();
  });

  it('ignore une exclusion inconnue', () => {
    expect(MIMIC_SONGS).toContain(pickRandomSong(new Set(['chanson-inexistante'])));
  });

  it('propose plusieurs chansons différentes sur plusieurs tours', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 60; i += 1) seen.add(pickRandomSong().title);
    expect(seen.size).toBeGreaterThan(1);
  });

  it('respecte l’exclusion insensible à la casse', () => {
    const exclude = new Set([MIMIC_SONGS[1].title.toUpperCase().toLowerCase()]);
    for (let i = 0; i < 20; i += 1) {
      expect(pickRandomSong(exclude).title).not.toBe(MIMIC_SONGS[1].title);
    }
  });

  it('permet d’enchaîner un tour complet sans répétition', () => {
    const played = new Set<string>();
    const rounds = Math.min(5, MIMIC_SONGS.length);
    for (let i = 0; i < rounds; i += 1) {
      const song = pickRandomSong(played);
      expect(played.has(song.title.toLowerCase())).toBe(false);
      played.add(song.title.toLowerCase());
    }
    expect(played.size).toBe(rounds);
  });
});

// ── 7. Paroles : fenêtre à chanter ─────────────────────────────────────────

describe('mimic — fenêtre de paroles pour l’extrait', () => {
  const lines = (count: number): LyricLine[] =>
    Array.from({ length: count }, (_, i) => ({ text: `ligne ${i}`, t: i }));

  it('renvoie tout quand il y a peu de lignes', () => {
    const all = lines(5);
    expect(pickExtractLines(all, 8)).toEqual(all);
  });

  it('renvoie tout quand le nombre égale la limite', () => {
    const all = lines(8);
    expect(pickExtractLines(all, 8)).toEqual(all);
  });

  it('limite au maximum demandé', () => {
    expect(pickExtractLines(lines(40), 8)).toHaveLength(8);
  });

  it('respecte une limite personnalisée', () => {
    expect(pickExtractLines(lines(40), 4)).toHaveLength(4);
  });

  it('renvoie une tranche contiguë', () => {
    const picked = pickExtractLines(lines(40), 6);
    const indices = picked.map((line) => Number(line.text.split(' ')[1]));
    for (let i = 1; i < indices.length; i += 1) {
      expect(indices[i]).toBe(indices[i - 1] + 1);
    }
  });

  it('saute l’introduction', () => {
    const picked = pickExtractLines(lines(100), 8);
    const first = Number(picked[0].text.split(' ')[1]);
    expect(first).toBeGreaterThanOrEqual(15);
  });

  it('ne dépasse jamais la fin des paroles', () => {
    for (let i = 0; i < 30; i += 1) {
      const picked = pickExtractLines(lines(30), 8);
      const last = Number(picked[picked.length - 1].text.split(' ')[1]);
      expect(last).toBeLessThan(30);
    }
  });

  it('gère une liste vide', () => {
    expect(pickExtractLines([], 8)).toEqual([]);
  });

  it('gère une seule ligne', () => {
    expect(pickExtractLines([{ text: 'seule' }], 8)).toEqual([{ text: 'seule' }]);
  });

  it('conserve les horodatages présents', () => {
    const picked = pickExtractLines(lines(40), 5);
    expect(picked.every((line) => typeof line.t === 'number')).toBe(true);
  });

  it('n’altère pas la liste d’origine', () => {
    const all = lines(40);
    const copy = JSON.parse(JSON.stringify(all));
    pickExtractLines(all, 8);
    expect(all).toEqual(copy);
  });

  it('renvoie toujours au moins une ligne quand il y en a', () => {
    for (const count of [1, 2, 9, 25, 200]) {
      expect(pickExtractLines(lines(count), 8).length).toBeGreaterThan(0);
    }
  });
});

// ── 8. Synchro entre joueurs : maillage voix ───────────────────────────────

describe('mimic — maillage voix chanteur vers auditeurs', () => {
  interface FakePc {
    peer: string;
    tracks: number;
    localDescription: unknown;
    remoteDescription: unknown;
    currentRemoteDescription: unknown;
    candidates: RTCIceCandidateInit[];
    closed: boolean;
    connectionState: string;
    onicecandidate: ((event: { candidate: { toJSON(): RTCIceCandidateInit } | null }) => void) | null;
    ontrack: ((event: { streams: MediaStream[] }) => void) | null;
    onconnectionstatechange: (() => void) | null;
  }

  let created: FakePc[] = [];
  let sent: Array<{ kind: string; payload: Record<string, unknown> }> = [];
  let remoteStreams: MediaStream[] = [];

  const stream = () =>
    ({ getAudioTracks: () => [{ kind: 'audio' }] }) as unknown as MediaStream;

  /** Instancie le maillage avec un RTCPeerConnection simulé. */
  const makeMesh = async (selfId: string) => {
    const module = await import('@/components/mimic/mimicVoice');
    return new module.MimicVoiceMesh(
      selfId,
      (kind, payload) => sent.push({ kind, payload: payload as Record<string, unknown> }),
      (incoming) => remoteStreams.push(incoming),
    );
  };

  beforeEach(() => {
    created = [];
    sent = [];
    remoteStreams = [];

    class FakePeerConnection implements Partial<FakePc> {
      peer = '';
      tracks = 0;
      localDescription: unknown = null;
      remoteDescription: unknown = null;
      currentRemoteDescription: unknown = null;
      candidates: RTCIceCandidateInit[] = [];
      closed = false;
      connectionState = 'new';
      onicecandidate: FakePc['onicecandidate'] = null;
      ontrack: FakePc['ontrack'] = null;
      onconnectionstatechange: FakePc['onconnectionstatechange'] = null;

      constructor() {
        created.push(this as unknown as FakePc);
      }
      addTrack() { this.tracks += 1; }
      async createOffer() { return { type: 'offer', sdp: 'offre' }; }
      async createAnswer() { return { type: 'answer', sdp: 'reponse' }; }
      async setLocalDescription(description: unknown) { this.localDescription = description; }
      async setRemoteDescription(description: unknown) {
        this.remoteDescription = description;
        this.currentRemoteDescription = description;
      }
      async addIceCandidate(candidate: RTCIceCandidateInit) { this.candidates.push(candidate); }
      close() { this.closed = true; }
    }

    vi.stubGlobal('RTCPeerConnection', FakePeerConnection as unknown as typeof RTCPeerConnection);
    vi.stubGlobal('RTCSessionDescription', class { constructor(public init: unknown) {} });
    vi.stubGlobal('RTCIceCandidate', class { constructor(public init: RTCIceCandidateInit) {} });
  });

  it('crée une connexion par auditeur', async () => {
    const mesh = await makeMesh('chanteur');
    await mesh.startAsSinger(stream(), ['a', 'b', 'c']);
    expect(created).toHaveLength(3);
  });

  it('n’ouvre pas de connexion vers soi-même', async () => {
    const mesh = await makeMesh('chanteur');
    await mesh.startAsSinger(stream(), ['chanteur', 'a']);
    expect(created).toHaveLength(1);
  });

  it('envoie une offre à chaque auditeur', async () => {
    const mesh = await makeMesh('chanteur');
    await mesh.startAsSinger(stream(), ['a', 'b']);
    expect(sent.filter((s) => s.kind === 'offer')).toHaveLength(2);
  });

  it('adresse chaque offre au bon auditeur', async () => {
    const mesh = await makeMesh('chanteur');
    await mesh.startAsSinger(stream(), ['a', 'b']);
    expect(sent.map((s) => s.payload.to)).toEqual(['a', 'b']);
  });

  it('identifie le chanteur comme émetteur', async () => {
    const mesh = await makeMesh('chanteur');
    await mesh.startAsSinger(stream(), ['a']);
    expect(sent[0].payload.from).toBe('chanteur');
  });

  it('publie la piste micro sur chaque connexion', async () => {
    const mesh = await makeMesh('chanteur');
    await mesh.startAsSinger(stream(), ['a', 'b']);
    expect(created.every((pc) => pc.tracks === 1)).toBe(true);
  });

  it('n’ouvre aucune connexion sans auditeur', async () => {
    const mesh = await makeMesh('chanteur');
    await mesh.startAsSinger(stream(), []);
    expect(created).toHaveLength(0);
  });

  it('mémorise la description locale de l’offre', async () => {
    const mesh = await makeMesh('chanteur');
    await mesh.startAsSinger(stream(), ['a']);
    expect(created[0].localDescription).toMatchObject({ type: 'offer' });
  });

  it('répond à l’offre du chanteur en tant qu’auditeur', async () => {
    const mesh = await makeMesh('auditeur');
    mesh.startAsListener('chanteur');
    await mesh.handleSignal({
      kind: 'offer',
      from: 'chanteur',
      to: 'auditeur',
      sdp: { type: 'offer', sdp: 'offre' },
    });
    expect(sent.filter((s) => s.kind === 'answer')).toHaveLength(1);
  });

  it('adresse la réponse au chanteur', async () => {
    const mesh = await makeMesh('auditeur');
    mesh.startAsListener('chanteur');
    await mesh.handleSignal({
      kind: 'offer', from: 'chanteur', to: 'auditeur', sdp: { type: 'offer' },
    });
    expect(sent[0].payload.to).toBe('chanteur');
  });

  it('ignore un signal adressé à un autre joueur', async () => {
    const mesh = await makeMesh('auditeur');
    mesh.startAsListener('chanteur');
    await mesh.handleSignal({
      kind: 'offer', from: 'chanteur', to: 'quelquun-dautre', sdp: { type: 'offer' },
    });
    expect(sent).toHaveLength(0);
  });

  it('refuse une offre venant d’un joueur qui n’est pas le chanteur', async () => {
    const mesh = await makeMesh('auditeur');
    mesh.startAsListener('chanteur');
    await mesh.handleSignal({
      kind: 'offer', from: 'imposteur', to: 'auditeur', sdp: { type: 'offer' },
    });
    expect(sent).toHaveLength(0);
  });

  it('refuse une offre quand on n’est pas auditeur', async () => {
    const mesh = await makeMesh('chanteur');
    await mesh.handleSignal({
      kind: 'offer', from: 'autre', to: 'chanteur', sdp: { type: 'offer' },
    });
    expect(sent.filter((s) => s.kind === 'answer')).toHaveLength(0);
  });

  it('accepte la réponse d’un auditeur côté chanteur', async () => {
    const mesh = await makeMesh('chanteur');
    await mesh.startAsSinger(stream(), ['a']);
    await mesh.handleSignal({
      kind: 'answer', from: 'a', to: 'chanteur', sdp: { type: 'answer' },
    });
    expect(created[0].remoteDescription).toMatchObject({ init: { type: 'answer' } });
  });

  it('ignore une réponse d’un pair inconnu', async () => {
    const mesh = await makeMesh('chanteur');
    await mesh.startAsSinger(stream(), ['a']);
    await mesh.handleSignal({
      kind: 'answer', from: 'inconnu', to: 'chanteur', sdp: { type: 'answer' },
    });
    expect(created[0].remoteDescription).toBeNull();
  });

  it('met en file un ICE reçu avant la description distante', async () => {
    const mesh = await makeMesh('auditeur');
    mesh.startAsListener('chanteur');
    await mesh.handleSignal({
      kind: 'ice', from: 'chanteur', to: 'auditeur', candidate: { candidate: 'c1' },
    });
    // Aucune connexion encore ouverte : le candidat est mis de côté, pas perdu.
    expect(created).toHaveLength(0);
  });

  it('rejoue les ICE mis en file dès l’arrivée de l’offre', async () => {
    const mesh = await makeMesh('auditeur');
    mesh.startAsListener('chanteur');
    await mesh.handleSignal({
      kind: 'ice', from: 'chanteur', to: 'auditeur', candidate: { candidate: 'c1' },
    });
    await mesh.handleSignal({
      kind: 'ice', from: 'chanteur', to: 'auditeur', candidate: { candidate: 'c2' },
    });
    await mesh.handleSignal({
      kind: 'offer', from: 'chanteur', to: 'auditeur', sdp: { type: 'offer' },
    });
    expect(created[0].candidates).toHaveLength(2);
  });

  it('applique directement un ICE reçu après la description distante', async () => {
    const mesh = await makeMesh('auditeur');
    mesh.startAsListener('chanteur');
    await mesh.handleSignal({
      kind: 'offer', from: 'chanteur', to: 'auditeur', sdp: { type: 'offer' },
    });
    await mesh.handleSignal({
      kind: 'ice', from: 'chanteur', to: 'auditeur', candidate: { candidate: 'apres' },
    });
    expect(created[0].candidates).toHaveLength(1);
  });

  it('remonte le flux distant à l’application', async () => {
    const mesh = await makeMesh('auditeur');
    mesh.startAsListener('chanteur');
    await mesh.handleSignal({
      kind: 'offer', from: 'chanteur', to: 'auditeur', sdp: { type: 'offer' },
    });
    const incoming = { id: 'flux' } as unknown as MediaStream;
    created[0].ontrack?.({ streams: [incoming] });
    expect(remoteStreams).toContain(incoming);
  });

  it('ne remonte rien quand la piste n’a pas de flux', async () => {
    const mesh = await makeMesh('auditeur');
    mesh.startAsListener('chanteur');
    await mesh.handleSignal({
      kind: 'offer', from: 'chanteur', to: 'auditeur', sdp: { type: 'offer' },
    });
    created[0].ontrack?.({ streams: [] });
    expect(remoteStreams).toHaveLength(0);
  });

  it('transmet ses candidats ICE au pair', async () => {
    const mesh = await makeMesh('chanteur');
    await mesh.startAsSinger(stream(), ['a']);
    created[0].onicecandidate?.({ candidate: { toJSON: () => ({ candidate: 'local' }) } });
    expect(sent.some((s) => s.kind === 'ice')).toBe(true);
  });

  it('n’envoie rien quand la collecte ICE est terminée', async () => {
    const mesh = await makeMesh('chanteur');
    await mesh.startAsSinger(stream(), ['a']);
    const before = sent.length;
    created[0].onicecandidate?.({ candidate: null });
    expect(sent).toHaveLength(before);
  });

  it('réutilise la connexion existante pour un même pair', async () => {
    const mesh = await makeMesh('auditeur');
    mesh.startAsListener('chanteur');
    await mesh.handleSignal({
      kind: 'offer', from: 'chanteur', to: 'auditeur', sdp: { type: 'offer' },
    });
    await mesh.handleSignal({
      kind: 'offer', from: 'chanteur', to: 'auditeur', sdp: { type: 'offer' },
    });
    expect(created).toHaveLength(1);
  });

  it('ferme toutes les connexions à l’arrêt', async () => {
    const mesh = await makeMesh('chanteur');
    await mesh.startAsSinger(stream(), ['a', 'b']);
    mesh.stop();
    expect(created.every((pc) => pc.closed)).toBe(true);
  });

  it('oublie le rôle après l’arrêt', async () => {
    const mesh = await makeMesh('auditeur');
    mesh.startAsListener('chanteur');
    mesh.stop();
    await mesh.handleSignal({
      kind: 'offer', from: 'chanteur', to: 'auditeur', sdp: { type: 'offer' },
    });
    expect(sent).toHaveLength(0);
  });

  it('permet de changer de chanteur au tour suivant', async () => {
    const mesh = await makeMesh('joueur');
    mesh.startAsListener('chanteur-1');
    await mesh.handleSignal({
      kind: 'offer', from: 'chanteur-2', to: 'joueur', sdp: { type: 'offer' },
    });
    expect(sent).toHaveLength(0);

    mesh.startAsListener('chanteur-2');
    await mesh.handleSignal({
      kind: 'offer', from: 'chanteur-2', to: 'joueur', sdp: { type: 'offer' },
    });
    expect(sent.filter((s) => s.kind === 'answer')).toHaveLength(1);
  });

  it('laisse un auditeur devenir chanteur au tour suivant', async () => {
    const mesh = await makeMesh('joueur');
    mesh.startAsListener('autre');
    mesh.stop();
    await mesh.startAsSinger(stream(), ['autre']);
    expect(sent.filter((s) => s.kind === 'offer')).toHaveLength(1);
  });

  it('nettoie une connexion en échec', async () => {
    const mesh = await makeMesh('chanteur');
    await mesh.startAsSinger(stream(), ['a']);
    created[0].connectionState = 'failed';
    created[0].onconnectionstatechange?.();
    // Le pair ayant été retiré, une réponse tardive n’est plus appliquée.
    await mesh.handleSignal({
      kind: 'answer', from: 'a', to: 'chanteur', sdp: { type: 'answer' },
    });
    expect(created[0].remoteDescription).toBeNull();
  });

  it('reste silencieux sur un ICE destiné à un autre joueur', async () => {
    const mesh = await makeMesh('auditeur');
    mesh.startAsListener('chanteur');
    await mesh.handleSignal({
      kind: 'ice', from: 'chanteur', to: 'autre', candidate: { candidate: 'x' },
    });
    expect(created).toHaveLength(0);
  });

  it('supporte un arrêt sans démarrage préalable', async () => {
    const mesh = await makeMesh('joueur');
    expect(() => mesh.stop()).not.toThrow();
  });

  it('supporte deux arrêts consécutifs', async () => {
    const mesh = await makeMesh('chanteur');
    await mesh.startAsSinger(stream(), ['a']);
    mesh.stop();
    expect(() => mesh.stop()).not.toThrow();
  });
});
