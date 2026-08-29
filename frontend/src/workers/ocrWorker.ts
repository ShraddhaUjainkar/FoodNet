import { QueueScheduler, Worker } from "bullmq";
import Redis from "ioredis";
import { generateAISummary } from "@/lib/ai";
import {
  calculateGrade,
  calculateHealthScore,
  calculateProductMetadata,
} from "@/lib/analyzer";
import { db } from "@/lib/db";
import { logger, captureException } from "@/lib/logger";
import { normalizeAndMatchIngredients } from "@/lib/normalizer";
import { runOCR } from "@/lib/ocr";
import { getImageSignedUrl } from "@/lib/storage";

const connection = {
  connection: new Redis(process.env.REDIS_URL || "redis://localhost:6379"),
} as any;
const queueName = "analyze";

new QueueScheduler(queueName, connection);

const worker = new Worker(
  queueName,
  async (job) => {
    const { image, imageUrl, filename, text, storageKey } = job.data as {
      image?: string;
      imageUrl?: string;
      filename?: string;
      text?: string;
      storageKey?: string;
    };

    try {
      let rawText = text || "";
      let imageForOCR = image;

      if (!rawText && (imageUrl || storageKey)) {
        const ocrUrl =
          imageUrl || (await getImageSignedUrl(storageKey!, 10 * 60));
        if (ocrUrl) {
          const response = await fetch(ocrUrl);
          if (!response.ok) {
            throw new Error(`Storage download failed: ${response.status}`);
          }
          const buffer = Buffer.from(await response.arrayBuffer());
          const contentType =
            response.headers.get("content-type") || "image/png";
          imageForOCR = `data:${contentType};base64,${buffer.toString("base64")}`;
        }
      }

      if (!rawText && imageForOCR) {
        rawText = await runOCR(imageForOCR, filename || "label.png");
        console.log("----- Extracted OCR text -----");
        console.log({ jobId: job.id, filename, text: rawText });
        console.log("------------------------------");
      }

      const matchedIngredients = await normalizeAndMatchIngredients(rawText);
      const { score, recommendation } =
        calculateHealthScore(matchedIngredients);
      const aiResult = await generateAISummary({
        rawText,
        ingredients: matchedIngredients,
        score,
        recommendation,
      });
      const finalScoreInfo = calculateHealthScore(matchedIngredients);
      const finalGrade = calculateGrade(finalScoreInfo.score);
      const formattedDate = new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date());
      const staticMetadata = calculateProductMetadata(
        matchedIngredients,
        filename || "label.png",
      );
      const metadata = {
        name: `Scan - ${formattedDate}`,
        brand: aiResult.brand || staticMetadata.brand,
        emoji: aiResult.emoji || staticMetadata.emoji,
        gradient: aiResult.gradient || staticMetadata.gradient,
        nutrition: aiResult.nutrition || staticMetadata.nutrition,
        alternatives: aiResult.alternatives || staticMetadata.alternatives,
      };

      const scan = await db.saveScan(Math.random().toString(36).substring(7), {
        name: metadata.name,
        brand: metadata.brand,
        score: finalScoreInfo.score,
        grade: finalGrade,
        summary: aiResult.summary,
        allergens: finalScoreInfo.foundAllergens,
        ingredients: matchedIngredients.map((ingredient) => ({
          name: ingredient.name,
          rating: ingredient.rating,
          description: ingredient.description,
          percentage: ingredient.percentage,
          commonUses: ingredient.commonUses,
          evidenceLevel: ingredient.evidenceLevel,
        })),
        additives: finalScoreInfo.flaggedAdditives,
        nutrition: metadata.nutrition,
        alternatives: metadata.alternatives,
        emoji: metadata.emoji,
        gradient: metadata.gradient,
        // Keep the exact URL returned by Cloudinary in the scan record.
        image: imageUrl || image || storageKey || undefined,
      });

      return { success: true, id: scan.id };
    } catch (error) {
      logger.error({ err: error, jobId: job.id }, "Worker processing failed");
      captureException(error);
      throw error;
    }
  },
  connection,
);

worker.on("failed", (job, error) => {
  logger.error({ jobId: job?.id, err: error }, "Job failed");
});

logger.info("OCR worker started, listening for analyze jobs...");
