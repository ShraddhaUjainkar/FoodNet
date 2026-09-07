import { prisma } from "../config/database.js";
import { getEmbedding } from "./embedding.service.js";
import { logger } from "../config/logger.js";

export interface RetrievedEvidence {
  id: string;
  title: string;
  content: string;
  source: string | null;
  sourceUrl: string | null;
  evidenceLevel: string | null;
  category: string | null;
  ingredientId: string | null;
  similarity: number;
}

/**
 * Hybrid RAG Retrieval Service:
 * 1. Fast Relational Lookup: If specific ingredient IDs or names are known, directly fetches attached documents.
 * 2. Dense Vector Similarity Search: Converts query into 768-dim embedding and finds nearest documents using pgvector.
 * 3. Merges, deduplicates, and ranks by relevance.
 */
export async function retrieveRelevantEvidence(params: {
  query: string;
  ingredientIds?: string[];
  topK?: number;
  similarityThreshold?: number;
}): Promise<RetrievedEvidence[]> {
  const {
    query,
    ingredientIds = [],
    topK = 3,
    similarityThreshold = 0.6,
  } = params;

  const resultsMap = new Map<string, RetrievedEvidence>();

  try {
    // 1. Relational Fast Path: If ingredient IDs are provided, pull attached documents
    if (ingredientIds.length > 0) {
      const directDocs = await prisma.ingredientDocument.findMany({
        where: {
          ingredientId: { in: ingredientIds },
        },
        take: topK,
      });

      for (const doc of directDocs) {
        resultsMap.set(doc.id, {
          id: doc.id,
          title: doc.title,
          content: doc.content,
          source: doc.source,
          sourceUrl: doc.sourceUrl,
          evidenceLevel: doc.evidenceLevel,
          category: doc.category,
          ingredientId: doc.ingredientId,
          similarity: 1.0, // Exact relational match gets maximum score
        });
      }
    }

    // 2. Vector Similarity Search: For semantic / conceptual matching
    if (query && query.trim().length > 0) {
      const queryEmbedding = await getEmbedding(query);
      const vectorSql = `[${queryEmbedding.join(",")}]`;

      const vectorResults = await prisma.$queryRawUnsafe<
        Array<{
          id: string;
          title: string;
          content: string;
          source: string | null;
          sourceUrl: string | null;
          evidenceLevel: string | null;
          category: string | null;
          ingredientId: string | null;
          similarity: number;
        }>
      >(
        `SELECT 
           d.id, 
           d.title, 
           d.content, 
           d.source, 
           d."sourceUrl", 
           d."evidenceLevel", 
           d.category, 
           d."ingredientId",
           (1 - (d.embedding <=> $1::vector))::float AS similarity
         FROM "IngredientDocument" d
         WHERE d.embedding IS NOT NULL
         ORDER BY d.embedding <=> $1::vector ASC
         LIMIT $2`,
        vectorSql,
        topK + resultsMap.size,
      );

      for (const row of vectorResults) {
        if (row.similarity >= similarityThreshold && !resultsMap.has(row.id)) {
          resultsMap.set(row.id, {
            ...row,
            similarity: Number(row.similarity),
          });
        }
      }
    }
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed during RAG retrieval");
  }

  // Sort by similarity score descending and return top K
  return Array.from(resultsMap.values())
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

/**
 * Helper to format retrieved scientific evidence into an authoritative prompt block
 * for the LLM in ai.service.ts or chat assistant.
 */
export function formatEvidenceForPrompt(evidence: RetrievedEvidence[]): string {
  if (!evidence || evidence.length === 0) {
    return "No specific scientific monographs retrieved. Rely on standard food science classifications.";
  }

  return evidence
    .map((doc, idx) => {
      const refNumber = idx + 1;
      const citation = doc.source ? ` (${doc.source})` : "";
      return `[Citation ${refNumber}] "${doc.title}"${citation}\n${doc.content}`;
    })
    .join("\n\n");
}
