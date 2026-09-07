import { logger } from "../config/logger.js";

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
}

/**
 * Generates a 768-dimensional vector embedding for a given text input.
 * Prioritizes Gemini text-embedding-004, with fallback to local Ollama nomic-embed-text.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const cleanText = text.replace(/\n+/g, " ").trim();
  if (!cleanText) {
    throw new Error("Cannot generate embedding for empty text");
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;

  // 1. Primary Provider: Google Gemini text-embedding-004 (768 dimensions)
  if (geminiApiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiApiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: {
            parts: [{ text: cleanText }],
          },
          outputDimensionality: 768,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        const values = data.embedding?.values;
        if (Array.isArray(values) && values.length > 0) {
          return values;
        }
      } else {
        const errText = await response.text();
        logger.warn(
          { status: response.status, errText },
          "Gemini embedding API failed",
        );
      }
    } catch (err) {
      logger.warn({ err }, "Gemini embedding failed, trying Ollama fallback");
    }
  }

  // 2. Fallback: Local Ollama (nomic-embed-text generates 768 dimensions)
  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
  try {
    const response = await fetch(
      `${ollamaUrl.replace(/\/$/, "")}/api/embeddings`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "nomic-embed-text",
          prompt: cleanText,
        }),
      },
    );

    if (response.ok) {
      const data = (await response.json()) as any;
      if (Array.isArray(data.embedding)) {
        return data.embedding;
      }
    }
  } catch (err) {
    logger.error({ err }, "All embedding providers failed");
  }

  throw new Error(
    "Failed to generate embedding: No embedding provider available",
  );
}
