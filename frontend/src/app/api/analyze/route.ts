// src/app/api/analyze/route.ts
import { NextResponse } from "next/server";
import { runOCR } from "@/lib/ocr";
import { normalizeAndMatchIngredients } from "@/lib/normalizer";
import {
  calculateHealthScore,
  calculateProductMetadata,
  calculateGrade,
} from "@/lib/analyzer";
import { generateAISummary } from "@/lib/ai";
import { db } from "@/lib/db";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { uploadImageFromDataUrl } from "@/lib/storage";
import { checkRateLimit } from "@/lib/rateLimiter";
import { logger, captureException } from "@/lib/logger";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
let redisLogValue = redisUrl;
try {
  const parsedRedisUrl = new URL(redisUrl);
  parsedRedisUrl.username = "***";
  parsedRedisUrl.password = "***";
  redisLogValue = parsedRedisUrl.toString();
} catch {
  redisLogValue = "invalid Redis URL";
}

console.log("Analyze API Redis URL:", redisLogValue);

const analyzeQueue = new Queue("analyze", {
  connection: new Redis(redisUrl),
} as any);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const image = body.image || "";
    const filename = body.filename || "";
    const text = body.text || "";

    // Basic rate limiting by client IP (X-Forwarded-For or fallback)
    const ip = (
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "local"
    )
      .split(",")[0]
      .trim();
    const rl = await checkRateLimit(ip);
    if (!rl.allowed) {
      const retryAfter = rl.reset - Math.floor(Date.now() / 1000);
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfter },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }

    if (!image && !filename && !text) {
      return NextResponse.json(
        { error: "Image, filename, or text is required" },
        { status: 400 },
      );
    }

    if (image) {
      // Validate data URL
      const match = /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i.exec(
        image,
      );

      if (!match) {
        return NextResponse.json(
          {
            error:
              "Invalid image format. Use data:image/png|jpeg|jpg|webp;base64,...",
          },
          { status: 400 },
        );
      }

      const mime = match[1].toLowerCase();
      const base64Data = match[2];

      const buffer = Buffer.from(base64Data, "base64");

      // Max upload size
      const maxBytes = Number(process.env.MAX_IMAGE_BYTES || 5 * 1024 * 1024);

      if (buffer.length > maxBytes) {
        return NextResponse.json(
          {
            error: "Image too large",
            maxBytes,
          },
          { status: 413 },
        );
      }

      // Default filename
      const finalFilename =
        filename ||
        `upload.${
          mime === "image/jpeg" || mime === "image/jpg"
            ? "jpg"
            : mime.split("/")[1]
        }`;

      let imageStored = false;
      try {
        // Upload image to Cloudinary
        const uploaded = await uploadImageFromDataUrl(image, "foodnet/uploads");
        imageStored = Boolean(uploaded.key && uploaded.url);
        logger.info(
          {
            imageStored,
            storageKey: uploaded.key,
            imageUrl: uploaded.url,
          },
          "Image stored successfully",
        );

        // Only send reference to BullMQ, NOT base64 image
        const job = await analyzeQueue.add("image-analysis", {
          storageKey: uploaded.key,
          imageUrl: uploaded.url,
          filename: finalFilename,
          text,
        });

        return NextResponse.json({
          enqueued: true,
          jobId: job.id,
          storageKey: uploaded.key,
          imageUrl: uploaded.url,
        });
      } catch (error) {
        logger.error(
          { err: error, imageStored },
          "Image upload or analysis job enqueue failed",
        );

        captureException(error);

        return NextResponse.json(
          {
            error: "Failed to upload image",
          },
          { status: 500 },
        );
      }
    }

    // Step 1: Get raw text of ingredient list (either directly pasted, or via OCR)
    let rawText = text;
    if (!rawText) {
      rawText = await runOCR(image, filename || "label.png");
    }

    // Step 2: Extract & Match ingredients against DB (performs cleaning, alias lookup, fuzzy matching)
    const matchedIngredients = await normalizeAndMatchIngredients(rawText);

    // Step 3: Compute deterministic health score and consumption recommendation
    const { score, recommendation } = calculateHealthScore(matchedIngredients);

    // Step 4: Generate plain English explanation via OpenAI GPT
    // (This dynamically updates unmatched ingredients in-place with classifications and generates product details)
    const aiResult = await generateAISummary({
      rawText,
      ingredients: matchedIngredients,
      score,
      recommendation,
    });

    // Step 4.5: Recalculate health score, additives, and allergens after dynamic categorization
    const finalScoreInfo = calculateHealthScore(matchedIngredients);
    const finalGrade = calculateGrade(finalScoreInfo.score);

    // Resolve product UI metadata (emoji, gradient, brand, nutrition, swaps)
    // falling back to static metadata if AI key is missing or failed to return them
    const formattedDate = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date());
    const scanName = `Scan - ${formattedDate}`;

    const staticMetadata = calculateProductMetadata(
      matchedIngredients,
      filename || "label.png",
    );
    const metadata = {
      name: scanName,
      brand: aiResult.brand || staticMetadata.brand,
      emoji: aiResult.emoji || staticMetadata.emoji,
      gradient: aiResult.gradient || staticMetadata.gradient,
      nutrition: aiResult.nutrition || staticMetadata.nutrition,
      alternatives: aiResult.alternatives || staticMetadata.alternatives,
    };

    // Step 5: Save scan to DB for public access URL
    const scanId = Math.random().toString(36).substring(7);
    const scan = await db.saveScan(scanId, {
      name: metadata.name,
      brand: metadata.brand,
      score: finalScoreInfo.score,
      grade: finalGrade,
      summary: aiResult.summary,
      allergens: finalScoreInfo.foundAllergens,
      ingredients: matchedIngredients.map((ing) => ({
        name: ing.name,
        rating: ing.rating,
        description: ing.description,
        percentage: ing.percentage,
        commonUses: ing.commonUses,
        evidenceLevel: ing.evidenceLevel,
      })),
      additives: finalScoreInfo.flaggedAdditives,
      nutrition: metadata.nutrition,
      alternatives: metadata.alternatives,
      emoji: metadata.emoji,
      gradient: metadata.gradient,
      image: image || undefined,
    });

    logger.info(
      { scanId: scan.id, imageStored: Boolean(scan.image) },
      image ? "Image stored with scan" : "No image stored with scan",
    );

    return NextResponse.json({ success: true, id: scan.id, scanId: scan.id });
  } catch (error) {
    logger.error({ err: error }, "Analysis Pipeline Error");
    captureException(error);
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json(
        { error: "Failed to process food label", details: message, stack },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Failed to process food label" },
      { status: 500 },
    );
  }
}
