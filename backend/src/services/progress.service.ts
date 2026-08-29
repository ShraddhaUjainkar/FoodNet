import { Job } from 'bullmq';

export type StepName = 'upload' | 'ocr' | 'identify' | 'health' | 'report';
export type StepStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ProgressState {
  currentStep: StepName | null;
  progress: number;
  steps: {
    upload: StepStatus;
    ocr: StepStatus;
    identify: StepStatus;
    health: StepStatus;
    report: StepStatus;
  };
  error?: string | null;
}

export const STEP_METADATA = {
  upload: { title: 'Uploading image', description: 'Preparing your label image' },
  ocr: { title: 'Reading the label', description: 'Extracting ingredients' },
  identify: { title: 'Identifying ingredients', description: 'Matching with our database' },
  health: { title: 'Evaluating product health', description: 'Calculating score and warnings' },
  report: { title: 'Preparing your report', description: 'Generating insights' }
};

export const INITIAL_PROGRESS_STATE: ProgressState = {
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

export async function updateAnalysisProgress(
  job: Job,
  update: {
    currentStep?: StepName | null;
    progress?: number;
    steps?: Partial<ProgressState['steps']>;
    error?: string | null;
  }
) {
  let currentProgress: ProgressState = (job.progress as ProgressState);

  // Parse if it was serialized as a string or is invalid
  if (!currentProgress || typeof currentProgress !== 'object' || !currentProgress.steps) {
    currentProgress = {
      currentStep: 'upload',
      progress: 0,
      steps: {
        upload: 'pending',
        ocr: 'pending',
        identify: 'pending',
        health: 'pending',
        report: 'pending'
      },
      error: null
    };
  }

  const steps = { ...currentProgress.steps };
  if (update.steps) {
    Object.assign(steps, update.steps);
  }

  const updatedProgress: ProgressState = {
    currentStep: update.currentStep !== undefined ? update.currentStep : currentProgress.currentStep,
    progress: update.progress !== undefined ? update.progress : currentProgress.progress,
    steps,
    error: update.error !== undefined ? update.error : currentProgress.error
  };

  await job.updateProgress(updatedProgress);
}
