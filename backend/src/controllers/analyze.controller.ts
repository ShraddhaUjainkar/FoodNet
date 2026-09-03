import { Request, Response, NextFunction } from "express";
import { runOCR } from "../services/ocr.service.js";
import { normalizeAndMatchIngredients } from "../services/normalizer.service.js";
import {
  calculateHealthScore,
  calculateProductMetadata,
  calculateGrade,
} from "../services/analyzer.service.js";
import { generateAISummary } from "../services/ai.service.js";
import { scanRepository } from "../repositories/scan.repository.js";
import { analyzeQueue } from "../config/redis.js";
import { uploadImageFromDataUrl } from "../services/storage.service.js";
import { logger, captureException } from "../config/logger.js";
import { INITIAL_PROGRESS_STATE } from "../services/progress.service.js";

export async function analyzeController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { image = "", filename = "", text = "" } = req.body;

    if (!image && !filename && !text) {
      res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Image, filename, or text is required",
        },
      });
      return;
    }

    if (image) {
      const match = /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i.exec(
        image,
      );

      if (!match) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_IMAGE_FORMAT",
            message:
              "Invalid image format. Use data:image/png|jpeg|jpg|webp;base64,...",
          },
        });
        return;
      }

      const mime = match[1].toLowerCase();
      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, "base64");

      const maxBytes = Number(process.env.MAX_IMAGE_BYTES || 5 * 1024 * 1024);
      if (buffer.length > maxBytes) {
        res.status(413).json({
          success: false,
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: "Image exceeds maximum allowed size (5MB)",
            maxBytes,
          },
        });
        return;
      }

      const finalFilename =
        filename ||
        `upload.${
          mime === "image/jpeg" || mime === "image/jpg"
            ? "jpg"
            : mime.split("/")[1]
        }`;

      try {
        const uploaded = await uploadImageFromDataUrl(image, "foodnet/uploads");

        const job = await analyzeQueue.add("image-analysis", {
          storageKey: uploaded.key,
          imageUrl: uploaded.url,
          filename: finalFilename,
          text,
          userContext: (req as any).user,
        });

        await job.updateProgress(INITIAL_PROGRESS_STATE);

        res.status(202).json({
          enqueued: true,
          jobId: job.id,
          storageKey: uploaded.key,
          imageUrl: uploaded.url,
        });
        return;
      } catch (error) {
        logger.error(
          { err: error },
          "Image upload or analysis job enqueue failed",
        );
        captureException(error);
        res.status(500).json({
          success: false,
          error: {
            code: "UPLOAD_FAILED",
            message: "Failed to upload image",
          },
        });
        return;
      }
    }

    // Synchronous raw text execution path
    let rawText = text;
    if (!rawText) {
      console.log("Step 2 (Sync): Running OCR text extraction...");
      rawText = await runOCR(image, filename || "label.png");
      console.log(
        `Step 2 (Sync): OCR complete. Extracted text length: ${rawText.length}`,
      );
    } else {
      console.log(
        `Step 2 (Sync): Using provided raw text. Length: ${rawText.length}`,
      );
    }

    console.log("Step 3 (Sync): Normalizing and matching ingredients...");
    const matchedIngredients = await normalizeAndMatchIngredients(rawText);
    console.log(
      `Step 3 (Sync): Normalization complete. Matched: ${matchedIngredients.length} ingredients`,
    );

    console.log("Step 4 (Sync): Calculating health score and grade...");
    const { score, recommendation } = calculateHealthScore(matchedIngredients);
    console.log(`Step 4 (Sync): Health score: ${score}`);

    console.log("Step 5 (Sync): Generating AI product summary...");
    const aiResult = await generateAISummary({
      rawText,
      ingredients: matchedIngredients,
      score,
      recommendation,
    });
    console.log("Step 5 (Sync): AI summary generation complete.");

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

    console.log("Step 6 (Sync): Saving scan to database repository...");
    const scanId = Math.random().toString(36).substring(7);
    const scan = await scanRepository.saveScan(scanId, {
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
      image: undefined,
    }, (req as any).user);

    console.log(`Step 6 (Sync): Scan saved successfully with ID: ${scan.id}`);
    logger.info({ scanId: scan.id }, "Scan processed and saved successfully");

    res.status(200).json({
      success: true,
      id: scan.id,
      scanId: scan.id,
    });
  } catch (error) {
    console.error("Error occurred in analyze pipeline:", error);
    logger.error({ err: error }, "Analysis Pipeline Error");
    captureException(error);
    next(error);
  }
}
