import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import { runOCR } from '../services/ocr.service.js';
import { normalizeAndMatchIngredients } from '../services/normalizer.service.js';
import {
  calculateHealthScore,
  calculateGrade,
  calculateProductMetadata,
} from '../services/analyzer.service.js';
import { generateAISummary } from '../services/ai.service.js';
import { getImageSignedUrl } from '../services/storage.service.js';
import { scanRepository } from '../repositories/scan.repository.js';
import { logger, captureException } from '../config/logger.js';
import { updateAnalysisProgress, StepName, ProgressState } from '../services/progress.service.js';

const queueName = 'analyze';

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
      console.log(`[Job ${job.id}] Step 0: Worker started processing job payload.`);
      logger.info({ jobId: job.id }, 'Worker started processing job');
      let rawText = text || '';
      let imageForOCR = image;

      // Transition upload to ocr
      await updateAnalysisProgress(job, {
        currentStep: 'ocr',
        progress: 20,
        steps: {
          upload: 'completed',
          ocr: 'processing'
        }
      });

      if (!rawText && (imageUrl || storageKey)) {
        console.log(`[Job ${job.id}] Step 1: Downloading image from storage...`);
        const ocrUrl =
          imageUrl || (await getImageSignedUrl(storageKey!, 10 * 60));
        if (ocrUrl) {
          const response = await fetch(ocrUrl);
          if (!response.ok) {
            throw new Error(`Storage download failed: ${response.status}`);
          }
          const buffer = Buffer.from(await response.arrayBuffer());
          const contentType =
            response.headers.get('content-type') || 'image/png';
          imageForOCR = `data:${contentType};base64,${buffer.toString('base64')}`;
          console.log(`[Job ${job.id}] Step 1: Image downloaded successfully. Size: ${buffer.length} bytes`);
        }
      }

      if (!rawText && imageForOCR) {
        console.log(`[Job ${job.id}] Step 2: Running OCR text extraction...`);
        rawText = await runOCR(imageForOCR, filename || 'label.png');
        console.log(`[Job ${job.id}] Step 2: OCR complete. Extracted text length: ${rawText.length}`);
      } else if (rawText) {
        console.log(`[Job ${job.id}] Step 2: Skipping OCR, using raw text payload.`);
      }

      // Transition ocr to identify
      await updateAnalysisProgress(job, {
        currentStep: 'identify',
        progress: 40,
        steps: {
          ocr: 'completed',
          identify: 'processing'
        }
      });

      console.log(`[Job ${job.id}] Step 3: Normalizing and matching ingredients...`);
      const matchedIngredients = await normalizeAndMatchIngredients(rawText);
      console.log(`[Job ${job.id}] Step 3: Normalization complete. Matched: ${matchedIngredients.length} ingredients`);

      // Transition identify to health
      await updateAnalysisProgress(job, {
        currentStep: 'health',
        progress: 65,
        steps: {
          identify: 'completed',
          health: 'processing'
        }
      });

      console.log(`[Job ${job.id}] Step 4: Calculating health score and grade...`);
      const { score, recommendation } =
        calculateHealthScore(matchedIngredients);
      console.log(`[Job ${job.id}] Step 4: Health score: ${score}`);

      // Transition health to report
      await updateAnalysisProgress(job, {
        currentStep: 'report',
        progress: 85,
        steps: {
          health: 'completed',
          report: 'processing'
        }
      });

      console.log(`[Job ${job.id}] Step 5: Generating AI product summary...`);
      const aiResult = await generateAISummary({
        rawText,
        ingredients: matchedIngredients,
        score,
        recommendation,
      });
      console.log(`[Job ${job.id}] Step 5: AI summary generated successfully.`);

      const finalScoreInfo = calculateHealthScore(matchedIngredients);
      const finalGrade = calculateGrade(finalScoreInfo.score);
      
      const formattedDate = new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(new Date());

      const staticMetadata = calculateProductMetadata(
        matchedIngredients,
        filename || 'label.png',
      );
      const metadata = {
        name: `Scan - ${formattedDate}`,
        brand: aiResult.brand || staticMetadata.brand,
        emoji: aiResult.emoji || staticMetadata.emoji,
        gradient: aiResult.gradient || staticMetadata.gradient,
        nutrition: aiResult.nutrition || staticMetadata.nutrition,
        alternatives: aiResult.alternatives || staticMetadata.alternatives,
      };

      console.log(`[Job ${job.id}] Step 6: Saving scan report to database...`);
      const scanId = Math.random().toString(36).substring(7);
      const scan = await scanRepository.saveScan(scanId, {
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
        image: imageUrl || image || storageKey || undefined,
      });

      console.log(`[Job ${job.id}] Step 6: Scan saved successfully with ID: ${scan.id}`);
      logger.info({ jobId: job.id, scanId: scan.id }, 'Job completed successfully');

      // Transition to final completion
      await updateAnalysisProgress(job, {
        currentStep: null,
        progress: 100,
        steps: {
          report: 'completed'
        }
      });

      return { success: true, id: scan.id };
    } catch (error) {
      console.error(`[Job ${job.id}] Error occurred in background processing:`, error);
      
      let failedStep: StepName = 'upload';
      let failedProgress = 0;
      
      const currentProgress = (job.progress as ProgressState);
      if (currentProgress && currentProgress.currentStep) {
        failedStep = currentProgress.currentStep;
        failedProgress = currentProgress.progress;
      }
      
      try {
        await updateAnalysisProgress(job, {
          progress: failedProgress,
          steps: { [failedStep]: 'failed' },
          error: error instanceof Error ? error.message : 'An unexpected error occurred.'
        });
      } catch (progressErr) {
        logger.error({ err: progressErr }, 'Failed to save progress error state');
      }

      logger.error({ err: error, jobId: job.id }, 'Worker processing failed');
      captureException(error);
      throw error;
    }
  },
  {
    connection: redisConnection,
  }
);

worker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, err: error }, 'Job execution failed');
});

logger.info('OCR worker process started, listening for analyze queue jobs...');
