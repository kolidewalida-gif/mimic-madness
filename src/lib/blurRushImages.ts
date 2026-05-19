// =============================================================================
// BlurRush Image Bank — curated list using ONLY stable, reliable image sources
// (Wikimedia Commons / Wikipedia thumbnails) so images never break.
//
// Sources verified to load via the proxy chain:
//   1) Backend image-proxy (Supabase function)
//   2) images.weserv.nl (CORS-friendly proxy)
//   3) Direct (works fine for Wikimedia Commons)
// =============================================================================

export type BlurRushCategory =
  | 'Anime'
  | 'Film'
  | 'Série'
  | 'Personnage'
  | 'Jeux Vidéo'
  | 'Logo'
  | 'Monument'
  | 'Art'
  | 'Mix';

export interface BlurRushImage {
  url: string;
  answer: string;
  acceptable: string[];
  category: Exclude<BlurRushCategory, 'Mix'>;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const BLURRUSH_CATEGORIES: Exclude<BlurRushCategory, 'Mix'>[] = [
  'Anime',
  'Film',
  'Série',
  'Personnage',
  'Jeux Vidéo',
  'Logo',
  'Monument',
  'Art',
];

// Helper for Wikipedia thumbnail URLs (always stable)
const wp = (path: string, w = 800) =>
  `https://upload.wikimedia.org/wikipedia/${path}`;
const wpThumb = (path: string, w = 800) =>
  `https://upload.wikimedia.org/wikipedia/${path}`;

const BLURRUSH_IMAGES: BlurRushImage[] = [
  // ========== ANIME ==========
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/9/94/NarutoCoverTankobon1.jpg',
    answer: 'naruto',
    acceptable: ['naruto', 'naruto uzumaki'],
    category: 'Anime',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/9/90/One_Piece%2C_Volume_61_Cover_%28Japanese%29.jpg',
    answer: 'one piece',
    acceptable: ['one piece', 'luffy'],
    category: 'Anime',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/5/5f/Dragon_Ball_volume_1.jpg',
    answer: 'dragon ball',
    acceptable: ['dragon ball', 'dbz', 'goku', 'sangoku'],
    category: 'Anime',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/d/d6/Shingeki_no_Kyojin_manga_volume_1.jpg',
    answer: 'attack on titan',
    acceptable: ['attack on titan', 'snk', 'shingeki no kyojin', 'eren'],
    category: 'Anime',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/0/09/Demon_Slayer_-_Kimetsu_no_Yaiba%2C_volume_1.jpg',
    answer: 'demon slayer',
    acceptable: ['demon slayer', 'kimetsu no yaiba', 'tanjiro'],
    category: 'Anime',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/2/20/Jujutsu_Kaisen_volume_1.jpg',
    answer: 'jujutsu kaisen',
    acceptable: ['jujutsu kaisen', 'jjk', 'gojo'],
    category: 'Anime',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/4/4a/My_Hero_Academia_Volume_1.png',
    answer: 'my hero academia',
    acceptable: ['my hero academia', 'mha', 'boku no hero', 'deku'],
    category: 'Anime',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/0/0a/Death_Note_Vol_1.jpg',
    answer: 'death note',
    acceptable: ['death note', 'light yagami', 'kira'],
    category: 'Anime',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/4/45/Bleach_cover_01.png',
    answer: 'bleach',
    acceptable: ['bleach', 'ichigo'],
    category: 'Anime',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/d/d6/Fullmetal_Alchemist_volume_1_cover.jpg',
    answer: 'fullmetal alchemist',
    acceptable: ['fullmetal alchemist', 'fma'],
    category: 'Anime',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/7/74/Hunter_x_Hunter_Volume_1.jpg',
    answer: 'hunter x hunter',
    acceptable: ['hunter x hunter', 'hxh', 'gon'],
    category: 'Anime',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/c/c4/Tokyo_Ghoul_volume_1_cover.jpg',
    answer: 'tokyo ghoul',
    acceptable: ['tokyo ghoul', 'kaneki'],
    category: 'Anime',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/2/27/Chainsaw_Man_Volume_1.jpg',
    answer: 'chainsaw man',
    acceptable: ['chainsaw man', 'denji'],
    category: 'Anime',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/1/13/One-Punch_Man_volume_1_cover.jpg',
    answer: 'one punch man',
    acceptable: ['one punch man', 'opm', 'saitama'],
    category: 'Anime',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/4/4a/SwordArtOnline.jpg',
    answer: 'sword art online',
    acceptable: ['sword art online', 'sao', 'kirito'],
    category: 'Anime',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/0/0b/Your_Name_poster.png',
    answer: 'your name',
    acceptable: ['your name', 'kimi no na wa'],
    category: 'Anime',
    difficulty: 'medium',
  },

  // ========== FILMS ==========
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/0/0d/Avengers_Endgame_poster.jpg',
    answer: 'avengers endgame',
    acceptable: ['avengers', 'endgame', 'avengers endgame'],
    category: 'Film',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/b/b0/Avatar-Teaser-Poster.jpg',
    answer: 'avatar',
    acceptable: ['avatar'],
    category: 'Film',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/2/22/Titanic_%281997_film%29_poster.png',
    answer: 'titanic',
    acceptable: ['titanic'],
    category: 'Film',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/2/2e/Inception_%282010%29_theatrical_poster.jpg',
    answer: 'inception',
    acceptable: ['inception'],
    category: 'Film',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/c/c1/The_Matrix_Poster.jpg',
    answer: 'matrix',
    acceptable: ['matrix', 'the matrix'],
    category: 'Film',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/b/bc/Interstellar_film_poster.jpg',
    answer: 'interstellar',
    acceptable: ['interstellar'],
    category: 'Film',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/4/4a/Oppenheimer_%28film%29.jpg',
    answer: 'oppenheimer',
    acceptable: ['oppenheimer'],
    category: 'Film',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/0/0b/Barbie_2023_poster.jpg',
    answer: 'barbie',
    acceptable: ['barbie'],
    category: 'Film',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/c/c1/Spider-Man_No_Way_Home_poster.jpg',
    answer: 'spider man no way home',
    acceptable: ['spider man', 'spiderman', 'no way home'],
    category: 'Film',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/e/e7/Jurassic_Park_poster.jpg',
    answer: 'jurassic park',
    acceptable: ['jurassic park', 'jurassic world'],
    category: 'Film',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/d/d8/Frozen_%282013_film%29_poster.jpg',
    answer: 'frozen',
    acceptable: ['frozen', 'reine des neiges', 'la reine des neiges', 'elsa'],
    category: 'Film',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/3/3d/The_Lion_King_poster.jpg',
    answer: 'le roi lion',
    acceptable: ['lion king', 'roi lion', 'le roi lion', 'simba'],
    category: 'Film',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/1/1c/Godfather_ver1.jpg',
    answer: 'le parrain',
    acceptable: ['godfather', 'parrain', 'le parrain'],
    category: 'Film',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/8/8a/Dark_Knight.jpg',
    answer: 'the dark knight',
    acceptable: ['dark knight', 'batman'],
    category: 'Film',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/6/6c/Forrest_Gump_poster.jpg',
    answer: 'forrest gump',
    acceptable: ['forrest gump'],
    category: 'Film',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/8/82/Pulp_Fiction_cover.jpg',
    answer: 'pulp fiction',
    acceptable: ['pulp fiction'],
    category: 'Film',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/8/81/ShawshankRedemptionMoviePoster.jpg',
    answer: 'shawshank redemption',
    acceptable: ['shawshank', 'evades', 'les evades'],
    category: 'Film',
    difficulty: 'hard',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/a/a8/Fight_Club_poster.png',
    answer: 'fight club',
    acceptable: ['fight club'],
    category: 'Film',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/8/8d/Gladiator_ver1.jpg',
    answer: 'gladiator',
    acceptable: ['gladiator', 'gladiateur'],
    category: 'Film',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/8/8e/Dune_%282021_film%29.jpg',
    answer: 'dune',
    acceptable: ['dune'],
    category: 'Film',
    difficulty: 'medium',
  },

  // ========== SÉRIES ==========
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/6/68/Game_of_Thrones_title_card.jpg',
    answer: 'game of thrones',
    acceptable: ['game of thrones', 'got'],
    category: 'Série',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/0/03/Breaking_Bad_title_card.png',
    answer: 'breaking bad',
    acceptable: ['breaking bad'],
    category: 'Série',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/3/35/Stranger_Things_logo.png',
    answer: 'stranger things',
    acceptable: ['stranger things'],
    category: 'Série',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/a/a9/Money_Heist_logo.png',
    answer: 'la casa de papel',
    acceptable: ['casa de papel', 'money heist', 'la casa de papel'],
    category: 'Série',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/e/ec/Squid_Game_logo.png',
    answer: 'squid game',
    acceptable: ['squid game'],
    category: 'Série',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/f/f9/The_Mandalorian.jpg',
    answer: 'the mandalorian',
    acceptable: ['mandalorian', 'the mandalorian'],
    category: 'Série',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/9/91/The_Last_of_Us_HBO_logo.png',
    answer: 'the last of us',
    acceptable: ['last of us', 'the last of us', 'tlou'],
    category: 'Série',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/3/3a/Friends_logo.svg',
    answer: 'friends',
    acceptable: ['friends'],
    category: 'Série',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/d/d0/The_Office_US_logo.svg',
    answer: 'the office',
    acceptable: ['the office', 'office'],
    category: 'Série',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/9/9d/Lost_main_title.svg',
    answer: 'lost',
    acceptable: ['lost'],
    category: 'Série',
    difficulty: 'medium',
  },

  // ========== JEUX VIDÉO ==========
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/0/01/MinecraftCover.png',
    answer: 'minecraft',
    acceptable: ['minecraft'],
    category: 'Jeux Vidéo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/5/5e/Fortnite_cover.jpg',
    answer: 'fortnite',
    acceptable: ['fortnite'],
    category: 'Jeux Vidéo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/0/04/Mario_Series_Logo.svg',
    answer: 'mario',
    acceptable: ['mario', 'super mario'],
    category: 'Jeux Vidéo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/4/41/Pokemon_Logo_in_a_5_aspect_ratio_format_in_color.png',
    answer: 'pokemon',
    acceptable: ['pokemon', 'pokémon'],
    category: 'Jeux Vidéo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/0/0c/The_Legend_of_Zelda_logo.svg',
    answer: 'zelda',
    acceptable: ['zelda', 'legend of zelda'],
    category: 'Jeux Vidéo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/0/04/Sonic_the_Hedgehog_-_Logo_-_2018.svg',
    answer: 'sonic',
    acceptable: ['sonic', 'sonic the hedgehog'],
    category: 'Jeux Vidéo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/9/9c/Assassin%27s_Creed_logo.svg',
    answer: 'assassins creed',
    acceptable: ['assassins creed', "assassin's creed", 'ac'],
    category: 'Jeux Vidéo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/a/a7/GTA_V_logo.png',
    answer: 'gta v',
    acceptable: ['gta', 'gta v', 'gta 5', 'grand theft auto'],
    category: 'Jeux Vidéo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/4/4f/Call_of_Duty_logo.svg',
    answer: 'call of duty',
    acceptable: ['call of duty', 'cod'],
    category: 'Jeux Vidéo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/7/77/Among_Us_cover_art.jpg',
    answer: 'among us',
    acceptable: ['among us'],
    category: 'Jeux Vidéo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/2/2d/Witcher_3_cover_art.jpg',
    answer: 'the witcher 3',
    acceptable: ['witcher', 'the witcher', 'the witcher 3'],
    category: 'Jeux Vidéo',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/e/eb/Elden_Ring_Box_art.jpg',
    answer: 'elden ring',
    acceptable: ['elden ring'],
    category: 'Jeux Vidéo',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/3/35/Halo_3_final_boxshot.JPG',
    answer: 'halo',
    acceptable: ['halo'],
    category: 'Jeux Vidéo',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/a/a5/Fnaf_cover.jpg',
    answer: 'five nights at freddys',
    acceptable: ['fnaf', 'five nights at freddys'],
    category: 'Jeux Vidéo',
    difficulty: 'medium',
  },

  // ========== LOGOS ==========
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
    answer: 'amazon',
    acceptable: ['amazon'],
    category: 'Logo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg',
    answer: 'google',
    acceptable: ['google'],
    category: 'Logo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
    answer: 'apple',
    acceptable: ['apple'],
    category: 'Logo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg',
    answer: 'microsoft',
    acceptable: ['microsoft'],
    category: 'Logo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
    answer: 'netflix',
    acceptable: ['netflix'],
    category: 'Logo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg',
    answer: 'facebook',
    acceptable: ['facebook', 'fb', 'meta'],
    category: 'Logo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Instagram_logo_2022.svg',
    answer: 'instagram',
    acceptable: ['instagram', 'insta', 'ig'],
    category: 'Logo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/YouTube_social_white_squircle_%282017%29.svg',
    answer: 'youtube',
    acceptable: ['youtube', 'yt'],
    category: 'Logo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Twitter-logo.svg',
    answer: 'twitter',
    acceptable: ['twitter', 'x'],
    category: 'Logo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/7/7d/Spotify_logo_with_text.svg',
    answer: 'spotify',
    acceptable: ['spotify'],
    category: 'Logo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Discord_logo.svg',
    answer: 'discord',
    acceptable: ['discord'],
    category: 'Logo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Twitch_logo_%28wordmark_only%29.svg',
    answer: 'twitch',
    acceptable: ['twitch'],
    category: 'Logo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/Tesla_Motors.svg',
    answer: 'tesla',
    acceptable: ['tesla'],
    category: 'Logo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/5/5a/Nike-Logo.svg',
    answer: 'nike',
    acceptable: ['nike'],
    category: 'Logo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Adidas_Logo.svg',
    answer: 'adidas',
    acceptable: ['adidas'],
    category: 'Logo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Coca-Cola_logo.svg',
    answer: 'coca cola',
    acceptable: ['coca cola', 'coca', 'coke'],
    category: 'Logo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/36/Pepsi_logo_2014.svg',
    answer: 'pepsi',
    acceptable: ['pepsi'],
    category: 'Logo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/36/McDonald%27s_Golden_Arches.svg',
    answer: 'mcdonalds',
    acceptable: ['mcdonalds', 'mcdo', 'mcdonald'],
    category: 'Logo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/7/74/Starbucks_Corporation_Logo_2011.svg',
    answer: 'starbucks',
    acceptable: ['starbucks'],
    category: 'Logo',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/5/55/Logo_NIKE.svg',
    answer: 'nike',
    acceptable: ['nike'],
    category: 'Logo',
    difficulty: 'easy',
  },

  // ========== MONUMENTS ==========
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg/600px-Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg',
    answer: 'tour eiffel',
    acceptable: ['tour eiffel', 'eiffel tower', 'eiffel'],
    category: 'Monument',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Statue_of_Liberty_7.jpg/600px-Statue_of_Liberty_7.jpg',
    answer: 'statue de la liberte',
    acceptable: ['statue de la liberte', 'statue of liberty', 'liberty'],
    category: 'Monument',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Colosseo_2020.jpg/600px-Colosseo_2020.jpg',
    answer: 'colisee',
    acceptable: ['colisee', 'colosseum', 'colosseo'],
    category: 'Monument',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Taj_Mahal_%28Edited%29.jpeg/600px-Taj_Mahal_%28Edited%29.jpeg',
    answer: 'taj mahal',
    acceptable: ['taj mahal'],
    category: 'Monument',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/The_Great_Wall_of_China_at_Jinshanling-edit.jpg/600px-The_Great_Wall_of_China_at_Jinshanling-edit.jpg',
    answer: 'muraille de chine',
    acceptable: ['muraille', 'muraille de chine', 'great wall', 'great wall of china'],
    category: 'Monument',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/All_Gizah_Pyramids.jpg/600px-All_Gizah_Pyramids.jpg',
    answer: 'pyramides',
    acceptable: ['pyramides', 'pyramides de gizeh', 'pyramids', 'gizeh'],
    category: 'Monument',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Christ_the_Redeemer_-_Cristo_Redentor.jpg/600px-Christ_the_Redeemer_-_Cristo_Redentor.jpg',
    answer: 'christ redempteur',
    acceptable: ['christ redempteur', 'christ rio', 'christ the redeemer'],
    category: 'Monument',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Machu_Picchu%2C_Per%C3%BA.jpg/600px-Machu_Picchu%2C_Per%C3%BA.jpg',
    answer: 'machu picchu',
    acceptable: ['machu picchu'],
    category: 'Monument',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Big_Ben_2012_2.jpg/400px-Big_Ben_2012_2.jpg',
    answer: 'big ben',
    acceptable: ['big ben'],
    category: 'Monument',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Sydney_Opera_House_Sails.jpg/600px-Sydney_Opera_House_Sails.jpg',
    answer: 'opera de sydney',
    acceptable: ['opera sydney', 'opera de sydney', 'sydney opera house'],
    category: 'Monument',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/01_Schloss_Neuschwanstein.jpg/600px-01_Schloss_Neuschwanstein.jpg',
    answer: 'neuschwanstein',
    acceptable: ['neuschwanstein', 'chateau neuschwanstein'],
    category: 'Monument',
    difficulty: 'hard',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/La_Tour_de_Pise.jpg/400px-La_Tour_de_Pise.jpg',
    answer: 'tour de pise',
    acceptable: ['tour de pise', 'pise', 'leaning tower'],
    category: 'Monument',
    difficulty: 'easy',
  },

  // ========== ART ==========
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Mona_Lisa.jpg/600px-Mona_Lisa.jpg',
    answer: 'mona lisa',
    acceptable: ['mona lisa', 'joconde', 'la joconde'],
    category: 'Art',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/800px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
    answer: 'nuit etoilee',
    acceptable: ['nuit etoilee', 'starry night', 'van gogh'],
    category: 'Art',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/The_Scream.jpg/600px-The_Scream.jpg',
    answer: 'le cri',
    acceptable: ['le cri', 'cri', 'the scream', 'scream'],
    category: 'Art',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Hokusai_-_Great_Wave_off_Kanagawa.jpg/800px-Hokusai_-_Great_Wave_off_Kanagawa.jpg',
    answer: 'la grande vague',
    acceptable: ['grande vague', 'hokusai', 'great wave', 'kanagawa'],
    category: 'Art',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/The_Persistence_of_Memory.jpg/600px-The_Persistence_of_Memory.jpg',
    answer: 'persistance de la memoire',
    acceptable: ['persistance memoire', 'dali', 'persistance de la memoire', 'persistence of memory'],
    category: 'Art',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg/800px-Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg',
    answer: 'creation adam',
    acceptable: ['creation adam', 'creation of adam', 'michelangelo'],
    category: 'Art',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/The_Last_Supper_-_Leonardo_Da_Vinci_-_High_Resolution_32x16.jpg/1200px-The_Last_Supper_-_Leonardo_Da_Vinci_-_High_Resolution_32x16.jpg',
    answer: 'la cene',
    acceptable: ['cene', 'la cene', 'last supper'],
    category: 'Art',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mauritshuis_670.jpg/600px-Mauritshuis_670.jpg',
    answer: 'jeune fille a la perle',
    acceptable: ['jeune fille a la perle', 'fille perle', 'girl with a pearl earring', 'vermeer'],
    category: 'Art',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Claude_Monet%2C_Impression%2C_soleil_levant.jpg/1000px-Claude_Monet%2C_Impression%2C_soleil_levant.jpg',
    answer: 'impression soleil levant',
    acceptable: ['impression soleil levant', 'monet'],
    category: 'Art',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Edward_Hopper_-_Nighthawks.jpg/1000px-Edward_Hopper_-_Nighthawks.jpg',
    answer: 'nighthawks',
    acceptable: ['nighthawks', 'hopper', 'edward hopper'],
    category: 'Art',
    difficulty: 'hard',
  },

  // ========== PERSONNAGES ==========
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Albert_Einstein_Head.jpg/400px-Albert_Einstein_Head.jpg',
    answer: 'einstein',
    acceptable: ['einstein', 'albert einstein'],
    category: 'Personnage',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Mona_Lisa_face_800x800px.jpg/400px-Mona_Lisa_face_800x800px.jpg',
    answer: 'mona lisa',
    acceptable: ['mona lisa', 'joconde'],
    category: 'Personnage',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Napoleon_Bonaparte.jpg/400px-Napoleon_Bonaparte.jpg',
    answer: 'napoleon',
    acceptable: ['napoleon', 'napoleon bonaparte'],
    category: 'Personnage',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Abraham_Lincoln_O-77_matte_collodion_print.jpg/400px-Abraham_Lincoln_O-77_matte_collodion_print.jpg',
    answer: 'abraham lincoln',
    acceptable: ['lincoln', 'abraham lincoln'],
    category: 'Personnage',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Mahatma-Gandhi%2C_studio%2C_1931.jpg/400px-Mahatma-Gandhi%2C_studio%2C_1931.jpg',
    answer: 'gandhi',
    acceptable: ['gandhi', 'mahatma gandhi'],
    category: 'Personnage',
    difficulty: 'easy',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Martin_Luther_King_Jr_NYWTS.jpg/400px-Martin_Luther_King_Jr_NYWTS.jpg',
    answer: 'martin luther king',
    acceptable: ['martin luther king', 'mlk'],
    category: 'Personnage',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Marie_Curie_c._1920s.jpg/400px-Marie_Curie_c._1920s.jpg',
    answer: 'marie curie',
    acceptable: ['marie curie', 'curie'],
    category: 'Personnage',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Frida_Kahlo%2C_by_Guillermo_Kahlo.jpg/400px-Frida_Kahlo%2C_by_Guillermo_Kahlo.jpg',
    answer: 'frida kahlo',
    acceptable: ['frida kahlo', 'frida'],
    category: 'Personnage',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Pablo_Picasso%2C_1908%2C_photograph_published_in_1939.jpg/400px-Pablo_Picasso%2C_1908%2C_photograph_published_in_1939.jpg',
    answer: 'picasso',
    acceptable: ['picasso', 'pablo picasso'],
    category: 'Personnage',
    difficulty: 'medium',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Leonardo_da_Vinci_-_Self-Portrait_-_WGA12798.jpg/400px-Leonardo_da_Vinci_-_Self-Portrait_-_WGA12798.jpg',
    answer: 'leonardo da vinci',
    acceptable: ['leonardo', 'leonardo da vinci', 'da vinci', 'leonard de vinci'],
    category: 'Personnage',
    difficulty: 'medium',
  },
];

// Get images filtered by category
export function getImagesByCategory(category: BlurRushCategory): BlurRushImage[] {
  if (category === 'Mix') {
    return BLURRUSH_IMAGES;
  }
  return BLURRUSH_IMAGES.filter((img) => img.category === category);
}

// Get random images for a game session
export function getRandomImages(
  count: number,
  categories: BlurRushCategory[] = ['Mix'],
  usedIndices: number[] = [],
): { images: BlurRushImage[]; newUsedIndices: number[] } {
  let pool: BlurRushImage[];

  if (categories.includes('Mix') || categories.length === 0) {
    pool = [...BLURRUSH_IMAGES];
  } else {
    pool = BLURRUSH_IMAGES.filter((img) => categories.includes(img.category));
  }

  const availableIndices = pool
    .map((_, i) => i)
    .filter((i) => !usedIndices.includes(i));

  const shuffled = [...availableIndices].sort(() => Math.random() - 0.5);
  const selectedIndices = shuffled.slice(0, Math.min(count, shuffled.length));

  return {
    images: selectedIndices.map((i) => pool[i]),
    newUsedIndices: [...usedIndices, ...selectedIndices],
  };
}

export { BLURRUSH_IMAGES };
