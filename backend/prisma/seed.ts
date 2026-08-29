import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import {
  INGREDIENT_CATALOG,
  INGREDIENT_ALIASES,
  ADDITIVES_CATALOG,
} from '../src/services/catalog.service.js';

dotenv.config();

export type ConcernLevel = 'low' | 'moderate' | 'high';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function mapConcernLevel(rating: 'safe' | 'caution' | 'avoid'): ConcernLevel {
  switch (rating) {
    case 'safe':
      return 'low';
    case 'caution':
      return 'moderate';
    case 'avoid':
      return 'high';
  }
}

async function main() {
  console.log('🌱 Starting FoodNet database seed...');

  const ingredientMap = new Map<string, string>();

  for (const [name, data] of Object.entries(INGREDIENT_CATALOG)) {
    const ingredient = await prisma.ingredient.upsert({
      where: {
        normalizedName: name.toLowerCase(),
      },
      update: {
        name,
        category: null,
        description: data.description,
        commonUses: data.commonUses,
        evidenceLevel: data.evidenceLevel,
        consumptionGuidance: data.consumptionGuidance,
        concernLevel: mapConcernLevel(data.rating),
      },
      create: {
        name,
        normalizedName: name.toLowerCase(),
        description: data.description,
        commonUses: data.commonUses,
        evidenceLevel: data.evidenceLevel,
        consumptionGuidance: data.consumptionGuidance,
        concernLevel: mapConcernLevel(data.rating),
      },
    });

    ingredientMap.set(name, ingredient.id);
    console.log(`✓ Ingredient: ${name}`);
  }

  for (const [alias, standardName] of Object.entries(INGREDIENT_ALIASES)) {
    const ingredientId = ingredientMap.get(standardName);

    if (!ingredientId) {
      console.warn(
        `⚠ Skipping alias "${alias}" because "${standardName}" was not found`,
      );
      continue;
    }

    await prisma.ingredientAlias.upsert({
      where: {
        alias: alias.toLowerCase(),
      },
      update: {
        ingredientId,
      },
      create: {
        alias: alias.toLowerCase(),
        ingredientId,
      },
    });

    console.log(`  ↳ Alias: ${alias} → ${standardName}`);
  }

  for (const [key, data] of Object.entries(ADDITIVES_CATALOG)) {
    await prisma.additive.upsert({
      where: {
        code: data.code,
      },
      update: {
        name: data.name,
        description: data.description,
        category: data.purpose,
        concernLevel: mapConcernLevel(data.rating),
      },
      create: {
        code: data.code,
        name: data.name,
        description: data.description,
        category: data.purpose,
        concernLevel: mapConcernLevel(data.rating),
      },
    });

    console.log(`✓ Additive: ${data.code} - ${data.name}`);
  }

  console.log('\n✅ FoodNet database seed completed!');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
