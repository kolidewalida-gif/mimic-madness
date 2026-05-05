// =============================================================================
// BlurRush Image Bank — 200+ entries with categories, synonyms, and difficulty
// Using CORS-friendly image sources (Lorem Picsum for reliable loading)
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

// Categories available for selection (excluding Mix which is a special mode)
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

// Helper to create Picsum URLs with consistent IDs for each answer
// This ensures the same image is always shown for the same answer
const picsum = (id: number) => `https://picsum.photos/id/${id}/600/600`;

// Use reliable CDN sources for logos and recognizable images
const BLURRUSH_IMAGES: BlurRushImage[] = [
  // ========== ANIME (30+) ==========
  { url: 'https://cdn.myanimelist.net/images/anime/1208/94745.jpg', answer: 'naruto', acceptable: ['naruto', 'naruto uzumaki', 'naruto shippuden'], category: 'Anime', difficulty: 'easy' },
  { url: 'https://cdn.myanimelist.net/images/anime/1171/109222.jpg', answer: 'one piece', acceptable: ['one piece', 'luffy', 'monkey d luffy'], category: 'Anime', difficulty: 'easy' },
  { url: 'https://cdn.myanimelist.net/images/anime/10/78745.jpg', answer: 'dragon ball', acceptable: ['dragon ball', 'dbz', 'goku', 'sangoku', 'dragon ball z'], category: 'Anime', difficulty: 'easy' },
  { url: 'https://cdn.myanimelist.net/images/anime/10/47347.jpg', answer: 'attack on titan', acceptable: ['attack on titan', 'snk', 'shingeki no kyojin', 'eren'], category: 'Anime', difficulty: 'easy' },
  { url: 'https://cdn.myanimelist.net/images/anime/1286/99889.jpg', answer: 'demon slayer', acceptable: ['demon slayer', 'kimetsu no yaiba', 'tanjiro'], category: 'Anime', difficulty: 'easy' },
  { url: 'https://cdn.myanimelist.net/images/anime/1000/110531.jpg', answer: 'jujutsu kaisen', acceptable: ['jujutsu kaisen', 'jjk', 'gojo', 'yuji'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://cdn.myanimelist.net/images/anime/1015/138006.jpg', answer: 'spy x family', acceptable: ['spy x family', 'anya', 'loid', 'yor'], category: 'Anime', difficulty: 'easy' },
  { url: 'https://cdn.myanimelist.net/images/anime/1806/126216.jpg', answer: 'chainsaw man', acceptable: ['chainsaw man', 'denji'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://cdn.myanimelist.net/images/anime/1441/122795.jpg', answer: 'my hero academia', acceptable: ['my hero academia', 'mha', 'boku no hero', 'deku'], category: 'Anime', difficulty: 'easy' },
  { url: 'https://cdn.myanimelist.net/images/anime/9/9453.jpg', answer: 'death note', acceptable: ['death note', 'light', 'light yagami', 'kira', 'l'], category: 'Anime', difficulty: 'easy' },
  { url: 'https://cdn.myanimelist.net/images/anime/5/87048.jpg', answer: 'one punch man', acceptable: ['one punch man', 'opm', 'saitama'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://cdn.myanimelist.net/images/anime/1764/126627.jpg', answer: 'bleach', acceptable: ['bleach', 'ichigo', 'ichigo kurosaki'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://cdn.myanimelist.net/images/anime/11/33657.jpg', answer: 'fullmetal alchemist', acceptable: ['fullmetal alchemist', 'fma', 'edward', 'edward elric'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://cdn.myanimelist.net/images/anime/1337/99013.jpg', answer: 'hunter x hunter', acceptable: ['hunter x hunter', 'hxh', 'gon', 'killua'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://cdn.myanimelist.net/images/anime/1935/127974.jpg', answer: 'tokyo ghoul', acceptable: ['tokyo ghoul', 'kaneki', 'ken kaneki'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://cdn.myanimelist.net/images/anime/1756/138983.jpg', answer: 'solo leveling', acceptable: ['solo leveling', 'sung jinwoo'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://cdn.myanimelist.net/images/anime/1244/138851.jpg', answer: 'frieren', acceptable: ['frieren', 'sousou no frieren'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://cdn.myanimelist.net/images/anime/1160/122627.jpg', answer: 'cowboy bebop', acceptable: ['cowboy bebop', 'spike', 'spike spiegel'], category: 'Anime', difficulty: 'hard' },
  { url: 'https://cdn.myanimelist.net/images/anime/7/20310.jpg', answer: 'code geass', acceptable: ['code geass', 'lelouch'], category: 'Anime', difficulty: 'hard' },
  { url: 'https://cdn.myanimelist.net/images/anime/1314/108941.jpg', answer: 'steins gate', acceptable: ['steins gate', 'okabe'], category: 'Anime', difficulty: 'hard' },
  { url: 'https://cdn.myanimelist.net/images/anime/1935/141839.jpg', answer: 'oshi no ko', acceptable: ['oshi no ko', 'aqua', 'ruby'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://cdn.myanimelist.net/images/anime/1948/120625.jpg', answer: 'tokyo revengers', acceptable: ['tokyo revengers', 'takemichi'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://cdn.myanimelist.net/images/anime/1223/96541.jpg', answer: 'mob psycho', acceptable: ['mob psycho', 'mob psycho 100', 'mob'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://cdn.myanimelist.net/images/anime/1517/100633.jpg', answer: 'fire force', acceptable: ['fire force', 'enen no shouboutai', 'shinra'], category: 'Anime', difficulty: 'hard' },
  { url: 'https://cdn.myanimelist.net/images/anime/1498/134443.jpg', answer: 'blue lock', acceptable: ['blue lock', 'isagi'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://cdn.myanimelist.net/images/anime/1384/136925.jpg', answer: 'vinland saga', acceptable: ['vinland saga', 'thorfinn'], category: 'Anime', difficulty: 'hard' },
  { url: 'https://cdn.myanimelist.net/images/anime/1572/111130.jpg', answer: 'black clover', acceptable: ['black clover', 'asta'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://cdn.myanimelist.net/images/anime/1988/119437.jpg', answer: 'fairy tail', acceptable: ['fairy tail', 'natsu'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://cdn.myanimelist.net/images/anime/1079/138100.jpg', answer: 'mashle', acceptable: ['mashle', 'mash'], category: 'Anime', difficulty: 'hard' },
  { url: 'https://cdn.myanimelist.net/images/anime/1506/138982.jpg', answer: 'kaiju no 8', acceptable: ['kaiju no 8', 'kafka'], category: 'Anime', difficulty: 'hard' },
  { url: 'https://cdn.myanimelist.net/images/anime/1094/133203.jpg', answer: 'haikyuu', acceptable: ['haikyuu', 'hinata'], category: 'Anime', difficulty: 'medium' },
  { url: 'https://cdn.myanimelist.net/images/anime/5/50331.jpg', answer: 'sword art online', acceptable: ['sword art online', 'sao', 'kirito'], category: 'Anime', difficulty: 'easy' },
  { url: 'https://cdn.myanimelist.net/images/anime/1429/95946.jpg', answer: 'your name', acceptable: ['your name', 'kimi no na wa'], category: 'Anime', difficulty: 'medium' },

  // ========== FILMS (30+) ==========
  { url: 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg', answer: 'avengers endgame', acceptable: ['avengers', 'endgame', 'avengers endgame'], category: 'Film', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg', answer: 'avatar', acceptable: ['avatar', 'avatar 2'], category: 'Film', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg', answer: 'titanic', acceptable: ['titanic'], category: 'Film', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg', answer: 'inception', acceptable: ['inception'], category: 'Film', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', answer: 'matrix', acceptable: ['matrix', 'the matrix'], category: 'Film', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', answer: 'interstellar', acceptable: ['interstellar'], category: 'Film', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', answer: 'oppenheimer', acceptable: ['oppenheimer'], category: 'Film', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg', answer: 'barbie', acceptable: ['barbie'], category: 'Film', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg', answer: 'spider man no way home', acceptable: ['spider man', 'spiderman', 'no way home'], category: 'Film', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/oU7Oq2kFAAlGqbU4VoAE36g4hoI.jpg', answer: 'jurassic park', acceptable: ['jurassic park', 'jurassic world'], category: 'Film', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/lZpWprJqbIFpEV5uoHfoK0KCnTW.jpg', answer: 'jaws', acceptable: ['jaws', 'dents de la mer', 'les dents de la mer'], category: 'Film', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/kgwjIb2JDHRhNk13lmSxiClFjVk.jpg', answer: 'frozen', acceptable: ['frozen', 'reine des neiges', 'la reine des neiges', 'elsa'], category: 'Film', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg', answer: 'le roi lion', acceptable: ['lion king', 'roi lion', 'le roi lion', 'simba'], category: 'Film', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', answer: 'le parrain', acceptable: ['godfather', 'parrain', 'le parrain', 'the godfather'], category: 'Film', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', answer: 'the dark knight', acceptable: ['dark knight', 'batman'], category: 'Film', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/saHP97rTPS5eLmrLQEcANmKrsFl.jpg', answer: 'forrest gump', acceptable: ['forrest gump'], category: 'Film', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', answer: 'pulp fiction', acceptable: ['pulp fiction'], category: 'Film', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', answer: 'shawshank redemption', acceptable: ['shawshank', 'evades', 'les evades'], category: 'Film', difficulty: 'hard' },
  { url: 'https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg', answer: 'schindlers list', acceptable: ['schindlers list', 'schindler', 'liste de schindler'], category: 'Film', difficulty: 'hard' },
  { url: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', answer: 'fight club', acceptable: ['fight club'], category: 'Film', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg', answer: 'gladiator', acceptable: ['gladiator', 'gladiateur'], category: 'Film', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg', answer: 'dune', acceptable: ['dune'], category: 'Film', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/fZPSd91yGE9fCcCe6OoQr6E3Bev.jpg', answer: 'john wick', acceptable: ['john wick'], category: 'Film', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/iB64vpL3dIObOtMZgX3RqdVdQDc.jpg', answer: 'shrek', acceptable: ['shrek'], category: 'Film', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/r2J02Z2OpNTctfOSN1Ydgii51I3.jpg', answer: 'guardians of the galaxy', acceptable: ['guardians of the galaxy', 'gardiens de la galaxie', 'gotg'], category: 'Film', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg', answer: 'top gun', acceptable: ['top gun', 'maverick'], category: 'Film', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg', answer: 'lord of the rings', acceptable: ['lord of the rings', 'seigneur des anneaux', 'lotr'], category: 'Film', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/wuMc08IPKEatf9rnMNXvIDxqP4W.jpg', answer: 'harry potter', acceptable: ['harry potter'], category: 'Film', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/z8Y1NTDF88OBIjNsJyFmWjGjzOQ.jpg', answer: 'pirates of the caribbean', acceptable: ['pirates of the caribbean', 'pirates des caraibes', 'jack sparrow'], category: 'Film', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/fiVW06jE7z9YnO4trhaMEdclSiC.jpg', answer: 'fast and furious', acceptable: ['fast and furious', 'fast furious', 'fast x'], category: 'Film', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg', answer: 'inside out', acceptable: ['inside out', 'vice versa'], category: 'Film', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg', answer: 'joker', acceptable: ['joker'], category: 'Film', difficulty: 'easy' },

  // ========== SÉRIES (30+) ==========
  { url: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg', answer: 'breaking bad', acceptable: ['breaking bad', 'bb', 'walter white'], category: 'Série', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg', answer: 'game of thrones', acceptable: ['game of thrones', 'got'], category: 'Série', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg', answer: 'stranger things', acceptable: ['stranger things', 'eleven'], category: 'Série', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/reEMJA1uzscCbkpeRJeTT2bjqUp.jpg', answer: 'la casa de papel', acceptable: ['casa de papel', 'la casa de papel', 'money heist'], category: 'Série', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/7vjaCdMw15FEbXyLQTVa04URsPm.jpg', answer: 'the witcher', acceptable: ['witcher', 'the witcher', 'geralt'], category: 'Série', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg', answer: 'squid game', acceptable: ['squid game'], category: 'Série', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/l0qVZIpXtIo7km9u5Yqh0nKPOr5.jpg', answer: 'friends', acceptable: ['friends'], category: 'Série', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/qWnJzyZhyy74gjpSjIXWmuk0ifX.jpg', answer: 'the office', acceptable: ['the office', 'office'], category: 'Série', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/vUUqzWa2LnHIVqkaKVlVGkVcZIW.jpg', answer: 'peaky blinders', acceptable: ['peaky blinders', 'peaky'], category: 'Série', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/sWgBv7LV2PRoQgkxwlibdGXKz1S.jpg', answer: 'the mandalorian', acceptable: ['mandalorian', 'the mandalorian', 'mando'], category: 'Série', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/fC2HDm5t0kHl7mTm7jxMR31b7by.jpg', answer: 'better call saul', acceptable: ['better call saul', 'saul'], category: 'Série', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg', answer: 'the last of us', acceptable: ['the last of us', 'tlou', 'last of us'], category: 'Série', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/9PFonBhy4cQy7Jz20NpMygczOkv.jpg', answer: 'wednesday', acceptable: ['wednesday', 'mercredi'], category: 'Série', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg', answer: 'arcane', acceptable: ['arcane', 'league of legends'], category: 'Série', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/stTEycfG9928HYGEISBFaG1ngjM.jpg', answer: 'the boys', acceptable: ['the boys', 'boys'], category: 'Série', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/2IWouZK4gkgHhJa3oyYuSWfSqbG.jpg', answer: 'the simpsons', acceptable: ['simpsons', 'les simpsons', 'the simpsons'], category: 'Série', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/cvhNj9eoRBe5SxjCbQTkh05UP5K.jpg', answer: 'rick and morty', acceptable: ['rick and morty', 'rick et morty'], category: 'Série', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/xJWPZIYOEFIjZpBL7SVBGnzRYXp.jpg', answer: 'south park', acceptable: ['south park'], category: 'Série', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/7HW47XbkNQ5fiwQFYGWdw9gs144.jpg', answer: 'succession', acceptable: ['succession'], category: 'Série', difficulty: 'hard' },
  { url: 'https://image.tmdb.org/t/p/w500/rTh4K5uw9HypmpGslcKd4QfHl93.jpg', answer: 'narcos', acceptable: ['narcos', 'pablo escobar'], category: 'Série', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/xf9wuDcqlUPWABZNeDKPbZUjWx0.jpg', answer: 'the walking dead', acceptable: ['walking dead', 'the walking dead', 'twd'], category: 'Série', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/z2yahl2uefxDCl0nogcRBstwruJ.jpg', answer: 'house of the dragon', acceptable: ['house of the dragon', 'hotd'], category: 'Série', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/obLBdhLxheKg8Li1qO11r2SwmYO.jpg', answer: 'cobra kai', acceptable: ['cobra kai'], category: 'Série', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/4EYPN5mVIhKLfxGruy7Dy41dTVn.jpg', answer: 'lucifer', acceptable: ['lucifer'], category: 'Série', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/5E1BhkCgjLBlqx557Z5yzcN0i88.jpg', answer: 'prison break', acceptable: ['prison break'], category: 'Série', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/bQLrHIRNEkE3PdIWQrZHynQZazu.jpg', answer: 'vikings', acceptable: ['vikings', 'ragnar'], category: 'Série', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/58O1OLb2Ilvu4rqyGWcdLbzmnAE.jpg', answer: 'dexter', acceptable: ['dexter'], category: 'Série', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/esN3gWb1P091xExLddD2nh4zmi3.jpg', answer: 'sherlock', acceptable: ['sherlock', 'sherlock holmes'], category: 'Série', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/aCw8ONfyz3AhngVQa1E2Ss4KSUQ.jpg', answer: 'the crown', acceptable: ['the crown', 'crown'], category: 'Série', difficulty: 'hard' },

  // ========== PERSONNAGES (30+) ==========
  { url: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', answer: 'tyler durden', acceptable: ['tyler durden', 'brad pitt fight club'], category: 'Personnage', difficulty: 'hard' },
  { url: 'https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg', answer: 'darth vader', acceptable: ['darth vader', 'vader', 'dark vador', 'anakin'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/4D0PpNI0kmP58hgrwGC3wCjxhnm.jpg', answer: 'iron man', acceptable: ['iron man', 'tony stark'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg', answer: 'batman', acceptable: ['batman', 'bruce wayne'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/lxMtsGomlkVjDM29lx0xDwDAluM.jpg', answer: 'superman', acceptable: ['superman', 'clark kent'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/e6qJtzyLLqjTbynXOb8VcthSGhG.jpg', answer: 'wonder woman', acceptable: ['wonder woman', 'diana'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/c4SdIrlOLg1Z0Gbo5hJAwoez5xD.jpg', answer: 'captain america', acceptable: ['captain america', 'steve rogers'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/qpJHvBv9WNruRgCxGU0A07dYdWf.jpg', answer: 'thor', acceptable: ['thor'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/tJr9GcmGNHhLVVEkinmwsXl8hmK.jpg', answer: 'hulk', acceptable: ['hulk', 'bruce banner'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/6NVHp6N2LPk2PQWNBbD3xWXFH3M.jpg', answer: 'thanos', acceptable: ['thanos'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/1mWHPm8tTEMnJMb3AwY0NeEC0jU.jpg', answer: 'james bond', acceptable: ['james bond', '007', 'bond'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/5XBzD5WuTyVQZeS4II6AbXvJpLt.jpg', answer: 'indiana jones', acceptable: ['indiana jones', 'indy'], category: 'Personnage', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/bxVxZb5O9IZ7VZcUiAhJLbvjZMr.jpg', answer: 'wolverine', acceptable: ['wolverine', 'logan'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/iiS4MHpjFyFXKt3obMBdQjm00xh.jpg', answer: 'deadpool', acceptable: ['deadpool', 'wade wilson'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/c24sv2weTHPsmDa7jEMN0m2P3Py.jpg', answer: 'joker', acceptable: ['joker', 'arthur fleck'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/vJU3rXSK4OIFVRMopp6G9ULMhcP.jpg', answer: 'harley quinn', acceptable: ['harley quinn', 'harley'], category: 'Personnage', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/cNVNPW28d8tuMYaQHr6fLMH3YJH.jpg', answer: 'michael myers', acceptable: ['michael myers', 'halloween'], category: 'Personnage', difficulty: 'hard' },
  { url: 'https://image.tmdb.org/t/p/w500/wVTYlkKPKrljJfugXN7UlLNjtuJ.jpg', answer: 'freddy krueger', acceptable: ['freddy krueger', 'freddy', 'nightmare'], category: 'Personnage', difficulty: 'hard' },
  { url: 'https://image.tmdb.org/t/p/w500/nRGg2sOTwdLhWsVX8Ahc2LQJW4b.jpg', answer: 'ghostface', acceptable: ['ghostface', 'scream'], category: 'Personnage', difficulty: 'medium' },
  { url: 'https://image.tmdb.org/t/p/w500/xy44UvpbTgzs9kWmp5stD7XTlUt.jpg', answer: 'mario', acceptable: ['mario', 'super mario'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/bV3w9zJw6QZ8n64D0bzNuPEEOaD.jpg', answer: 'sonic', acceptable: ['sonic', 'sonic the hedgehog'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/uxj3DTBqRw1FJLynKjQ8Ckd2LlH.jpg', answer: 'pikachu', acceptable: ['pikachu', 'pokemon'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/nN9AvlnfVqijBJIcP1amDxkEHPC.jpg', answer: 'grinch', acceptable: ['grinch', 'le grinch'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/kiIq8xaOPCMPYRYnzNkSm5JdxaH.jpg', answer: 'minions', acceptable: ['minions', 'minion'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/lPsD10PP4rgUGiGR4CCXA6iY0QQ.jpg', answer: 'olaf', acceptable: ['olaf', 'frozen'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/6bCplVkhowCjTHXWv49UjRPn0eK.jpg', answer: 'buzz lightyear', acceptable: ['buzz', 'buzz lightyear', 'toy story'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/dZ2aFhTfmHmroRNOfFntyCIBvkq.jpg', answer: 'woody', acceptable: ['woody', 'toy story'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/dNu30xISYbiZVyWOWpuSV0sPgHr.jpg', answer: 'nemo', acceptable: ['nemo', 'finding nemo', 'le monde de nemo'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/iRkq3VXfNbEuxPFFLxpOy9ZLuOh.jpg', answer: 'shrek', acceptable: ['shrek'], category: 'Personnage', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/a6aw3JJPp0qnxHWAAX9lm8Epv1L.jpg', answer: 'donkey', acceptable: ['donkey', 'ane', 'shrek donkey'], category: 'Personnage', difficulty: 'medium' },

  // ========== JEUX VIDÉO (30+) ==========
  { url: 'https://image.tmdb.org/t/p/w500/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg', answer: 'minecraft', acceptable: ['minecraft', 'steve'], category: 'Jeux Vidéo', difficulty: 'easy' },
  { url: 'https://image.tmdb.org/t/p/w500/2E03IAGm6y0VPbpGj6kEz0B9FmE.jpg', answer: 'fortnite', acceptable: ['fortnite'], category: 'Jeux Vidéo', difficulty: 'easy' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg', answer: 'counter strike', acceptable: ['counter strike', 'csgo', 'cs go', 'cs2'], category: 'Jeux Vidéo', difficulty: 'easy' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/578080/header.jpg', answer: 'pubg', acceptable: ['pubg', 'playerunknown', 'battlegrounds'], category: 'Jeux Vidéo', difficulty: 'easy' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/header.jpg', answer: 'red dead redemption', acceptable: ['red dead', 'red dead redemption', 'rdr2', 'arthur morgan'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/271590/header.jpg', answer: 'gta 5', acceptable: ['gta', 'gta 5', 'gta v', 'grand theft auto'], category: 'Jeux Vidéo', difficulty: 'easy' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg', answer: 'elden ring', acceptable: ['elden ring'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg', answer: 'cyberpunk', acceptable: ['cyberpunk', 'cyberpunk 2077'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/292030/header.jpg', answer: 'the witcher 3', acceptable: ['witcher 3', 'the witcher 3', 'witcher', 'geralt'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg', answer: 'dota 2', acceptable: ['dota', 'dota 2'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1172470/header.jpg', answer: 'apex legends', acceptable: ['apex', 'apex legends'], category: 'Jeux Vidéo', difficulty: 'easy' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1238810/header.jpg', answer: 'battlefield', acceptable: ['battlefield', 'bf'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/381210/header.jpg', answer: 'dead by daylight', acceptable: ['dead by daylight', 'dbd'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/252490/header.jpg', answer: 'rust', acceptable: ['rust'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/230410/header.jpg', answer: 'warframe', acceptable: ['warframe'], category: 'Jeux Vidéo', difficulty: 'hard' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/582010/header.jpg', answer: 'monster hunter', acceptable: ['monster hunter', 'monster hunter world', 'mhw'], category: 'Jeux Vidéo', difficulty: 'hard' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/374320/header.jpg', answer: 'dark souls', acceptable: ['dark souls', 'dark souls 3', 'ds3'], category: 'Jeux Vidéo', difficulty: 'hard' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/105600/header.jpg', answer: 'terraria', acceptable: ['terraria'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/413150/header.jpg', answer: 'stardew valley', acceptable: ['stardew', 'stardew valley'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/945360/header.jpg', answer: 'among us', acceptable: ['among us', 'amogus'], category: 'Jeux Vidéo', difficulty: 'easy' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1599340/header.jpg', answer: 'lost ark', acceptable: ['lost ark'], category: 'Jeux Vidéo', difficulty: 'hard' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1238840/header.jpg', answer: 'battlefield 5', acceptable: ['battlefield 5', 'bf5', 'bfv'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1623730/header.jpg', answer: 'palworld', acceptable: ['palworld'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/header.jpg', answer: 'baldurs gate', acceptable: ['baldurs gate', 'baldurs gate 3', 'bg3'], category: 'Jeux Vidéo', difficulty: 'hard' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/548430/header.jpg', answer: 'deep rock galactic', acceptable: ['deep rock', 'deep rock galactic', 'drg'], category: 'Jeux Vidéo', difficulty: 'hard' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1203220/header.jpg', answer: 'naraka', acceptable: ['naraka', 'naraka bladepoint'], category: 'Jeux Vidéo', difficulty: 'hard' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/739630/header.jpg', answer: 'phasmophobia', acceptable: ['phasmo', 'phasmophobia'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/892970/header.jpg', answer: 'valheim', acceptable: ['valheim'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1966720/header.jpg', answer: 'lethal company', acceptable: ['lethal company'], category: 'Jeux Vidéo', difficulty: 'medium' },
  { url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1293830/header.jpg', answer: 'fall guys', acceptable: ['fall guys'], category: 'Jeux Vidéo', difficulty: 'easy' },

  // ========== LOGOS (26+) ==========
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/1200px-Google_2015_logo.svg.png', answer: 'google', acceptable: ['google'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/1200px-Amazon_logo.svg.png', answer: 'amazon', acceptable: ['amazon'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/800px-Apple_logo_black.svg.png', answer: 'apple', acceptable: ['apple'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/1200px-Microsoft_logo.svg.png', answer: 'microsoft', acceptable: ['microsoft'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Facebook_f_logo_%282019%29.svg/1200px-Facebook_f_logo_%282019%29.svg.png', answer: 'facebook', acceptable: ['facebook', 'meta'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/1200px-Instagram_logo_2016.svg.png', answer: 'instagram', acceptable: ['instagram', 'insta'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Logo_of_Twitter.svg/1200px-Logo_of_Twitter.svg.png', answer: 'twitter', acceptable: ['twitter', 'x'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/YouTube_full-color_icon_%282017%29.svg/1200px-YouTube_full-color_icon_%282017%29.svg.png', answer: 'youtube', acceptable: ['youtube'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Netflix_2015_logo.svg/1200px-Netflix_2015_logo.svg.png', answer: 'netflix', acceptable: ['netflix'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Spotify_logo_without_text.svg/800px-Spotify_logo_without_text.svg.png', answer: 'spotify', acceptable: ['spotify'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Coca-Cola_logo.svg/1200px-Coca-Cola_logo.svg.png', answer: 'coca cola', acceptable: ['coca cola', 'coca', 'coke'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/McDonald%27s_Golden_Arches.svg/800px-McDonald%27s_Golden_Arches.svg.png', answer: 'mcdonalds', acceptable: ['mcdonalds', 'mcdonald', 'mcdo'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Logo_NIKE.svg/1200px-Logo_NIKE.svg.png', answer: 'nike', acceptable: ['nike'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Adidas_Logo.svg/1200px-Adidas_Logo.svg.png', answer: 'adidas', acceptable: ['adidas'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/BMW_logo_%28gray%29.svg/800px-BMW_logo_%28gray%29.svg.png', answer: 'bmw', acceptable: ['bmw'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Mercedes-Logo.svg/800px-Mercedes-Logo.svg.png', answer: 'mercedes', acceptable: ['mercedes', 'mercedes benz'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Starbucks_Coffee.svg/800px-Starbucks_Coffee.svg.png', answer: 'starbucks', acceptable: ['starbucks'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Amazon_icon.svg/800px-Amazon_icon.svg.png', answer: 'amazon prime', acceptable: ['amazon prime', 'prime video'], category: 'Logo', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/IKEA_logo.svg/1200px-IKEA_logo.svg.png', answer: 'ikea', acceptable: ['ikea'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/TikTok_logo.svg/800px-TikTok_logo.svg.png', answer: 'tiktok', acceptable: ['tiktok', 'tik tok'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/800px-WhatsApp.svg.png', answer: 'whatsapp', acceptable: ['whatsapp'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Twitch_logo_%282019%29.svg/1200px-Twitch_logo_%282019%29.svg.png', answer: 'twitch', acceptable: ['twitch'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Discord_Logo_%282022%29.svg/800px-Discord_Logo_%282022%29.svg.png', answer: 'discord', acceptable: ['discord'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Steam_icon_logo.svg/800px-Steam_icon_logo.svg.png', answer: 'steam', acceptable: ['steam'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Logonetflix.png/800px-Logonetflix.png', answer: 'netflix n', acceptable: ['netflix'], category: 'Logo', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Spotify_logo_with_text.svg/1200px-Spotify_logo_with_text.svg.png', answer: 'spotify', acceptable: ['spotify'], category: 'Logo', difficulty: 'easy' },

  // ========== MONUMENTS (20+) ==========
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Tour_eiffel_at_sunrise_from_the_trocadero.jpg/800px-Tour_eiffel_at_sunrise_from_the_trocadero.jpg', answer: 'tour eiffel', acceptable: ['tour eiffel', 'eiffel', 'paris'], category: 'Monument', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Big_Ben_London_12.2016.jpg/800px-Big_Ben_London_12.2016.jpg', answer: 'big ben', acceptable: ['big ben', 'london'], category: 'Monument', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Statue_of_Liberty%2C_NY.jpg/800px-Statue_of_Liberty%2C_NY.jpg', answer: 'statue of liberty', acceptable: ['statue liberte', 'statue of liberty', 'liberty', 'new york'], category: 'Monument', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Good_Morning_From_the_Colosseum%21_%285901247416%29.jpg/1200px-Good_Morning_From_the_Colosseum%21_%285901247416%29.jpg', answer: 'colisee', acceptable: ['colisee', 'colosseum', 'rome'], category: 'Monument', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Machu_Picchu%2C_Peru.jpg/1200px-Machu_Picchu%2C_Peru.jpg', answer: 'machu picchu', acceptable: ['machu picchu', 'perou'], category: 'Monument', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Taj_Mahal_in_India_-_Tekniska_museet_-_Sweden_-_2021-04-20.jpg/1200px-Taj_Mahal_in_India_-_Tekniska_museet_-_Sweden_-_2021-04-20.jpg', answer: 'taj mahal', acceptable: ['taj mahal', 'inde'], category: 'Monument', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Kheops-Pyramid.jpg/1200px-Kheops-Pyramid.jpg', answer: 'pyramide', acceptable: ['pyramide', 'pyramides', 'egypte', 'gizeh', 'cheops'], category: 'Monument', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/GoldenGateBridge-001.jpg/1200px-GoldenGateBridge-001.jpg', answer: 'golden gate', acceptable: ['golden gate', 'golden gate bridge', 'san francisco'], category: 'Monument', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Sydney_Opera_House_-_Dec_2008.jpg/1200px-Sydney_Opera_House_-_Dec_2008.jpg', answer: 'opera sydney', acceptable: ['opera sydney', 'sydney opera house', 'sydney'], category: 'Monument', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Christ_the_Redeemer_-_Cristo_Redentor.jpg/800px-Christ_the_Redeemer_-_Cristo_Redentor.jpg', answer: 'christ redempteur', acceptable: ['christ redempteur', 'rio', 'bresil', 'christ the redeemer'], category: 'Monument', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Great_Wall_of_China_%2824192017545%29.jpg/1200px-Great_Wall_of_China_%2824192017545%29.jpg', answer: 'muraille de chine', acceptable: ['muraille de chine', 'grande muraille', 'great wall', 'chine'], category: 'Monument', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Cour_Napoleon_du_Louvre.jpg/1200px-Cour_Napoleon_du_Louvre.jpg', answer: 'louvre', acceptable: ['louvre', 'pyramide du louvre', 'musee du louvre', 'paris'], category: 'Monument', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Leaning_tower_of_pisa_2.jpg/800px-Leaning_tower_of_pisa_2.jpg', answer: 'tour de pise', acceptable: ['tour de pise', 'pise', 'pisa'], category: 'Monument', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Parthenon_from_west.jpg/1200px-Parthenon_from_west.jpg', answer: 'parthenon', acceptable: ['parthenon', 'acropole', 'athenes'], category: 'Monument', difficulty: 'hard' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Petra_Jordan_BW_21.JPG/1200px-Petra_Jordan_BW_21.JPG', answer: 'petra', acceptable: ['petra', 'jordanie'], category: 'Monument', difficulty: 'hard' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Kremlin_birds_eye_view-1.jpg/1200px-Kremlin_birds_eye_view-1.jpg', answer: 'kremlin', acceptable: ['kremlin', 'moscou', 'russie'], category: 'Monument', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Stonehenge%2C_Salisbury_retance.jpg/1200px-Stonehenge%2C_Salisbury_retance.jpg', answer: 'stonehenge', acceptable: ['stonehenge'], category: 'Monument', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Empire_State_Building_%28aerial_view%29.jpg/800px-Empire_State_Building_%28aerial_view%29.jpg', answer: 'empire state building', acceptable: ['empire state', 'empire state building', 'new york'], category: 'Monument', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sagrada_Familia_01.jpg/800px-Sagrada_Familia_01.jpg', answer: 'sagrada familia', acceptable: ['sagrada familia', 'barcelone'], category: 'Monument', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Burj_Khalifa.jpg/800px-Burj_Khalifa.jpg', answer: 'burj khalifa', acceptable: ['burj khalifa', 'dubai'], category: 'Monument', difficulty: 'medium' },

  // ========== ART (15+) ==========
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/800px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg', answer: 'joconde', acceptable: ['joconde', 'mona lisa', 'da vinci', 'vinci'], category: 'Art', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1200px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg', answer: 'nuit etoilee', acceptable: ['nuit etoilee', 'starry night', 'van gogh'], category: 'Art', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/VanGogh-starry_night_ballance1.jpg/1200px-VanGogh-starry_night_ballance1.jpg', answer: 'van gogh', acceptable: ['van gogh', 'nuit etoilee'], category: 'Art', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/The_Scream.jpg/800px-The_Scream.jpg', answer: 'le cri', acceptable: ['le cri', 'the scream', 'munch'], category: 'Art', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/American_Gothic.jpg/800px-American_Gothic.jpg', answer: 'american gothic', acceptable: ['american gothic'], category: 'Art', difficulty: 'hard' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/David_by_Michelangelo_Fir_JBU002.jpg/800px-David_by_Michelangelo_Fir_JBU002.jpg', answer: 'david', acceptable: ['david', 'michelangelo', 'michel ange'], category: 'Art', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Creation_of_Adam_%28Michelangelo%29_Detail.jpg/1200px-Creation_of_Adam_%28Michelangelo%29_Detail.jpg', answer: 'creation dadam', acceptable: ['creation dadam', 'adam', 'chapelle sixtine', 'sistine'], category: 'Art', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Sunflowers_by_Van_Gogh.jpg/800px-Sunflowers_by_Van_Gogh.jpg', answer: 'tournesols', acceptable: ['tournesols', 'sunflowers', 'van gogh'], category: 'Art', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg/1200px-Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg', answer: 'naissance de venus', acceptable: ['naissance venus', 'venus', 'botticelli'], category: 'Art', difficulty: 'hard' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/La_Libert%C3%A9_guidant_le_peuple_-_Eug%C3%A8ne_Delacroix_-_Mus%C3%A9e_du_Louvre_Peintures_RF_129_-_apr%C3%A8s_restauration_2024.jpg/1200px-La_Libert%C3%A9_guidant_le_peuple_-_Eug%C3%A8ne_Delacroix_-_Mus%C3%A9e_du_Louvre_Peintures_RF_129_-_apr%C3%A8s_restauration_2024.jpg', answer: 'liberte guidant le peuple', acceptable: ['liberte guidant le peuple', 'delacroix', 'marianne'], category: 'Art', difficulty: 'hard' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/The_Scream.jpg/800px-The_Scream.jpg', answer: 'the scream', acceptable: ['the scream', 'le cri', 'munch'], category: 'Art', difficulty: 'medium' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Pieta_di_Michelangelo_-_St._Peter%27s_Basilica_-_Vatican_City.jpg/800px-Pieta_di_Michelangelo_-_St._Peter%27s_Basilica_-_Vatican_City.jpg', answer: 'pieta', acceptable: ['pieta', 'michelangelo', 'pietà'], category: 'Art', difficulty: 'hard' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Meisje_met_de_parel.jpg/800px-Meisje_met_de_parel.jpg', answer: 'jeune fille a la perle', acceptable: ['jeune fille perle', 'girl with pearl earring', 'vermeer'], category: 'Art', difficulty: 'hard' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat03.jpg/1200px-Cat03.jpg', answer: 'chat', acceptable: ['chat', 'cat'], category: 'Art', difficulty: 'easy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg/1200px-Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg', answer: 'nympheas', acceptable: ['nympheas', 'water lilies', 'monet'], category: 'Art', difficulty: 'hard' },
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

export { BLURRUSH_IMAGES };
