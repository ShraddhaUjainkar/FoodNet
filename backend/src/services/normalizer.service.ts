import { findIngredient } from './catalog.service.js';

export interface NormalizedIngredient {
  raw: string;
  name: string;
  percentage?: string;
}

export interface MatchedIngredient {
  id: string;
  name: string;
  rating: 'safe' | 'caution' | 'avoid' | 'unknown';
  description: string;
  percentage?: string;
  isUnmatched?: boolean;
  commonUses?: string;
  evidenceLevel?: string;
  consumptionGuidance?: string;
}

export const normalizer = {
  normalizeText: (rawOCRText: string): NormalizedIngredient[] => {
    let cleanText = rawOCRText.replace(/ingredients:\s*/i, '').trim();

    if (cleanText.endsWith('.')) {
      cleanText = cleanText.slice(0, -1);
    }

    const rawTokens = cleanText.split(/,(?![^(]*\))/g);

    return rawTokens.map((token) => {
      const trimmed = token.trim();
      let name = trimmed;
      let percentage: string | undefined = undefined;

      const percentMatch = trimmed.match(/\(([^)]+)\)/);
      if (percentMatch) {
        const content = percentMatch[1];
        if (content.includes('%')) {
          percentage = content;
          name = trimmed.replace(/\([^)]+\)/, '').trim();
        }
      }

      name = name
        .toLowerCase()
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      if (name.includes('Lecithin')) name = 'Soy Lecithin';
      if (name.includes('Cocoa')) name = 'Fat-Reduced Cocoa Powder';
      if (name.includes('Milk')) name = 'Skimmed Milk Powder';

      return {
        raw: trimmed,
        name,
        percentage,
      };
    });
  },
};

function extractTokens(token: string): { name: string; percentage?: string }[] {
  const results: { name: string; percentage?: string }[] = [];
  let cleanToken = token.trim();
  let percentage: string | undefined = undefined;

  const percentMatch = cleanToken.match(/\(([^)]*%\s*)\)/);
  if (percentMatch) {
    percentage = percentMatch[1].trim();
    cleanToken = cleanToken.replace(/\([^)]*%\s*\)/, '').trim();
  }

  const parenMatch = cleanToken.match(/^([^(]+)\(([^)]+)\)$/);
  if (parenMatch) {
    const parentName = parenMatch[1].trim();
    const childrenStr = parenMatch[2].trim();

    if (parentName && !/containing|includes|of\s+which/i.test(parentName)) {
      results.push({ name: parentName, percentage });
    }

    const children = childrenStr.split(/,/g);
    for (const child of children) {
      const childCleaned = child.trim();
      if (childCleaned) {
        results.push({ name: childCleaned });
      }
    }
  } else {
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

export async function normalizeAndMatchIngredients(rawText: string): Promise<MatchedIngredient[]> {
  let cleanText = rawText;

  // Find where the ingredients statement starts
  const ingredientsStartMatch = cleanText.match(/ingredients:\s*/i);
  if (ingredientsStartMatch && ingredientsStartMatch.index !== undefined) {
    cleanText = cleanText.substring(ingredientsStartMatch.index + ingredientsStartMatch[0].length);
  }

  // Stop before any trailing sections like ALLERGEN INFORMATION, STORAGE INSTRUCTIONS, WARNINGS, etc.
  const sectionIndex = cleanText.search(/(allergen|storage|mfg|warning|nutrition|contains:|may contain)/i);
  if (sectionIndex !== -1) {
    cleanText = cleanText.substring(0, sectionIndex).trim();
  }

  if (cleanText.endsWith('.')) {
    cleanText = cleanText.slice(0, -1);
  }

  cleanText = cleanText.trim();

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

    let cleaned = rawName.replace(/[^a-zA-Z0-9\s\-]/g, '');
    cleaned = cleaned.toLowerCase().trim();

    if (!cleaned || /^\d+(\.\d+)?%?$/.test(cleaned) || /^\d+\s*percent$/i.test(cleaned)) {
      continue;
    }

    const match = await findIngredient(cleaned);

    let id: string;
    let name: string;
    let rating: 'safe' | 'caution' | 'avoid' | 'unknown';
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
      const titleCaseName = cleaned
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      id = titleCaseName;
      name = titleCaseName;
      rating = 'unknown';
      description = 'Ingredient profile not found in local database.';
      isUnmatched = true;
    }

    const dedupKey = name.toLowerCase();
    if (seenNames.has(dedupKey)) {
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
