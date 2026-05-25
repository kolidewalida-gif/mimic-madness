import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { QUESTIONS_BANK, CATEGORIES, DIFFICULTIES } from "./questions-bank.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { category, difficulty, previousQuestions = [] } = body;
    
    // Input validation
    if (previousQuestions.length > 200) {
      return new Response(JSON.stringify({ error: 'Too many previous questions' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Select category
    const categoryKeys = Object.keys(QUESTIONS_BANK);
    const selectedCategory = category && QUESTIONS_BANK[category] 
      ? category 
      : categoryKeys[Math.floor(Math.random() * categoryKeys.length)];
    
    const questions = QUESTIONS_BANK[selectedCategory] || [];
    
    // Filter by difficulty if specified
    let filteredQuestions = difficulty 
      ? questions.filter(q => q.difficulty === difficulty)
      : questions;
    
    // Remove already asked questions
    const prevSet = new Set(previousQuestions);
    filteredQuestions = filteredQuestions.filter(q => !prevSet.has(q.question));
    
    // Fallback to all questions if none left
    if (filteredQuestions.length === 0) {
      filteredQuestions = questions.filter(q => !prevSet.has(q.question));
    }
    if (filteredQuestions.length === 0) {
      filteredQuestions = questions;
    }
    
    // Pick random question
    const question = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
    
    if (!question) {
      return new Response(JSON.stringify({ error: 'No questions available' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Shuffle options
    const shuffledOptions = [...question.options].sort(() => Math.random() - 0.5);
    
    const categoryInfo = CATEGORIES.find(c => c.id === selectedCategory);
    
    const result = {
      question: question.question,
      answer: question.answer,
      options: shuffledOptions,
      category: selectedCategory,
      categoryName: categoryInfo ? `${categoryInfo.emoji} ${categoryInfo.name}` : selectedCategory,
      difficulty: question.difficulty
    };

    return new Response(JSON.stringify(result), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        // Cache for 0s — each request should be unique
        'Cache-Control': 'no-store',
      },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
