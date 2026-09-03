"use client";

import { Check, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

const steps = [
  {
    title: "Uploading image",
    description: "Preparing your label image",
  },
  {
    title: "Reading the label",
    description: "Extracting ingredients from the image",
  },
  {
    title: "Identifying ingredients",
    description: "Matching with our database",
  },
  {
    title: "Evaluating product health",
    description: "Calculating score and warnings",
  },
  {
    title: "Preparing your report",
    description: "Generating insights and alternatives",
  },
];

interface ProgressStep {
  status: "pending" | "processing" | "completed" | "failed";
  title: string;
  description: string;
}

interface ProgressStateProp {
  progress?: number;
  currentStep?: string | null;
  steps?: Record<string, ProgressStep>;
  error?: string | null;
  isFallback?: boolean;
  status?: string;
}

export default function AnalysisProgressOverlay({
  progressState,
  onClose,
  onAnimationComplete,
}: {
  progressState?: ProgressStateProp | null;
  onClose?: () => void;
  onAnimationComplete?: () => void;
}) {
  const [renderedProgress, setRenderedProgress] = useState(0);
  const [renderedStepIndex, setRenderedStepIndex] = useState(0);
  const [lastStepUpdate, setLastStepUpdate] = useState(Date.now());
  const MIN_STEP_DURATION = 1200; // ms per step for a premium, smooth transition

  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const [simulatedCompletedSteps, setSimulatedCompletedSteps] = useState(0);

  useEffect(() => {
    if (progressState && !progressState.isFallback) return;

    const timers = [
      setTimeout(() => {
        setSimulatedProgress(20);
        setSimulatedCompletedSteps(1);
      }, 1400),
      setTimeout(() => {
        setSimulatedProgress(40);
        setSimulatedCompletedSteps(2);
      }, 2800),
      setTimeout(() => {
        setSimulatedProgress(65);
        setSimulatedCompletedSteps(3);
      }, 4200),
      setTimeout(() => {
        setSimulatedProgress(85);
        setSimulatedCompletedSteps(4);
      }, 5600),
      setTimeout(() => {
        setSimulatedProgress(100);
        setSimulatedCompletedSteps(5);
      }, 7000),
    ];

    return () => timers.forEach(clearTimeout);
  }, [progressState]);

  // Smooth animation logic for progress and step indices
  useEffect(() => {
    const errorMsg = progressState?.error || null;
    if (errorMsg) return; // Do not animate further if there is an error

    const targetProgress = progressState && !progressState.isFallback && progressState.progress !== undefined
      ? progressState.progress
      : simulatedProgress;

    // Determine the backend target step index
    let targetStepIndex = 0;
    if (progressState && !progressState.isFallback) {
      if (progressState.status === "completed") {
        targetStepIndex = 5;
      } else if (progressState.currentStep) {
        const stepKeys = ["upload", "ocr", "identify", "health", "report"];
        targetStepIndex = stepKeys.indexOf(progressState.currentStep);
        if (targetStepIndex === -1) targetStepIndex = 0;
      }
    } else {
      targetStepIndex = simulatedCompletedSteps;
    }

    const interval = setInterval(() => {
      let nextProgress = renderedProgress;
      let nextStepIndex = renderedStepIndex;

      // 1. Advance progress smoothly
      if (renderedProgress < targetProgress) {
        const diff = targetProgress - renderedProgress;
        const increment = Math.max(1, Math.min(3, Math.ceil(diff / 8)));
        nextProgress = Math.min(renderedProgress + increment, targetProgress);
        setRenderedProgress(nextProgress);
      }

      // 2. Advance step index smoothly if MIN_STEP_DURATION has passed
      const now = Date.now();
      const elapsed = now - lastStepUpdate;

      if (renderedStepIndex < targetStepIndex && (elapsed >= MIN_STEP_DURATION || renderedStepIndex === 0)) {
        nextStepIndex = renderedStepIndex + 1;
        setRenderedStepIndex(nextStepIndex);
        setLastStepUpdate(now);
      }

      // 3. If everything is complete, trigger the complete callback
      if (nextProgress === 100 && nextStepIndex === 5) {
        clearInterval(interval);
        onAnimationComplete?.();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [
    progressState,
    simulatedProgress,
    simulatedCompletedSteps,
    renderedProgress,
    renderedStepIndex,
    lastStepUpdate,
    onAnimationComplete,
  ]);

  let progress = renderedProgress;
  let errorMsg = null;

  if (progressState) {
    errorMsg = progressState.error || null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#211817]/25 px-4 backdrop-blur-[5px] animate-in fade-in duration-300">
      {/* Glass Card */}
      <div className="w-full max-w-[544px] overflow-hidden rounded-[14px] border border-[#FFE0D8] bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(255,248,246,0.97)_48%,rgba(255,236,230,0.95)_100%)] px-7 py-7 shadow-[0_24px_80px_rgba(255,75,63,0.18),0_18px_54px_rgba(15,23,42,0.16)] backdrop-blur-xl animate-in zoom-in-[0.97] fade-in duration-300">
        {/* Header */}
        <div className="mb-7 flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFE9E4] text-[#FF3B30] shadow-[0_8px_20px_rgba(255,75,63,0.16)]">
            <Sparkles size={18} strokeWidth={2.3} />
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="text-[18px] font-bold leading-tight text-[#171717]">
              Analyzing your food label
            </h2>

            <p className="mt-1 text-[13px] leading-5 text-[#5F6368]">
              We're checking what's inside your product
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close progress overlay"
            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#1F2937] transition-colors hover:bg-black/[0.06] focus:outline-none focus:ring-2 focus:ring-[#FF3B30]/30"
          >
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        {/* Steps */}
        <div className="px-3">
          {steps.map((step, index) => {
            const stepKey = ["upload", "ocr", "identify", "health", "report"][
              index
            ];

            let completed = index < renderedStepIndex;
            let active = index === renderedStepIndex;
            let failed = false;

            if (progressState && errorMsg) {
              const targetFailedIndex = progressState.currentStep
                ? ["upload", "ocr", "identify", "health", "report"].indexOf(progressState.currentStep)
                : -1;
              if (index === targetFailedIndex) {
                failed = true;
                active = false;
              } else if (index > targetFailedIndex) {
                active = false;
                completed = false;
              } else {
                completed = true;
                active = false;
              }
            }

            return (
              <div key={step.title} className="relative flex gap-5">
                {/* Connector */}
                {index !== steps.length - 1 && (
                  <div className="absolute left-[13px] top-[27px] h-[44px] w-[2px] bg-[#E3E5E8]">
                    <div
                      className="
                        absolute left-0 top-0
                        w-full
                        bg-[#FF3B30]
                        transition-all
                        duration-700
                        ease-out
                      "
                      style={{
                        height: completed ? "100%" : "0%",
                      }}
                    />
                  </div>
                )}

                {/* Status Circle */}
                <div
                  className={`relative z-10 flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full border transition-all duration-500 ${
                    failed
                      ? "border-[#FF4B3F] bg-[#FF4B3F] text-white"
                      : completed
                        ? "border-[#FF4B3F] bg-[#FF4B3F] text-white"
                        : active
                          ? "border-[#FFD8D2] bg-[#FFE6E2] shadow-[0_0_0_8px_rgba(255,75,63,0.12)]"
                          : "border-[#D2D6DD] bg-[#FFF8F6]"
                  }`}
                >
                  {failed ? (
                    <span className="text-[11px] font-bold">✕</span>
                  ) : completed ? (
                    <Check size={14} strokeWidth={3} />
                  ) : active ? (
                    <span className="h-[10px] w-[10px] rounded-full bg-[#FF4B3F] animate-pulse" />
                  ) : (
                    <span className="h-[5px] w-[5px] rounded-full bg-[#D4D4D4]" />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 pb-[19px]">
                  <div className="flex min-h-[27px] items-center gap-3">
                    <p className="text-[15px] font-bold leading-tight transition-colors duration-500 text-[#171717]">
                      {step.title}
                    </p>

                    {/* Active indicator */}
                    {active && progress < 100 && (
                      <span className="ml-auto rounded-full bg-[#FFE1DC] px-3 py-1 text-[11px] font-medium leading-none text-[#FF3B30] shadow-[0_5px_14px_rgba(255,75,63,0.12)]">
                        Processing
                      </span>
                    )}
                  </div>

                  <p className="text-[13px] leading-5 transition-colors duration-500 text-[#5F6368]">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress */}
        <div className="mt-2 border-t border-[#FFDCD4] pt-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[13px] font-medium text-[#5F6368]">
              Analysis progress
            </span>

            <span className="text-[15px] font-bold text-[#FF3B30]">
              {progress}%
            </span>
          </div>

          {/* Track */}
          <div className="h-[6px] overflow-hidden rounded-full bg-[#FFE8E2]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FF3B30] to-[#FF6A00] transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>

        {/* Error State */}
        {errorMsg && (
          <div className="mt-4 rounded-[12px] bg-[#FFF1EF] border border-[#FFE3E0] p-3 text-left">
            <p className="text-[11px] font-bold text-[#FF3B30]">
              Analysis Failed
            </p>
            <p className="text-[10px] text-[#FF4A3D] mt-0.5">{errorMsg}</p>
            <button
              onClick={onClose || (() => window.location.reload())}
              className="mt-3 w-full rounded-[10px] bg-[#FF3B30] py-2 text-[11px] font-bold text-white shadow-md active:scale-95 transition-all"
            >
              Go Back
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
