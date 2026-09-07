import { prisma } from '../config/database.js';
import { getEmbedding } from '../services/embedding.service.js';

interface ScientificDoc {
  id: string;
  ingredientMatchName?: string; // Links directly to an Ingredient in the DB
  title: string;
  category: string;
  source: string;
  sourceUrl: string;
  evidenceLevel: 'high' | 'moderate';
  content: string;
}

const SCIENTIFIC_KNOWLEDGE_BASE: ScientificDoc[] = [
  {
    id: 'doc_e150d',
    ingredientMatchName: 'caramel color',
    title: 'EFSA Scientific Opinion on Caramel Colour IV (E 150d)',
    category: 'color',
    source: 'EFSA Journal 2011;9(3):2004',
    sourceUrl: 'https://www.efsa.europa.eu/en/efsajournal/pub/2004',
    evidenceLevel: 'high',
    content:
      'Caramel colour E 150d (sulphite ammonia caramel) is widely used in colas and gravies. The manufacturing process can form 4-methylimidazole (4-MEI) as a byproduct. EFSA established an Acceptable Daily Intake (ADI) of 300 mg/kg body weight per day for caramels, noting that exposure to 4-MEI must be monitored due to potential toxicological and carcinogenic concerns in rodent bioassays.',
  },
  {
    id: 'doc_e211',
    ingredientMatchName: 'sodium benzoate',
    title: 'FDA & EFSA Safety Review on Sodium Benzoate and Benzene Formation',
    category: 'preservative',
    source: 'FDA Center for Food Safety and Applied Nutrition (CFSAN)',
    sourceUrl:
      'https://www.fda.gov/food/chemicals/questions-and-answers-benzene-food',
    evidenceLevel: 'high',
    content:
      'Sodium benzoate (E211) is a common antimicrobial preservative in acidic beverages. When combined with ascorbic acid (vitamin C) or erythorbic acid in the presence of heat and UV light, trace amounts of benzene (a known human carcinogen) can form. Regulatory limits recommend restricting combined use in soft drink formulations.',
  },
  {
    id: 'doc_e250',
    title:
      'IARC Evaluation of Sodium Nitrite and Processed Meat Carcinogenicity',
    category: 'preservative',
    source: 'IARC Monographs on the Evaluation of Carcinogenic Risks Vol 114',
    sourceUrl:
      'https://www.iarc.who.int/news-events/iarc-monographs-evaluate-consumption-of-red-meat-and-processed-meat/',
    evidenceLevel: 'high',
    content:
      'Sodium nitrite (E250) is used for curing meats and preventing Clostridium botulinum. Under high heat cooking (e.g. frying bacon) and in the acidic stomach environment, nitrites react with amines to form N-nitroso compounds (nitrosamines), which are potent carcinogens classified as Group 1 carcinogenic to humans.',
  },
  {
    id: 'doc_e951',
    ingredientMatchName: 'aspartame',
    title: 'WHO/IARC Hazard and Risk Assessment of Aspartame',
    category: 'sweetener',
    source: 'WHO/IARC/JECFA Joint Statement July 2023',
    sourceUrl:
      'https://www.who.int/news/item/14-07-2023-aspartame-hazard-and-risk-assessment-results-released',
    evidenceLevel: 'high',
    content:
      'Aspartame (E951) was classified by IARC as possibly carcinogenic to humans (Group 2B) citing limited evidence for hepatocellular carcinoma in humans. JECFA reaffirmed an acceptable daily intake (ADI) of 0-40 mg/kg body weight, indicating that typical moderate consumption remains within acceptable safety margins but excessive intake is cautioned.',
  },
  {
    id: 'doc_e338',
    ingredientMatchName: 'phosphoric acid',
    title:
      'EFSA Scientific Opinion on the Re-evaluation of Phosphoric Acid (E 338)',
    category: 'acidulant',
    source: 'EFSA Journal 2019;17(6):5674',
    sourceUrl: 'https://www.efsa.europa.eu/en/efsajournal/pub/5674',
    evidenceLevel: 'high',
    content:
      'Phosphoric acid (E338) is an acidifier commonly found in cola beverages. High dietary phosphorus intake, especially unbuffered inorganic phosphate additives, alters the calcium-to-phosphorus ratio, contributing to accelerated bone resorption, reduced bone mineral density, and increased risk of vascular calcification in individuals with renal vulnerability.',
  },
  {
    id: 'doc_e171',
    ingredientMatchName: 'titanium dioxide',
    title:
      'EFSA Assessment: Titanium Dioxide (E 171) No Longer Considered Safe',
    category: 'color',
    source: 'EFSA Journal 2021;19(5):6585',
    sourceUrl: 'https://www.efsa.europa.eu/en/efsajournal/pub/6585',
    evidenceLevel: 'high',
    content:
      'Titanium dioxide (E171) consists of food-grade particles including a significant nanoparticle fraction. Following comprehensive review of oral toxicity, EFSA concluded that concerns regarding genotoxicity could not be ruled out after absorption into intestinal tissues. Consequently, E171 was banned as a food additive across the European Union.',
  },
  {
    id: 'doc_e102_e110_e129',
    ingredientMatchName: 'red 40',
    title: 'The Southampton Study: Synthetic Food Dyes and Child Hyperactivity',
    category: 'color',
    source: 'The Lancet Vol 370, Issue 9598; EFSA Panel Review',
    sourceUrl:
      'https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(07)61306-3/fulltext',
    evidenceLevel: 'moderate',
    content:
      'Artificial azo food dyes including Tartrazine (E102), Sunset Yellow (E110), and Allura Red (E129) were clinically evaluated in a randomized double-blind placebo-controlled trial. Diets high in these artificial food colorings paired with sodium benzoate demonstrated a statistically significant increase in hyperactive behavior in 3-year-old and 8-to-9-year-old children.',
  },
  {
    id: 'doc_hfcs',
    ingredientMatchName: 'high fructose corn syrup',
    title: 'Metabolic Effects of High Fructose Corn Syrup (HFCS) vs Sucrose',
    category: 'sweetener',
    source: 'American Journal of Clinical Nutrition / Endocrine Reviews',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/24723079/',
    evidenceLevel: 'high',
    content:
      'High Fructose Corn Syrup contains free unbound monosaccharides (fructose and glucose). Fructose is metabolized predominantly in hepatocytes through fructokinase, bypassing insulin regulation. High consumption promotes hepatic de novo lipogenesis, increases intrahepatic triglyceride accumulation, and accelerates non-alcoholic fatty liver disease (NAFLD) and insulin resistance.',
  },
  {
    id: 'doc_palmoil',
    ingredientMatchName: 'palm oil',
    title: 'Cardiovascular Risk and Contaminants in Refined Palm Oil',
    category: 'fat',
    source: 'WHO Bulletin / EFSA Contaminants in the Food Chain',
    sourceUrl: 'https://www.efsa.europa.eu/en/efsajournal/pub/4426',
    evidenceLevel: 'high',
    content:
      'Palm oil contains approximately 44% palmitic acid (saturated fat), which significantly raises LDL cholesterol when consumed in large amounts. Additionally, refining palm oil at high temperatures (above 200°C) produces processing contaminants: 3-MCPD and glycidyl fatty acid esters, which have established organ toxicity and carcinogenic potential according to EFSA evaluations.',
  },
  {
    id: 'doc_emulsifiers_cmc_p80',
    title: 'Dietary Emulsifiers Impact on Gut Microbiota and Mucosal Barrier',
    category: 'emulsifier',
    source: 'Nature 519, 92-96 (2015)',
    sourceUrl: 'https://www.nature.com/articles/nature14232',
    evidenceLevel: 'moderate',
    content:
      'Common industrial emulsifiers including Carboxymethylcellulose (E466) and Polysorbate 80 (E433) alter human and rodent gut microbiota composition. These compounds reduce mucus layer thickness, bringing bacteria into direct contact with the epithelial lining, inducing low-grade intestinal inflammation, and exacerbating colitis and metabolic syndrome.',
  },
  {
    id: 'doc_maltodextrin',
    ingredientMatchName: 'maltodextrin',
    title: 'Glycemic Index and Intestinal Effects of Food-Grade Maltodextrin',
    category: 'carbohydrate',
    source: 'Gut Microbes Journal / PLoS ONE',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/25738413/',
    evidenceLevel: 'moderate',
    content:
      'Maltodextrin is a hydrolyzed starch polysaccharide with a very high glycemic index ranging from 85 to 105, higher than standard table sugar (sucrose). Consumption causes rapid postprandial glucose spikes. Research also demonstrates that dietary maltodextrin enhances Escherichia coli biofilm formation in intestinal mucosa, impairing cellular antibacterial defenses.',
  },
  {
    id: 'doc_e407',
    ingredientMatchName: 'carrageenan',
    title: 'Carrageenan (E 407): Gut Inflammation and Poligeenan Distinction',
    category: 'thickener',
    source:
      'EFSA Re-evaluation of Carrageenan; Environmental Health Perspectives',
    sourceUrl: 'https://www.efsa.europa.eu/en/efsajournal/pub/5238',
    evidenceLevel: 'moderate',
    content:
      'Carrageenan is an extraction from red seaweed used as a gelling agent. While food-grade carrageenan has higher molecular weight, degraded carrageenan (poligeenan) induces marked gastrointestinal ulceration and inflammation. EFSA set strict limits for low-molecular-weight fractions and recommends continuous monitoring for irritable bowel aggravation.',
  },
];

async function seedRAGDocuments() {
  console.log('🚀 Starting RAG Knowledge Base Seeding...');
  console.log(
    `Found ${SCIENTIFIC_KNOWLEDGE_BASE.length} authoritative monographs to ingest.\n`,
  );

  let successCount = 0;

  for (const doc of SCIENTIFIC_KNOWLEDGE_BASE) {
    try {
      console.log(
        `[${doc.id}] Generating 768-dim embedding for: "${doc.title}"...`,
      );
      const embedding = await getEmbedding(doc.content);
      const vectorSql = `[${embedding.join(',')}]`;

      // 🔍 1. Lookup matching ingredient in DB (if specified)
      let ingredientId: string | null = null;
      if (doc.ingredientMatchName) {
        const found = await prisma.ingredient.findFirst({
          where: {
            OR: [
              { normalizedName: doc.ingredientMatchName.toLowerCase() },
              { name: { equals: doc.ingredientMatchName, mode: 'insensitive' } },
              {
                aliases: {
                  some: { alias: doc.ingredientMatchName.toLowerCase() },
                },
              },
            ],
          },
        });

        if (found) {
          ingredientId = found.id;
          console.log(
            `  🔗 Linked to Ingredient: "${found.name}" (id: ${found.id})`,
          );
        } else {
          console.log(
            `  ℹ️ No direct catalog match for "${doc.ingredientMatchName}", storing without ingredientId link`,
          );
        }
      }

      // 💾 2. Upsert into Neon PostgreSQL with vector casting AND ingredientId
      await prisma.$executeRawUnsafe(
        `INSERT INTO "IngredientDocument" 
          ("id", "ingredientId", "title", "content", "source", "sourceUrl", "evidenceLevel", "category", "embedding", "createdAt", "updatedAt")
         VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector, NOW(), NOW())
         ON CONFLICT ("id") DO UPDATE SET
          "ingredientId" = EXCLUDED."ingredientId",
          "title" = EXCLUDED."title",
          "content" = EXCLUDED."content",
          "source" = EXCLUDED."source",
          "sourceUrl" = EXCLUDED."sourceUrl",
          "evidenceLevel" = EXCLUDED."evidenceLevel",
          "category" = EXCLUDED."category",
          "embedding" = EXCLUDED."embedding",
          "updatedAt" = NOW()`,
        doc.id,
        ingredientId,
        doc.title,
        doc.content,
        doc.source,
        doc.sourceUrl,
        doc.evidenceLevel,
        doc.category,
        vectorSql,
      );

      console.log(
        `  ✓ Inserted into PostgreSQL with vector embedding (${embedding.length} dims)\n`,
      );
      successCount++;
    } catch (err: any) {
      console.error(`  ❌ Failed to ingest ${doc.id}:`, err.message);
    }
  }

  console.log(
    `\n🎉 Seeding Complete! Successfully ingested ${successCount}/${SCIENTIFIC_KNOWLEDGE_BASE.length} documents.`,
  );
  await prisma.$disconnect();
}

seedRAGDocuments().catch(async (e) => {
  console.error('Fatal error seeding RAG documents:', e);
  await prisma.$disconnect();
  process.exit(1);
});
