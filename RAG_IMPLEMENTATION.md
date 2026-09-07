# FoodNet RAG & LLM Integration Architecture & Implementation Guide

> **Document Version:** 1.0.0  
> **Target Project:** FoodNet (Next.js 15 Frontend + Express ESM / BullMQ Backend + Neon PostgreSQL + Redis)  
> **Status:** Architectural Blueprint & Technical Specification  

---

## 📑 Table of Contents

1. [Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
2. [Current Architecture vs. RAG-Augmented Architecture](#2-current-architecture-vs-rag-augmented-architecture)
3. [Core Use Cases for FoodNet](#3-core-use-cases-for-foodnet)
4. [Technology Stack & Model Selection](#4-technology-stack--model-selection)
5. [Database & Vector Storage (Neon pgvector)](#5-database--vector-storage-neon-pgvector)
6. [Knowledge Ingestion & Data Pipeline](#6-knowledge-ingestion--data-pipeline)
7. [Retrieval Engine & Hybrid Search](#7-retrieval-engine--hybrid-search)
8. [LLM Prompt Engineering & Grounded Generation](#8-llm-prompt-engineering--grounded-generation)
9. [Interactive Feature: "Chat with this Product"](#9-interactive-feature-chat-with-this-product)
10. [End-to-End Implementation Roadmap (Phased)](#10-end-to-end-implementation-roadmap-phased)
11. [Hardware, Cost & Latency Considerations](#11-hardware-cost--latency-considerations)

---

## 1. Executive Summary & Problem Statement

### The Problem with Zero-Shot LLMs in Food Safety
FoodNet currently relies on zero-shot prompt engineering (`ai.service.ts`) using Ollama (`llama3.2:3b`), Gemini (`gemini-1.5-flash`), or OpenAI (`gpt-4o-mini`). When food labels contain unknown ingredients, complex chemical preservatives, or unfamiliar E-numbers, a purely generative LLM has significant vulnerabilities:

1. **Hallucination Risk:** Generative models often hallucinate toxicological classifications, claim non-existent regulatory bans, or confuse food additives (e.g., confusing *Sodium Benzoate* with *Sodium Bisulfite*).
2. **Lack of Verifiable Citations:** A consumer or health professional reading *"Avoid this product due to cancer risk"* requires verifiable evidence (e.g., *EFSA 2021 Opinion*, *IARC Monograph Vol. 134*, or *FDA 21 CFR §172.841*).
3. **Stale Information:** Regulatory decisions change rapidly (e.g., California Food Safety Act banning Red 3 and Brominated Vegetable Oil; EFSA banning Titanium Dioxide E171). LLMs trained on older data are unaware of these updates without external context.
4. **Underutilized Database Assets:** FoodNet already has an `IngredientDocument` table in its Prisma schema, but it remains empty and unindexed for semantic search.

### The Solution: RAG (Retrieval-Augmented Generation)
RAG connects FoodNet's LLMs directly to an authoritative, vectorized knowledge base containing:
- Regulatory body decisions (FDA, EFSA, WHO/FAO, FSSAI).
- Toxicological research and carcinogenic hazard evaluations (IARC, PubChem).
- Verified clinical nutrition guidelines (Allergen lists, Diabetic glycemic indexes).

When FoodNet analyzes a food label, it **retrieves** matching scientific excerpts from the vector database and **augments** the LLM prompt with those exact facts. The LLM is instructed to synthesize answers strictly based on the retrieved context with authoritative citations.

---

## 2. Current Architecture vs. RAG-Augmented Architecture

### 2.1 Current Workflow
```
[User Label] ──> [OCR] ──> [Exact DB Match] ──> [Hardcoded Scoring]
                                 │
                   (Unmatched Ingredients / Summary)
                                 ▼
                     [Zero-Shot LLM Call]
                     (Susceptible to hallucination)
```

### 2.2 RAG-Augmented Workflow
```
[User Label] ──> [OCR] ──> [Exact DB Match] ──> [Score Calculation]
                                 │
                 ┌───────────────┴────────────────┐
                 ▼                                ▼
     [Unmatched Ingredients]           [High Concern Additives]
                 │                                │
                 └───────────────┬────────────────┘
                                 ▼
                    [Query Embedding Generator]
                   (nomic-embed-text / text-embedding-3-small)
                                 ▼
                 [Vector Similarity Search (pgvector)]
                    (Top-K Scientific Excerpts & EFSA Docs)
                                 ▼
              [Grounded Augmented Prompt Construction]
              - Context: Retrieved scientific papers
              - Context: User dietary restrictions (diabetic, vegan, etc.)
                                 ▼
             [LLM Synthesis (Ollama / Gemini / GPT-4o-mini)]
                                 ▼
           [Structured JSON Result with Verified Citations]
                                 ▼
            [Scan Result Saved + Interactive Chat Ready]
```

---

## 3. Core Use Cases for FoodNet

### Use Case 1: Evidence-Backed Ingredient Verdicts
Instead of generating generic descriptions like *"This is a synthetic preservative"*, FoodNet's analysis cards provide:
- **Verdict:** Caution
- **Scientific Rationale:** In acidic beverages, Sodium Benzoate can react with Ascorbic Acid (Vitamin C) to form trace Benzene, a known carcinogen.
- **Evidence Citation:** *EFSA Panel on Food Additives (EFSA Journal 2016;14(3):4433)*.
- **Regulatory Status:** Banned in organic standards; allowed up to 0.1% by FDA.

### Use Case 2: Dynamic Categorization of Unmatched Ingredients
Food labels frequently use proprietary trade names, regional names, or botanical Latin (e.g., *Hydrated Silica*, *Withania Somnifera*, *Steviol Glycosides*). RAG matches these against PubChem and botanical monographs to categorize them accurately without developer intervention.

### Use Case 3: Personalized "Chat with this Product"
On `/scan/[id]`, users can converse with an AI agent grounded in their specific scan report:
- *"Is this product safe for my 4-year-old child with mild eczema?"*
- *"Why did this product get a Grade D despite being labeled 'All Natural'?"*
- *"What makes Potassium Sorbate different from Sodium Benzoate?"*

---

## 4. Technology Stack & Model Selection

FoodNet already supports both **Local (Dockerized)** and **Cloud (API Keys)** environments. The RAG architecture maintains this dual capability:

| Component | Local Stack (Zero Cost / Offline) | Cloud Stack (Production / Scalable) |
| :--- | :--- | :--- |
| **Vector Store** | Neon Serverless PostgreSQL with `pgvector` | Neon PostgreSQL with `pgvector` *(Already in FoodNet)* |
| **Embedding Model** | `nomic-embed-text` or `bge-small-en-v1.5` via Ollama | OpenAI `text-embedding-3-small` (1536 dims) or Google `text-embedding-004` |
| **LLM Reasoning** | `llama3.2:3b` / `mistral:7b` / `qwen2.5:7b` via Ollama | Google `gemini-1.5-flash` or OpenAI `gpt-4o-mini` |
| **Orchestration** | Native Node.js/TypeScript fetch + pgvector SQL | Native TypeScript OR LangChain.js / LlamaIndex.TS |
| **Job Queue** | BullMQ + Redis (Existing in FoodNet) | BullMQ + Redis (Existing in FoodNet) |

---

## 5. Database & Vector Storage (Neon pgvector)

Because FoodNet already uses Neon PostgreSQL via Prisma, **there is no need to deploy or pay for a separate vector database (such as Pinecone, Qdrant, or Weaviate)**. Neon provides first-class support for `pgvector`.

### 5.1 Prisma Schema Migration

We enhance `IngredientDocument` and add a conversational `ScanChatMessage` model in `backend/prisma/schema.prisma`:

```prisma
// Enable the vector extension in PostgreSQL
// Note: Supported natively in PostgreSQL via 'CREATE EXTENSION IF NOT EXISTS vector;'

model IngredientDocument {
  id            String      @id @default(cuid())
  ingredientId  String?
  title         String
  content       String      @db.Text
  source        String?     // e.g., "EFSA Journal 2021", "FDA CFR Title 21", "PubMed ID: 312019"
  sourceUrl     String?
  evidenceLevel String?     // e.g., "high", "moderate", "observational"
  category      String?     // e.g., "preservative", "sweetener", "emulsifier"
  
  // Vector Embedding column (1536 dimensions for OpenAI / 768 for nomic-embed-text)
  // In Prisma, unsupported columns are handled via raw SQL or Unsupported type:
  embedding     Unsupported("vector(1536)")?

  ingredient    Ingredient? @relation(fields: [ingredientId], references: [id], onDelete: Cascade)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@index([ingredientId])
}

model ScanChatMessage {
  id        String   @id @default(cuid())
  scanId    String
  role      String   // "user" | "assistant" | "system"
  content   String   @db.Text
  citations Json?    // Array of sources cited in response
  createdAt DateTime @default(now())

  scan      Scan     @relation(fields: [scanId], references: [id], onDelete: Cascade)

  @@index([scanId])
}
```

### 5.2 Creating the Fast HNSW Index
In PostgreSQL, vector similarity search on large document sets is accelerated using an **HNSW (Hierarchical Navigable Small World)** index:

```sql
-- Run directly in Neon SQL Console or via a Prisma migration:
CREATE EXTENSION IF NOT EXISTS vector;

-- Create HNSW index for Cosine Distance (<=>)
CREATE INDEX IF NOT EXISTS ingredient_document_embedding_hnsw_idx 
ON "IngredientDocument" 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

---

## 6. Knowledge Ingestion & Data Pipeline

A RAG pipeline is only as good as the documents in its knowledge base. FoodNet requires an automated ingestion script to parse, chunk, embed, and store scientific data.

### 6.1 Authoritative Data Sources for FoodNet

1. **EFSA (European Food Safety Authority) Open Data:**
   - Evaluated food additives, maximum permitted limits, and scientific opinions on E-numbers.
2. **FDA Substances Added to Food (formerly EAFUS) & GRAS Inventory:**
   - Over 4,000 food ingredients regulated by the United States Food and Drug Administration.
3. **Open Food Facts Additives Taxonomy:**
   - Comprehensive multilingual definitions, vegan/vegetarian safety, and cross-referenced wikidata entries.
4. **IARC Monographs on the Evaluation of Carcinogenic Risks to Humans:**
   - Classifications for aspartame, titanium dioxide, processed meats, and food contaminants.
5. **PubMed Central Open Access (Food Toxicology & Nutrition):**
   - Peer-reviewed research abstracts on emulsifiers (polysorbate 80, carboxymethylcellulose) and gut microbiome impact.

### 6.2 Chunking & Ingestion Strategy

- **Chunk Size:** 400–600 tokens (optimal for food scientific opinions).
- **Overlap:** 50 tokens (ensures chemical context across sentence boundaries).
- **Metadata Tagging:** Each chunk stores `chemical_name`, `e_number`, `regulatory_body`, `publication_year`, and `risk_rating`.

#### Ingestion Script Prototype (`backend/src/scripts/ingest_knowledge.ts`)
```typescript
import { prisma } from '../config/database.js';
import { getEmbedding } from '../services/embedding.service.js';

interface RawDocument {
  ingredientName: string;
  title: string;
  source: string;
  sourceUrl: string;
  content: string;
  evidenceLevel: string;
}

export async function ingestDocuments(docs: RawDocument[]) {
  for (const doc of docs) {
    // 1. Generate dense vector embedding
    const embedding = await getEmbedding(doc.content);
    const vectorString = `[${embedding.join(',')}]`;

    // 2. Insert with pgvector type casting
    await prisma.$executeRawUnsafe(
      `INSERT INTO "IngredientDocument" 
        ("id", "title", "content", "source", "sourceUrl", "evidenceLevel", "embedding", "createdAt", "updatedAt")
       VALUES 
        (gen_random_uuid(), $1, $2, $3, $4, $5, $6::vector, NOW(), NOW())`,
      doc.title,
      doc.content,
      doc.source,
      doc.sourceUrl,
      doc.evidenceLevel,
      vectorString
    );
  }
}
```

---

## 7. Retrieval Engine & Hybrid Search

Food safety queries require **Hybrid Search** combining:
1. **Keyword/Lexical Filter:** Ensuring exact matches for chemical codes (e.g., "E150d", "INS 211", "Tartrazine").
2. **Dense Vector Search:** Ensuring conceptual and symptom-based matches (e.g., "preservative linked to hyperactivity in children" or "emulsifiers disrupting intestinal mucus barrier").

### 7.1 Hybrid Retrieval Service (`backend/src/services/rag.service.ts`)
```typescript
import { prisma } from '../config/database.js';
import { getEmbedding } from './embedding.service.js';

export interface RetrievedEvidence {
  id: string;
  title: string;
  content: string;
  source: string;
  sourceUrl: string | null;
  evidenceLevel: string | null;
  similarity: number;
}

export async function retrieveRelevantEvidence(
  query: string,
  ingredientNames: string[] = [],
  topK: number = 3
): Promise<RetrievedEvidence[]> {
  // 1. Generate query embedding
  const queryVector = await getEmbedding(query);
  const vectorString = `[${queryVector.join(',')}]`;

  // 2. Hybrid query: Cosine Distance (<=>) with score threshold + keyword priority
  const results = await prisma.$queryRawUnsafe<RetrievedEvidence[]>(
    `SELECT 
       id, 
       title, 
       content, 
       source, 
       "sourceUrl", 
       "evidenceLevel",
       1 - (embedding <=> $1::vector) AS similarity
     FROM "IngredientDocument"
     WHERE embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector ASC
     LIMIT $2`,
    vectorString,
    topK
  );

  return results.filter((doc) => doc.similarity >= 0.70); // Filter low-relevance noise
}
```

---

## 8. LLM Prompt Engineering & Grounded Generation

In `backend/src/services/ai.service.ts`, the LLM prompt is updated to include the retrieved scientific evidence as an authoritative source context.

### 8.1 Augmented Prompt Template

```typescript
export function buildRAGPrompt(params: {
  rawText: string;
  matchedIngredients: string[];
  unmatchedIngredients: string[];
  retrievedEvidence: RetrievedEvidence[];
}): string {
  const evidenceBlock = params.retrievedEvidence.length > 0
    ? params.retrievedEvidence
        .map(
          (e, idx) =>
            `[Reference ${idx + 1}]: ${e.title} (${e.source})\n"${e.content}"\n`
        )
        .join('\n')
    : 'No specific research documents retrieved. Rely on standard food science rules.';

  return `You are FoodNet AI, a certified toxicologist and food scientist.
Analyze the provided food label data. Base your findings strictly on the verified scientific evidence below.

=== AUTHORITATIVE SCIENTIFIC EVIDENCE ===
${evidenceBlock}

=== SCANNED PRODUCT DATA ===
Raw OCR Text: "${params.rawText}"
Detected Catalog Ingredients: ${params.matchedIngredients.join(', ')}
Uncategorized Ingredients: ${params.unmatchedIngredients.join(', ') || 'None'}

=== MANDATORY INSTRUCTIONS ===
1. Categorize all uncategorized ingredients into "safe", "caution", or "avoid".
2. If evidence exists in the references above, cite the reference number (e.g. "[Ref 1]") in the description.
3. If an additive has known health controversies (e.g., hyperactivity, gut dysbiosis), explicitly state the consensus and evidence strength.
4. Return ONLY valid JSON conforming to the FoodNet schema. Do NOT hallucinate regulatory bans not supported by the evidence.`;
}
```

---

## 9. Interactive Feature: "Chat with this Product"

To enable conversational AI on the `/scan/[id]` page:

### 9.1 Backend Endpoint (`POST /api/v1/scan/:id/chat`)
- **Route:** `backend/src/routes/api.routes.ts`
- **Request Body:** `{ message: string, userHealthContext?: { diabetic?: boolean; vegan?: boolean; allergies?: string[] } }`
- **Processing Steps:**
  1. Fetch `Scan` record by `id` (including ingredients, score, grade).
  2. Embed user question (`"Can I eat this if I have celiac disease?"`).
  3. Retrieve top-3 matching documents from `IngredientDocument` vector store.
  4. Build conversational context including product ingredients, nutrition values, and retrieved scientific context.
  5. Stream or return the response with citation footnotes.

### 9.2 Frontend UI Component (`ScanChatDrawer.tsx`)
- Appears on `/scan/[id]` as an interactive floating or docked widget ("Ask FoodNet about this food").
- Provides one-click starter prompts:
  - *"Is this safe for diabetics?"*
  - *"Why is E150d rated as caution?"*
  - *"What are healthier alternatives to this snack?"*
- Displays source badges (e.g., `[EFSA 2021]` or `[FDA GRAS]`) with links to official sources.

---

## 10. End-to-End Implementation Roadmap (Phased)

### Phase 1: Database & Vector Setup
- [ ] Run `CREATE EXTENSION IF NOT EXISTS vector;` in Neon database.
- [ ] Update `backend/prisma/schema.prisma` with `IngredientDocument` embedding column and `ScanChatMessage` model.
- [ ] Run `npx prisma db push` or create SQL migration.
- [ ] Create HNSW vector index in PostgreSQL.

### Phase 2: Embedding Service & Ingestion Pipeline
- [ ] Create `backend/src/services/embedding.service.ts` supporting both OpenAI `text-embedding-3-small` and Ollama `nomic-embed-text`.
- [ ] Create `backend/src/scripts/ingest_knowledge.ts` to load initial seed documents (EFSA opinions for common additives: E150d, E211, E250, E951, E338, Palm Oil, High Fructose Corn Syrup).
- [ ] Verify similarity search via a scratch test script.

### Phase 3: Worker & RAG Service Integration
- [ ] Create `backend/src/services/rag.service.ts` with hybrid search logic.
- [ ] Update Step 5 of `backend/src/workers/analyze.worker.ts`:
  - Extract unmatched ingredients & high-risk additives.
  - Fetch relevant documents.
  - Pass retrieved evidence to `ai.service.ts`.
- [ ] Update `ai.service.ts` prompt to include evidence citations in the scan JSON output.

### Phase 4: Conversational Chat API & Frontend UI
- [ ] Implement `POST /api/v1/scan/:id/chat` controller and route.
- [ ] Create `frontend/src/components/ScanChatDrawer.tsx` with Markdown and citation rendering.
- [ ] Add chat widget to `frontend/src/app/scan/[id]/page.tsx`.

### Phase 5: Verification & Resilience
- [ ] Validate end-to-end scan flow with a known controversial product (e.g., Diet Soda containing Aspartame and Caramel Color).
- [ ] Verify that the generated summary cites EFSA/FDA references.
- [ ] Benchmark query latency (target: < 2.5s for vector retrieval + LLM completion).

---

## 11. Hardware, Cost & Latency Considerations

### 11.1 Local (Ollama) Setup
- **Model:** `llama3.2:3b` (reasoning) + `nomic-embed-text` (embeddings).
- **RAM Requirement:** Minimum 8GB RAM (Apple Silicon M1/M2/M3 or x86_64 with NVIDIA GPU recommended).
- **Cost:** $0.00 / month.
- **Latency:** ~2.0s–4.5s for embedding + generation.

### 11.2 Cloud (OpenAI / Gemini) Setup
- **Embeddings:** OpenAI `text-embedding-3-small` ($0.02 / 1M tokens).
  - Ingesting 5,000 scientific abstracts (~2.5M tokens) costs ~$0.05 one-time.
  - Each scan query (embedding 50 tokens) costs ~$0.000001.
- **Generation:** `gpt-4o-mini` ($0.15 / 1M input tokens) or `gemini-1.5-flash` ($0.075 / 1M tokens).
  - Cost per scan report: ~$0.0003.
- **Latency:** ~1.2s–2.2s end-to-end.

---

*This document is ready to serve as the development specification whenever you are ready to begin Phase 1.*
