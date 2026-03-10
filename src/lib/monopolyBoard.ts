// Complete Monopoly board definition - 40 spaces

export type SpaceType = 'property' | 'railroad' | 'utility' | 'chance' | 'community' | 'tax' | 'go' | 'jail' | 'free_parking' | 'go_to_jail';

export type PropertyGroup = 'brown' | 'lightblue' | 'pink' | 'orange' | 'red' | 'yellow' | 'green' | 'darkblue' | 'railroad' | 'utility';

export interface BoardSpace {
  index: number;
  name: string;
  nameFr: string;
  type: SpaceType;
  group?: PropertyGroup;
  price?: number;
  rent?: number[];      // [0 houses, 1, 2, 3, 4, hotel]
  houseCost?: number;
  mortgage?: number;
  color?: string;        // hex color for display
  taxAmount?: number;
}

export const BOARD_SPACES: BoardSpace[] = [
  // Bottom row (right to left when looking at board)
  { index: 0, name: 'GO', nameFr: 'DÉPART', type: 'go' },
  { index: 1, name: 'Mediterranean Avenue', nameFr: 'Boulevard de Belleville', type: 'property', group: 'brown', price: 60, rent: [2, 10, 30, 90, 160, 250], houseCost: 50, mortgage: 30, color: '#8B4513' },
  { index: 2, name: 'Community Chest', nameFr: 'Caisse de Communauté', type: 'community' },
  { index: 3, name: 'Baltic Avenue', nameFr: 'Rue Lecourbe', type: 'property', group: 'brown', price: 60, rent: [4, 20, 60, 180, 320, 450], houseCost: 50, mortgage: 30, color: '#8B4513' },
  { index: 4, name: 'Income Tax', nameFr: 'Impôt sur le Revenu', type: 'tax', taxAmount: 200 },
  { index: 5, name: 'Reading Railroad', nameFr: 'Gare Montparnasse', type: 'railroad', group: 'railroad', price: 200, mortgage: 100, color: '#333333' },
  { index: 6, name: 'Oriental Avenue', nameFr: 'Rue de Vaugirard', type: 'property', group: 'lightblue', price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgage: 50, color: '#87CEEB' },
  { index: 7, name: 'Chance', nameFr: 'Chance', type: 'chance' },
  { index: 8, name: 'Vermont Avenue', nameFr: 'Rue de Courcelles', type: 'property', group: 'lightblue', price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgage: 50, color: '#87CEEB' },
  { index: 9, name: 'Connecticut Avenue', nameFr: 'Avenue de la République', type: 'property', group: 'lightblue', price: 120, rent: [8, 40, 100, 300, 450, 600], houseCost: 50, mortgage: 60, color: '#87CEEB' },
  
  // Left column (bottom to top)
  { index: 10, name: 'Jail / Just Visiting', nameFr: 'Prison / Simple Visite', type: 'jail' },
  { index: 11, name: 'St. Charles Place', nameFr: 'Boulevard de la Villette', type: 'property', group: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgage: 70, color: '#FF69B4' },
  { index: 12, name: 'Electric Company', nameFr: 'Compagnie de Distribution d\'Électricité', type: 'utility', group: 'utility', price: 150, mortgage: 75, color: '#FFD700' },
  { index: 13, name: 'States Avenue', nameFr: 'Avenue de Neuilly', type: 'property', group: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgage: 70, color: '#FF69B4' },
  { index: 14, name: 'Virginia Avenue', nameFr: 'Rue du Paradis', type: 'property', group: 'pink', price: 160, rent: [12, 60, 180, 500, 700, 900], houseCost: 100, mortgage: 80, color: '#FF69B4' },
  { index: 15, name: 'Pennsylvania Railroad', nameFr: 'Gare de Lyon', type: 'railroad', group: 'railroad', price: 200, mortgage: 100, color: '#333333' },
  { index: 16, name: 'St. James Place', nameFr: 'Avenue Mozart', type: 'property', group: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgage: 90, color: '#FFA500' },
  { index: 17, name: 'Community Chest', nameFr: 'Caisse de Communauté', type: 'community' },
  { index: 18, name: 'Tennessee Avenue', nameFr: 'Boulevard Saint-Michel', type: 'property', group: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgage: 90, color: '#FFA500' },
  { index: 19, name: 'New York Avenue', nameFr: 'Place Pigalle', type: 'property', group: 'orange', price: 200, rent: [16, 80, 220, 600, 800, 1000], houseCost: 100, mortgage: 100, color: '#FFA500' },
  
  // Top row (left to right)
  { index: 20, name: 'Free Parking', nameFr: 'Parc Gratuit', type: 'free_parking' },
  { index: 21, name: 'Kentucky Avenue', nameFr: 'Avenue Matignon', type: 'property', group: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgage: 110, color: '#FF0000' },
  { index: 22, name: 'Chance', nameFr: 'Chance', type: 'chance' },
  { index: 23, name: 'Indiana Avenue', nameFr: 'Boulevard Malesherbes', type: 'property', group: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgage: 110, color: '#FF0000' },
  { index: 24, name: 'Illinois Avenue', nameFr: 'Avenue Henri-Martin', type: 'property', group: 'red', price: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 150, mortgage: 120, color: '#FF0000' },
  { index: 25, name: 'B&O Railroad', nameFr: 'Gare du Nord', type: 'railroad', group: 'railroad', price: 200, mortgage: 100, color: '#333333' },
  { index: 26, name: 'Atlantic Avenue', nameFr: 'Faubourg Saint-Honoré', type: 'property', group: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgage: 130, color: '#FFD700' },
  { index: 27, name: 'Ventnor Avenue', nameFr: 'Place de la Bourse', type: 'property', group: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgage: 130, color: '#FFD700' },
  { index: 28, name: 'Water Works', nameFr: 'Compagnie de Distribution des Eaux', type: 'utility', group: 'utility', price: 150, mortgage: 75, color: '#4169E1' },
  { index: 29, name: 'Marvin Gardens', nameFr: 'Rue La Fayette', type: 'property', group: 'yellow', price: 280, rent: [24, 120, 360, 850, 1025, 1200], houseCost: 150, mortgage: 140, color: '#FFD700' },
  
  // Right column (top to bottom)
  { index: 30, name: 'Go To Jail', nameFr: 'Allez en Prison', type: 'go_to_jail' },
  { index: 31, name: 'Pacific Avenue', nameFr: 'Avenue de Breteuil', type: 'property', group: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgage: 150, color: '#228B22' },
  { index: 32, name: 'North Carolina Avenue', nameFr: 'Avenue Foch', type: 'property', group: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgage: 150, color: '#228B22' },
  { index: 33, name: 'Community Chest', nameFr: 'Caisse de Communauté', type: 'community' },
  { index: 34, name: 'Pennsylvania Avenue', nameFr: 'Boulevard des Capucines', type: 'property', group: 'green', price: 320, rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200, mortgage: 160, color: '#228B22' },
  { index: 35, name: 'Short Line', nameFr: 'Gare Saint-Lazare', type: 'railroad', group: 'railroad', price: 200, mortgage: 100, color: '#333333' },
  { index: 36, name: 'Chance', nameFr: 'Chance', type: 'chance' },
  { index: 37, name: 'Park Place', nameFr: 'Avenue des Champs-Élysées', type: 'property', group: 'darkblue', price: 350, rent: [35, 175, 500, 1100, 1300, 1500], houseCost: 200, mortgage: 175, color: '#00008B' },
  { index: 38, name: 'Luxury Tax', nameFr: 'Taxe de Luxe', type: 'tax', taxAmount: 100 },
  { index: 39, name: 'Boardwalk', nameFr: 'Rue de la Paix', type: 'property', group: 'darkblue', price: 400, rent: [50, 200, 600, 1400, 1700, 2000], houseCost: 200, mortgage: 200, color: '#00008B' },
];

export const GROUP_COLORS: Record<PropertyGroup, string> = {
  brown: '#8B4513',
  lightblue: '#87CEEB',
  pink: '#FF69B4',
  orange: '#FFA500',
  red: '#FF0000',
  yellow: '#FFD700',
  green: '#228B22',
  darkblue: '#00008B',
  railroad: '#333333',
  utility: '#4169E1',
};

export const TOKEN_TYPES = ['car', 'hat', 'shoe', 'dog', 'ship', 'thimble', 'iron', 'cannon'] as const;
export type TokenType = typeof TOKEN_TYPES[number];

export const TOKEN_COLORS: Record<TokenType, string> = {
  car: '#FF4444',
  hat: '#4444FF',
  shoe: '#44FF44',
  dog: '#FFD700',
  ship: '#FF8800',
  thimble: '#AA44FF',
  iron: '#888888',
  cannon: '#00CCCC',
};

// Cards
export interface GameCard {
  text: string;
  textFr: string;
  action: 'collect' | 'pay' | 'move' | 'move_to' | 'jail' | 'get_out_of_jail' | 'repairs' | 'pay_each' | 'collect_each' | 'move_back';
  amount?: number;
  position?: number;
  perHouse?: number;
  perHotel?: number;
}

export const CHANCE_CARDS: GameCard[] = [
  { text: 'Advance to GO', textFr: 'Avancez jusqu\'au Départ', action: 'move_to', position: 0 },
  { text: 'Advance to Illinois Ave', textFr: 'Avancez à l\'Avenue Henri-Martin', action: 'move_to', position: 24 },
  { text: 'Advance to St. Charles Place', textFr: 'Avancez au Boulevard de la Villette', action: 'move_to', position: 11 },
  { text: 'Bank pays you $50', textFr: 'La banque vous verse 50$', action: 'collect', amount: 50 },
  { text: 'Get Out of Jail Free', textFr: 'Sortez de Prison Gratuitement', action: 'get_out_of_jail' },
  { text: 'Go Back 3 Spaces', textFr: 'Reculez de 3 cases', action: 'move_back', amount: 3 },
  { text: 'Go to Jail', textFr: 'Allez en Prison', action: 'jail' },
  { text: 'Make general repairs: $25/house, $100/hotel', textFr: 'Réparations: 25$/maison, 100$/hôtel', action: 'repairs', perHouse: 25, perHotel: 100 },
  { text: 'Pay poor tax of $15', textFr: 'Payez une amende de 15$', action: 'pay', amount: 15 },
  { text: 'Advance to Reading Railroad', textFr: 'Avancez à la Gare Montparnasse', action: 'move_to', position: 5 },
  { text: 'Advance to Boardwalk', textFr: 'Avancez à la Rue de la Paix', action: 'move_to', position: 39 },
  { text: 'Pay each player $50', textFr: 'Payez 50$ à chaque joueur', action: 'pay_each', amount: 50 },
  { text: 'Collect $150', textFr: 'Recevez 150$', action: 'collect', amount: 150 },
  { text: 'Advance to GO', textFr: 'Avancez au Départ', action: 'move_to', position: 0 },
];

export const COMMUNITY_CARDS: GameCard[] = [
  { text: 'Advance to GO', textFr: 'Avancez au Départ', action: 'move_to', position: 0 },
  { text: 'Bank error in your favor: Collect $200', textFr: 'Erreur de la banque: Recevez 200$', action: 'collect', amount: 200 },
  { text: 'Doctor\'s fees: Pay $50', textFr: 'Frais médicaux: Payez 50$', action: 'pay', amount: 50 },
  { text: 'Sale of stock: Collect $50', textFr: 'Vente d\'actions: Recevez 50$', action: 'collect', amount: 50 },
  { text: 'Get Out of Jail Free', textFr: 'Sortez de Prison Gratuitement', action: 'get_out_of_jail' },
  { text: 'Go to Jail', textFr: 'Allez en Prison', action: 'jail' },
  { text: 'Grand Opera Night: Collect $50 from each player', textFr: 'Soirée Opéra: Recevez 50$ de chaque joueur', action: 'collect_each', amount: 50 },
  { text: 'Holiday fund matures: Collect $100', textFr: 'Placement: Recevez 100$', action: 'collect', amount: 100 },
  { text: 'Income tax refund: Collect $20', textFr: 'Remboursement d\'impôts: Recevez 20$', action: 'collect', amount: 20 },
  { text: 'It\'s your birthday: Collect $10 from each player', textFr: 'Anniversaire: Recevez 10$ de chaque joueur', action: 'collect_each', amount: 10 },
  { text: 'Life insurance matures: Collect $100', textFr: 'Assurance vie: Recevez 100$', action: 'collect', amount: 100 },
  { text: 'Pay hospital fees of $100', textFr: 'Frais d\'hôpital: Payez 100$', action: 'pay', amount: 100 },
  { text: 'Pay school fees of $50', textFr: 'Frais de scolarité: Payez 50$', action: 'pay', amount: 50 },
  { text: 'Receive $25 consultancy fee', textFr: 'Honoraires de consultation: Recevez 25$', action: 'collect', amount: 25 },
  { text: 'Repairs: $40/house, $115/hotel', textFr: 'Réparations: 40$/maison, 115$/hôtel', action: 'repairs', perHouse: 40, perHotel: 115 },
  { text: 'You have won second prize in a beauty contest: Collect $10', textFr: 'Concours de beauté: Recevez 10$', action: 'collect', amount: 10 },
  { text: 'You inherit $100', textFr: 'Héritage: Recevez 100$', action: 'collect', amount: 100 },
];

// Utility functions
export function getPropertiesInGroup(group: PropertyGroup): BoardSpace[] {
  return BOARD_SPACES.filter(s => s.group === group);
}

export function calculateRent(
  space: BoardSpace,
  houses: number,
  ownerProperties: { property_index: number; houses: number; is_mortgaged: boolean }[],
  diceRoll?: number
): number {
  if (space.type === 'railroad') {
    const ownedRailroads = ownerProperties.filter(p => {
      const s = BOARD_SPACES[p.property_index];
      return s.type === 'railroad' && !p.is_mortgaged;
    }).length;
    return [0, 25, 50, 100, 200][ownedRailroads] || 0;
  }
  
  if (space.type === 'utility') {
    const ownedUtilities = ownerProperties.filter(p => {
      const s = BOARD_SPACES[p.property_index];
      return s.type === 'utility' && !p.is_mortgaged;
    }).length;
    const multiplier = ownedUtilities >= 2 ? 10 : 4;
    return (diceRoll || 7) * multiplier;
  }
  
  if (space.type === 'property' && space.rent) {
    // Check if owner has all properties in group (monopoly)
    const groupProps = getPropertiesInGroup(space.group!);
    const ownsAll = groupProps.every(gp => 
      ownerProperties.some(op => op.property_index === gp.index && !op.is_mortgaged)
    );
    
    if (houses === 0 && ownsAll) {
      return space.rent[0] * 2; // Double rent for monopoly
    }
    
    const rentIndex = Math.min(houses, 5);
    return space.rent[rentIndex];
  }
  
  return 0;
}

// Get position on the board for 3D rendering
export function getBoardPosition(index: number): { x: number; z: number; rotation: number } {
  const size = 10; // Board half-size
  const spacing = size * 2 / 10; // 10 spaces per side
  
  if (index <= 10) {
    // Bottom: right to left
    return { x: size - index * spacing, z: size, rotation: 0 };
  } else if (index <= 20) {
    // Left: bottom to top
    const i = index - 10;
    return { x: -size, z: size - i * spacing, rotation: Math.PI / 2 };
  } else if (index <= 30) {
    // Top: left to right
    const i = index - 20;
    return { x: -size + i * spacing, z: -size, rotation: Math.PI };
  } else {
    // Right: top to bottom
    const i = index - 30;
    return { x: size, z: -size + i * spacing, rotation: -Math.PI / 2 };
  }
}
