// Word pairs for the Undercover game
// Each pair has a civilian word and an undercover word (similar but different)
// ALL words must be simple, universally understood, everyday vocabulary.
// No anime references, no obscure pop culture, no English slang.

export interface WordPair {
  civilian: string;
  undercover: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export type WordCategory =
  | 'nourriture'
  | 'boissons'
  | 'animaux'
  | 'transport'
  | 'sport'
  | 'nature'
  | 'objets'
  | 'lieux'
  | 'metiers'
  | 'vetements'
  | 'corps'
  | 'maison'
  | 'ecole'
  | 'musique'
  | 'fetes';

export const CATEGORY_LABELS: Record<WordCategory, string> = {
  nourriture: '🍕 Nourriture',
  boissons: '☕ Boissons',
  animaux: '🐾 Animaux',
  transport: '🚗 Transport',
  sport: '⚽ Sport',
  nature: '🌿 Nature',
  objets: '🔑 Objets',
  lieux: '📍 Lieux',
  metiers: '👷 Métiers',
  vetements: '👕 Vêtements',
  corps: '🫀 Corps',
  maison: '🏠 Maison',
  ecole: '📚 École',
  musique: '🎵 Musique',
  fetes: '🎉 Fêtes',
};

export const WORD_PAIRS: WordPair[] = [
  // ═══════════════════════════════════════════════════════════
  // 🍕 NOURRITURE — Mots du quotidien, compréhensibles par tous
  // ═══════════════════════════════════════════════════════════
  { civilian: "Pizza", undercover: "Burger", category: "nourriture", difficulty: "easy" },
  { civilian: "Frites", undercover: "Chips", category: "nourriture", difficulty: "easy" },
  { civilian: "Croissant", undercover: "Pain au chocolat", category: "nourriture", difficulty: "easy" },
  { civilian: "Gâteau", undercover: "Tarte", category: "nourriture", difficulty: "easy" },
  { civilian: "Glace", undercover: "Sorbet", category: "nourriture", difficulty: "medium" },
  { civilian: "Crêpe", undercover: "Gaufre", category: "nourriture", difficulty: "easy" },
  { civilian: "Bonbon", undercover: "Chewing-gum", category: "nourriture", difficulty: "easy" },
  { civilian: "Soupe", undercover: "Bouillon", category: "nourriture", difficulty: "medium" },
  { civilian: "Beurre", undercover: "Margarine", category: "nourriture", difficulty: "hard" },
  { civilian: "Pain", undercover: "Biscotte", category: "nourriture", difficulty: "medium" },
  { civilian: "Yaourt", undercover: "Fromage blanc", category: "nourriture", difficulty: "hard" },
  { civilian: "Confiture", undercover: "Miel", category: "nourriture", difficulty: "medium" },
  { civilian: "Pâtes", undercover: "Riz", category: "nourriture", difficulty: "easy" },
  { civilian: "Salade", undercover: "Crudités", category: "nourriture", difficulty: "hard" },
  { civilian: "Sandwich", undercover: "Wrap", category: "nourriture", difficulty: "medium" },
  { civilian: "Chocolat", undercover: "Caramel", category: "nourriture", difficulty: "medium" },
  { civilian: "Ketchup", undercover: "Mayonnaise", category: "nourriture", difficulty: "easy" },
  { civilian: "Pomme", undercover: "Poire", category: "nourriture", difficulty: "hard" },
  { civilian: "Fraise", undercover: "Framboise", category: "nourriture", difficulty: "hard" },
  { civilian: "Orange", undercover: "Mandarine", category: "nourriture", difficulty: "hard" },
  { civilian: "Steak", undercover: "Poulet", category: "nourriture", difficulty: "easy" },
  { civilian: "Sushi", undercover: "Kebab", category: "nourriture", difficulty: "easy" },
  { civilian: "Omelette", undercover: "Œuf dur", category: "nourriture", difficulty: "medium" },
  { civilian: "Pop-corn", undercover: "Cacahuètes", category: "nourriture", difficulty: "medium" },

  // ═══════════════════════════════════════════════════════════
  // ☕ BOISSONS
  // ═══════════════════════════════════════════════════════════
  { civilian: "Café", undercover: "Thé", category: "boissons", difficulty: "easy" },
  { civilian: "Coca", undercover: "Pepsi", category: "boissons", difficulty: "hard" },
  { civilian: "Jus d'orange", undercover: "Limonade", category: "boissons", difficulty: "medium" },
  { civilian: "Lait", undercover: "Chocolat chaud", category: "boissons", difficulty: "medium" },
  { civilian: "Eau plate", undercover: "Eau gazeuse", category: "boissons", difficulty: "hard" },
  { civilian: "Bière", undercover: "Vin", category: "boissons", difficulty: "easy" },
  { civilian: "Smoothie", undercover: "Milkshake", category: "boissons", difficulty: "medium" },
  { civilian: "Sirop", undercover: "Soda", category: "boissons", difficulty: "medium" },
  { civilian: "Champagne", undercover: "Cidre", category: "boissons", difficulty: "medium" },
  { civilian: "Tisane", undercover: "Infusion", category: "boissons", difficulty: "hard" },

  // ═══════════════════════════════════════════════════════════
  // 🐾 ANIMAUX
  // ═══════════════════════════════════════════════════════════
  { civilian: "Chat", undercover: "Chien", category: "animaux", difficulty: "easy" },
  { civilian: "Lion", undercover: "Tigre", category: "animaux", difficulty: "hard" },
  { civilian: "Cheval", undercover: "Âne", category: "animaux", difficulty: "medium" },
  { civilian: "Poule", undercover: "Canard", category: "animaux", difficulty: "medium" },
  { civilian: "Mouton", undercover: "Chèvre", category: "animaux", difficulty: "medium" },
  { civilian: "Lapin", undercover: "Hamster", category: "animaux", difficulty: "medium" },
  { civilian: "Aigle", undercover: "Pigeon", category: "animaux", difficulty: "easy" },
  { civilian: "Requin", undercover: "Dauphin", category: "animaux", difficulty: "easy" },
  { civilian: "Serpent", undercover: "Lézard", category: "animaux", difficulty: "medium" },
  { civilian: "Abeille", undercover: "Guêpe", category: "animaux", difficulty: "hard" },
  { civilian: "Papillon", undercover: "Coccinelle", category: "animaux", difficulty: "medium" },
  { civilian: "Loup", undercover: "Renard", category: "animaux", difficulty: "medium" },
  { civilian: "Tortue", undercover: "Escargot", category: "animaux", difficulty: "medium" },
  { civilian: "Vache", undercover: "Taureau", category: "animaux", difficulty: "hard" },
  { civilian: "Grenouille", undercover: "Crapaud", category: "animaux", difficulty: "hard" },
  { civilian: "Perroquet", undercover: "Perruche", category: "animaux", difficulty: "hard" },

  // ═══════════════════════════════════════════════════════════
  // 🚗 TRANSPORT
  // ═══════════════════════════════════════════════════════════
  { civilian: "Train", undercover: "Métro", category: "transport", difficulty: "hard" },
  { civilian: "Voiture", undercover: "Moto", category: "transport", difficulty: "easy" },
  { civilian: "Vélo", undercover: "Trottinette", category: "transport", difficulty: "easy" },
  { civilian: "Avion", undercover: "Hélicoptère", category: "transport", difficulty: "medium" },
  { civilian: "Bus", undercover: "Tramway", category: "transport", difficulty: "hard" },
  { civilian: "Bateau", undercover: "Canoë", category: "transport", difficulty: "medium" },
  { civilian: "Taxi", undercover: "Uber", category: "transport", difficulty: "hard" },
  { civilian: "Camion", undercover: "Fourgon", category: "transport", difficulty: "hard" },
  { civilian: "Fusée", undercover: "Satellite", category: "transport", difficulty: "medium" },
  { civilian: "Skateboard", undercover: "Roller", category: "transport", difficulty: "medium" },

  // ═══════════════════════════════════════════════════════════
  // ⚽ SPORT
  // ═══════════════════════════════════════════════════════════
  { civilian: "Football", undercover: "Rugby", category: "sport", difficulty: "easy" },
  { civilian: "Tennis", undercover: "Badminton", category: "sport", difficulty: "medium" },
  { civilian: "Basket", undercover: "Handball", category: "sport", difficulty: "medium" },
  { civilian: "Natation", undercover: "Plongée", category: "sport", difficulty: "medium" },
  { civilian: "Ski", undercover: "Snowboard", category: "sport", difficulty: "easy" },
  { civilian: "Boxe", undercover: "Judo", category: "sport", difficulty: "easy" },
  { civilian: "Danse", undercover: "Gymnastique", category: "sport", difficulty: "medium" },
  { civilian: "Course", undercover: "Marche", category: "sport", difficulty: "medium" },
  { civilian: "Surf", undercover: "Planche à voile", category: "sport", difficulty: "medium" },
  { civilian: "Escalade", undercover: "Randonnée", category: "sport", difficulty: "medium" },
  { civilian: "Ping-pong", undercover: "Billard", category: "sport", difficulty: "easy" },
  { civilian: "Pétanque", undercover: "Bowling", category: "sport", difficulty: "easy" },

  // ═══════════════════════════════════════════════════════════
  // 🌿 NATURE
  // ═══════════════════════════════════════════════════════════
  { civilian: "Soleil", undercover: "Lune", category: "nature", difficulty: "easy" },
  { civilian: "Pluie", undercover: "Neige", category: "nature", difficulty: "easy" },
  { civilian: "Montagne", undercover: "Colline", category: "nature", difficulty: "hard" },
  { civilian: "Océan", undercover: "Lac", category: "nature", difficulty: "medium" },
  { civilian: "Forêt", undercover: "Jardin", category: "nature", difficulty: "medium" },
  { civilian: "Rivière", undercover: "Ruisseau", category: "nature", difficulty: "hard" },
  { civilian: "Désert", undercover: "Plage", category: "nature", difficulty: "easy" },
  { civilian: "Volcan", undercover: "Tremblement de terre", category: "nature", difficulty: "medium" },
  { civilian: "Arc-en-ciel", undercover: "Aurore boréale", category: "nature", difficulty: "medium" },
  { civilian: "Étoile", undercover: "Planète", category: "nature", difficulty: "medium" },
  { civilian: "Orage", undercover: "Tempête", category: "nature", difficulty: "hard" },
  { civilian: "Fleur", undercover: "Arbre", category: "nature", difficulty: "easy" },
  { civilian: "Île", undercover: "Continent", category: "nature", difficulty: "easy" },
  { civilian: "Grotte", undercover: "Tunnel", category: "nature", difficulty: "medium" },

  // ═══════════════════════════════════════════════════════════
  // 🔑 OBJETS DU QUOTIDIEN
  // ═══════════════════════════════════════════════════════════
  { civilian: "Stylo", undercover: "Crayon", category: "objets", difficulty: "hard" },
  { civilian: "Lunettes", undercover: "Lentilles", category: "objets", difficulty: "medium" },
  { civilian: "Montre", undercover: "Réveil", category: "objets", difficulty: "medium" },
  { civilian: "Parapluie", undercover: "Imperméable", category: "objets", difficulty: "medium" },
  { civilian: "Bougie", undercover: "Lampe", category: "objets", difficulty: "easy" },
  { civilian: "Miroir", undercover: "Vitre", category: "objets", difficulty: "hard" },
  { civilian: "Couteau", undercover: "Ciseaux", category: "objets", difficulty: "medium" },
  { civilian: "Clé", undercover: "Cadenas", category: "objets", difficulty: "medium" },
  { civilian: "Valise", undercover: "Sac à dos", category: "objets", difficulty: "easy" },
  { civilian: "Oreiller", undercover: "Coussin", category: "objets", difficulty: "hard" },
  { civilian: "Téléphone", undercover: "Tablette", category: "objets", difficulty: "medium" },
  { civilian: "Portefeuille", undercover: "Sac à main", category: "objets", difficulty: "medium" },
  { civilian: "Brosse à dents", undercover: "Peigne", category: "objets", difficulty: "easy" },
  { civilian: "Assiette", undercover: "Bol", category: "objets", difficulty: "hard" },

  // ═══════════════════════════════════════════════════════════
  // 📍 LIEUX
  // ═══════════════════════════════════════════════════════════
  { civilian: "Restaurant", undercover: "Cantine", category: "lieux", difficulty: "medium" },
  { civilian: "Cinéma", undercover: "Théâtre", category: "lieux", difficulty: "medium" },
  { civilian: "Hôpital", undercover: "Pharmacie", category: "lieux", difficulty: "medium" },
  { civilian: "Bibliothèque", undercover: "Librairie", category: "lieux", difficulty: "hard" },
  { civilian: "Hôtel", undercover: "Appartement", category: "lieux", difficulty: "medium" },
  { civilian: "Piscine", undercover: "Plage", category: "lieux", difficulty: "easy" },
  { civilian: "Supermarché", undercover: "Marché", category: "lieux", difficulty: "hard" },
  { civilian: "Parc", undercover: "Forêt", category: "lieux", difficulty: "medium" },
  { civilian: "Aéroport", undercover: "Gare", category: "lieux", difficulty: "medium" },
  { civilian: "Stade", undercover: "Gymnase", category: "lieux", difficulty: "medium" },
  { civilian: "Zoo", undercover: "Aquarium", category: "lieux", difficulty: "easy" },
  { civilian: "Musée", undercover: "Galerie", category: "lieux", difficulty: "hard" },
  { civilian: "Prison", undercover: "Caserne", category: "lieux", difficulty: "medium" },
  { civilian: "Église", undercover: "Mosquée", category: "lieux", difficulty: "medium" },

  // ═══════════════════════════════════════════════════════════
  // 👷 MÉTIERS
  // ═══════════════════════════════════════════════════════════
  { civilian: "Médecin", undercover: "Dentiste", category: "metiers", difficulty: "medium" },
  { civilian: "Pompier", undercover: "Policier", category: "metiers", difficulty: "easy" },
  { civilian: "Professeur", undercover: "Directeur", category: "metiers", difficulty: "medium" },
  { civilian: "Boulanger", undercover: "Pâtissier", category: "metiers", difficulty: "hard" },
  { civilian: "Coiffeur", undercover: "Maquilleur", category: "metiers", difficulty: "medium" },
  { civilian: "Plombier", undercover: "Électricien", category: "metiers", difficulty: "medium" },
  { civilian: "Pilote", undercover: "Chauffeur", category: "metiers", difficulty: "medium" },
  { civilian: "Cuisinier", undercover: "Serveur", category: "metiers", difficulty: "easy" },
  { civilian: "Facteur", undercover: "Livreur", category: "metiers", difficulty: "hard" },
  { civilian: "Architecte", undercover: "Maçon", category: "metiers", difficulty: "medium" },
  { civilian: "Chanteur", undercover: "Musicien", category: "metiers", difficulty: "hard" },
  { civilian: "Acteur", undercover: "Comédien", category: "metiers", difficulty: "hard" },

  // ═══════════════════════════════════════════════════════════
  // 👕 VÊTEMENTS
  // ═══════════════════════════════════════════════════════════
  { civilian: "Chaussures", undercover: "Baskets", category: "vetements", difficulty: "hard" },
  { civilian: "Pantalon", undercover: "Jean", category: "vetements", difficulty: "hard" },
  { civilian: "Pull", undercover: "Gilet", category: "vetements", difficulty: "medium" },
  { civilian: "Casquette", undercover: "Bonnet", category: "vetements", difficulty: "easy" },
  { civilian: "Écharpe", undercover: "Cravate", category: "vetements", difficulty: "easy" },
  { civilian: "Manteau", undercover: "Veste", category: "vetements", difficulty: "hard" },
  { civilian: "Pyjama", undercover: "Robe de chambre", category: "vetements", difficulty: "medium" },
  { civilian: "Maillot de bain", undercover: "Short", category: "vetements", difficulty: "medium" },
  { civilian: "Gants", undercover: "Moufles", category: "vetements", difficulty: "hard" },
  { civilian: "Lunettes de soleil", undercover: "Chapeau", category: "vetements", difficulty: "easy" },

  // ═══════════════════════════════════════════════════════════
  // 🫀 CORPS HUMAIN
  // ═══════════════════════════════════════════════════════════
  { civilian: "Main", undercover: "Pied", category: "corps", difficulty: "easy" },
  { civilian: "Œil", undercover: "Oreille", category: "corps", difficulty: "easy" },
  { civilian: "Cheveux", undercover: "Barbe", category: "corps", difficulty: "medium" },
  { civilian: "Doigt", undercover: "Orteil", category: "corps", difficulty: "hard" },
  { civilian: "Bouche", undercover: "Nez", category: "corps", difficulty: "easy" },
  { civilian: "Bras", undercover: "Jambe", category: "corps", difficulty: "easy" },
  { civilian: "Cœur", undercover: "Cerveau", category: "corps", difficulty: "medium" },
  { civilian: "Dent", undercover: "Ongle", category: "corps", difficulty: "medium" },

  // ═══════════════════════════════════════════════════════════
  // 🏠 MAISON
  // ═══════════════════════════════════════════════════════════
  { civilian: "Cuisine", undercover: "Salle de bain", category: "maison", difficulty: "easy" },
  { civilian: "Lit", undercover: "Canapé", category: "maison", difficulty: "medium" },
  { civilian: "Fenêtre", undercover: "Porte", category: "maison", difficulty: "medium" },
  { civilian: "Escalier", undercover: "Ascenseur", category: "maison", difficulty: "medium" },
  { civilian: "Garage", undercover: "Cave", category: "maison", difficulty: "medium" },
  { civilian: "Balcon", undercover: "Terrasse", category: "maison", difficulty: "hard" },
  { civilian: "Douche", undercover: "Baignoire", category: "maison", difficulty: "hard" },
  { civilian: "Cheminée", undercover: "Radiateur", category: "maison", difficulty: "medium" },
  { civilian: "Tapis", undercover: "Moquette", category: "maison", difficulty: "hard" },
  { civilian: "Rideau", undercover: "Store", category: "maison", difficulty: "hard" },

  // ═══════════════════════════════════════════════════════════
  // 📚 ÉCOLE
  // ═══════════════════════════════════════════════════════════
  { civilian: "Cahier", undercover: "Classeur", category: "ecole", difficulty: "hard" },
  { civilian: "Récréation", undercover: "Pause", category: "ecole", difficulty: "hard" },
  { civilian: "Tableau", undercover: "Écran", category: "ecole", difficulty: "medium" },
  { civilian: "Cartable", undercover: "Trousse", category: "ecole", difficulty: "easy" },
  { civilian: "Examen", undercover: "Contrôle", category: "ecole", difficulty: "hard" },
  { civilian: "Devoirs", undercover: "Exercices", category: "ecole", difficulty: "hard" },
  { civilian: "Cantine", undercover: "Cafétéria", category: "ecole", difficulty: "hard" },
  { civilian: "Gymnase", undercover: "Cour de récré", category: "ecole", difficulty: "medium" },

  // ═══════════════════════════════════════════════════════════
  // 🎵 MUSIQUE
  // ═══════════════════════════════════════════════════════════
  { civilian: "Guitare", undercover: "Piano", category: "musique", difficulty: "easy" },
  { civilian: "Batterie", undercover: "Tambour", category: "musique", difficulty: "hard" },
  { civilian: "Concert", undercover: "Festival", category: "musique", difficulty: "hard" },
  { civilian: "Chanson", undercover: "Musique", category: "musique", difficulty: "hard" },
  { civilian: "Radio", undercover: "Podcast", category: "musique", difficulty: "medium" },
  { civilian: "Casque", undercover: "Écouteurs", category: "musique", difficulty: "hard" },
  { civilian: "Micro", undercover: "Enceinte", category: "musique", difficulty: "medium" },
  { civilian: "Violon", undercover: "Flûte", category: "musique", difficulty: "easy" },

  // ═══════════════════════════════════════════════════════════
  // 🎉 FÊTES & ÉVÉNEMENTS
  // ═══════════════════════════════════════════════════════════
  { civilian: "Noël", undercover: "Nouvel An", category: "fetes", difficulty: "medium" },
  { civilian: "Anniversaire", undercover: "Mariage", category: "fetes", difficulty: "easy" },
  { civilian: "Halloween", undercover: "Carnaval", category: "fetes", difficulty: "medium" },
  { civilian: "Vacances", undercover: "Week-end", category: "fetes", difficulty: "medium" },
  { civilian: "Pique-nique", undercover: "Barbecue", category: "fetes", difficulty: "easy" },
  { civilian: "Feu d'artifice", undercover: "Pétard", category: "fetes", difficulty: "hard" },
  { civilian: "Cadeau", undercover: "Surprise", category: "fetes", difficulty: "medium" },
  { civilian: "Déguisement", undercover: "Costume", category: "fetes", difficulty: "hard" },
  { civilian: "Gâteau d'anniversaire", undercover: "Bûche de Noël", category: "fetes", difficulty: "medium" },
  { civilian: "Fête foraine", undercover: "Parc d'attractions", category: "fetes", difficulty: "hard" },
];

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

/** Get a random word pair from all available pairs */
export function getRandomWordPair(): WordPair {
  return WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
}

/** Get a random word pair filtered by difficulty */
export function getRandomWordPairByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): WordPair {
  const filtered = WORD_PAIRS.filter(p => p.difficulty === difficulty);
  if (filtered.length === 0) return getRandomWordPair();
  return filtered[Math.floor(Math.random() * filtered.length)];
}

/** Get a random word pair filtered by category */
export function getRandomWordPairByCategory(category: string): WordPair {
  const filtered = WORD_PAIRS.filter(p => p.category === category);
  if (filtered.length === 0) return getRandomWordPair();
  return filtered[Math.floor(Math.random() * filtered.length)];
}

/** Get a random word pair filtered by both difficulty and category */
export function getRandomWordPairFiltered(options: {
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
}): WordPair {
  let filtered = [...WORD_PAIRS];
  if (options.difficulty) {
    filtered = filtered.filter(p => p.difficulty === options.difficulty);
  }
  if (options.category) {
    filtered = filtered.filter(p => p.category === options.category);
  }
  if (filtered.length === 0) return getRandomWordPair();
  return filtered[Math.floor(Math.random() * filtered.length)];
}

/** Get all available categories */
export function getCategories(): string[] {
  return [...new Set(WORD_PAIRS.map(p => p.category))];
}

/** Get word count per category */
export function getCategoryCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  WORD_PAIRS.forEach(p => {
    counts[p.category] = (counts[p.category] || 0) + 1;
  });
  return counts;
}

/** Get word count per difficulty */
export function getDifficultyCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  WORD_PAIRS.forEach(p => {
    counts[p.difficulty] = (counts[p.difficulty] || 0) + 1;
  });
  return counts;
}
