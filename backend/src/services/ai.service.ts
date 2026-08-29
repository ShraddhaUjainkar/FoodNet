import { AnalysisResult } from './analyzer.service.js';
import { MatchedIngredient } from './normalizer.service.js';
import { logger, captureException } from '../config/logger.js';

export interface AISummaryResult {
  summary: string;
  productName?: string;
  brand?: string;
  emoji?: string;
  gradient?: string;
  nutrition?: {
    label: string;
    value: string;
    rating: 'good' | 'neutral' | 'bad';
    description: string;
  }[];
  alternatives?: {
    name: string;
    brand: string;
    score: number;
    grade: 'A' | 'B';
    emoji: string;
    gradient: string;
  }[];
}

export const ai = {
  generateSummary: async (
    analysis: Omit<AnalysisResult, 'summary'>,
    _filename: string,
  ): Promise<string> => {
    const mapped: MatchedIngredient[] = analysis.ingredients.map((ing) => ({
      id: ing.name,
      name: ing.name,
      rating: ing.rating as 'safe' | 'caution' | 'avoid' | 'unknown',
      description: ing.description,
      percentage: ing.percentage,
    }));

    const res = await generateAISummary({
      rawText: '',
      ingredients: mapped,
      score: analysis.score,
      recommendation:
        analysis.score >= 70
          ? 'Daily'
          : analysis.score >= 40
            ? 'Occasionally'
            : 'Rarely',
    });

    return res.summary;
  },
};

const ollamaSystemPrompt = `You are FoodNet AI. Return only valid JSON with this shape:
{
  "summary": "short plain-English summary",
  "categorizations": [{"name":"exact ingredient name","rating":"safe|caution|avoid","description":"brief explanation","consumptionGuidance":"brief guidance"}],
  "productName": "string",
  "brand": "string",
  "emoji": "single emoji",
  "gradient": "from-color to-color",
  "nutrition": [{"label":"string","value":"string","rating":"good|neutral|bad","description":"string"}],
  "alternatives": [{"name":"string","brand":"string","score":85,"grade":"A|B","emoji":"single emoji","gradient":"from-color to-color"}]
}
Use only the supplied label and matched ingredient information. Do not invent medical claims. Do not override the supplied safety ratings. FoodNet's rules and database are authoritative. Explain uncertainty clearly.`;

async function generateOllamaSummary(params: {
  rawText: string;
  ingredients: MatchedIngredient[];
  score: number;
  recommendation: string;
}): Promise<AISummaryResult | null> {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2:3b';

  try {
    const response = await fetch(`${ollamaUrl.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        stream: false,
        format: 'json',
        messages: [
          { role: 'system', content: ollamaSystemPrompt },
          {
            role: 'user',
            content: JSON.stringify({
              rawText: params.rawText,
              ingredients: params.ingredients.map((ingredient) => ({
                name: ingredient.name,
                rating: ingredient.rating,
                description: ingredient.description,
              })),
              score: params.score,
              recommendation: params.recommendation,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, 'Ollama request failed');
      return null;
    }

    const json = (await response.json()) as any;
    const responseData = JSON.parse(json.message?.content || '{}');
    if (!responseData.summary) return null;

    for (const categorization of responseData.categorizations || []) {
      const ingredient = params.ingredients.find(
        (item) =>
          item.name.toLowerCase() === String(categorization.name).toLowerCase(),
      );
      if (ingredient && ingredient.isUnmatched) {
        ingredient.rating = categorization.rating;
        ingredient.description = categorization.description;
        ingredient.consumptionGuidance = categorization.consumptionGuidance;
        ingredient.isUnmatched = false;
      }
    }

    logger.info({ model: ollamaModel }, 'Ollama summary generated');
    console.log('AI generated summary (Ollama):', responseData.summary);
    return {
      summary: String(responseData.summary).trim(),
      productName: responseData.productName,
      brand: responseData.brand,
      emoji: responseData.emoji,
      gradient: responseData.gradient,
      nutrition: responseData.nutrition,
      alternatives: responseData.alternatives,
    };
  } catch (error) {
    logger.warn({ err: error }, 'Ollama unavailable, using next AI fallback');
    return null;
  }
}

function localFallbackCategorize(ingName: string): {
  rating: 'safe' | 'caution' | 'avoid';
  description: string;
  consumptionGuidance: string;
} {
  const lower = ingName.toLowerCase();

  if (
    lower.includes('sugar') ||
    lower.includes('syrup') ||
    lower.includes('hydrogenated') ||
    lower.includes('msg') ||
    lower.includes('monosodium glutamate') ||
    lower.includes('artificial color')
  ) {
    return {
      rating: 'avoid',
      description:
        'Refined sugar, flavor enhancer, or hydrogenated fat. High glycemic load or chronic health risk.',
      consumptionGuidance:
        'Seek cleaner alternatives and avoid regular intake.',
    };
  }

  if (
    lower.includes('acid') ||
    lower.includes('gum') ||
    lower.includes('salt') ||
    lower.includes('sodium') ||
    lower.includes('starch') ||
    lower.includes('maltodextrin') ||
    lower.includes('flavor') ||
    lower.includes('preservative')
  ) {
    return {
      rating: 'caution',
      description:
        'Processed additive or sodium compound. Generally safe, but consumption should be kept moderate.',
      consumptionGuidance: 'Consume in moderation as part of a balanced diet.',
    };
  }

  if (
    lower.includes('water') ||
    lower.includes('extract') ||
    lower.includes('powder') ||
    lower.includes('organic') ||
    lower.includes('natural') ||
    lower.includes('milk') ||
    lower.includes('cocoa') ||
    lower.includes('hazelnut') ||
    lower.includes('potato') ||
    lower.includes('flour') ||
    lower.includes('oil')
  ) {
    return {
      rating: 'safe',
      description:
        'Identified as a natural or common dietary base ingredient. Deemed safe by regulatory bodies.',
      consumptionGuidance: 'Generally safe for daily consumption.',
    };
  }

  return {
    rating: 'caution',
    description:
      'Common food ingredient. Recommend checking serving sizes and consuming in moderation.',
    consumptionGuidance: 'Check standard portion sizes and consume moderately.',
  };
}

async function generateGeminiSummary(params: {
  rawText: string;
  ingredients: MatchedIngredient[];
  score: number;
  recommendation: string;
}): Promise<AISummaryResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const systemPrompt = `You are FoodNet AI, a professional food scientist.
Analyze the food label and provide:
1. A plain English summary explaining the health risks and safety profile under 3 sentences.
2. A safety categorization for each of the unmatched ingredients listed. Each categorization must contain:
   - "name": the exact name of the unmatched ingredient as provided
   - "rating": one of "safe", "caution", or "avoid"
   - "description": a brief (1-2 sentences) explanation of its health impact and what it is.
   - "consumptionGuidance": a brief (1 sentence) instruction on how much is safe or good to eat (e.g. "Consume sparingly", "Limit to less than 25g/day").
3. Inferred product details:
   - "productName": Name of the product (e.g. "Spicy Barbecue Chips", "Hazelnut Spread") based on ingredients.
   - "brand": Brand name if detected in OCR text, else a generic plausible brand.
   - "emoji": A single representative food emoji.
   - "gradient": A Tailwind CSS gradient class starting with "from-" and "to-".
   - "nutrition": An array of 2-3 key nutrition elements (e.g. Sugar, Sodium, Calories) with:
     - "label": e.g. "Added Sugars"
     - "value": e.g. "25g / serving"
     - "rating": "good" | "neutral" | "bad"
     - "description": e.g. "High concentration."
   - "alternatives": An array of 2 healthier alternative products with:
     - "name": e.g. "Baked Sweet Potato Crisps"
     - "brand": e.g. "TerraLife"
     - "score": number between 75 and 96
     - "grade": "A" or "B"
     - "emoji": representative emoji
     - "gradient": Tailwind CSS gradient class

You must return your response in JSON format matching this structure:
{
  "summary": "...",
  "categorizations": [
    {
      "name": "...",
      "rating": "safe" | "caution" | "avoid",
      "description": "...",
      "consumptionGuidance": "..."
    }
  ],
  "productName": "...",
  "brand": "...",
  "emoji": "...",
  "gradient": "...",
  "nutrition": [
    { "label": "...", "value": "...", "rating": "good" | "neutral" | "bad", "description": "..." }
  ],
  "alternatives": [
    { "name": "...", "brand": "...", "score": 85, "grade": "A", "emoji": "...", "gradient": "..." }
  ]
}`;

    const userPrompt = `Raw text of the label: "${params.rawText}"
Matched ingredients catalog:
${params.ingredients
  .filter((i) => !i.isUnmatched && i.rating !== 'unknown')
  .map((i) => `${i.name} (${i.rating})`)
  .join(', ')}
Overall Safety Score: ${params.score}/100 (${params.recommendation})

Unmatched ingredients to categorize:
${params.ingredients.filter((i) => i.isUnmatched || i.rating === 'unknown').map(i => i.name).join(', ') || 'None'}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: systemPrompt + "\n\n" + userPrompt
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, 'Gemini API request failed');
      return null;
    }

    const resJson = (await response.json()) as any;
    const responseText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) return null;

    const responseData = JSON.parse(responseText.trim());
    if (!responseData.summary) return null;

    if (responseData.categorizations && Array.isArray(responseData.categorizations)) {
      for (const cat of responseData.categorizations) {
        const matchedIng = params.ingredients.find(
          (i) => i.name.toLowerCase() === cat.name.toLowerCase(),
        );
        if (matchedIng) {
          matchedIng.rating = cat.rating;
          matchedIng.description = cat.description;
          matchedIng.consumptionGuidance = cat.consumptionGuidance;
          matchedIng.isUnmatched = false;
        }
      }
    }

    logger.info({ provider: 'gemini' }, 'Gemini summary generated');
    console.log('AI generated summary (Gemini):', responseData.summary);

    return {
      summary: responseData.summary.trim(),
      productName: responseData.productName,
      brand: responseData.brand,
      emoji: responseData.emoji,
      gradient: responseData.gradient,
      nutrition: responseData.nutrition,
      alternatives: responseData.alternatives,
    };
  } catch (e) {
    logger.error({ err: e }, 'Gemini API call failed');
    return null;
  }
}

export async function generateAISummary(params: {
  rawText: string;
  ingredients: MatchedIngredient[];
  score: number;
  recommendation: string;
}): Promise<AISummaryResult> {
  const unmatchedIngredients = params.ingredients.filter(
    (ing) => ing.isUnmatched || ing.rating === 'unknown',
  );
  const unmatchedNames = unmatchedIngredients.map((ing) => ing.name);

  // 1. Try local Ollama if enabled
  if (process.env.ENABLE_OLLAMA === '1') {
    const ollamaResult = await generateOllamaSummary(params);
    if (ollamaResult) return ollamaResult;
  }

  // 2. Try Gemini if API key is provided
  if (process.env.GEMINI_API_KEY) {
    const geminiResult = await generateGeminiSummary(params);
    if (geminiResult) return geminiResult;
  }

  // 3. Try OpenAI if API key is provided and remote AI is enabled
  if (process.env.OPENAI_API_KEY && process.env.ENABLE_REMOTE_AI === '1') {
    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: `You are FoodNet AI, a professional food scientist.
Analyze the food label and provide:
1. A plain English summary explaining the health risks and safety profile under 3 sentences.
2. A safety categorization for each of the unmatched ingredients listed. Each categorization must contain:
   - "name": the exact name of the unmatched ingredient as provided
   - "rating": one of "safe", "caution", or "avoid"
   - "description": a brief (1-2 sentences) explanation of its health impact and what it is.
   - "consumptionGuidance": a brief (1 sentence) instruction on how much is safe or good to eat (e.g. "Consume sparingly", "Limit to less than 25g/day").
3. Inferred product details:
   - "productName": Name of the product (e.g. "Spicy Barbecue Chips", "Hazelnut Spread") based on ingredients.
   - "brand": Brand name if detected in OCR text, else a generic plausible brand.
   - "emoji": A single representative food emoji.
   - "gradient": A Tailwind CSS gradient class starting with "from-" and "to-".
   - "nutrition": An array of 2-3 key nutrition elements (e.g. Sugar, Sodium, Calories) with:
     - "label": e.g. "Added Sugars"
     - "value": e.g. "25g / serving"
     - "rating": "good" | "neutral" | "bad"
     - "description": e.g. "High concentration."
   - "alternatives": An array of 2 healthier alternative products with:
     - "name": e.g. "Baked Sweet Potato Crisps"
     - "brand": e.g. "TerraLife"
     - "score": number between 75 and 96
     - "grade": "A" or "B"
     - "emoji": representative emoji
     - "gradient": Tailwind CSS gradient class

You must return your response in JSON format matching this structure:
{
  "summary": "...",
  "categorizations": [
    {
      "name": "...",
      "rating": "safe" | "caution" | "avoid",
      "description": "...",
      "consumptionGuidance": "..."
    }
  ],
  "productName": "...",
  "brand": "...",
  "emoji": "...",
  "gradient": "...",
  "nutrition": [
    { "label": "...", "value": "...", "rating": "good" | "neutral" | "bad", "description": "..." }
  ],
  "alternatives": [
    { "name": "...", "brand": "...", "score": 85, "grade": "A", "emoji": "...", "gradient": "..." }
  ]
}`,
              },
              {
                role: 'user',
                content: `Raw text of the label: "${params.rawText}"
Matched ingredients catalog:
${params.ingredients
  .filter((i) => !i.isUnmatched && i.rating !== 'unknown')
  .map((i) => `${i.name} (${i.rating})`)
  .join(', ')}
Overall Safety Score: ${params.score}/100 (${params.recommendation})

Unmatched ingredients to categorize:
${unmatchedNames.length > 0 ? unmatchedNames.join(', ') : 'None'}`,
              },
            ],
            max_tokens: 600,
          }),
        },
      );

      if (response.ok) {
        const json = (await response.json()) as any;
        const responseData = JSON.parse(
          json.choices?.[0]?.message?.content || '{}',
        );

        if (responseData.summary) {
          if (
            responseData.categorizations &&
            Array.isArray(responseData.categorizations)
          ) {
            for (const cat of responseData.categorizations) {
              const matchedIng = params.ingredients.find(
                (i) => i.name.toLowerCase() === cat.name.toLowerCase(),
              );
              if (matchedIng) {
                matchedIng.rating = cat.rating;
                matchedIng.description = cat.description;
                matchedIng.consumptionGuidance = cat.consumptionGuidance;
                matchedIng.isUnmatched = false;
              }
            }
          }
          logger.info({ provider: 'openai' }, 'AI summary generated');
          console.log('AI generated summary (OpenAI):', responseData.summary);
          return {
            summary: responseData.summary.trim(),
            productName: responseData.productName,
            brand: responseData.brand,
            emoji: responseData.emoji,
            gradient: responseData.gradient,
            nutrition: responseData.nutrition,
            alternatives: responseData.alternatives,
          };
        }
      }
    } catch (e) {
      logger.error(
        { err: e },
        'OpenAI summary & categorization call failed, falling back',
      );
      captureException(e);
    }
  } else {
    if (!process.env.OPENAI_API_KEY) {
      logger.info(
        'Remote AI disabled: OPENAI_API_KEY not set — using local fallback.',
      );
    } else if (process.env.ENABLE_REMOTE_AI !== '1') {
      logger.info(
        'Remote AI disabled: ENABLE_REMOTE_AI!=1 — using local fallback.',
      );
    }
  }

  for (const ing of unmatchedIngredients) {
    const fallback = localFallbackCategorize(ing.name);
    ing.rating = fallback.rating;
    ing.description = fallback.description;
    ing.consumptionGuidance = fallback.consumptionGuidance;
    ing.isUnmatched = false;
  }

  const avoids = params.ingredients
    .filter((i) => i.rating === 'avoid')
    .map((i) => i.name.toLowerCase());
  const cautions = params.ingredients
    .filter((i) => i.rating === 'caution')
    .map((i) => i.name.toLowerCase());

  let summaryText = '';

  if (avoids.length > 0) {
    summaryText += `Contains processed ingredients to avoid, notably ${avoids.slice(0, 3).join(', ')}${avoids.length > 3 ? ' and others' : ''}. `;
  }

  if (cautions.length > 0) {
    summaryText += `Includes items requiring caution such as ${cautions.slice(0, 3).join(', ')}${cautions.length > 3 ? ' and others' : ''}. `;
  }

  if (params.score < 40) {
    summaryText += `Regular intake of this item is linked to metabolic strain and glycemic spikes. We recommend healthier, cleaner swaps.`;
  } else if (params.score < 70) {
    summaryText += `Moderately processed. Contains additives or sodium levels that suggest caution. Safe to eat occasionally in moderation.`;
  } else {
    summaryText += `Excellent safety profile. Features a highly natural composition and zero harmful chemical additives. Safe for daily dietary consumption.`;
  }

  console.log('AI generated summary (local fallback):', summaryText);
  return {
    summary: summaryText,
  };
}
