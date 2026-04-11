// Word pairs for the Undercover game
// Each pair has a civilian word and an undercover word (similar but different)
export interface WordPair {
  civilian: string;
  undercover: string;
}

export const WORD_PAIRS: WordPair[] = [
  { civilian: "Chat", undercover: "Chien" },
  { civilian: "Pizza", undercover: "Burger" },
  { civilian: "Football", undercover: "Rugby" },
  { civilian: "Océan", undercover: "Mer" },
  { civilian: "Guitare", undercover: "Ukulélé" },
  { civilian: "Soleil", undercover: "Lune" },
  { civilian: "Train", undercover: "Métro" },
  { civilian: "Café", undercover: "Thé" },
  { civilian: "Ski", undercover: "Snowboard" },
  { civilian: "Superman", undercover: "Batman" },
  { civilian: "Pomme", undercover: "Poire" },
  { civilian: "Chocolat", undercover: "Caramel" },
  { civilian: "Netflix", undercover: "YouTube" },
  { civilian: "iPhone", undercover: "Samsung" },
  { civilian: "Paris", undercover: "Londres" },
  { civilian: "Dentiste", undercover: "Médecin" },
  { civilian: "Piscine", undercover: "Lac" },
  { civilian: "Vélo", undercover: "Trottinette" },
  { civilian: "Cinéma", undercover: "Théâtre" },
  { civilian: "Croissant", undercover: "Pain au chocolat" },
  { civilian: "Whisky", undercover: "Rhum" },
  { civilian: "Manga", undercover: "Comics" },
  { civilian: "TikTok", undercover: "Instagram" },
  { civilian: "Mario", undercover: "Sonic" },
  { civilian: "Fortnite", undercover: "Minecraft" },
  { civilian: "McDonald's", undercover: "Burger King" },
  { civilian: "Nike", undercover: "Adidas" },
  { civilian: "Rap", undercover: "R&B" },
  { civilian: "Voiture", undercover: "Moto" },
  { civilian: "Rose", undercover: "Tulipe" },
  { civilian: "Lunettes", undercover: "Lentilles" },
  { civilian: "Pluie", undercover: "Neige" },
  { civilian: "Piano", undercover: "Violon" },
  { civilian: "Requin", undercover: "Dauphin" },
  { civilian: "Hamburger", undercover: "Hot-dog" },
  { civilian: "Couteau", undercover: "Fourchette" },
  { civilian: "Montagne", undercover: "Colline" },
  { civilian: "Dragon Ball", undercover: "Naruto" },
  { civilian: "Bière", undercover: "Vin" },
  { civilian: "Basket", undercover: "Handball" },
  { civilian: "Spider-Man", undercover: "Iron Man" },
  { civilian: "Fantôme", undercover: "Zombie" },
  { civilian: "Chips", undercover: "Pop-corn" },
  { civilian: "Avion", undercover: "Hélicoptère" },
  { civilian: "Chaussettes", undercover: "Chaussures" },
  { civilian: "Dictionnaire", undercover: "Encyclopédie" },
  { civilian: "Clown", undercover: "Magicien" },
  { civilian: "Tigre", undercover: "Lion" },
  { civilian: "Bague", undercover: "Bracelet" },
  { civilian: "Serpent", undercover: "Lézard" },
];

export function getRandomWordPair(): WordPair {
  return WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
}
