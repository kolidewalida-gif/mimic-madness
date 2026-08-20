/**
 * Mode MONOPOLY — couverture complète.
 *
 *  - mécaniques : déplacement mod-40, loyers, monopoles de groupe, hypothèques
 *  - passage au tour suivant : chemin de saut, passage par la case départ
 *  - synchro entre joueurs : mêmes zones et mêmes canaux perçus pour tous
 *  - reconnexion : prédicats purs recalculables depuis un simple instantané SQL
 */
import { describe, expect, it } from 'vitest';
import {
  BOARD_SIZE,
  computeHopPath,
} from '@/lib/monopolyHopPath';
import {
  BOARD_SPACES,
  GROUP_COLORS,
  TOKEN_COLORS,
  TOKEN_TYPES,
  calculateRent,
  getBoardPosition,
  type BoardSpace,
  type PropertyGroup,
} from '@/lib/monopolyBoard';
import {
  getPropertiesInGroup,
  playerOwnsAllInGroup,
  type OwnedPropertyLike,
} from '@/lib/monopolyOwnership';
import { ZONE_KEYS, ZONE_PALETTES, tileToZone } from '@/lib/monopolyZones';
import { CHANNELS, channelsFor, channelsRemoving } from '@/lib/monopolyChannels';
import { RENDER_EVENT_KINDS, type RenderEvent } from '@/lib/monopolyDiff';

const owned = (index: number, ownerId: string | null): OwnedPropertyLike => ({
  property_index: index,
  owner_id: ownerId,
});

/** Propriété telle que passée à `calculateRent`. */
const rentRow = (index: number, houses = 0, mortgaged = false) => ({
  property_index: index,
  houses,
  is_mortgaged: mortgaged,
});

const spaceOf = (index: number): BoardSpace => BOARD_SPACES[index];

const firstPropertySpace = BOARD_SPACES.find(
  (s) => s.type === 'property' && s.rent && s.group,
) as BoardSpace;

// ── 1. Intégrité du plateau ────────────────────────────────────────────────

describe('monopoly — intégrité du plateau', () => {
  it('compte quarante cases', () => {
    expect(BOARD_SPACES).toHaveLength(BOARD_SIZE);
  });

  it('fixe la taille du plateau à quarante', () => {
    expect(BOARD_SIZE).toBe(40);
  });

  it('indexe les cases de zéro à trente-neuf, sans trou', () => {
    expect(BOARD_SPACES.map((s) => s.index)).toEqual(
      Array.from({ length: BOARD_SIZE }, (_, i) => i),
    );
  });

  it('nomme chaque case en français', () => {
    expect(BOARD_SPACES.every((s) => s.nameFr.length > 0)).toBe(true);
  });

  it('nomme chaque case en anglais', () => {
    expect(BOARD_SPACES.every((s) => s.name.length > 0)).toBe(true);
  });

  it('place la case départ en zéro', () => {
    expect(BOARD_SPACES[0].type).toBe('go');
  });

  it('contient une prison', () => {
    expect(BOARD_SPACES.some((s) => s.type === 'jail')).toBe(true);
  });

  it('contient un parc gratuit', () => {
    expect(BOARD_SPACES.some((s) => s.type === 'free_parking')).toBe(true);
  });

  it('contient une case « allez en prison »', () => {
    expect(BOARD_SPACES.some((s) => s.type === 'go_to_jail')).toBe(true);
  });

  it('donne un prix à chaque propriété', () => {
    const properties = BOARD_SPACES.filter((s) => s.type === 'property');
    expect(properties.every((s) => typeof s.price === 'number' && s.price > 0)).toBe(true);
  });

  it('donne six paliers de loyer à chaque propriété', () => {
    const properties = BOARD_SPACES.filter((s) => s.type === 'property');
    expect(properties.every((s) => s.rent?.length === 6)).toBe(true);
  });

  it('fait croître le loyer avec les constructions', () => {
    for (const space of BOARD_SPACES.filter((s) => s.type === 'property')) {
      const rents = space.rent as number[];
      for (let i = 1; i < rents.length; i += 1) {
        expect(rents[i]).toBeGreaterThan(rents[i - 1]);
      }
    }
  });

  it('associe un groupe à chaque propriété', () => {
    const properties = BOARD_SPACES.filter((s) => s.type === 'property');
    expect(properties.every((s) => !!s.group)).toBe(true);
  });

  it('compte quatre gares', () => {
    expect(BOARD_SPACES.filter((s) => s.type === 'railroad')).toHaveLength(4);
  });

  it('compte deux compagnies', () => {
    expect(BOARD_SPACES.filter((s) => s.type === 'utility')).toHaveLength(2);
  });

  it('donne une couleur à chaque groupe', () => {
    const groups = new Set(
      BOARD_SPACES.map((s) => s.group).filter((g): g is PropertyGroup => !!g),
    );
    for (const group of groups) {
      expect(GROUP_COLORS[group]).toMatch(/^#/);
    }
  });

  it('propose huit pions', () => {
    expect(TOKEN_TYPES).toHaveLength(8);
  });

  it('donne une couleur à chaque pion', () => {
    for (const token of TOKEN_TYPES) {
      expect(TOKEN_COLORS[token]).toMatch(/^#/);
    }
  });

  it('donne des couleurs de pion distinctes', () => {
    const colors = TOKEN_TYPES.map((t) => TOKEN_COLORS[t]);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('donne un montant aux cases taxe', () => {
    const taxes = BOARD_SPACES.filter((s) => s.type === 'tax');
    expect(taxes.every((s) => typeof s.taxAmount === 'number' && s.taxAmount > 0)).toBe(true);
  });
});

// ── 2. Déplacement : chemin de saut ────────────────────────────────────────

describe('monopoly — déplacement du pion', () => {
  it('avance case par case', () => {
    expect(computeHopPath(0, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('ne bouge pas quand la position est inchangée', () => {
    expect(computeHopPath(7, 7)).toEqual([]);
  });

  it('passe par la case départ en fin de tour', () => {
    expect(computeHopPath(38, 2)).toEqual([39, 0, 1, 2]);
  });

  it('boucle depuis la dernière case', () => {
    expect(computeHopPath(39, 0)).toEqual([0]);
  });

  it('fait un tour complet moins une case', () => {
    expect(computeHopPath(0, 39)).toHaveLength(39);
  });

  it('avance d’une seule case', () => {
    expect(computeHopPath(10, 11)).toEqual([11]);
  });

  it('respecte la longueur attendue modulo quarante', () => {
    for (let from = 0; from < BOARD_SIZE; from += 7) {
      for (let to = 0; to < BOARD_SIZE; to += 5) {
        const expected = (to - from + BOARD_SIZE) % BOARD_SIZE;
        expect(computeHopPath(from, to)).toHaveLength(expected);
      }
    }
  });

  it('reste dans les bornes du plateau', () => {
    for (let from = 0; from < BOARD_SIZE; from += 3) {
      for (const tile of computeHopPath(from, (from + 17) % BOARD_SIZE)) {
        expect(tile).toBeGreaterThanOrEqual(0);
        expect(tile).toBeLessThan(BOARD_SIZE);
      }
    }
  });

  it('progresse d’exactement une case à chaque étape', () => {
    const path = computeHopPath(35, 4);
    for (let i = 1; i < path.length; i += 1) {
      expect(path[i]).toBe((path[i - 1] + 1) % BOARD_SIZE);
    }
  });

  it('termine sur la case d’arrivée', () => {
    const path = computeHopPath(12, 20);
    expect(path[path.length - 1]).toBe(20);
  });

  it('démarre juste après la case de départ', () => {
    expect(computeHopPath(12, 20)[0]).toBe(13);
  });

  it('refuse une position de départ négative', () => {
    expect(() => computeHopPath(-1, 5)).toThrow(RangeError);
  });

  it('refuse une position de départ hors plateau', () => {
    expect(() => computeHopPath(40, 5)).toThrow(RangeError);
  });

  it('refuse une position d’arrivée hors plateau', () => {
    expect(() => computeHopPath(0, 40)).toThrow(RangeError);
  });

  it('refuse une position décimale', () => {
    expect(() => computeHopPath(0.5, 5)).toThrow(RangeError);
  });

  it('refuse une position non finie', () => {
    expect(() => computeHopPath(Number.NaN, 5)).toThrow(RangeError);
    expect(() => computeHopPath(0, Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it('donne le même chemin à tous les joueurs', () => {
    expect(computeHopPath(30, 3)).toEqual(computeHopPath(30, 3));
  });

  it('détecte le passage par la case départ sur tout le plateau', () => {
    // Un chemin contenant 0 signifie que le joueur touche la case départ.
    expect(computeHopPath(37, 5)).toContain(0);
    expect(computeHopPath(1, 10)).not.toContain(0);
  });

  it('place chaque case du plateau dans l’espace 3D', () => {
    for (let index = 0; index < BOARD_SIZE; index += 1) {
      const position = getBoardPosition(index);
      expect(Number.isFinite(position.x)).toBe(true);
      expect(Number.isFinite(position.z)).toBe(true);
      expect(Number.isFinite(position.rotation)).toBe(true);
    }
  });

  it('donne des positions 3D distinctes à des cases distinctes', () => {
    const seen = new Set<string>();
    for (let index = 0; index < BOARD_SIZE; index += 1) {
      const { x, z } = getBoardPosition(index);
      seen.add(`${x.toFixed(3)}:${z.toFixed(3)}`);
    }
    expect(seen.size).toBe(BOARD_SIZE);
  });
});

// ── 3. Monopoles de groupe ─────────────────────────────────────────────────

describe('monopoly — détection du monopole de groupe', () => {
  it('liste les cases marron', () => {
    expect(getPropertiesInGroup('brown').length).toBeGreaterThan(0);
  });

  it('ne renvoie que des cases du groupe demandé', () => {
    for (const space of getPropertiesInGroup('orange')) {
      expect(space.group).toBe('orange');
    }
  });

  it('liste les cases dans l’ordre du plateau', () => {
    const indices = getPropertiesInGroup('red').map((s) => s.index);
    expect([...indices].sort((a, b) => a - b)).toEqual(indices);
  });

  it('liste les quatre gares comme un groupe', () => {
    expect(getPropertiesInGroup('railroad')).toHaveLength(4);
  });

  it('liste les deux compagnies comme un groupe', () => {
    expect(getPropertiesInGroup('utility')).toHaveLength(2);
  });

  it('reconnaît un monopole complet', () => {
    const group: PropertyGroup = 'brown';
    const properties = getPropertiesInGroup(group).map((s) => owned(s.index, 'joueur-1'));
    expect(playerOwnsAllInGroup({ properties }, 'joueur-1', group)).toBe(true);
  });

  it('refuse un monopole incomplet', () => {
    const group: PropertyGroup = 'brown';
    const spaces = getPropertiesInGroup(group);
    const properties = [owned(spaces[0].index, 'joueur-1')];
    expect(playerOwnsAllInGroup({ properties }, 'joueur-1', group)).toBe(false);
  });

  it('refuse un monopole partagé avec un adversaire', () => {
    const group: PropertyGroup = 'brown';
    const spaces = getPropertiesInGroup(group);
    const properties = spaces.map((s, i) => owned(s.index, i === 0 ? 'joueur-2' : 'joueur-1'));
    expect(playerOwnsAllInGroup({ properties }, 'joueur-1', group)).toBe(false);
  });

  it('refuse un monopole sans aucune propriété', () => {
    expect(playerOwnsAllInGroup({ properties: [] }, 'joueur-1', 'brown')).toBe(false);
  });

  it('refuse un identifiant de joueur vide', () => {
    const properties = getPropertiesInGroup('brown').map((s) => owned(s.index, null));
    expect(playerOwnsAllInGroup({ properties }, '', 'brown')).toBe(false);
  });

  it('ne confond pas une case libre avec une possession', () => {
    const properties = getPropertiesInGroup('brown').map((s) => owned(s.index, null));
    expect(playerOwnsAllInGroup({ properties }, 'joueur-1', 'brown')).toBe(false);
  });

  it('ignore les propriétés hors du groupe', () => {
    const group: PropertyGroup = 'brown';
    const properties = [
      ...getPropertiesInGroup(group).map((s) => owned(s.index, 'joueur-1')),
      owned(getPropertiesInGroup('red')[0].index, 'joueur-2'),
    ];
    expect(playerOwnsAllInGroup({ properties }, 'joueur-1', group)).toBe(true);
  });

  it('reconnaît un monopole sur chaque groupe de couleur', () => {
    const colorGroups: PropertyGroup[] = [
      'brown', 'lightblue', 'pink', 'orange', 'red', 'yellow', 'green', 'darkblue',
    ];
    for (const group of colorGroups) {
      const properties = getPropertiesInGroup(group).map((s) => owned(s.index, 'joueur-1'));
      expect(playerOwnsAllInGroup({ properties }, 'joueur-1', group)).toBe(true);
    }
  });

  it('ignore le statut d’hypothèque pour la possession du groupe', () => {
    const group: PropertyGroup = 'brown';
    const properties = getPropertiesInGroup(group).map((s) => owned(s.index, 'joueur-1'));
    // `playerOwnsAllInGroup` ne lit pas l'hypothèque : c'est le loyer qui la gère.
    expect(playerOwnsAllInGroup({ properties }, 'joueur-1', group)).toBe(true);
  });

  it('donne le même verdict à tous les joueurs pour un même instantané', () => {
    const group: PropertyGroup = 'lightblue';
    const properties = getPropertiesInGroup(group).map((s) => owned(s.index, 'joueur-1'));
    const vuJoueur1 = playerOwnsAllInGroup({ properties }, 'joueur-1', group);
    const vuJoueur2 = playerOwnsAllInGroup({ properties: [...properties].reverse() }, 'joueur-1', group);
    expect(vuJoueur1).toBe(vuJoueur2);
  });
});

// ── 4. Loyers ──────────────────────────────────────────────────────────────

describe('monopoly — calcul des loyers', () => {
  it('applique le loyer de base sans construction', () => {
    const space = firstPropertySpace;
    const rent = calculateRent(space, 0, [rentRow(space.index)]);
    expect(rent).toBeGreaterThan(0);
  });

  it('double le loyer de base sur un monopole sans maison', () => {
    const group = firstPropertySpace.group as PropertyGroup;
    const spaces = getPropertiesInGroup(group);
    const owner = spaces.map((s) => rentRow(s.index));
    const seul = calculateRent(firstPropertySpace, 0, [rentRow(firstPropertySpace.index)]);
    const monopole = calculateRent(firstPropertySpace, 0, owner);
    expect(monopole).toBe(seul * 2);
  });

  it('augmente le loyer avec une maison', () => {
    const space = firstPropertySpace;
    const base = calculateRent(space, 0, [rentRow(space.index)]);
    const avecMaison = calculateRent(space, 1, [rentRow(space.index, 1)]);
    expect(avecMaison).toBeGreaterThan(base);
  });

  it('augmente le loyer à chaque maison supplémentaire', () => {
    const space = firstPropertySpace;
    let previous = 0;
    for (let houses = 1; houses <= 5; houses += 1) {
      const rent = calculateRent(space, houses, [rentRow(space.index, houses)]);
      expect(rent).toBeGreaterThan(previous);
      previous = rent;
    }
  });

  it('applique le loyer hôtel au cinquième palier', () => {
    const space = firstPropertySpace;
    const rents = space.rent as number[];
    expect(calculateRent(space, 5, [rentRow(space.index, 5)])).toBe(rents[5]);
  });

  it('facture vingt-cinq pour une seule gare', () => {
    const railroad = BOARD_SPACES.find((s) => s.type === 'railroad') as BoardSpace;
    expect(calculateRent(railroad, 0, [rentRow(railroad.index)])).toBe(25);
  });

  it('double le loyer à deux gares', () => {
    const railroads = BOARD_SPACES.filter((s) => s.type === 'railroad');
    const owner = railroads.slice(0, 2).map((s) => rentRow(s.index));
    expect(calculateRent(railroads[0], 0, owner)).toBe(50);
  });

  it('facture cent à trois gares', () => {
    const railroads = BOARD_SPACES.filter((s) => s.type === 'railroad');
    const owner = railroads.slice(0, 3).map((s) => rentRow(s.index));
    expect(calculateRent(railroads[0], 0, owner)).toBe(100);
  });

  it('facture deux cents aux quatre gares', () => {
    const railroads = BOARD_SPACES.filter((s) => s.type === 'railroad');
    const owner = railroads.map((s) => rentRow(s.index));
    expect(calculateRent(railroads[0], 0, owner)).toBe(200);
  });

  it('ne compte pas une gare hypothéquée', () => {
    const railroads = BOARD_SPACES.filter((s) => s.type === 'railroad');
    const owner = [rentRow(railroads[0].index), rentRow(railroads[1].index, 0, true)];
    expect(calculateRent(railroads[0], 0, owner)).toBe(25);
  });

  it('ne facture rien sans gare détenue', () => {
    const railroad = BOARD_SPACES.find((s) => s.type === 'railroad') as BoardSpace;
    expect(calculateRent(railroad, 0, [])).toBe(0);
  });

  it('facture quatre fois le dé pour une compagnie', () => {
    const utility = BOARD_SPACES.find((s) => s.type === 'utility') as BoardSpace;
    expect(calculateRent(utility, 0, [rentRow(utility.index)], 8)).toBe(32);
  });

  it('facture dix fois le dé pour deux compagnies', () => {
    const utilities = BOARD_SPACES.filter((s) => s.type === 'utility');
    const owner = utilities.map((s) => rentRow(s.index));
    expect(calculateRent(utilities[0], 0, owner, 8)).toBe(80);
  });

  it('suppose un lancer de sept sans dé fourni', () => {
    const utility = BOARD_SPACES.find((s) => s.type === 'utility') as BoardSpace;
    expect(calculateRent(utility, 0, [rentRow(utility.index)])).toBe(28);
  });

  it('ne compte pas une compagnie hypothéquée', () => {
    const utilities = BOARD_SPACES.filter((s) => s.type === 'utility');
    const owner = [rentRow(utilities[0].index), rentRow(utilities[1].index, 0, true)];
    expect(calculateRent(utilities[0], 0, owner, 5)).toBe(20);
  });

  it('varie le loyer de compagnie avec le lancer', () => {
    const utility = BOARD_SPACES.find((s) => s.type === 'utility') as BoardSpace;
    const owner = [rentRow(utility.index)];
    expect(calculateRent(utility, 0, owner, 2)).toBeLessThan(
      calculateRent(utility, 0, owner, 12),
    );
  });

  it('ne renvoie jamais de loyer négatif', () => {
    for (const space of BOARD_SPACES) {
      const rent = calculateRent(space, 0, [rentRow(space.index)], 7);
      expect(rent).toBeGreaterThanOrEqual(0);
    }
  });

  it('ne facture rien sur une case non constructible', () => {
    const go = spaceOf(0);
    expect(calculateRent(go, 0, [rentRow(0)])).toBe(0);
  });

  it('reste déterministe pour une même situation', () => {
    const space = firstPropertySpace;
    const owner = [rentRow(space.index, 2)];
    expect(calculateRent(space, 2, owner)).toBe(calculateRent(space, 2, owner));
  });

  it('ne double pas le loyer quand une case du groupe est hypothéquée', () => {
    const group = firstPropertySpace.group as PropertyGroup;
    const spaces = getPropertiesInGroup(group);
    const owner = spaces.map((s, i) => rentRow(s.index, 0, i === spaces.length - 1));
    const seul = calculateRent(firstPropertySpace, 0, [rentRow(firstPropertySpace.index)]);
    expect(calculateRent(firstPropertySpace, 0, owner)).toBe(seul);
  });
});

// ── 5. Zones du plateau (cohérence visuelle partagée) ──────────────────────

describe('monopoly — zones du plateau', () => {
  it('déclare douze zones', () => {
    expect(ZONE_KEYS).toHaveLength(12);
  });

  it('donne une palette à chaque zone', () => {
    for (const key of ZONE_KEYS) {
      expect(ZONE_PALETTES[key]).toBeDefined();
    }
  });

  it('associe la case départ à sa zone d’angle', () => {
    expect(tileToZone(0)).toBe('corner_go');
  });

  it('associe chaque propriété colorée à une zone', () => {
    for (const space of BOARD_SPACES) {
      if (space.type !== 'property') continue;
      expect(tileToZone(space.index)).not.toBeNull();
    }
  });

  it('renvoie une zone connue pour chaque case ayant une zone', () => {
    for (let index = 0; index < BOARD_SIZE; index += 1) {
      const zone = tileToZone(index);
      if (zone !== null) expect(ZONE_KEYS).toContain(zone);
    }
  });

  it('ne renvoie aucune zone pour une case hors plateau', () => {
    expect(tileToZone(999)).toBeNull();
  });

  it('ne renvoie aucune zone pour un index négatif', () => {
    expect(tileToZone(-1)).toBeNull();
  });

  it('donne les quatre zones d’angle', () => {
    const corners = [0, 10, 20, 30].map((i) => tileToZone(i));
    expect(corners.filter((z) => z?.startsWith('corner_'))).toHaveLength(4);
  });

  it('donne la même zone à tous les joueurs pour une case', () => {
    for (let index = 0; index < BOARD_SIZE; index += 1) {
      expect(tileToZone(index)).toBe(tileToZone(index));
    }
  });

  it('regroupe les propriétés d’un même groupe dans la même zone', () => {
    for (const group of ['brown', 'red', 'green'] as PropertyGroup[]) {
      const zones = new Set(getPropertiesInGroup(group).map((s) => tileToZone(s.index)));
      expect(zones.size).toBe(1);
    }
  });
});

// ── 6. Canaux perçus (accessibilité multi-canal) ───────────────────────────

describe('monopoly — canaux de restitution des évènements', () => {
  const event = (kind: RenderEvent['kind']): RenderEvent =>
    ({ kind } as unknown as RenderEvent);

  it('déclare cinq canaux', () => {
    expect(CHANNELS).toHaveLength(5);
  });

  it('gèle la liste des canaux', () => {
    expect(Object.isFrozen(CHANNELS)).toBe(true);
  });

  it('déclare treize types d’évènements', () => {
    expect(RENDER_EVENT_KINDS).toHaveLength(13);
  });

  it('donne au moins un canal à chaque évènement', () => {
    for (const kind of RENDER_EVENT_KINDS) {
      expect(channelsFor(event(kind)).length).toBeGreaterThan(0);
    }
  });

  it('donne au moins deux canaux à chaque évènement critique', () => {
    const critiques: RenderEvent['kind'][] = [
      'DICE_ROLL', 'PURCHASE', 'CARD_DRAW', 'JAILED', 'BANKRUPT', 'GAME_END', 'MONEY_DELTA',
    ];
    for (const kind of critiques) {
      expect(channelsFor(event(kind)).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('n’utilise que des canaux déclarés', () => {
    for (const kind of RENDER_EVENT_KINDS) {
      for (const channel of channelsFor(event(kind))) {
        expect(CHANNELS).toContain(channel);
      }
    }
  });

  it('respecte l’ordre canonique des canaux', () => {
    for (const kind of RENDER_EVENT_KINDS) {
      const channels = channelsFor(event(kind));
      const positions = channels.map((c) => CHANNELS.indexOf(c));
      expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    }
  });

  it('ne répète jamais un canal', () => {
    for (const kind of RENDER_EVENT_KINDS) {
      const channels = channelsFor(event(kind));
      expect(new Set(channels).size).toBe(channels.length);
    }
  });

  it('laisse un canal perceptible même en retirant n’importe lequel', () => {
    const critiques: RenderEvent['kind'][] = [
      'DICE_ROLL', 'PURCHASE', 'CARD_DRAW', 'JAILED', 'BANKRUPT', 'GAME_END', 'MONEY_DELTA',
    ];
    for (const kind of critiques) {
      for (const channel of CHANNELS) {
        expect(channelsRemoving(event(kind), channel).length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('retire effectivement le canal demandé', () => {
    expect(channelsRemoving(event('DICE_ROLL'), 'sound')).not.toContain('sound');
  });

  it('laisse la liste intacte si le canal est absent', () => {
    const before = channelsFor(event('TOKEN_HOP'));
    expect(channelsRemoving(event('TOKEN_HOP'), 'text')).toEqual(before);
  });

  it('accompagne le lancer de dés d’un retour texte et sonore', () => {
    const channels = channelsFor(event('DICE_ROLL'));
    expect(channels).toContain('text');
    expect(channels).toContain('sound');
  });

  it('accompagne l’achat d’un retour visuel et sonore', () => {
    const channels = channelsFor(event('PURCHASE'));
    expect(channels).toContain('color');
    expect(channels).toContain('sound');
  });

  it('accompagne la faillite sur les cinq canaux', () => {
    expect(channelsFor(event('BANKRUPT'))).toHaveLength(5);
  });

  it('accompagne la fin de partie sur les cinq canaux', () => {
    expect(channelsFor(event('GAME_END'))).toHaveLength(5);
  });

  it('reste sobre sur un simple saut de pion', () => {
    expect(channelsFor(event('TOKEN_HOP'))).toEqual(['motion', 'sound']);
  });

  it('renvoie la même table à tous les joueurs', () => {
    for (const kind of RENDER_EVENT_KINDS) {
      expect(channelsFor(event(kind))).toEqual(channelsFor(event(kind)));
    }
  });

  it('ne renvoie jamais une liste modifiable par accident', () => {
    const first = channelsRemoving(event('PURCHASE'), 'sound') as Channel[];
    first.push('sound' as Channel);
    expect(channelsFor(event('PURCHASE'))).toContain('sound');
  });
});

type Channel = (typeof CHANNELS)[number];
