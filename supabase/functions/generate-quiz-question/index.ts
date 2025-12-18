import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Open Trivia Database category IDs
const OTDB_CATEGORIES: Record<string, number> = {
  culture: 9,        // General Knowledge
  histoire: 23,      // History
  musique: 12,       // Music
  sport: 21,         // Sports
  cinema: 11,        // Film
  science: 17,       // Science & Nature
  geographie: 22,    // Geography
  jeux_video: 15,    // Video Games
  animaux: 27,       // Animals
  art: 25,           // Art
};

const CATEGORY_NAMES: Record<string, string> = {
  culture: 'Culture générale',
  histoire: 'Histoire',
  musique: 'Musique',
  sport: 'Sport',
  cinema: 'Cinéma',
  science: 'Science',
  geographie: 'Géographie',
  jeux_video: 'Jeux vidéo',
  animaux: 'Animaux',
  art: 'Art',
};

const DIFFICULTY_MAP: Record<string, string> = {
  easy: 'easy',
  medium: 'medium',
  hard: 'hard',
};

// Decode HTML entities
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&agrave;/g, 'à')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&uuml;/g, 'ü')
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&hellip;/g, '...')
    .replace(/&ndash;/g, '-')
    .replace(/&mdash;/g, '-');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category, difficulty } = await req.json();
    
    // Select random category if not specified
    const categoryKeys = Object.keys(OTDB_CATEGORIES);
    const selectedCategory = category && OTDB_CATEGORIES[category] 
      ? category 
      : categoryKeys[Math.floor(Math.random() * categoryKeys.length)];
    
    const categoryId = OTDB_CATEGORIES[selectedCategory];
    const selectedDifficulty = difficulty && DIFFICULTY_MAP[difficulty] 
      ? DIFFICULTY_MAP[difficulty] 
      : ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)];
    
    console.log(`Fetching question from Open Trivia DB - Category: ${selectedCategory} (${categoryId}), Difficulty: ${selectedDifficulty}`);

    // Fetch question from Open Trivia Database
    const otdbUrl = `https://opentdb.com/api.php?amount=1&category=${categoryId}&difficulty=${selectedDifficulty}&type=multiple`;
    
    const response = await fetch(otdbUrl);
    
    if (!response.ok) {
      throw new Error(`Open Trivia DB error: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('OTDB response:', JSON.stringify(data));

    if (data.response_code !== 0 || !data.results || data.results.length === 0) {
      // Fallback: try without difficulty filter
      console.log('Retrying without difficulty filter...');
      const fallbackUrl = `https://opentdb.com/api.php?amount=1&category=${categoryId}&type=multiple`;
      const fallbackResponse = await fetch(fallbackUrl);
      const fallbackData = await fallbackResponse.json();
      
      if (fallbackData.response_code !== 0 || !fallbackData.results || fallbackData.results.length === 0) {
        throw new Error('No questions available from Open Trivia DB');
      }
      
      data.results = fallbackData.results;
    }

    const questionData = data.results[0];
    const question = decodeHtmlEntities(questionData.question);
    const correctAnswer = decodeHtmlEntities(questionData.correct_answer);
    const incorrectAnswers = questionData.incorrect_answers.map((a: string) => decodeHtmlEntities(a));
    
    // Shuffle all answers
    const allAnswers = [correctAnswer, ...incorrectAnswers];
    for (let i = allAnswers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allAnswers[i], allAnswers[j]] = [allAnswers[j], allAnswers[i]];
    }

    const result = {
      question: question,
      answer: correctAnswer,
      options: allAnswers,
      category: selectedCategory,
      categoryName: CATEGORY_NAMES[selectedCategory] || selectedCategory,
      difficulty: selectedDifficulty
    };

    console.log('Generated question:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-quiz-question:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
