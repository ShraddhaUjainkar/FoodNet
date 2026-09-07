"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Check, RefreshCw, FastForward } from "lucide-react";

interface TypewriterSummaryProps {
  summary: string;
  speedMs?: number;
  className?: string;
}

function splitSummary(summary: string) {
  if (!summary) return { main: "", highlight: "" };
  const sentences = summary.split(". ");
  if (sentences.length > 1) {
    const last = sentences[sentences.length - 1].trim();
    if (
      last.includes("moderation") ||
      last.includes("consumption") ||
      last.includes("swaps") ||
      last.toLowerCase().includes("safe to eat")
    ) {
      return {
        main: sentences.slice(0, sentences.length - 1).join(". ") + ".",
        highlight: last,
      };
    }
  }
  return { main: summary, highlight: "" };
}

export default function TypewriterSummary({
  summary,
  speedMs = 12,
  className = "",
}: TypewriterSummaryProps) {
  const { main, highlight } = splitSummary(summary);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [showHighlight, setShowHighlight] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setDisplayedText("");
    setIsTyping(true);
    setShowHighlight(false);

    if (!main) {
      setIsTyping(false);
      setShowHighlight(true);
      return;
    }

    let currentIndex = 0;
    const targetLength = main.length;

    function tick() {
      if (currentIndex < targetLength) {
        const step =
          currentIndex + 2 <= targetLength && Math.random() > 0.4 ? 2 : 1;
        currentIndex = Math.min(currentIndex + step, targetLength);
        setDisplayedText(main.slice(0, currentIndex));

        const jitter = Math.floor(Math.random() * 6) - 3;
        const delay = Math.max(6, speedMs + jitter);
        timerRef.current = setTimeout(tick, delay);
      } else {
        setIsTyping(false);
        setTimeout(() => setShowHighlight(true), 100);
      }
    }

    timerRef.current = setTimeout(tick, 80);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [main, speedMs, runKey]);

  const handleSkip = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setDisplayedText(main);
    setIsTyping(false);
    setShowHighlight(true);
  };

  const handleReplay = () => {
    setRunKey((prev) => prev + 1);
  };

  return (
    <div className={`flex flex-col gap-1.5 text-left ${className}`}>
      {/* Top AI Status Row - Compact & Subdued */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isTyping ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200/60 rounded-md px-2 py-0.5">
              <Sparkles className="w-2.5 h-2.5 text-orange-500 animate-spin" />
              AI Analyzing...
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-md px-2 py-0.5">
              <Check className="w-2.5 h-2.5 text-emerald-600" />
              AI Verdict
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isTyping && (
            <button
              onClick={handleSkip}
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-zinc-400 hover:text-zinc-700 transition-colors px-1 py-0.5 rounded cursor-pointer"
              title="Skip typing animation"
            >
              <FastForward className="w-2.5 h-2.5" />
              Skip
            </button>
          )}
          {!isTyping && (
            <button
              onClick={handleReplay}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-400 hover:text-orange-600 transition-colors px-1 py-0.5 rounded cursor-pointer"
              title="Replay AI verdict"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              Replay
            </button>
          )}
        </div>
      </div>

      {/* Main Text with Blinking AI Cursor */}
      <p className="text-zinc-700 text-xs sm:text-[13px] leading-relaxed font-normal">
        {displayedText}
        {isTyping && (
          <span className="inline-block w-1.5 h-3 bg-orange-500 ml-0.5 rounded-2xs animate-pulse align-middle" />
        )}
      </p>

      {/* Compact Highlight Callout - No huge empty box */}
      {highlight && (
        <div
          className={`transition-all duration-300 ${
            showHighlight
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-0.5 pointer-events-none"
          }`}
        >
          <div className="flex items-start gap-1.5 text-xs font-semibold text-zinc-850 bg-orange-50/80 border border-orange-200/60 rounded-lg px-2.5 py-1.5">
            <span className="text-orange-600 font-bold shrink-0">💡 Advice:</span>
            <span>{highlight}</span>
          </div>
        </div>
      )}
    </div>
  );
}
