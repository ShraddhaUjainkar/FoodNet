You are a senior full-stack engineer, software architect, and AI/RAG engineer.

We are building FoodNet.

FoodNet is a food ingredient analysis application.

The user uploads a photo of a packaged food ingredient list.

The system:

1. Extracts the ingredient list using OCR.
2. Cleans and normalizes the ingredients.
3. Identifies individual ingredients.
4. Checks ingredients against our trusted ingredient knowledge base.
5. Detects allergens, additives, preservatives, colors, sweeteners, etc.
6. Determines whether an ingredient needs attention.
7. Explains the ingredient in simple language.
8. Gives a simple consumption recommendation such as:
   - Generally OK
   - Occasional
   - Limit
   - Avoid if sensitive
9. Shows the user a simple and understandable result.

IMPORTANT:

This is NOT a medical diagnosis application.

Do not claim that a food causes a disease unless the evidence and source explicitly support that statement.

Do not invent scientific information.

The system must distinguish between:

- Strong evidence
- Moderate evidence
- Limited/uncertain evidence

The application should prefer trusted stored knowledge over AI-generated assumptions.

==================================================
IMPORTANT DEVELOPMENT CONSTRAINT
==================================================

I currently have NO budget for paid APIs or AI services.

Use FREE and OPEN-SOURCE tools wherever possible.

Do NOT add:

- OpenAI API
- Anthropic API
- Google paid APIs
- AWS paid APIs
- Paid OCR services
- Paid vector databases
- Paid AI APIs

The application should be able to run locally using open-source software.

If something cannot realistically be free forever, clearly mark it as optional.

==================================================
PHASE 1 — BASIC PROJECT
==================================================

First create the basic FoodNet application.

Technology:

- Next.js
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma
- Docker

Create:

/app
/components
/lib
/services
/prisma
/types

Create a clean architecture.

Do not over-engineer.

Create:

- Landing page
- Upload page
- Result page
- Basic API structure
- PostgreSQL connection
- Prisma schema

Do NOT implement RAG yet.

Do NOT implement AI yet.

The application must run locally.

==================================================
PHASE 2 — IMAGE TO INGREDIENT TEXT
==================================================

Implement ingredient-list image processing.

Use:

Tesseract.js

The user uploads an image.

Flow:

Image
→ OCR
→ Raw text
→ Ingredient extraction
→ Clean ingredient list

Handle common OCR problems:

- Extra spaces
- Line breaks
- Incorrect capitalization
- OCR mistakes
- Commas
- Parentheses
- Duplicate ingredients
- Ingredient numbering

Example:

Input:

"INGREDIENTS: Sugar, Whey Proteln Concentrate,
Sodlum Benzoate, Citric Acld, INS 102"

Normalize into:

[
"Sugar",
"Whey Protein Concentrate",
"Sodium Benzoate",
"Citric Acid",
"INS 102"
]

Create a normalization service.

Do not use an LLM for this phase.

==================================================
PHASE 3 — INGREDIENT DATABASE
==================================================

Create the first FoodNet knowledge database.

Create tables:

Ingredient

Fields:

- id
- name
- normalizedName
- aliases
- category
- description
- commonUses
- concernLevel
- evidenceLevel
- consumptionGuidance
- createdAt
- updatedAt

Create additional tables if necessary:

IngredientAlias
IngredientSource
IngredientCategory

Categories may include:

- Preservative
- Artificial Color
- Sweetener
- Emulsifier
- Stabilizer
- Flavoring
- Thickener
- Acid
- Antioxidant
- Salt
- Sugar
- Fat
- Allergen
- Other

Start with a small curated dataset.

DO NOT try to create thousands of ingredients initially.

Start with 50–100 important ingredients.

The database must be the source of truth.

==================================================
PHASE 4 — RULE-BASED ANALYSIS
==================================================

Create an Ingredient Analysis Engine.

Input:

Ingredient list

Output:

For every ingredient:

- ingredientName
- matchedIngredient
- category
- concernLevel
- evidenceLevel
- explanation
- recommendation

Example:

{
"ingredientName": "Sodium Benzoate",
"category": "Preservative",
"concernLevel": "moderate",
"evidenceLevel": "strong",
"explanation": "A preservative used to help prevent spoilage.",
"recommendation": "Generally acceptable within regulated use levels."
}

The rules engine must use the database.

Do NOT ask an LLM to determine the safety level.

The rules engine makes the decision.

==================================================
PHASE 5 — RESULT PAGE
==================================================

Create a beautiful and simple result page.

The user should understand the result within 10 seconds.

Show:

1. Product image

2. Overall summary

3. Overall status

Examples:

"Good Choice"

"Okay Occasionally"

"Needs Attention"

4. Ingredients analyzed

5. Ingredients to watch

6. Allergens detected

7. Consumption guidance

8. Simple explanations

Avoid complicated medical dashboards.

Use:

- Cards
- Icons
- Badges
- Progress indicators
- Clear typography
- Large whitespace
- Mobile responsive design

Keep the design consistent with the existing FoodNet landing page.

==================================================
PHASE 6 — VECTOR SEARCH
==================================================

Only after the previous phases work correctly, add RAG.

Use:

PostgreSQL + pgvector

Do NOT introduce a paid vector database.

Store embeddings for trusted ingredient documents.

Use a free/open-source embedding model locally.

Recommended approach:

sentence-transformers

The embedding model must run locally.

Create:

ingredient_documents

Fields:

- id
- ingredientId
- title
- content
- source
- evidenceLevel
- embedding
- createdAt

Generate embeddings locally.

Store vectors inside PostgreSQL using pgvector.

==================================================
PHASE 7 — BUILD THE KNOWLEDGE BASE
==================================================

Create structured documents for every important ingredient.

Example:

Ingredient:

Sodium Benzoate

Document:

Name:
Sodium Benzoate

Category:
Preservative

What is it:
A preservative commonly used to prevent microbial growth.

Why is it used:
It helps extend shelf life.

Evidence:
[trusted information]

Potential concerns:
[carefully documented evidence]

Who may need caution:
[if supported by evidence]

Consumption guidance:
[careful wording]

Source:
[source information]

Evidence level:
Strong / Moderate / Limited

IMPORTANT:

Do not generate scientific facts using the LLM.

The knowledge base should be created from trusted sources.

==================================================
PHASE 8 — RAG PIPELINE
==================================================

Implement the following architecture:

USER IMAGE

↓

OCR

↓

INGREDIENT NORMALIZATION

↓

INGREDIENT DATABASE MATCH

↓

RULE ENGINE

↓

RETRIEVE RELEVANT KNOWLEDGE

↓

VECTOR SEARCH

↓

RAG CONTEXT

↓

LOCAL LLM

↓

SIMPLE USER-FRIENDLY EXPLANATION

The LLM must NOT independently decide ingredient safety.

The LLM's job is:

- Explain
- Summarize
- Simplify
- Organize

The database/rules engine decides the actual classification.

==================================================
PHASE 9 — LOCAL LLM
==================================================

Use Ollama.

The LLM must run locally.

Do not use a paid API.

Make the LLM provider configurable.

Create:

LLMService

Interface:

generateExplanation(context)

Initially support Ollama.

Do not tightly couple the application to one model.

Possible local models can be evaluated based on the developer's machine capabilities.

==================================================
PHASE 10 — RAG PROMPT
==================================================

Create a strict system prompt for the local LLM.

Use this logic:

"You are FoodNet's ingredient explanation assistant.

You must answer ONLY using the supplied FoodNet knowledge context.

Never invent information.

Never diagnose a disease.

Never claim that an ingredient definitely causes a disease unless the supplied evidence explicitly supports that statement.

If the supplied knowledge does not contain enough information, say:

'FoodNet does not currently have enough reliable information to make a clear assessment.'

Explain technical information in simple language.

Clearly distinguish:

- established evidence
- possible concerns
- limited evidence

Do not exaggerate risk.

Do not create fear.

Do not use sensational language.

Do not override the FoodNet rule engine.

The rule engine's classification is authoritative.

Your task is only to explain the classification clearly."

==================================================
PHASE 11 — RAG RETRIEVAL
==================================================

When an ingredient is detected:

1. Normalize the ingredient name.

2. Search exact database match.

3. If exact match exists:
   retrieve the ingredient record.

4. Perform vector search for supporting documents.

5. Retrieve top relevant documents.

6. Filter documents by relevance.

7. Send only trusted context to the local LLM.

8. Generate explanation.

Use metadata filtering where possible.

For example:

ingredientId
category
evidenceLevel
source

Do not retrieve random documents simply because they are semantically similar.

==================================================
PHASE 12 — HALLUCINATION PROTECTION
==================================================

Implement safeguards.

If no database match exists:

Do NOT let the LLM guess.

Return:

"FoodNet hasn't identified this ingredient yet."

If vector search returns insufficient evidence:

Return:

"Limited information available."

If sources disagree:

Show:

"Evidence is mixed."

Never hide uncertainty.

==================================================
PHASE 13 — PERSONALIZATION
==================================================

Only after the core system works.

Add optional user accounts.

Users can save:

- Scan history
- Favorite products
- Allergies
- Dietary preferences
- Ingredients to avoid

Personalized analysis should be an additional layer.

Do not change the underlying scientific classification based on user preferences.

Instead, personalize the presentation.

Example:

General result:
"Contains milk."

User preference:
"Milk allergy."

Result:

"IMPORTANT: Contains milk — this matches an ingredient you marked as an allergy."

==================================================
PHASE 14 — TESTING
==================================================

Create automated tests for:

- OCR normalization
- Ingredient matching
- Alias matching
- Rule engine
- Risk classification
- Vector retrieval
- RAG context construction
- LLM response validation

Create test cases for:

Known ingredient

Unknown ingredient

OCR typo

Ingredient alias

Multiple ingredients

Allergen

Conflicting evidence

Missing knowledge

Empty OCR result

==================================================
PHASE 15 — SECURITY AND PRIVACY
==================================================

Do not permanently store uploaded images unless the user explicitly chooses to save them.

Validate image type.

Limit image size.

Sanitize OCR input.

Protect API routes.

Do not expose database credentials.

Use environment variables.

Add rate limiting where practical.

==================================================
PHASE 16 — FINAL ARCHITECTURE
==================================================

Final architecture should look like:

                FOODNET

                   |
                   v

             IMAGE UPLOAD
                   |
                   v
                OCR
                   |
                   v
        INGREDIENT NORMALIZER
                   |
                   v
          INGREDIENT MATCHER
                   |
          +--------+--------+
          |                 |
          v                 v
     RULE ENGINE       VECTOR SEARCH
          |                 |
          |                 v
          |            KNOWLEDGE BASE
          |                 |
          +--------+--------+
                   |
                   v
              RAG CONTEXT
                   |
                   v
             LOCAL LLM
              OLLAMA
                   |
                   v
          USER-FRIENDLY RESULT

==================================================
IMPORTANT DEVELOPMENT RULES
==================================================

1. Keep the application simple.

2. Do not introduce unnecessary dependencies.

3. Prefer open-source solutions.

4. Do not use paid APIs.

5. Do not implement everything at once.

6. Complete one phase before starting the next.

7. Keep business logic separate from UI.

8. Keep the rule engine deterministic.

9. Keep RAG responsible for retrieving knowledge.

10. Keep the LLM responsible for explanation.

11. Never allow the LLM to invent scientific claims.

12. Every important health-related claim should have a source.

13. Always show uncertainty when evidence is limited.

14. Write clean, maintainable TypeScript.

15. Explain each architectural decision in simple language.

==================================================
HOW TO WORK
==================================================

Start with PHASE 1 only.

Before writing code:

1. Inspect the existing project.
2. Identify the current technology.
3. Identify what already exists.
4. Do not overwrite working code.
5. Tell me what needs to be added.
6. Then implement Phase 1.

After completing Phase 1:

- Explain what was built.
- Explain how to run it.
- Explain what files were created/changed.
- Explain any commands I need to run.
- Then STOP.

Do not automatically continue to Phase 2.

Wait for my confirmation.

Follow the same process for every phase.
