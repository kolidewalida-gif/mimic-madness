// =============================================================================
// BlurRush Image Bank — 200+ entries with categories, synonyms, and difficulty
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
  category: BlurRushCategory;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const BLURRUSH_CATEGORIES: BlurRushCategory[] = [
  'Anime',
  'Film',
  'Série',
  'Personnage',
  'Jeux Vidéo',
  'Logo',
  'Monument',
  'Art',
];

// The massive image bank
export const BLURRUSH_IMAGES: BlurRushImage[] = [
  // ========== ANIME (30+) ==========
  { url: 'https://upload.wikimedia.org/wikipedia/en/9/94/NastyNaruto.png', answer: 'naruto', acceptable: ['naruto', 'naruto uzumaki'], category: 'Anime', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/a/a7/Camie_Utsushimi.png', answer: 'my hero academia', acceptable: ['my hero academia', 'mha', 'boku no hero'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/5/51/Goku_%28Super_Saiyan%29.png', answer: 'goku', acceptable: ['goku', 'sangoku', 'dragon ball', 'dbz'], category: 'Anime', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/1/17/Mikasa_Ackermann.jpg', answer: 'mikasa', acceptable: ['mikasa', 'attack on titan', 'snk', 'shingeki no kyojin'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/2/27/Spike_Spiegel_as_drawn_by_the_creators.png', answer: 'spike', acceptable: ['spike', 'spike spiegel', 'cowboy bebop'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/4/44/Levi_Ackerman.png', answer: 'levi', acceptable: ['levi', 'levi ackerman', 'attack on titan'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/0/09/Luffy_pfp.png', answer: 'luffy', acceptable: ['luffy', 'monkey d luffy', 'one piece'], category: 'Anime', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/d/d8/Ichigo_Kurosaki.png', answer: 'ichigo', acceptable: ['ichigo', 'bleach', 'ichigo kurosaki'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/8/8b/Light_from_Death_Note.jpg', answer: 'light yagami', acceptable: ['light', 'light yagami', 'death note', 'kira'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/6/6e/Sasuke_Uchiha.png', answer: 'sasuke', acceptable: ['sasuke', 'sasuke uchiha', 'naruto'], category: 'Anime', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/b/b8/Vegeta_Super_Saiyan.png', answer: 'vegeta', acceptable: ['vegeta', 'dragon ball'], category: 'Anime', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/8/80/Sailor_Moon_character.png', answer: 'sailor moon', acceptable: ['sailor moon', 'usagi'], category: 'Anime', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/3/3b/Eren_Yeager_%28Attack_on_Titan%29.png', answer: 'eren', acceptable: ['eren', 'eren yeager', 'eren jaeger', 'attack on titan'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/0/0b/Tanjiro_Kamado_Anime.png', answer: 'tanjiro', acceptable: ['tanjiro', 'demon slayer', 'kimetsu no yaiba'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/d/d5/Totoro_%28My_Neighbor_Totoro%29.jpg', answer: 'totoro', acceptable: ['totoro', 'mon voisin totoro', 'my neighbor totoro'], category: 'Anime', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/0/05/Spirited_Away_poster.jpg', answer: 'chihiro', acceptable: ['chihiro', 'spirited away', 'voyage de chihiro', 'le voyage de chihiro'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/a/aa/Saitama_One-Punch_Man.png', answer: 'saitama', acceptable: ['saitama', 'one punch man', 'opm'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/3/3f/Pikachu_detective.png', answer: 'pikachu', acceptable: ['pikachu', 'pokemon'], category: 'Anime', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/9/98/Edward_Elric.png', answer: 'edward elric', acceptable: ['edward', 'edward elric', 'fullmetal alchemist', 'fma'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/7/7e/Kakashi_Hatake.png', answer: 'kakashi', acceptable: ['kakashi', 'kakashi hatake', 'naruto'], category: 'Anime', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/0/0a/Gon_Freecss.png', answer: 'gon', acceptable: ['gon', 'gon freecss', 'hunter x hunter', 'hxh'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/5/5e/Killua_Zoldyck.png', answer: 'killua', acceptable: ['killua', 'hunter x hunter', 'hxh'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/7/73/Roronoa_Zoro.png', answer: 'zoro', acceptable: ['zoro', 'roronoa zoro', 'one piece'], category: 'Anime', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/c/c9/Hinata_Hy%C5%ABga.png', answer: 'hinata', acceptable: ['hinata', 'hinata hyuga', 'naruto'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/9/90/Zero_Two_Character.png', answer: 'zero two', acceptable: ['zero two', '02', 'darling in the franxx'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/f/f6/Itachi_Uchiha.png', answer: 'itachi', acceptable: ['itachi', 'itachi uchiha', 'naruto'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/9/9a/Akira_%281988%29.jpg', answer: 'akira', acceptable: ['akira', 'kaneda'], category: 'Anime', difficulty: 'hard' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/a/a1/Jujutsu_Kaisen_0_Movie.png', answer: 'jujutsu kaisen', acceptable: ['jujutsu kaisen', 'jjk', 'gojo', 'yuji'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/3/31/JoJo_Part_3_Stone_Ocean.jpg', answer: 'jojo', acceptable: ['jojo', 'jojo bizarre adventure', 'jjba'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/6/68/Chainsaw_Man_anime_key_visual.png', answer: 'chainsaw man', acceptable: ['chainsaw man', 'denji'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/4/4e/Ken_Kaneki.png', answer: 'kaneki', acceptable: ['kaneki', 'ken kaneki', 'tokyo ghoul'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/8/88/SPY_FAMILY.png', answer: 'spy x family', acceptable: ['spy x family', 'anya', 'loid', 'yor'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/5/5c/Code_Geass_-_Lelouch_of_the_Rebellion.png', answer: 'lelouch', acceptable: ['lelouch', 'code geass'], category: 'Anime', difficulty: 'hard' },

  // ========== FILMS (30+) ==========
  { url: 'https://upload.wikimedia.org/wikipedia/en/0/0d/Avengers_Endgame_poster.jpg', answer: 'avengers endgame', acceptable: ['avengers', 'endgame', 'avengers endgame'], category: 'Film', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/2/21/Avatar_2_logo.svg', answer: 'avatar', acceptable: ['avatar', 'avatar 2'], category: 'Film', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/e/e2/TitanicDVDCover.jpg', answer: 'titanic', acceptable: ['titanic'], category: 'Film', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/c/cf/Inception_ver3.jpg', answer: 'inception', acceptable: ['inception'], category: 'Film', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/3/3b/Matrix_poster.jpg', answer: 'matrix', acceptable: ['matrix', 'the matrix'], category: 'Film', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/8/87/Interstellar_film_poster.jpg', answer: 'interstellar', acceptable: ['interstellar'], category: 'Film', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/9/9a/Oppenheimer_film_poster.jpg', answer: 'oppenheimer', acceptable: ['oppenheimer'], category: 'Film', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/1/1e/Barbie_%282023%29_poster.jpg', answer: 'barbie', acceptable: ['barbie'], category: 'Film', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/9/9c/Spider-Man_No_Way_Home_poster.jpg', answer: 'spider-man no way home', acceptable: ['spider man', 'spiderman', 'no way home'], category: 'Film', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/6/67/Jurassic_Park_poster.jpg', answer: 'jurassic park', acceptable: ['jurassic park', 'jurassic world'], category: 'Film', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/a/a2/Jaws_poster.jpg', answer: 'les dents de la mer', acceptable: ['jaws', 'dents de la mer', 'les dents de la mer'], category: 'Film', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/9/96/Frozen2poster.jpg', answer: 'la reine des neiges', acceptable: ['frozen', 'reine des neiges', 'la reine des neiges', 'elsa'], category: 'Film', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/1/12/The_Lion_King_%282019_film%29.jpg', answer: 'le roi lion', acceptable: ['lion king', 'roi lion', 'le roi lion', 'simba'], category: 'Film', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/3/34/El_Camino_A_Breaking_Bad_Movie.png', answer: 'el camino', acceptable: ['el camino', 'breaking bad'], category: 'Film', difficulty: 'hard' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/8/8a/The_Godfather%2C_The_Game.jpg', answer: 'le parrain', acceptable: ['godfather', 'parrain', 'le parrain'], category: 'Film', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/8/8a/Dark_Knight.jpg', answer: 'the dark knight', acceptable: ['dark knight', 'batman'], category: 'Film', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/8/82/Forrest_Gump_poster.jpg', answer: 'forrest gump', acceptable: ['forrest gump'], category: 'Film', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/7/7a/Pulp_Fiction_cover.jpg', answer: 'pulp fiction', acceptable: ['pulp fiction'], category: 'Film', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/1/17/The_Shawshank_Redemption.jpg', answer: 'les evades', acceptable: ['shawshank', 'evades', 'les evades'], category: 'Film', difficulty: 'hard' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/1/1e/Schindler%27s_List_movie.jpg', answer: 'la liste de schindler', acceptable: ['schindlers list', 'schindler', 'liste de schindler'], category: 'Film', difficulty: 'hard' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/0/09/Fight_Club_poster.jpg', answer: 'fight club', acceptable: ['fight club'], category: 'Film', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/1/14/Gladiator_ver1.jpg', answer: 'gladiator', acceptable: ['gladiator', 'gladiateur'], category: 'Film', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/8/8e/Dune_%282021_film%29.jpg', answer: 'dune', acceptable: ['dune'], category: 'Film', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/4/4b/John_Wick_TeaserPoster.jpg', answer: 'john wick', acceptable: ['john wick'], category: 'Film', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/c/c3/Shrek_%282001%29_poster.jpg', answer: 'shrek', acceptable: ['shrek'], category: 'Film', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/a/a8/Guardians_of_the_Galaxy_Vol._3_poster.jpg', answer: 'gardiens de la galaxie', acceptable: ['guardians of the galaxy', 'gardiens de la galaxie', 'gotg'], category: 'Film', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/2/29/Top_Gun_Maverick_Poster.jpg', answer: 'top gun', acceptable: ['top gun', 'maverick'], category: 'Film', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/2/2c/Lord_of_the_Rings_%28Film_series%29_logo.svg', answer: 'le seigneur des anneaux', acceptable: ['lord of the rings', 'seigneur des anneaux', 'lotr'], category: 'Film', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/0/00/Harry_Potter_and_the_Philosopher%27s_Stone_poster.jpg', answer: 'harry potter', acceptable: ['harry potter'], category: 'Film', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/4/4a/Pirates_of_the_Caribbean_Dead_Men_Tell_No_Tales.jpg', answer: 'pirates des caraibes', acceptable: ['pirates of the caribbean', 'pirates des caraibes', 'jack sparrow'], category: 'Film', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/0/0c/Fast_X_poster.jpg', answer: 'fast and furious', acceptable: ['fast and furious', 'fast furious', 'fast x'], category: 'Film', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/d/dc/Inside_Out_2_poster.jpg', answer: 'vice versa', acceptable: ['inside out', 'vice versa'], category: 'Film', difficulty: 'easy' },

  // ========== SÉRIES (30+) ==========
  { url: 'https://upload.wikimedia.org/wikipedia/en/d/d7/Breaking_Bad_logo.svg', answer: 'breaking bad', acceptable: ['breaking bad', 'bb'], category: 'Série', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/5/5e/Game_of_Thrones_Season_8.png', answer: 'game of thrones', acceptable: ['game of thrones', 'got'], category: 'Série', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/8/85/Stranger_Things_Season_4_Poster.jpg', answer: 'stranger things', acceptable: ['stranger things'], category: 'Série', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/6/67/Money_Heist_title_card.png', answer: 'la casa de papel', acceptable: ['casa de papel', 'la casa de papel', 'money heist'], category: 'Série', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Witcher_%28TV_series%29_title_logo.svg', answer: 'the witcher', acceptable: ['witcher', 'the witcher', 'geralt'], category: 'Série', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/c/c0/Squid_Game.jpg', answer: 'squid game', acceptable: ['squid game'], category: 'Série', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Netflix_2015_logo.svg/1200px-Netflix_2015_logo.svg.png', answer: 'netflix', acceptable: ['netflix'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/0/04/Friends_logo.svg', answer: 'friends', acceptable: ['friends'], category: 'Série', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/0/04/The_Office_US-logo.png', answer: 'the office', acceptable: ['the office', 'office'], category: 'Série', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/e/e9/Peaky_Blinders.svg', answer: 'peaky blinders', acceptable: ['peaky blinders', 'peaky'], category: 'Série', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/c/cf/The_Mandalorian_logo.svg', answer: 'the mandalorian', acceptable: ['mandalorian', 'the mandalorian', 'mando'], category: 'Série', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/a/ad/Better_Call_Saul_logo.svg', answer: 'better call saul', acceptable: ['better call saul', 'saul'], category: 'Série', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/5/52/The_Last_of_Us_TV_title_card.jpg', answer: 'the last of us', acceptable: ['the last of us', 'tlou', 'last of us'], category: 'Série', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/3/37/Wednesday_Logo.png', answer: 'wednesday', acceptable: ['wednesday', 'mercredi'], category: 'Série', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/6/68/Arcane_League_of_Legends_season_1_logo.png', answer: 'arcane', acceptable: ['arcane', 'league of legends'], category: 'Série', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/2/27/The_Boys_2019_logo.svg', answer: 'the boys', acceptable: ['the boys', 'boys'], category: 'Série', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/The_Simpsons_Logo.png/800px-The_Simpsons_Logo.png', answer: 'les simpsons', acceptable: ['simpsons', 'les simpsons', 'the simpsons'], category: 'Série', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/b/b9/Rick_and_Morty_Logo.svg', answer: 'rick and morty', acceptable: ['rick and morty', 'rick et morty'], category: 'Série', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/8/81/SouthPark.png', answer: 'south park', acceptable: ['south park'], category: 'Série', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/3/38/Succession_title.svg', answer: 'succession', acceptable: ['succession'], category: 'Série', difficulty: 'hard' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/8/86/Narcos_logo.png', answer: 'narcos', acceptable: ['narcos'], category: 'Série', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/9/96/The_Walking_Dead_%28TV_series%29_logo.svg', answer: 'the walking dead', acceptable: ['walking dead', 'the walking dead', 'twd'], category: 'Série', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/c/c9/House_of_the_Dragon_Title_Card.jpg', answer: 'house of the dragon', acceptable: ['house of the dragon', 'hotd'], category: 'Série', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/d/d8/Cobra_Kai_Logo.svg', answer: 'cobra kai', acceptable: ['cobra kai'], category: 'Série', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/8/89/Lucifer_%28TV_series%29_title_card.png', answer: 'lucifer', acceptable: ['lucifer'], category: 'Série', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/5/52/Prison_Break_logo.png', answer: 'prison break', acceptable: ['prison break'], category: 'Série', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/7/7e/Vikings_title_card.jpg', answer: 'vikings', acceptable: ['vikings'], category: 'Série', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/1/11/Dexter_title_card.jpg', answer: 'dexter', acceptable: ['dexter'], category: 'Série', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/c/c7/The_100_title_card.png', answer: 'the 100', acceptable: ['the 100', 'les 100'], category: 'Série', difficulty: 'hard' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Spongebob-squarepants.svg/800px-Spongebob-squarepants.svg.png', answer: 'bob eponge', acceptable: ['spongebob', 'bob eponge', 'bob leponge'], category: 'Série', difficulty: 'easy' },

  // ========== PERSONNAGES (30+) ==========
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Donald_Trump_%2853211035367%29.jpg/800px-Donald_Trump_%2853211035367%29.jpg', answer: 'donald trump', acceptable: ['trump', 'donald trump'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Elon_Musk_Colorado_2022.jpg/800px-Elon_Musk_Colorado_2022.jpg', answer: 'elon musk', acceptable: ['elon musk', 'elon', 'musk'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/President_Biden_portrait.jpg/800px-President_Biden_portrait.jpg', answer: 'joe biden', acceptable: ['joe biden', 'biden'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Barack_Obama.jpg/800px-Barack_Obama.jpg', answer: 'barack obama', acceptable: ['obama', 'barack obama'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Cristiano_Ronaldo_2018.jpg/800px-Cristiano_Ronaldo_2018.jpg', answer: 'cristiano ronaldo', acceptable: ['ronaldo', 'cr7', 'cristiano', 'cristiano ronaldo'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Lionel_Messi_20180626.jpg/800px-Lionel_Messi_20180626.jpg', answer: 'lionel messi', acceptable: ['messi', 'lionel messi'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Mike_Tyson_2019_by_Glenn_Francis.jpg/800px-Mike_Tyson_2019_by_Glenn_Francis.jpg', answer: 'mike tyson', acceptable: ['tyson', 'mike tyson'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Michael_Jackson_in_1988.jpg/800px-Michael_Jackson_in_1988.jpg', answer: 'michael jackson', acceptable: ['michael jackson', 'mj'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Leonardo_DiCaprio_October_2016.jpg/800px-Leonardo_DiCaprio_October_2016.jpg', answer: 'leonardo dicaprio', acceptable: ['dicaprio', 'leonardo dicaprio', 'leo dicaprio'], category: 'Personnage', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Dwayne_Johnson_2%2C_2013.jpg/800px-Dwayne_Johnson_2%2C_2013.jpg', answer: 'dwayne johnson', acceptable: ['dwayne johnson', 'the rock', 'rock'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Brad_Pitt_2019_by_Glenn_Francis.jpg/800px-Brad_Pitt_2019_by_Glenn_Francis.jpg', answer: 'brad pitt', acceptable: ['brad pitt'], category: 'Personnage', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Morgan_Freeman_2023.jpg/800px-Morgan_Freeman_2023.jpg', answer: 'morgan freeman', acceptable: ['morgan freeman'], category: 'Personnage', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Will_Smith_by_Gage_Skidmore.jpg/800px-Will_Smith_by_Gage_Skidmore.jpg', answer: 'will smith', acceptable: ['will smith'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Elvis_Presley_1970.jpg/800px-Elvis_Presley_1970.jpg', answer: 'elvis presley', acceptable: ['elvis', 'elvis presley'], category: 'Personnage', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Mark_Zuckerberg_F8_2019_Keynote_%2832830578717%29.jpg/800px-Mark_Zuckerberg_F8_2019_Keynote_%2832830578717%29.jpg', answer: 'mark zuckerberg', acceptable: ['zuckerberg', 'mark zuckerberg'], category: 'Personnage', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Bill_Gates_2017_%28cropped%29.jpg/800px-Bill_Gates_2017_%28cropped%29.jpg', answer: 'bill gates', acceptable: ['bill gates', 'gates'], category: 'Personnage', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Steve_Jobs_Headshot_2010-CROP_%28cropped_2%29.jpg/800px-Steve_Jobs_Headshot_2010-CROP_%28cropped_2%29.jpg', answer: 'steve jobs', acceptable: ['steve jobs', 'jobs'], category: 'Personnage', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Albert_Einstein_%28Nobel%29.png/800px-Albert_Einstein_%28Nobel%29.png', answer: 'albert einstein', acceptable: ['einstein', 'albert einstein'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Stephen_Hawking.StarChild.jpg/800px-Stephen_Hawking.StarChild.jpg', answer: 'stephen hawking', acceptable: ['hawking', 'stephen hawking'], category: 'Personnage', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Marilyn_Monroe%2C_Korea%2C_1954.jpg/800px-Marilyn_Monroe%2C_Korea%2C_1954.jpg', answer: 'marilyn monroe', acceptable: ['marilyn', 'marilyn monroe'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Kim_Kardashian_2019_by_Glenn_Francis.jpg/800px-Kim_Kardashian_2019_by_Glenn_Francis.jpg', answer: 'kim kardashian', acceptable: ['kim kardashian', 'kardashian'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Neymar_2017.jpg/800px-Neymar_2017.jpg', answer: 'neymar', acceptable: ['neymar'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Kylian_Mbapp%C3%A9_2018.jpg/800px-Kylian_Mbapp%C3%A9_2018.jpg', answer: 'kylian mbappe', acceptable: ['mbappe', 'kylian mbappe'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/LeBron_James_%2847954413116%29_%28cropped%29.jpg/800px-LeBron_James_%2847954413116%29_%28cropped%29.jpg', answer: 'lebron james', acceptable: ['lebron', 'lebron james'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Drake_July_2016.jpg/800px-Drake_July_2016.jpg', answer: 'drake', acceptable: ['drake'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Eminem_performing_in_2014.jpg/800px-Eminem_performing_in_2014.jpg', answer: 'eminem', acceptable: ['eminem', 'slim shady'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Rihanna_Fenty_2018.png/800px-Rihanna_Fenty_2018.png', answer: 'rihanna', acceptable: ['rihanna'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Beyonc%C3%A9_-_The_Formation_World_Tour%2C_at_Wembley_Stadium_in_London%2C_England.jpg/800px-Beyonc%C3%A9_-_The_Formation_World_Tour%2C_at_Wembley_Stadium_in_London%2C_England.jpg', answer: 'beyonce', acceptable: ['beyonce'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Taylor_Swift_at_the_2023_MTV_Video_Music_Awards_4.png/800px-Taylor_Swift_at_the_2023_MTV_Video_Music_Awards_4.png', answer: 'taylor swift', acceptable: ['taylor swift', 'taylor'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Ariana_Grande_Grammys_Red_Carpet_2020.png/800px-Ariana_Grande_Grammys_Red_Carpet_2020.png', answer: 'ariana grande', acceptable: ['ariana grande', 'ariana'], category: 'Personnage', difficulty: 'easy' },

  // ========== JEUX VIDÉO (30+) ==========
  { url: 'https://upload.wikimedia.org/wikipedia/fr/9/99/Minecraft_logo.png', answer: 'minecraft', acceptable: ['minecraft'], category: 'Jeux Vidéo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Fortnite_F_letterance_logo.png/800px-Fortnite_F_letterance_logo.png', answer: 'fortnite', acceptable: ['fortnite'], category: 'Jeux Vidéo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/League_of_Legends_logo.svg/800px-League_of_Legends_logo.svg.png', answer: 'league of legends', acceptable: ['lol', 'league of legends', 'league'], category: 'Jeux Vidéo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Genshin_Impact_logo.svg/800px-Genshin_Impact_logo.svg.png', answer: 'genshin impact', acceptable: ['genshin impact', 'genshin'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Valorant_Logo_-_Pink_color_version.svg/800px-Valorant_Logo_-_Pink_color_version.svg.png', answer: 'valorant', acceptable: ['valorant'], category: 'Jeux Vidéo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/d/d9/Mario_character.png', answer: 'mario', acceptable: ['mario', 'super mario'], category: 'Jeux Vidéo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/3/3c/Sonic_the_Hedgehog.png', answer: 'sonic', acceptable: ['sonic', 'sonic the hedgehog'], category: 'Jeux Vidéo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/fr/9/9c/Logo_GTA_V.png', answer: 'gta', acceptable: ['gta', 'gta v', 'gta 5', 'grand theft auto'], category: 'Jeux Vidéo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/3/3f/Call_of_Duty_Modern_Warfare_%282019%29_cover.jpg', answer: 'call of duty', acceptable: ['call of duty', 'cod', 'modern warfare'], category: 'Jeux Vidéo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/0/0c/Witcher_3_cover_art.jpg', answer: 'the witcher 3', acceptable: ['witcher 3', 'the witcher 3', 'witcher'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/a/a7/God_of_War_4_cover.jpg', answer: 'god of war', acceptable: ['god of war', 'kratos'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/9/9c/Elden_Ring_Box_art.jpg', answer: 'elden ring', acceptable: ['elden ring'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/a/a5/Cyberpunk_2077_box_art.jpg', answer: 'cyberpunk 2077', acceptable: ['cyberpunk', 'cyberpunk 2077'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/2/22/The_Legend_of_Zelda_Tears_of_the_Kingdom_cover.jpg', answer: 'zelda', acceptable: ['zelda', 'totk', 'tears of the kingdom', 'breath of the wild', 'botw'], category: 'Jeux Vidéo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/e/e7/Red_Dead_Redemption_II.jpg', answer: 'red dead redemption', acceptable: ['red dead redemption', 'rdr2', 'red dead'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/f/fe/Assassin%27s_Creed_Mirage_cover.jpg', answer: 'assassins creed', acceptable: ['assassins creed', 'assassin creed', 'ac'], category: 'Jeux Vidéo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/a/ab/Spider-Man_2_%282023%29_cover_art.jpg', answer: 'spider-man ps5', acceptable: ['spiderman', 'spider man ps5', 'spider-man'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/4/49/Among_Us_cover_art.png', answer: 'among us', acceptable: ['among us', 'amogus'], category: 'Jeux Vidéo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/8/8b/FIFA_23_Cover.jpg', answer: 'fifa', acceptable: ['fifa', 'ea fc', 'fc 24'], category: 'Jeux Vidéo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/2/2e/Overwatch_2_full_logo.svg', answer: 'overwatch', acceptable: ['overwatch', 'overwatch 2', 'ow'], category: 'Jeux Vidéo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/6/6e/Hogwarts_Legacy_cover_art.png', answer: 'hogwarts legacy', acceptable: ['hogwarts legacy', 'hogwarts'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/1/1a/Apex_legends_cover.jpg', answer: 'apex legends', acceptable: ['apex', 'apex legends'], category: 'Jeux Vidéo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/6/6e/Half-Life_Alyx_Cover_Art.jpg', answer: 'half-life', acceptable: ['half life', 'half-life', 'alyx'], category: 'Jeux Vidéo', difficulty: 'hard' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/c/c5/Dead_by_Daylight_Steam_header.jpg', answer: 'dead by daylight', acceptable: ['dead by daylight', 'dbd'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/c/cd/Pokemon_Violet_cover_art.jpg', answer: 'pokemon', acceptable: ['pokemon', 'violet', 'ecarlate'], category: 'Jeux Vidéo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/0/05/Halo_Infinite_cover_art.png', answer: 'halo', acceptable: ['halo', 'halo infinite', 'master chief'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/8/87/Rocket_League_coverart.jpg', answer: 'rocket league', acceptable: ['rocket league', 'rl'], category: 'Jeux Vidéo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/a/a4/Final_Fantasy_XVI_logo.png', answer: 'final fantasy', acceptable: ['final fantasy', 'ff', 'ff16'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/c/c0/Resident_Evil_4_remake_cover_art.jpg', answer: 'resident evil', acceptable: ['resident evil', 're4'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/5/50/Mortal_Kombat_1_cover_art.jpg', answer: 'mortal kombat', acceptable: ['mortal kombat', 'mk'], category: 'Jeux Vidéo', difficulty: 'easy' },

  // ========== LOGOS (25+) ==========
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/1200px-Google_2015_logo.svg.png', answer: 'google', acceptable: ['google'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/1200px-Amazon_logo.svg.png', answer: 'amazon', acceptable: ['amazon'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/1200px-Facebook_Logo_%282019%29.png', answer: 'facebook', acceptable: ['facebook', 'meta'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Instagram_icon.png/600px-Instagram_icon.png', answer: 'instagram', acceptable: ['instagram', 'insta'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/TikTok_logo.svg/800px-TikTok_logo.svg.png', answer: 'tiktok', acceptable: ['tiktok', 'tik tok'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/1200px-Microsoft_logo.svg.png', answer: 'microsoft', acceptable: ['microsoft'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/800px-Apple_logo_black.svg.png', answer: 'apple', acceptable: ['apple'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Logo_of_YouTube_%282015-2017%29.svg/1200px-Logo_of_YouTube_%282015-2017%29.svg.png', answer: 'youtube', acceptable: ['youtube'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Logo_of_Twitter.svg/800px-Logo_of_Twitter.svg.png', answer: 'twitter', acceptable: ['twitter', 'x'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Nike_logo.svg/800px-Nike_logo.svg.png', answer: 'nike', acceptable: ['nike'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Adidas_Logo.svg/800px-Adidas_Logo.svg.png', answer: 'adidas', acceptable: ['adidas'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Coca-Cola_bottle_cap.svg/800px-Coca-Cola_bottle_cap.svg.png', answer: 'coca cola', acceptable: ['coca cola', 'coca', 'coke'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/McDonald%27s_Golden_Arches.svg/800px-McDonald%27s_Golden_Arches.svg.png', answer: 'mcdonalds', acceptable: ['mcdonalds', 'mcdonald', 'mcdo'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Pepsi_logo_2023.svg/800px-Pepsi_logo_2023.svg.png', answer: 'pepsi', acceptable: ['pepsi'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Tesla_logo.png/800px-Tesla_logo.png', answer: 'tesla', acceptable: ['tesla'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/PlayStation_Logo.svg/800px-PlayStation_Logo.svg.png', answer: 'playstation', acceptable: ['playstation', 'ps', 'sony'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Xbox_one_logo.svg/800px-Xbox_one_logo.svg.png', answer: 'xbox', acceptable: ['xbox', 'microsoft'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/LG_logo_%282015%29.svg/800px-LG_logo_%282015%29.svg.png', answer: 'lg', acceptable: ['lg'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Samsung_Logo.svg/800px-Samsung_Logo.svg.png', answer: 'samsung', acceptable: ['samsung'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Snapchat_logo.svg/800px-Snapchat_logo.svg.png', answer: 'snapchat', acceptable: ['snapchat', 'snap'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Spotify_Logo.svg/800px-Spotify_Logo.svg.png', answer: 'spotify', acceptable: ['spotify'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Discord_icon.svg/800px-Discord_icon.svg.png', answer: 'discord', acceptable: ['discord'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Steam_icon_logo.svg/800px-Steam_icon_logo.svg.png', answer: 'steam', acceptable: ['steam'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Twitch_logo_2019.svg/800px-Twitch_logo_2019.svg.png', answer: 'twitch', acceptable: ['twitch'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Red_Bull_logo.svg/800px-Red_Bull_logo.svg.png', answer: 'red bull', acceptable: ['red bull', 'redbull'], category: 'Logo', difficulty: 'easy' },

  // ========== MONUMENTS (20+) ==========
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/GoldenGateBridge-001.jpg/1200px-GoldenGateBridge-001.jpg', answer: 'golden gate', acceptable: ['golden gate', 'san francisco', 'pont'], category: 'Monument', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Empire_State_Building_%28aerial_view%29.jpg/800px-Empire_State_Building_%28aerial_view%29.jpg', answer: 'empire state building', acceptable: ['empire state', 'new york'], category: 'Monument', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Tour_eiffel_at_sunrise_from_the_trocadero.jpg/800px-Tour_eiffel_at_sunrise_from_the_trocadero.jpg', answer: 'tour eiffel', acceptable: ['tour eiffel', 'eiffel', 'paris'], category: 'Monument', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Colosseo_2020.jpg/1200px-Colosseo_2020.jpg', answer: 'colisee', acceptable: ['colisee', 'colosseum', 'rome'], category: 'Monument', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Pyramide_Kheops.jpg/1200px-Pyramide_Kheops.jpg', answer: 'pyramide', acceptable: ['pyramide', 'egypte', 'gizeh', 'kheops'], category: 'Monument', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Statue_of_Liberty%2C_NY.jpg/800px-Statue_of_Liberty%2C_NY.jpg', answer: 'statue de la liberte', acceptable: ['statue de la liberte', 'statue of liberty', 'liberte'], category: 'Monument', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Taj_Mahal_in_India_-_Kristian_Bertel.jpg/1200px-Taj_Mahal_in_India_-_Kristian_Bertel.jpg', answer: 'taj mahal', acceptable: ['taj mahal', 'inde'], category: 'Monument', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Great_Wall_of_China_at_Jinshanling-edit.jpg/1200px-Great_Wall_of_China_at_Jinshanling-edit.jpg', answer: 'muraille de chine', acceptable: ['muraille de chine', 'great wall', 'grande muraille'], category: 'Monument', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/London_Tower_Bridge.jpg/1200px-London_Tower_Bridge.jpg', answer: 'tower bridge', acceptable: ['tower bridge', 'londres', 'london bridge'], category: 'Monument', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Sydney_Opera_House_seen_from_the_Harbour_Bridge.jpg/1200px-Sydney_Opera_House_seen_from_the_Harbour_Bridge.jpg', answer: 'opera de sydney', acceptable: ['opera de sydney', 'sydney opera', 'sydney'], category: 'Monument', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Christ_the_Redeemer_-_Rio_de_Janeiro%2C_Brazil.jpg/800px-Christ_the_Redeemer_-_Rio_de_Janeiro%2C_Brazil.jpg', answer: 'christ redempteur', acceptable: ['christ redempteur', 'rio', 'rio de janeiro', 'christ redeemer'], category: 'Monument', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Machu_Picchu%2C_Peru.jpg/1200px-Machu_Picchu%2C_Peru.jpg', answer: 'machu picchu', acceptable: ['machu picchu', 'perou'], category: 'Monument', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Arc_de_Triomphe_de_l%27%C3%89toile%2C_2008_%28cropped%29.jpg/800px-Arc_de_Triomphe_de_l%27%C3%89toile%2C_2008_%28cropped%29.jpg', answer: 'arc de triomphe', acceptable: ['arc de triomphe', 'paris'], category: 'Monument', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Sagrada_Familia_8-12-21_%281%29.jpg/800px-Sagrada_Familia_8-12-21_%281%29.jpg', answer: 'sagrada familia', acceptable: ['sagrada familia', 'barcelone', 'gaudi'], category: 'Monument', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Big_Ben_2007-1.jpg/800px-Big_Ben_2007-1.jpg', answer: 'big ben', acceptable: ['big ben', 'londres'], category: 'Monument', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Acropolis_of_Athens_01.jpg/1200px-Acropolis_of_Athens_01.jpg', answer: 'acropole', acceptable: ['acropole', 'parthenon', 'athenes'], category: 'Monument', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Burj_Khalifa.jpg/800px-Burj_Khalifa.jpg', answer: 'burj khalifa', acceptable: ['burj khalifa', 'dubai'], category: 'Monument', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Stonehenge%2C_Wiltshire%2C_England_%282019%29.jpg/1200px-Stonehenge%2C_Wiltshire%2C_England_%282019%29.jpg', answer: 'stonehenge', acceptable: ['stonehenge'], category: 'Monument', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Space_Needle_at_dusk_2011_-_02.jpg/800px-Space_Needle_at_dusk_2011_-_02.jpg', answer: 'space needle', acceptable: ['space needle', 'seattle'], category: 'Monument', difficulty: 'hard' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Leaning_tower_of_pisa_2.jpg/800px-Leaning_tower_of_pisa_2.jpg', answer: 'tour de pise', acceptable: ['tour de pise', 'pise', 'pisa'], category: 'Monument', difficulty: 'easy' },

  // ========== ART (15+) ==========
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/1200px-Tsunami_by_hokusai_19th_century.jpg', answer: 'la grande vague', acceptable: ['vague', 'hokusai', 'grande vague', 'kanagawa'], category: 'Art', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/800px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg', answer: 'mona lisa', acceptable: ['joconde', 'mona lisa', 'monalisa', 'la joconde'], category: 'Art', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/VanGogh-starry_night_ballance1.jpg/1200px-VanGogh-starry_night_ballance1.jpg', answer: 'nuit etoilee', acceptable: ['nuit etoilee', 'starry night', 'van gogh'], category: 'Art', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Meisje_met_de_parel.jpg/800px-Meisje_met_de_parel.jpg', answer: 'la jeune fille a la perle', acceptable: ['jeune fille perle', 'girl with pearl earring', 'vermeer'], category: 'Art', difficulty: 'hard' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/The_Birth_of_Venus_%28Botticelli%29.jpg/1200px-The_Birth_of_Venus_%28Botticelli%29.jpg', answer: 'naissance de venus', acceptable: ['naissance de venus', 'venus', 'botticelli'], category: 'Art', difficulty: 'hard' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/The_Scream.jpg/800px-The_Scream.jpg', answer: 'le cri', acceptable: ['le cri', 'the scream', 'munch'], category: 'Art', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/American_Gothic.jpg/800px-American_Gothic.jpg', answer: 'american gothic', acceptable: ['american gothic'], category: 'Art', difficulty: 'hard' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg', answer: 'persistance de la memoire', acceptable: ['persistence de la memoire', 'dali', 'montres molles', 'horloge'], category: 'Art', difficulty: 'hard' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/David_by_Michelangelo_Fir_JBU002.jpg/800px-David_by_Michelangelo_Fir_JBU002.jpg', answer: 'david', acceptable: ['david', 'michelangelo', 'michel ange'], category: 'Art', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Pieta_di_Michelangelo_-_St._Peter%27s_Basilica_-_Vatican_City.jpg/800px-Pieta_di_Michelangelo_-_St._Peter%27s_Basilica_-_Vatican_City.jpg', answer: 'pieta', acceptable: ['pieta', 'michelangelo', 'pietà'], category: 'Art', difficulty: 'hard' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Creation_of_Adam_%28Michelangelo%29_Detail.jpg/1200px-Creation_of_Adam_%28Michelangelo%29_Detail.jpg', answer: 'creation dadam', acceptable: ['creation dadam', 'adam', 'chapelle sixtine', 'sistine'], category: 'Art', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg/1200px-Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg', answer: 'nympheas', acceptable: ['nympheas', 'water lilies', 'monet'], category: 'Art', difficulty: 'hard' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Grant_Wood_-_American_Gothic_-_Google_Art_Project.jpg/800px-Grant_Wood_-_American_Gothic_-_Google_Art_Project.jpg', answer: 'american gothic', acceptable: ['american gothic', 'grant wood'], category: 'Art', difficulty: 'hard' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Sunflowers_by_Van_Gogh.jpg/800px-Sunflowers_by_Van_Gogh.jpg', answer: 'tournesols', acceptable: ['tournesols', 'sunflowers', 'van gogh'], category: 'Art', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg/1200px-Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg', answer: 'naissance de venus', acceptable: ['naissance venus', 'venus', 'botticelli'], category: 'Art', difficulty: 'hard' },
];

// Get images filtered by category
export function getImagesByCategory(category: BlurRushCategory): BlurRushImage[] {
  if (category === 'Mix') {
    return BLURRUSH_IMAGES;
  }
  return BLURRUSH_IMAGES.filter(img => img.category === category);
}

// Get random images for a game session
export function getRandomImages(
  count: number,
  categories: BlurRushCategory[] = ['Mix'],
  usedIndices: number[] = []
): { images: BlurRushImage[]; newUsedIndices: number[] } {
  let pool: BlurRushImage[];
  
  if (categories.includes('Mix') || categories.length === 0) {
    pool = [...BLURRUSH_IMAGES];
  } else {
    pool = BLURRUSH_IMAGES.filter(img => categories.includes(img.category));
  }

  // Get available indices
  const availableIndices = pool
    .map((_, i) => i)
    .filter(i => !usedIndices.includes(i));

  // Shuffle and pick
  const shuffled = [...availableIndices].sort(() => Math.random() - 0.5);
  const selectedIndices = shuffled.slice(0, Math.min(count, shuffled.length));
  
  return {
    images: selectedIndices.map(i => pool[i]),
    newUsedIndices: [...usedIndices, ...selectedIndices],
  };
}
