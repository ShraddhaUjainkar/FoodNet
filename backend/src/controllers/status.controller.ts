import { Request, Response, NextFunction } from 'express';
import { analyzeQueue } from '../config/redis.js';
import { scanRepository } from '../repositories/scan.repository.js';
import { logger, captureException } from '../config/logger.js';
import { STEP_METADATA, StepName, ProgressState } from '../services/progress.service.js';

export async function getStatusController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const job = await analyzeQueue.getJob(id);
    if (!job) {
      const scan = await scanRepository.getScan(id);
      if (scan) {
        res.status(200).json({
          jobId: id,
          status: 'completed',
          progress: 100,
          currentStep: null,
          steps: {
            upload: { status: 'completed', ...STEP_METADATA.upload },
            ocr: { status: 'completed', ...STEP_METADATA.ocr },
            identify: { status: 'completed', ...STEP_METADATA.identify },
            health: { status: 'completed', ...STEP_METADATA.health },
            report: { status: 'completed', ...STEP_METADATA.report }
          },
          scanId: id,
          scan,
          returnValue: { success: true, id },
          error: null
        });
        return;
      }
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Job status not found',
        },
      });
      return;
    }

    const state = await job.getState();
    const returnValue = job.returnvalue || null;

    let scan = null;
    let scanId = null;
    if (returnValue && typeof returnValue === 'object' && (returnValue as any).id) {
      scanId = (returnValue as any).id;
      scan = await scanRepository.getScan(scanId);
    }

    // Extract progress state
    let progress: ProgressState = job.progress as ProgressState;
    if (!progress || typeof progress !== 'object' || !progress.steps) {
      progress = {
        currentStep: 'upload',
        progress: 0,
        steps: {
          upload: 'processing',
          ocr: 'pending',
          identify: 'pending',
          health: 'pending',
          report: 'pending'
        },
        error: null
      };
    }

    // Build user-facing steps metadata
    const stepNames: StepName[] = ['upload', 'ocr', 'identify', 'health', 'report'];
    const stepsPayload: Record<string, any> = {};
    for (const name of stepNames) {
      let stepStatus = progress.steps[name] || 'pending';
      if (state === 'completed') {
        stepStatus = 'completed';
      } else if (state === 'failed' && progress.currentStep === name) {
        stepStatus = 'failed';
      }
      stepsPayload[name] = {
        status: stepStatus,
        title: STEP_METADATA[name].title,
        description: STEP_METADATA[name].description
      };
    }

    const isCompleted = state === 'completed';
    const isFailed = state === 'failed';
    const finalStatus = isCompleted ? 'completed' : isFailed ? 'failed' : 'active';

    res.status(200).json({
      jobId: job.id,
      status: finalStatus,
      progress: isCompleted ? 100 : progress.progress,
      currentStep: isCompleted ? null : progress.currentStep,
      steps: stepsPayload,
      scanId: scanId || (isCompleted ? id : null),
      scan,
      returnValue,
      error: isFailed ? (progress.error || 'Analysis request failed') : null
    });
  } catch (error) {
    logger.error({ err: error, jobId: req.params.id }, 'Status lookup failed');
    captureException(error);
    next(error);
  }
}
