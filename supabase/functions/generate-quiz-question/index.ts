import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CATEGORIES = [
  'culture',
  'histoire', 
  'youtube_fr',
  'musique',
  'sport',
  'cinema',
  'science',
  'geographie'
];

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  culture: "Culture générale (connaissances diverses, actualités, société)",
  histoire: "Histoire de France et du monde (dates, personnages, événements)",
  youtube_fr: "YouTube France (Squeezie, Cyprien, Norman, MrBeast traduit, Gotaga, Michou, Inoxtag, Amixem, etc.)",
  musique: "Musique française et internationale (artistes, chansons, groupes)",
  sport: "Sport (football, basketball, tennis, Jeux Olympiques, etc.)",
  cinema: "Cinéma et séries (films, acteurs, réalisateurs, séries populaires)",
  science: "Sciences et technologies (inventions, découvertes, espace)",
  geographie: "Géographie (capitales, pays, monuments, océans)"
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category, difficulty, previousQuestions } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Select category - random if not specified
    const selectedCategory = category && CATEGORIES.includes(category) 
      ? category 
      : CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    
    const selectedDifficulty = difficulty || ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)];
    
    const categoryDescription = CATEGORY_DESCRIPTIONS[selectedCategory];
    
    // Build prompt with previous questions to avoid duplicates
    const previousQuestionsText = previousQuestions && previousQuestions.length > 0
      ? `\n\nATTENTION: Ne pose PAS ces questions déjà posées:\n${previousQuestions.map((q: string) => `- ${q}`).join('\n')}`
      : '';

    const systemPrompt = `Tu es un générateur de questions de quiz en français. Tu dois générer UNE SEULE question originale et intéressante.

RÈGLES IMPORTANTES:
1. La question doit être en français
2. La réponse doit être courte (1 à 3 mots maximum)
3. La réponse doit être sans ambiguïté
4. Niveau de difficulté: ${selectedDifficulty} (easy = très facile, medium = moyen, hard = difficile)
5. La question doit être engageante et fun

Tu dois répondre UNIQUEMENT avec un JSON valide dans ce format exact, sans aucun texte avant ou après:
{"question": "Ta question ici ?", "answer": "Réponse courte"}`;

    const userPrompt = `Génère une question de quiz sur le thème: ${categoryDescription}
Niveau: ${selectedDifficulty}${previousQuestionsText}

Réponds UNIQUEMENT avec le JSON, rien d'autre.`;

    console.log(`Generating quiz question - Category: ${selectedCategory}, Difficulty: ${selectedDifficulty}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add funds.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log('AI response:', content);

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse the JSON response - handle potential markdown code blocks
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.slice(7);
    }
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.slice(0, -3);
    }
    cleanContent = cleanContent.trim();

    let parsedQuestion;
    try {
      parsedQuestion = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', cleanContent);
      throw new Error('Failed to parse AI response as JSON');
    }

    if (!parsedQuestion.question || !parsedQuestion.answer) {
      throw new Error('Invalid question format from AI');
    }

    const result = {
      question: parsedQuestion.question,
      answer: parsedQuestion.answer,
      category: selectedCategory,
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
