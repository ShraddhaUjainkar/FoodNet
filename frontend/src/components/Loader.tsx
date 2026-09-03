"use client";

import { RefreshCw, Sparkles, AlertCircle } from "lucide-react";

interface ReloadOverlayProps {
  title?: string;
  description?: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onClose?: () => void;
}

export default function ReloadOverlay({
  title = "Refreshing data",
  description = "Please wait while we reload the latest information.",
  isLoading = true,
  error = null,
  onRetry,
  onClose,
}: ReloadOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#211817]/25 px-4 backdrop-blur-[5px] animate-in fade-in duration-300">
      {/* Glass Card */}
      <div className="w-full max-w-[440px] overflow-hidden rounded-[14px] border border-[#FFE0D8] bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(255,248,246,0.97)_48%,rgba(255,236,230,0.95)_100%)] px-7 py-7 shadow-[0_24px_80px_rgba(255,75,63,0.18),0_18px_54px_rgba(15,23,42,0.16)] backdrop-blur-xl animate-in zoom-in-[0.97] fade-in duration-300 text-center">
        {/* Animated Icon Circle */}
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#FFE9E4] text-[#FF3B30] shadow-[0_8px_20px_rgba(255,75,63,0.16)]">
          {error ? (
            <AlertCircle size={24} strokeWidth={2.3} />
          ) : isLoading ? (
            <RefreshCw size={24} strokeWidth={2.3} className="animate-spin" />
          ) : (
            <Sparkles size={24} strokeWidth={2.3} className="animate-pulse" />
          )}
        </div>

        {/* Text Details */}
        <h2 className="text-[18px] font-bold leading-tight text-[#171717]">
          {error ? "Something went wrong" : title}
        </h2>
        
        <p className="mt-2 text-[13px] leading-5 text-[#5F6368] px-4">
          {error ? error : description}
        </p>

        {/* Progress Bar (Pulsing placeholder) */}
        {!error && isLoading && (
          <div className="mt-6 px-4">
            <div className="h-[6px] w-full overflow-hidden rounded-full bg-[#FFE8E2]">
              <div className="h-full rounded-full bg-gradient-to-r from-[#FF3B30] to-[#FF6A00] animate-pulse w-full" />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {(error || !isLoading) && (
          <div className="mt-6 flex flex-col gap-2">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="w-full rounded-[10px] bg-[#FF3B30] py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#E0241B] active:scale-95 transition-all cursor-pointer"
              >
                Try Again
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-[10px] bg-zinc-100 hover:bg-zinc-200 py-2.5 text-xs font-bold text-zinc-700 active:scale-95 transition-all cursor-pointer"
              >
                Close
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
