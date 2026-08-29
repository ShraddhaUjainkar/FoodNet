// Analyzes normalized ingredients to calculate safety scores, additives, allergens, and healthier swaps
import { NormalizedIngredient, MatchedIngredient } from "./normalizer";
import { ADDITIVES_CATALOG } from "./db";

export interface AnalysisResult {
  name: string;
  brand: string;
  score: number;
  grade: "A" | "B" | "C" | "D" | "E";
  summary: string;
  allergens: string[];
  ingredients: {
    name: string;
    rating: "safe" | "caution" | "avoid";
    description: string;
    percentage?: string;
  }[];
  additives: {
    code: string;
    name: string;
    rating: "safe" | "caution" | "avoid";
    purpose: string;
    description: string;
  }[];
  nutrition: {
    label: string;
    value: string;
    rating: "good" | "neutral" | "bad";
    description: string;
  }[];
  alternatives: {
    name: string;
    brand: string;
    score: number;
    grade: "A" | "B";
    emoji: string;
    gradient: string;
  }[];
  emoji: string;
  gradient: string;
}

export function calculateGrade(score: number): "A" | "B" | "C" | "D" | "E" {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "E";
}

// Compute deterministic health score and consumption recommendation
export function calculateHealthScore(ingredients: MatchedIngredient[]) {
  // Detect E-number additives
  const flaggedAdditives: { code: string; name: string; rating: "safe" | "caution" | "avoid"; purpose: string; description: string }[] = [];
  ingredients.forEach((ing) => {
    const lowerIng = ing.name.toLowerCase();
    const dbAdd = ADDITIVES_CATALOG[lowerIng];
    if (dbAdd) {
      flaggedAdditives.push(dbAdd);
    }
  });

  // Detect allergens based on ingredient patterns
  const allergens: string[] = [];
  ingredients.forEach((ing) => {
    const nameLower = ing.name.toLowerCase();
    if (nameLower.includes("hazelnut") || nameLower.includes("nut")) allergens.push("Hazelnuts (Tree Nuts)");
    if (nameLower.includes("milk") || nameLower.includes("lactose")) allergens.push("Milk Powder");
    if (nameLower.includes("soy") || nameLower.includes("lecithin")) allergens.push("Soy Lecithin");
    if (nameLower.includes("barley") || nameLower.includes("wheat") || nameLower.includes("gluten")) allergens.push("Gluten (Wheat)");
  });
  const foundAllergens = Array.from(new Set(allergens));

  // Calculate score
  let score = 100;
  ingredients.forEach((ing) => {
    if (ing.rating === "avoid") score -= 14;
    if (ing.rating === "caution") score -= 6;
  });
  flaggedAdditives.forEach((add) => {
    if (add.rating === "avoid") score -= 10;
    if (add.rating === "caution") score -= 4;
  });

  // Constrain score
  score = Math.max(12, Math.min(96, score));

  // Determine recommendation
  let recommendation = "Daily";
  if (score < 40) {
    recommendation = "Rarely";
  } else if (score < 70) {
    recommendation = "Occasionally";
  }

  return {
    score,
    recommendation,
    flaggedAdditives,
    foundAllergens
  };
}

// Guess product metadata based on filename and ingredients content
export function calculateProductMetadata(ingredients: MatchedIngredient[], filename: string) {
  const lowerFile = filename.toLowerCase();
  const ingNames = ingredients.map(ing => ing.name.toLowerCase());

  const isChips =
    lowerFile.includes("chip") ||
    lowerFile.includes("crisp") ||
    lowerFile.includes("potato") ||
    lowerFile.includes("fry") ||
    lowerFile.includes("snack") ||
    ingNames.includes("potatoes") ||
    ingNames.includes("bbq seasoning powder");

  const isSoda =
    lowerFile.includes("soda") ||
    lowerFile.includes("coke") ||
    lowerFile.includes("drink") ||
    lowerFile.includes("cola") ||
    lowerFile.includes("pepsi") ||
    lowerFile.includes("juice") ||
    lowerFile.includes("beverage") ||
    ingNames.includes("carbonated water") ||
    ingNames.includes("phosphoric acid") ||
    ingNames.includes("high fructose corn syrup");

  // Determine basic product type
  let name = "Processed Food Item";
  let brand = "Generic Brand";
  let emoji = "📦";
  let gradient = "from-zinc-700 to-zinc-900";
  let nutrition: AnalysisResult["nutrition"] = [];
  let alternatives: AnalysisResult["alternatives"] = [];

  if (isChips) {
    name = "Spicy Barbecue Chips";
    brand = "CrispyCraze";
    emoji = "🍟";
    gradient = "from-red-700 to-amber-800";
    nutrition = [
      { label: "Sodium", value: "840mg / 100g", rating: "bad", description: "High sodium concentration." },
      { label: "Total Fat", value: "32g / 100g", rating: "bad", description: "High fat content from continuous deep frying." },
      { label: "Potassium", value: "450mg / 100g", rating: "good", description: "Good level of natural potassium retained from the potato starches." }
    ];
    alternatives = [
      { name: "Air-Popped Chickpea Crisps", brand: "SimpleSnacks", score: 83, grade: "A", emoji: "🫛", gradient: "from-amber-600 to-yellow-700" },
      { name: "Sea Salt Baked Sweet Potato Chips", brand: "TerraLife", score: 79, grade: "B", emoji: "🍠", gradient: "from-orange-600 to-amber-900" }
    ];
  } else if (isSoda) {
    name = "Sparkling Citrus Cola";
    brand = "FizzCorp";
    emoji = "🥤";
    gradient = "from-zinc-800 to-zinc-950";
    nutrition = [
      { label: "Added Sugars", value: "39g / can", rating: "bad", description: "Extreme dose. Exceeds recommended daily limits." },
      { label: "Calories", value: "140 kcal / can", rating: "bad", description: "Empty calories with zero protein or fiber." }
    ];
    alternatives = [
      { name: "Organic Probiotic Cola", brand: "Olipop", score: 86, grade: "A", emoji: "🥤", gradient: "from-teal-600 to-indigo-850" },
      { name: "Lemon Lime Sparkling Water", brand: "Spindrift", score: 94, grade: "A", emoji: "🍋", gradient: "from-lime-500 to-teal-800" }
    ];
  } else {
    name = "Hazelnut Cocoa Spread";
    brand = "ChocoSweet";
    emoji = "🌰";
    gradient = "from-amber-800 to-amber-950";
    nutrition = [
      { label: "Energy", value: "539 kcal / 100g", rating: "bad", description: "High energy density." },
      { label: "Added Sugars", value: "56.3g / 100g", rating: "bad", description: "Severe warning. Composes over half of the product weight." },
      { label: "Saturated Fats", value: "10.6g / 100g", rating: "bad", description: "High level of unhealthy fats from palm oil." }
    ];
    alternatives = [
      { name: "Artisanal Almond Cocoa Butter", brand: "NutsOnly", score: 79, grade: "B", emoji: "🫘", gradient: "from-stone-700 to-amber-900" },
      { name: "Monk Fruit Hazelnut Butter", brand: "CleanEats", score: 88, grade: "A", emoji: "🌰", gradient: "from-amber-600 to-stone-800" }
    ];
  }

  return {
    name,
    brand,
    emoji,
    gradient,
    nutrition,
    alternatives
  };
}

export const analyzer = {
  analyzeProduct: async (ingredients: NormalizedIngredient[], filename: string): Promise<AnalysisResult> => {
    // Adapter function to maintain backward-compatibility if needed
    const matched = ingredients.map(ing => {
      return {
        id: ing.name,
        name: ing.name,
        rating: "safe" as const,
        description: "Common food ingredient.",
        percentage: ing.percentage
      };
    });

    const metadata = calculateProductMetadata(matched, filename);
    const scoreInfo = calculateHealthScore(matched);
    const grade = calculateGrade(scoreInfo.score);

    return {
      ...metadata,
      score: scoreInfo.score,
      grade,
      summary: "",
      allergens: scoreInfo.foundAllergens,
      ingredients: matched.map(m => ({
        name: m.name,
        rating: m.rating as "safe" | "caution" | "avoid",
        description: m.description,
        percentage: m.percentage
      })),
      additives: scoreInfo.flaggedAdditives,
    };
  }
};
