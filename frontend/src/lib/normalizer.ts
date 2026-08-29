// Normalizes and cleans raw ingredient lists extracted by OCR
import { findIngredient } from "./db";

export interface NormalizedIngredient {
  raw: string;
  name: string;
  percentage?: string;
}

export interface MatchedIngredient {
  id: string;
  name: string;
  rating: "safe" | "caution" | "avoid" | "unknown";
  description: string;
  percentage?: string;
  isUnmatched?: boolean;
  commonUses?: string;
  evidenceLevel?: string;
  consumptionGuidance?: string;
}

export const normalizer = {
  normalizeText: (rawOCRText: string): NormalizedIngredient[] => {
    // Remove "Ingredients:" prefix case-insensitively
    let cleanText = rawOCRText.replace(/ingredients:\s*/i, "").trim();

    // Remove trailing period if present
    if (cleanText.endsWith(".")) {
      cleanText = cleanText.slice(0, -1);
    }

    // Split on commas only outside of parentheses
    const rawTokens = cleanText.split(/,(?![^(]*\))/g);

    return rawTokens.map((token) => {
      const trimmed = token.trim();
      let name = trimmed;
      let percentage: string | undefined = undefined;

      const percentMatch = trimmed.match(/\(([^)]+)\)/);
      if (percentMatch) {
        const content = percentMatch[1];
        if (content.includes("%")) {
          percentage = content;
          name = trimmed.replace(/\([^)]+\)/, "").trim();
        }
      }

      // Format to title case
      name = name
        .toLowerCase()
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      // Handle custom standardizations
      if (name.includes("Lecithin")) name = "Soy Lecithin";
      if (name.includes("Cocoa")) name = "Fat-Reduced Cocoa Powder";
      if (name.includes("Milk")) name = "Skimmed Milk Powder";

      return {
        raw: trimmed,
        name,
        percentage,
      };
    });
  },
};

// Helper to extract tokens, including parentheticals and percentages
function extractTokens(token: string): { name: string; percentage?: string }[] {
  const results: { name: string; percentage?: string }[] = [];

  // Extract parenthetical percentage (e.g. "Hazelnuts (13%)")
  let cleanToken = token.trim();
  let percentage: string | undefined = undefined;

  const percentMatch = cleanToken.match(/\(([^)]*%\s*)\)/);
  if (percentMatch) {
    percentage = percentMatch[1].trim();
    cleanToken = cleanToken.replace(/\([^)]*%\s*\)/, "").trim();
  }

  // Check if there are other parenthetical items (e.g. "Vegetable Oil (Palm Oil)" or "Wheat Flour (Wheat, Calcium)")
  const parenMatch = cleanToken.match(/^([^(]+)\(([^)]+)\)$/);
  if (parenMatch) {
    const parentName = parenMatch[1].trim();
    const childrenStr = parenMatch[2].trim();

    // Add parent if it's not a generic word like "containing" or "of which"
    if (parentName && !/containing|includes|of\s+which/i.test(parentName)) {
      results.push({ name: parentName, percentage });
    }

    // Split children by commas
    const children = childrenStr.split(/,/g);
    for (const child of children) {
      const childCleaned = child.trim();
      if (childCleaned) {
        results.push({ name: childCleaned });
      }
    }
  } else {
    // No parentheses or not matching parent(children) structure
    const simpleParts = cleanToken.split(/[()]/g);
    for (const part of simpleParts) {
      const partCleaned = part.trim();
      if (partCleaned) {
        results.push({ name: partCleaned, percentage });
      }
    }
  }

  return results;
}

// Clean String: Strip special characters, lower-case, and split by commas/parentheses
// Then perform database lookup fallback (direct match -> IngredientAlias -> fuzzy match)
export async function normalizeAndMatchIngredients(rawText: string): Promise<MatchedIngredient[]> {
  // Remove "Ingredients:" prefix case-insensitively
  let cleanText = rawText.replace(/ingredients:\s*/i, "").trim();

  // Remove trailing period if present
  if (cleanText.endsWith(".")) {
    cleanText = cleanText.slice(0, -1);
  }

  // First split by commas outside parentheses (to preserve parentheticals)
  const mainTokens = cleanText.split(/,(?![^(]*\))/g);
  
  const subTokens: { name: string; percentage?: string }[] = [];
  for (const token of mainTokens) {
    subTokens.push(...extractTokens(token));
  }

  const results: MatchedIngredient[] = [];
  const seenNames = new Set<string>();

  for (const subToken of subTokens) {
    const rawName = subToken.name;
    const percentage = subToken.percentage;

    // Clean String: Strip special characters except spaces and hyphens
    let cleaned = rawName.replace(/[^a-zA-Z0-9\s\-]/g, "");
    cleaned = cleaned.toLowerCase().trim();

    // Ignore if it's empty, or contains only numbers/percentages
    if (!cleaned || /^\d+(\.\d+)?%?$/.test(cleaned) || /^\d+\s*percent$/i.test(cleaned)) {
      continue;
    }

    // Run database lookup fallback (direct -> alias -> fuzzy/regex)
    const match = await findIngredient(cleaned);

    let id: string;
    let name: string;
    let rating: "safe" | "caution" | "avoid" | "unknown";
    let description: string;
    let isUnmatched = false;
    let commonUses: string | undefined = undefined;
    let evidenceLevel: string | undefined = undefined;
    let consumptionGuidance: string | undefined = undefined;

    if (match) {
      id = match.standardName;
      name = match.standardName;
      rating = match.rating;
      description = match.description;
      commonUses = match.commonUses;
      evidenceLevel = match.evidenceLevel;
      consumptionGuidance = match.consumptionGuidance;
    } else {
      // Unmatched ingredient
      // Convert to Title Case for display
      const titleCaseName = cleaned
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      id = titleCaseName;
      name = titleCaseName;
      rating = "unknown";
      description = "Ingredient profile not found in local database.";
      isUnmatched = true;
    }

    const dedupKey = name.toLowerCase();
    if (seenNames.has(dedupKey)) {
      // Merge percentage if needed
      const existing = results.find((r) => r.name.toLowerCase() === dedupKey);
      if (existing && percentage && !existing.percentage) {
        existing.percentage = percentage;
      }
      continue;
    }
    seenNames.add(dedupKey);

    results.push({
      id,
      name,
      rating,
      description,
      percentage,
      isUnmatched,
      commonUses,
      evidenceLevel,
      consumptionGuidance
    });
  }

  return results;
}
