export interface ScanRecord {
  id: string;
  name: string;
  brand: string;
  score: number;
  grade: "A" | "B" | "C" | "D" | "E";
  summary: string;
  allergens: string[];
  ingredients: {
    name: string;
    rating: "safe" | "caution" | "avoid" | "unknown";
    description: string;
    percentage?: string;
    commonUses?: string;
    evidenceLevel?: string;
    consumptionGuidance?: string;
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
  image?: string;
  imageKey?: string; // original Cloudinary public ID
}
export let prisma: any = null;
