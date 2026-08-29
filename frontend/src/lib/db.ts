// Simple in-memory database to store scans during runtime
// and centralized database catalogs for ingredients & additives.
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { getImageSignedUrl } from "@/lib/storage";
import { logger } from "@/lib/logger";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: pg.Pool | undefined;
};

export let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} else {
  if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  if (!globalForPrisma.prisma) {
    const adapter = new PrismaPg(globalForPrisma.pgPool);
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }
  prisma = globalForPrisma.prisma;
}

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

const globalForDb = globalThis as unknown as {
  scanDatabase: Map<string, ScanRecord>;
};

if (!globalForDb.scanDatabase) {
  globalForDb.scanDatabase = new Map<string, ScanRecord>();
}

export const scanDatabase = globalForDb.scanDatabase;

export const db = {
  saveScan: async (
    id: string,
    report: Omit<ScanRecord, "id">,
  ): Promise<ScanRecord> => {
    const record = { id, ...report } as ScanRecord;

    // If an image field appears to be a storage key (not a data URL and not an http link),
    // keep the key in `imageKey` and attempt to generate a signed URL into `image` so clients can access it.
    try {
      if (
        record.image &&
        !record.image.startsWith("data:") &&
        !/^https?:\/\//i.test(record.image)
      ) {
        // save original key separately
        record.imageKey = record.image;
        const signed = await getImageSignedUrl(record.image, 60 * 60);
        if (signed) record.image = signed;
      }
    } catch (e) {
      // ignore storage errors — fall back to saving the key only
      // leave imageKey populated if available
    }

    // Persist to Prisma if available
    try {
      await prisma.scan.upsert({
        where: { id },
        create: {
          id,
          imageUrl: record.image || null,
          score: record.score ?? null,
          grade: record.grade || null,
          summary: record.summary || null,
          ingredients: record.ingredients as any,
          additives: record.additives as any,
          allergens: record.allergens as any,
          alternatives: record.alternatives as any,
        },
        update: {
          imageUrl: record.image || null,
          score: record.score ?? null,
          grade: record.grade || null,
          summary: record.summary || null,
          ingredients: record.ingredients as any,
          additives: record.additives as any,
          allergens: record.allergens as any,
          alternatives: record.alternatives as any,
        },
      });
    } catch (e) {
      // fail gracefully — still keep in-memory
      logger.error({ err: e, scanId: id }, "Failed to save scan to database");
    }

    scanDatabase.set(id, record);
    logger.info(
      { scanId: id, imageUrl: record.image },
      "Scan saved successfully",
    );
    return record;
  },
  getScan: async (id: string): Promise<ScanRecord | null> => {
    const mem = scanDatabase.get(id);
    if (mem) return mem;

    try {
      const p = await prisma.scan.findUnique({ where: { id } });
      if (!p) return null;
      const mapped: ScanRecord = {
        id: p.id,
        name: p.id,
        brand: "",
        score: p.score ?? 0,
        grade: (p.grade as any) || "C",
        summary: p.summary || "",
        allergens: (p.allergens as any) || [],
        ingredients: (p.ingredients as any) || [],
        additives: (p.additives as any) || [],
        nutrition: [],
        alternatives: (p.alternatives as any) || [],
        emoji: "",
        gradient: "",
        image: p.imageUrl || undefined,
      };
      // cache in-memory for quick access
      scanDatabase.set(id, mapped);
      return mapped;
    } catch (e) {
      return null;
    }
  },
  createAuditLog: async (params: {
    eventType: string;
    targetKey?: string | null;
    scanId?: string | null;
    userId?: string | null;
    details?: any;
  }) => {
    try {
      await prisma.auditLog.create({ data: { ...params } as any });
    } catch (e) {
      // ignore — best-effort audit
    }
  },
};

// Database catalogs
export const INGREDIENT_CATALOG: Record<
  string,
  {
    rating: "safe" | "caution" | "avoid";
    description: string;
    commonUses: string;
    evidenceLevel: "strong" | "moderate" | "limited";
    consumptionGuidance: string;
  }
> = {
  Sugar: {
    rating: "avoid",
    description:
      "Refined sugar. High glycemic index, can cause weight gain, metabolic stress, and insulin resistance.",
    commonUses: "Sweetener, preservative",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Limit added sugars to less than 25g (6 teaspoons) per day per WHO guidelines.",
  },
  "Palm Oil": {
    rating: "avoid",
    description:
      "Saturated vegetable fat. Elevates LDL cholesterol levels and is linked to environmental damage.",
    commonUses: "Texturizer, cooking oil",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Consume sparingly. High in saturated fats; recommendation is to limit saturated fats to <10% of daily calories.",
  },
  Potatoes: {
    rating: "safe",
    description: "Natural root vegetable, rich in potassium and carbohydrates.",
    commonUses: "Whole food base, starch source",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Safe for regular intake. Great whole food source, but keep portions moderate if managing glucose levels.",
  },
  "Refined Sunflower Oil": {
    rating: "avoid",
    description:
      "Refined seed oil. High in omega-6 fatty acids, which can promote chronic inflammation if consumed in excess.",
    commonUses: "Frying oil, emulsifier carrier",
    evidenceLevel: "moderate",
    consumptionGuidance:
      "Limit intake. High in Omega-6; balance with Omega-3 sources to avoid promoting inflammation.",
  },
  "Bbq Seasoning Powder": {
    rating: "caution",
    description:
      "Processed spice blend, typically contains high sodium and small amounts of sugar.",
    commonUses: "Flavoring agent",
    evidenceLevel: "moderate",
    consumptionGuidance:
      "Use in moderation due to processed sodium and flavor enhancers.",
  },
  Salt: {
    rating: "avoid",
    description:
      "Refined sodium chloride. High sodium intake elevates blood pressure and cardiovascular risks.",
    commonUses: "Flavor enhancer, preservative",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Limit daily sodium intake to less than 2,000 mg (about 1 teaspoon of salt) per WHO guidelines.",
  },
  "Monosodium Glutamate": {
    rating: "avoid",
    description:
      "Excitotoxin flavor enhancer (E621). Can trigger headaches or sensitivity in some people.",
    commonUses: "Flavor enhancer (MSG)",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Avoid if sensitive. Generally safe in small regulatory doses, but limit processed food intake.",
  },
  Maltodextrin: {
    rating: "caution",
    description:
      "Processed food starch binder. Glycemic index is extremely high, higher than table sugar.",
    commonUses: "Thickener, filler, binder",
    evidenceLevel: "moderate",
    consumptionGuidance:
      "Consume sparingly. High glycemic index; keep intake low, especially for diabetics.",
  },
  "Carbonated Water": {
    rating: "safe",
    description:
      "Purified water charged with carbon dioxide. Harmless base for drinks.",
    commonUses: "Beverage base",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Safe for daily consumption as a refreshing water alternative.",
  },
  "High Fructose Corn Syrup": {
    rating: "avoid",
    description:
      "Highly refined corn sweetener. Linked to liver fat accumulation, metabolic syndrome, and obesity.",
    commonUses: "Sweetener",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Avoid or severely limit. Strongly linked to metabolic strain and weight gain.",
  },
  "Phosphoric Acid": {
    rating: "avoid",
    description:
      "Acidifying chemical. Erodes tooth enamel and depletes bone calcium absorption.",
    commonUses: "Acidulant, flavoring",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Limit consumption. Can affect calcium levels and erode tooth enamel over time.",
  },
  "Caramel Color": {
    rating: "avoid",
    description:
      "Synthetic brown coloring (E150d) made with ammonium compounds. Possible health concern in high doses.",
    commonUses: "Coloring agent",
    evidenceLevel: "moderate",
    consumptionGuidance:
      "Limit consumption. Artificial coloring with process-byproduct concerns in large doses.",
  },
  Caffeine: {
    rating: "caution",
    description:
      "Central system stimulant. Can cause jitters, sleep cycle disruptions, and heart palpitations in excess.",
    commonUses: "Stimulant, flavoring",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Moderate intake is safe (up to 400mg per day for healthy adults). Avoid close to bedtime.",
  },
  "Natural Flavorings": {
    rating: "safe",
    description:
      "Extracted from natural sources like fruits, herbs, or botanicals.",
    commonUses: "Flavor enhancer",
    evidenceLevel: "moderate",
    consumptionGuidance: "Safe to consume in standard formulation levels.",
  },
  "Sodium Benzoate": {
    rating: "caution",
    description:
      "Chemical preservative (E211). Prevents microbial growth, but can form benzene in acidic conditions.",
    commonUses: "Preservative",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Safe in regulated food doses. Limit consumption in products containing vitamin C to prevent benzene formation.",
  },
  Hazelnuts: {
    rating: "safe",
    description:
      "Natural tree nut. Excellent source of healthy monounsaturated fats, fiber, and vitamin E.",
    commonUses: "Whole food ingredient, flavor",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Safe for daily intake. Recommended portion is a handful (approx. 30g) for heart-healthy fats.",
  },
  "Skimmed Milk Powder": {
    rating: "safe",
    description:
      "Dehydrated skim milk, source of calcium and proteins. Contains lactose.",
    commonUses: "Protein/calcium source, binder",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Safe to consume daily as a source of calcium and protein, unless lactose intolerant.",
  },
  "Fat-Reduced Cocoa Powder": {
    rating: "safe",
    description: "Rich in flavonoids and essential mineral antioxidants.",
    commonUses: "Flavoring, antioxidant source",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Safe for daily consumption. High in antioxidants; prefer dark, low-sugar options.",
  },
  "Soy Lecithin": {
    rating: "caution",
    description:
      "Processed emulsifier (E322). Generally safe, but typically derived from GMO soybeans.",
    commonUses: "Emulsifier",
    evidenceLevel: "strong",
    consumptionGuidance: "Safe in typical small emulsifier amounts.",
  },
  Vanillin: {
    rating: "caution",
    description:
      "Synthetic vanilla flavoring agent. Chemical alternative to natural vanilla extract.",
    commonUses: "Flavoring agent",
    evidenceLevel: "moderate",
    consumptionGuidance: "Safe in typical small flavoring amounts.",
  },
  Aspartame: {
    rating: "avoid",
    description:
      "Artificial sweetener. High consumption has potential links to gut dysbiosis and metabolic changes.",
    commonUses: "Sugar substitute",
    evidenceLevel: "moderate",
    consumptionGuidance:
      "Limit intake. Maintain daily consumption well below the ADI of 40 mg/kg body weight.",
  },
  "Acesulfame Potassium": {
    rating: "avoid",
    description:
      "Artificial sweetener, often paired with aspartame or sucralose. Subject to ongoing safety reviews.",
    commonUses: "Sugar substitute",
    evidenceLevel: "moderate",
    consumptionGuidance:
      "Limit intake. Maintain daily consumption below the ADI of 15 mg/kg body weight.",
  },
  Sucralose: {
    rating: "caution",
    description:
      "Chlorinated artificial sweetener. Can alter gut microbiome composition.",
    commonUses: "Sugar substitute",
    evidenceLevel: "moderate",
    consumptionGuidance:
      "Limit intake. Safe in moderate amounts but may impact gut microflora if consumed in excess.",
  },
  "Xanthan Gum": {
    rating: "caution",
    description:
      "Thickener and stabilizer. May cause mild digestive bloating or gas in sensitive individuals.",
    commonUses: "Emulsifier, thickener",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Safe for most. Limit to moderate amounts as high doses can cause digestive bloating.",
  },
  "Guar Gum": {
    rating: "caution",
    description:
      "Natural seed extract thickener. Generally safe, but can cause gas or digestive discomfort in high doses.",
    commonUses: "Thickener, stabilizer",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Safe for most. Limit to moderate amounts; high intake can cause mild digestive issues.",
  },
  Carrageenan: {
    rating: "avoid",
    description:
      "Seaweed-derived stabilizer. Linked to digestive tract inflammation and ulceration in animal models.",
    commonUses: "Thickener, emulsifier",
    evidenceLevel: "moderate",
    consumptionGuidance:
      "Consume sparingly. Linked to gut irritation; avoid if you have inflammatory bowel disease (IBD).",
  },
  "Citric Acid": {
    rating: "safe",
    description:
      "Natural preservative and sour flavoring extracted from citrus fruits or manufactured via fermentation.",
    commonUses: "Acidulant, preservative",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Safe for regular consumption. Gentle acidulant, though excessive intake can affect tooth enamel.",
  },
  "Ascorbic Acid": {
    rating: "safe",
    description: "Vitamin C. Acts as a natural antioxidant and preservative.",
    commonUses: "Antioxidant, nutrient",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Safe for daily intake. Helps meet the recommended daily intake of Vitamin C (75-90mg).",
  },
  "Potassium Sorbate": {
    rating: "caution",
    description:
      "Chemical preservative used to prevent mold and yeast growth. Low toxicity but can trigger skin or respiratory sensitivity.",
    commonUses: "Preservative",
    evidenceLevel: "strong",
    consumptionGuidance: "Safe in standard small preservative doses.",
  },
  BHA: {
    rating: "avoid",
    description:
      "Butylated hydroxyanisole. Synthetic antioxidant used to prevent rancidity. Classified as a possible human carcinogen.",
    commonUses: "Preservative, antioxidant",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Avoid. Known endocrine disruptor; seek cleaner preservative-free food choices.",
  },
  BHT: {
    rating: "avoid",
    description:
      "Butylated hydroxytoluene. Synthetic antioxidant. Can cause endocrine disruption and bioaccumulation concerns.",
    commonUses: "Preservative, antioxidant",
    evidenceLevel: "moderate",
    consumptionGuidance:
      "Avoid. Seek products free from synthetic antioxidants where possible.",
  },
  "Titanium Dioxide": {
    rating: "avoid",
    description:
      "White coloring agent. Banned in the EU due to concerns regarding genotoxicity and particle accumulation.",
    commonUses: "Food colorant",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Avoid. Banned in the EU due to accumulation and genotoxicity concerns.",
  },
  "Red 40": {
    rating: "avoid",
    description:
      "Allura Red AC. Synthetic azo dye linked to hyperactivity in children and hypersensitivity reactions.",
    commonUses: "Artificial color",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Avoid. Especially limit in children's diets due to links to hyperactivity and sensitivity.",
  },
  "Yellow 5": {
    rating: "avoid",
    description:
      "Tartrazine. Synthetic food coloring linked to allergic reactions and asthma triggers.",
    commonUses: "Artificial color",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Avoid. Can trigger allergic reactions or hypersensitivity; limit exposure.",
  },
  "Yellow 6": {
    rating: "avoid",
    description:
      "Sunset Yellow FCF. Synthetic petroleum-derived dye with potential links to hyperactivity and allergies.",
    commonUses: "Artificial color",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Avoid. Azo dye linked to skin allergies and hyperactivity; limit consumption.",
  },
  "Blue 1": {
    rating: "caution",
    description:
      "Brilliant Blue FCF. Synthetic dye. Low risk but can cross the blood-brain barrier in extremely high doses.",
    commonUses: "Artificial color",
    evidenceLevel: "moderate",
    consumptionGuidance:
      "Limit intake. Synthetic colorant; safe in small doses, but cleaner alternatives are preferred.",
  },
  "Whey Protein": {
    rating: "safe",
    description:
      "Concentrated milk protein. Excellent source of amino acids for muscle building.",
    commonUses: "Protein supplement",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Safe for daily consumption. Excellent for meeting active protein needs (typically 1.2-2.0g/kg body weight).",
  },
  "Soy Protein Isolate": {
    rating: "caution",
    description:
      "Highly processed plant protein. Good protein source, but heavily refined and often GMO-sourced.",
    commonUses: "Protein supplement, texturizer",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Consume in moderation as part of a balanced diet; choose organic/non-GMO when possible.",
  },
  "Modified Corn Starch": {
    rating: "caution",
    description:
      "Chemically modified food starch. High glycemic load and heavily processed.",
    commonUses: "Thickener, stabilizer",
    evidenceLevel: "moderate",
    consumptionGuidance:
      "Limit consumption. Heavily processed carbohydrate binder with a high glycemic index.",
  },
  "Coconut Oil": {
    rating: "safe",
    description:
      "Plant-based fat rich in medium-chain triglycerides (MCTs). High in saturated fat but stable for cooking.",
    commonUses: "Cooking fat, texturizer",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Consume in moderation due to high saturated fat content (over 80%). Use stable oils for frying.",
  },
  Dextrose: {
    rating: "avoid",
    description:
      "Simple sugar (glucose) derived from starch. Extremely high glycemic index.",
    commonUses: "Sweetener, binder",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Limit intake. Rapidly absorbing simple sugar; keep daily portions low.",
  },
  Erythritol: {
    rating: "caution",
    description:
      "Sugar alcohol. Generally low calorie, but high consumption can cause gas, bloating, or recent cardiovascular concerns in high doses.",
    commonUses: "Sugar substitute",
    evidenceLevel: "moderate",
    consumptionGuidance:
      "Limit consumption. Safe in moderate amounts but high doses can cause digestive bloating.",
  },
  "Stevia Extract": {
    rating: "safe",
    description:
      "Natural zero-calorie sweetener derived from Stevia rebaudiana plant leaves.",
    commonUses: "Sugar substitute",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Safe sugar substitute. Keep daily intake below 4 mg/kg body weight.",
  },
  "Monk Fruit Extract": {
    rating: "safe",
    description:
      "Natural zero-calorie sweetener containing sweet mogrosides. Safe and does not spike blood sugar.",
    commonUses: "Sugar substitute",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Safe sugar substitute. Excellent natural zero-calorie sweetener for daily use.",
  },
  Honey: {
    rating: "safe",
    description:
      "Natural unrefined sweetener containing antioxidants and trace enzymes, though high in natural sugars.",
    commonUses: "Sweetener",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Consume in moderation. Healthy natural sweetener, but still high in fructose and glucose.",
  },
  Maltitol: {
    rating: "caution",
    description:
      "Sugar alcohol with a significant glycemic impact. Known to cause laxative effects and bloating.",
    commonUses: "Sweetener",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Consume in moderation. Can cause laxative effects or gas if consumed in larger amounts.",
  },
  Glycerin: {
    rating: "safe",
    description:
      "Sweet humectant. Used to maintain moisture in foods. Safe and low glycemic impact.",
    commonUses: "Moisturizer, humectant",
    evidenceLevel: "strong",
    consumptionGuidance: "Safe in typical small dietary amounts.",
  },
  Soybeans: {
    rating: "safe",
    description:
      "Whole legume, rich in plant protein, fiber, and phytoestrogens.",
    commonUses: "Whole food base",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Safe for regular consumption as an excellent source of plant protein and fiber.",
  },
  "Wheat Flour": {
    rating: "safe",
    description:
      "Ground cereal grain containing gluten. Stable energy source but contains gluten allergens.",
    commonUses: "Baking flour, binder",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Safe for general consumption unless managing celiac disease or wheat allergies.",
  },
  "Yeast Extract": {
    rating: "caution",
    description:
      "Flavor enhancer containing natural glutamates. Often used as a clean-label MSG alternative.",
    commonUses: "Flavor enhancer",
    evidenceLevel: "strong",
    consumptionGuidance:
      "Safe in moderate flavoring amounts. High in natural glutamates.",
  },
};

export const ADDITIVES_CATALOG: Record<
  string,
  {
    code: string;
    name: string;
    rating: "safe" | "caution" | "avoid";
    purpose: string;
    description: string;
  }
> = {
  "soy lecithin": {
    code: "E322",
    name: "Lecithins",
    rating: "safe",
    purpose: "Emulsifier",
    description:
      "Generally safe. Natural fatty substance used to bind water and oil phases. No negative health impacts shown in standard dietary amounts.",
  },
  "phosphoric acid": {
    code: "E338",
    name: "Phosphoric Acid",
    rating: "avoid",
    purpose: "Acidity Regulator",
    description:
      "Linked to decreased bone density and kidney stones when consumed frequently. Acidifies oral environment below safe 5.5 pH.",
  },
  "caramel color": {
    code: "E150d",
    name: "Sulfite Ammonia Caramel",
    rating: "avoid",
    purpose: "Food Colorant",
    description:
      "Caramel color processed under ammonia conditions. Designated as a possible carcinogen in high doses by some health advisory groups.",
  },
  "sodium benzoate": {
    code: "E211",
    name: "Sodium Benzoate",
    rating: "caution",
    purpose: "Preservative",
    description:
      "Inhibits microbial growth. If combined with ascorbic acid (Vitamin C), it can form trace amounts of benzene, a known carcinogen.",
  },
  "monosodium glutamate": {
    code: "E621",
    name: "Monosodium Glutamate",
    rating: "avoid",
    purpose: "Flavor Enhancer",
    description:
      "Excitotoxin that artificially stimulates taste buds. Banned in infant foods due to potential neurological sensitivity in early development.",
  },
};

export const INGREDIENT_ALIASES: Record<string, string> = {
  "cane sugar": "Sugar",
  "added sugars": "Sugar",
  "refined sugar": "Sugar",
  "white sugar": "Sugar",
  "brown sugar": "Sugar",
  sucrose: "Sugar",
  "palm fat": "Palm Oil",
  "vegetable fat palm": "Palm Oil",
  "fractionated palm oil": "Palm Oil",
  "sunflower oil": "Refined Sunflower Oil",
  "barbecue seasoning": "Bbq Seasoning Powder",
  "sodium chloride": "Salt",
  msg: "Monosodium Glutamate",
  e621: "Monosodium Glutamate",
  "corn syrup": "High Fructose Corn Syrup",
  e338: "Phosphoric Acid",
  e150d: "Caramel Color",
  "sodium benzoate e211": "Sodium Benzoate",
  e211: "Sodium Benzoate",
  hazelnut: "Hazelnuts",
  "milk powder": "Skimmed Milk Powder",
  "skim milk powder": "Skimmed Milk Powder",
  "cocoa powder": "Fat-Reduced Cocoa Powder",
  lecithin: "Soy Lecithin",
  "soy lecithin e322": "Soy Lecithin",
  e322: "Soy Lecithin",
  "artificial vanillin": "Vanillin",
};

// String similarity helpers
const levenshteinCache = new Map<string, number>();

export function getLevenshteinDistance(a: string, b: string): number {
  // Use a symmetric cache key to avoid duplicate entries (order-independent)
  const key = a < b ? `${a}|${b}` : `${b}|${a}`;
  const cached = levenshteinCache.get(key);
  if (cached !== undefined) return cached;

  const la = a.length;
  const lb = b.length;

  if (la === 0) {
    levenshteinCache.set(key, lb);
    return lb;
  }
  if (lb === 0) {
    levenshteinCache.set(key, la);
    return la;
  }

  // Use a compact DP row-based algorithm to reduce allocations
  const prev = new Array(la + 1);
  const curr = new Array(la + 1);

  for (let i = 0; i <= la; i++) prev[i] = i;

  for (let j = 1; j <= lb; j++) {
    curr[0] = j;
    const bj = b.charAt(j - 1);
    for (let i = 1; i <= la; i++) {
      const cost = a.charAt(i - 1) === bj ? 0 : 1;
      const insertion = curr[i - 1] + 1;
      const deletion = prev[i] + 1;
      const substitution = prev[i - 1] + cost;
      curr[i] = Math.min(insertion, deletion, substitution);
    }
    // swap prev and curr
    for (let k = 0; k <= la; k++) prev[k] = curr[k];
  }

  const distance = prev[la];
  levenshteinCache.set(key, distance);
  return distance;
}

export function getSimilarity(a: string, b: string): number {
  const distance = getLevenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1.0;
  return 1.0 - distance / maxLength;
}

function mapConcernToRating(
  concern: string | null,
): "safe" | "caution" | "avoid" {
  switch (concern) {
    case "low":
      return "safe";
    case "moderate":
      return "caution";
    case "high":
      return "avoid";
    default:
      return "safe";
  }
}

// Core database search matching engine
export async function findIngredient(name: string): Promise<{
  standardName: string;
  rating: "safe" | "caution" | "avoid";
  description: string;
  commonUses: string;
  evidenceLevel: string;
  consumptionGuidance: string;
} | null> {
  const cleanName = name.toLowerCase().trim();

  // 1. Direct match (case-insensitive) against standard names
  const directMatch = await prisma.ingredient.findUnique({
    where: { normalizedName: cleanName },
  });
  if (directMatch) {
    return {
      standardName: directMatch.name,
      rating: mapConcernToRating(directMatch.concernLevel),
      description: directMatch.description || "",
      commonUses: directMatch.commonUses || "",
      evidenceLevel: directMatch.evidenceLevel || "",
      consumptionGuidance: directMatch.consumptionGuidance || "",
    };
  }

  // 2. Direct match against aliases
  const aliasMatch = await prisma.ingredientAlias.findUnique({
    where: { alias: cleanName },
    include: { ingredient: true },
  });
  if (aliasMatch) {
    return {
      standardName: aliasMatch.ingredient.name,
      rating: mapConcernToRating(aliasMatch.ingredient.concernLevel),
      description: aliasMatch.ingredient.description || "",
      commonUses: aliasMatch.ingredient.commonUses || "",
      evidenceLevel: aliasMatch.ingredient.evidenceLevel || "",
      consumptionGuidance: aliasMatch.ingredient.consumptionGuidance || "",
    };
  }

  // 3. Substring / fuzzy match fallback: retrieve all ingredients and aliases
  // Since the DB has ~50-100 ingredients, this is extremely fast and lets us do the same
  // complex substring/regex and fuzzy similarity logic in-memory.
  const allIngredients = await prisma.ingredient.findMany();
  const allAliases = await prisma.ingredientAlias.findMany({
    include: { ingredient: true },
  });

  // 3a. Substring / regex fallback: check if cleanName contains alias or standard name, or vice versa
  for (const aliasItem of allAliases) {
    const aliasKey = aliasItem.alias;
    if (cleanName.includes(aliasKey) || aliasKey.includes(cleanName)) {
      return {
        standardName: aliasItem.ingredient.name,
        rating: mapConcernToRating(aliasItem.ingredient.concernLevel),
        description: aliasItem.ingredient.description || "",
        commonUses: aliasItem.ingredient.commonUses || "",
        evidenceLevel: aliasItem.ingredient.evidenceLevel || "",
        consumptionGuidance: aliasItem.ingredient.consumptionGuidance || "",
      };
    }
  }

  for (const ing of allIngredients) {
    const stdLower = ing.normalizedName;
    if (cleanName.includes(stdLower) || stdLower.includes(cleanName)) {
      return {
        standardName: ing.name,
        rating: mapConcernToRating(ing.concernLevel),
        description: ing.description || "",
        commonUses: ing.commonUses || "",
        evidenceLevel: ing.evidenceLevel || "",
        consumptionGuidance: ing.consumptionGuidance || "",
      };
    }
  }

  // 4. Fuzzy Levenshtein match (match standard name or alias with > 78% similarity)
  let bestMatch: (typeof allIngredients)[number] | null = null;
  let bestScore = 0;

  // Apply quick candidate filters before doing expensive similarity checks.
  for (const ing of allIngredients) {
    const candidate = ing.normalizedName;
    // Skip if length differs wildly
    if (Math.abs(cleanName.length - candidate.length) > 6) continue;
    // If both are longer than 3 chars, require the same starting letter for a quick filter
    if (
      cleanName.length > 3 &&
      candidate.length > 3 &&
      cleanName[0] !== candidate[0]
    )
      continue;

    const score = getSimilarity(cleanName, candidate);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = ing;
      // Short-circuit for very high similarity
      if (bestScore >= 0.95) break;
    }
  }

  if (bestScore < 0.95) {
    for (const aliasItem of allAliases) {
      const candidate = aliasItem.alias;
      if (Math.abs(cleanName.length - candidate.length) > 6) continue;
      if (
        cleanName.length > 3 &&
        candidate.length > 3 &&
        cleanName[0] !== candidate[0]
      )
        continue;

      const score = getSimilarity(cleanName, candidate);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = aliasItem.ingredient;
        if (bestScore >= 0.95) break;
      }
    }
  }

  if (bestScore >= 0.78 && bestMatch) {
    return {
      standardName: bestMatch.name,
      rating: mapConcernToRating(bestMatch.concernLevel),
      description: bestMatch.description || "",
      commonUses: bestMatch.commonUses || "",
      evidenceLevel: bestMatch.evidenceLevel || "",
      consumptionGuidance: bestMatch.consumptionGuidance || "",
    };
  }

  return null;
}
