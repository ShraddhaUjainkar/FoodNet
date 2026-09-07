"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  CheckCircle,
  AlertTriangle,
  Lock,
  UserCheck,
  Sparkles,
  ArrowLeft,
  Heart,
  ShieldAlert,
  Scale,
  List,
  RefreshCw,
  Info,
  HelpCircle,
  FileText,
  Layers,
  Apple,
  Home,
  Leaf,
  Beaker,
  Activity,
  Flame,
  Droplets,
  Droplet,
  Check,
  Search,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  FileQuestionMark,
  BookOpen,
} from "lucide-react";
import { ScanRecord } from "@/lib/db";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ReloadOverlay from "@/components/Loader";
import TypewriterSummary from "@/components/TypewriterSummary";
import ScientificEvidenceCard from "@/components/ScientificEvidenceCard";

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

const getNutrientDetails = (label: string) => {
  const lower = label.toLowerCase();
  if (lower.includes("energy") || lower.includes("calories")) {
    return {
      icon: Flame,
      iconClass: "text-red-500 bg-red-50 border-red-100/60",
      badgeClass: "text-red-700 bg-red-50 border border-red-100",
    };
  }
  if (lower.includes("sugar")) {
    return {
      icon: Droplets,
      iconClass: "text-amber-500 bg-amber-50 border-amber-100/60",
      badgeClass: "text-amber-700 bg-amber-50 border border-amber-100",
    };
  }
  if (lower.includes("fat")) {
    return {
      icon: Droplet,
      iconClass: "text-red-500 bg-red-50 border-red-100/60",
      badgeClass: "text-red-700 bg-red-50 border border-red-100",
    };
  }
  return {
    icon: Scale,
    iconClass: "text-zinc-500 bg-zinc-50 border-zinc-100",
    badgeClass: "text-zinc-700 bg-zinc-50 border border-zinc-100",
  };
};

export default function ScanResultPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id ?? "";

  const [report, setReport] = useState<ScanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    "overview" | "ingredients" | "additives" | "nutrition" | "evidence" | "faq"
  >("overview");
  const [selectedIngredient, setSelectedIngredient] = useState<
    ScanRecord["ingredients"][number] | null
  >(null);
  const [activeQaIndex, setActiveQaIndex] = useState<number | null>(null);

  // Fetch report data on mount (polls status API for job resolution)
  useEffect(() => {
    const API_URL = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
    ).replace(/\/$/, "");
    let intervalId: NodeJS.Timeout;

    async function checkStatus() {
      try {
        const res = await fetch(`${API_URL}/api/v1/analyze/status/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Report not found");
          }
          throw new Error("Failed to load report status");
        }
        const data = await res.json();

        if (data.status === "completed" && data.scan) {
          setReport(data.scan);
          setLoading(false);
          clearInterval(intervalId);
        } else if (data.status === "failed") {
          throw new Error("Analysis job execution failed");
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load report";
        setError(message);
        setLoading(false);
        clearInterval(intervalId);
      }
    }

    checkStatus();
    intervalId = setInterval(checkStatus, 1500);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [id]);

  // Color helpers
  const getGradeBadge = (grade: "A" | "B" | "C" | "D" | "E") => {
    const base =
      "w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-sm sm:text-base font-black text-white shadow-2xs shrink-0";
    switch (grade) {
      case "A":
        return `${base} bg-emerald-500`;
      case "B":
        return `${base} bg-green-500`;
      case "C":
        return `${base} bg-yellow-500`;
      case "D":
        return `${base} bg-orange-500`;
      case "E":
        return `${base} bg-red-500`;
    }
  };

  const getRatingIcon = (rating: "safe" | "caution" | "avoid" | "unknown") => {
    switch (rating) {
      case "safe":
        return <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />;
      case "caution":
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
      case "avoid":
        return <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />;
      case "unknown":
      default:
        return <HelpCircle className="w-4 h-4 text-zinc-400 shrink-0" />;
    }
  };

  const getRatingStyle = (rating: "safe" | "caution" | "avoid" | "unknown") => {
    switch (rating) {
      case "safe":
        return "border-emerald-100 bg-emerald-50/20 hover:bg-emerald-50/40 text-emerald-950 hover:border-emerald-250";
      case "caution":
        return "border-amber-100 bg-amber-50/20 hover:bg-amber-50/40 text-amber-950 hover:border-amber-250";
      case "avoid":
        return "border-red-100 bg-red-50/20 hover:bg-red-50/40 text-red-950 hover:border-red-250";
      case "unknown":
      default:
        return "border-zinc-200 bg-zinc-50/20 hover:bg-zinc-50/40 text-zinc-950 hover:border-zinc-250";
    }
  };

  const getNutritionBadge = (rating: "good" | "neutral" | "bad") => {
    switch (rating) {
      case "good":
        return "bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold px-2 py-0.5 rounded-lg";
      case "neutral":
        return "bg-zinc-50 text-zinc-700 border border-zinc-150 text-xs font-bold px-2 py-0.5 rounded-lg";
      case "bad":
        return "bg-red-50 text-red-700 border border-red-100 text-xs font-bold px-2 py-0.5 rounded-lg";
    }
  };

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="flex-1 min-h-screen bg-zinc-50/60 flex items-center justify-center">
        <ReloadOverlay
          title="Fetching Report"
          description="Retrieving chemical risk classifications and safety calculations."
          isLoading={true}
        />
      </div>
    );
  }

  // Error State
  if (error || !report) {
    return (
      <div className="flex-1 min-h-screen bg-zinc-50/60 flex items-center justify-center">
        <ReloadOverlay
          title="Analysis Not Found"
          description={`The scan identifier "${id}" could not be located in our database.`}
          isLoading={false}
          error={error || "Scan record not found"}
          onRetry={() => window.location.reload()}
          onClose={() => router.push("/")}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#F9F9FB] font-sans text-zinc-900 selection:bg-red-100 selection:text-red-900 min-h-screen">
      {/* HEADER NAVBAR */}
      <Header />

      {/* RESULT DASHBOARD BODY */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-3.5 sm:px-6 py-5 flex flex-col gap-3.5 animate-fade-in">
        {/* Top Minimal Action Bar */}
        <div className="flex items-center justify-between py-0.5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Scan Another Food</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-zinc-400">
              ID: {report.id}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              Verified
            </span>
          </div>
        </div>

        {/* UNIFIED HERO CARD: Compact, Responsive & High-Impact */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-4 sm:p-5 flex flex-col gap-3 text-left">
          {/* Top Row: Identity + Circular Score Ring & Grade */}
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            {/* Identity Group (Image + Brand + Title + Quick Badges) */}
            <div className="flex items-center gap-3 sm:gap-3.5 flex-1 min-w-0">
              {/* Responsive Image Container */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-zinc-50 border border-zinc-200/80 overflow-hidden shrink-0 shadow-2xs relative flex items-center justify-center">
                {report.image ? (
                  <img
                    src={report.image}
                    alt={report.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center text-zinc-400 p-1 text-center">
                    <FileText className="w-4 h-4 text-orange-400" />
                    <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-400">Text</span>
                  </div>
                )}
              </div>

              {/* Text Info */}
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 truncate">
                  {report.brand || "Food Product"}
                </span>
                <h1 className="text-base sm:text-lg font-black text-zinc-950 tracking-tight leading-snug line-clamp-1">
                  {report.name}
                </h1>

                {/* Quick Context Badges */}
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                    {report.ingredients.length} Ingredients
                  </span>
                  <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                    {report.additives.length} Additives
                  </span>
                  {report.evidence && report.evidence.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("evidence")}
                      className="text-[10px] font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200/60 px-1.5 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-2.5 h-2.5 text-orange-600" />
                      RAG Grounded
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Score & Grade Group: Visual Punch */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                  Verdict
                </span>
                <span className="text-xs font-bold text-zinc-850">
                  {report.score >= 70
                    ? "Good Choice"
                    : report.score >= 40
                      ? "Moderate Caution"
                      : "Avoid"}
                </span>
              </div>

              {/* Circular Gauge */}
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="28"
                    cy="28"
                    r="22"
                    stroke="#f4f4f5"
                    strokeWidth="4"
                    fill="transparent"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r="22"
                    stroke={
                      report.score >= 80
                        ? "#22c55e"
                        : report.score >= 60
                          ? "#10b981"
                          : report.score >= 40
                            ? "#ff6a00"
                            : "#ff3b30"
                    }
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 22}
                    strokeDashoffset={
                      2 * Math.PI * 22 * (1 - report.score / 100)
                    }
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xs sm:text-sm font-black text-zinc-950 leading-none">
                    {report.score}
                  </span>
                  <span className="text-[6px] text-zinc-400 font-bold uppercase">/100</span>
                </div>
              </div>

              {/* Grade Badge */}
              <div className={getGradeBadge(report.grade)}>
                {report.grade}
              </div>
            </div>
          </div>

          {/* Allergen Strip: Only if allergens exist */}
          {report.allergens.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-red-50/80 border border-red-200/60 rounded-xl text-left">
              <span className="text-red-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                Allergens:
              </span>
              {report.allergens.map((allergen, idx) => (
                <span
                  key={idx}
                  className="bg-white border border-red-200 text-red-600 text-xs font-bold px-2 py-0.5 rounded-md shadow-2xs"
                >
                  {allergen}
                </span>
              ))}
              <span className="text-[10px] text-red-500 font-medium ml-auto hidden sm:inline">
                Trace cross-contamination possible
              </span>
            </div>
          )}

          {/* AI Verdict Summary: Streamlined without oversized boxes */}
          <div className="bg-zinc-50/70 border border-zinc-150/70 rounded-xl p-3 sm:p-3.5">
            <TypewriterSummary summary={report.summary} />
          </div>
        </div>

        {/* MODERN SEGMENTED CONTROL TABS */}
        <div className="bg-zinc-100/90 p-1 rounded-xl flex items-center gap-1 overflow-x-auto scrollbar-none">
          {(
            [
              { id: "overview", label: "Overview", icon: Home },
              {
                id: "ingredients",
                label: `Ingredients (${report.ingredients.length})`,
                icon: Leaf,
              },
              {
                id: "additives",
                label: `Additives (${report.additives.length})`,
                icon: Beaker,
              },
              { id: "nutrition", label: "Nutrition", icon: Activity },
              {
                id: "evidence",
                label:
                  report.evidence && report.evidence.length > 0
                    ? `Evidence (${report.evidence.length})`
                    : "Evidence",
                icon: BookOpen,
              },
              { id: "faq", label: "FAQ", icon: FileQuestionMark },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-white text-zinc-950 shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB PANEL CONTENTS */}
        <div className="bg-white rounded-2xl border border-zinc-200/70 shadow-xs p-4 sm:p-5 min-h-[300px]">
          {/* 1. OVERVIEW PANEL */}
          {activeTab === "overview" && (
            <div className="flex flex-col gap-4">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                    {/* Ingredient Safety Card */}
                    <div className="border border-zinc-100 rounded-2xl p-5 flex flex-col gap-3 bg-white shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                          Ingredient Safety
                        </span>
                        <span className="text-xs font-bold text-zinc-500">
                          {report.ingredients.length} Total
                        </span>
                      </div>

                      <div className="flex items-end gap-1.5 mt-1">
                        <span className="text-3xl font-black text-zinc-950 leading-none">
                          {
                            report.ingredients.filter(
                              (i) =>
                                i.rating === "avoid" || i.rating === "caution",
                            ).length
                          }
                        </span>
                        <span className="text-xs font-bold text-zinc-400 mb-0.5">
                          attention recommendations
                        </span>
                      </div>

                      {/* Safety Slider Bar */}
                      <div className="relative w-full h-2 mt-2 rounded-full bg-zinc-100 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-orange-400 to-emerald-500 opacity-90" />
                        {(() => {
                          const avoids = report.ingredients.filter(
                            (i) => i.rating === "avoid",
                          ).length;
                          const cautions = report.ingredients.filter(
                            (i) => i.rating === "caution",
                          ).length;
                          const total = report.ingredients.length;
                          const safetyRatio =
                            total > 0 ? (avoids + cautions * 0.5) / total : 0;
                          const pos = Math.max(
                            0,
                            Math.min(100, 100 - safetyRatio * 100),
                          );
                          return (
                            <div
                              className="absolute top-0 bottom-0 right-0 bg-zinc-100 transition-all duration-700"
                              style={{ width: `${100 - pos}%` }}
                            />
                          );
                        })()}
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-extrabold tracking-wider mt-1 text-zinc-400">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          High Risk
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                          Moderate
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Low Risk
                        </span>
                      </div>
                    </div>

                    {/* Chemical Additives Card */}
                    <div className="border border-zinc-100 rounded-2xl p-5 flex flex-col gap-3 bg-white shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                          Chemical Additives
                        </span>
                        <span className="text-xs font-bold text-zinc-500">
                          {report.additives.length} Detected
                        </span>
                      </div>

                      <div className="flex items-end gap-1.5 mt-1">
                        <span className="text-3xl font-black text-zinc-955 leading-none">
                          {
                            report.additives.filter(
                              (a) =>
                                a.rating === "avoid" || a.rating === "caution",
                            ).length
                          }
                        </span>
                        <span className="text-xs font-bold text-zinc-400 mb-0.5">
                          risk-prone additives
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {report.additives.map((add, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1 bg-zinc-50 border border-zinc-150 rounded-lg px-2 py-0.5 shadow-sm"
                          >
                            <span className="text-zinc-800 text-[9px] font-black uppercase">
                              {add.code}
                            </span>
                          </div>
                        ))}
                        {report.additives.length === 0 && (
                          <span className="text-xs text-zinc-500 font-semibold">
                            Zero additives detected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Key Health Highlights */}
                  <div className="flex flex-col gap-4 border-t border-zinc-100 pt-6">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-black uppercase tracking-wider text-zinc-850">
                        Key Health Highlights
                      </h4>
                      <button
                        onClick={() => setActiveTab("nutrition")}
                        className="text-xs font-bold text-red-500 hover:text-red-650 transition-colors flex items-center gap-0.5"
                      >
                        View all details <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {report.nutrition.map((nut, idx) => {
                        const style = getNutrientDetails(nut.label);
                        const Icon = style.icon;
                        return (
                          <div
                            key={idx}
                            className="flex flex-col justify-between items-start border border-zinc-100 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition-all duration-300 gap-4 text-left"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${style.iconClass}`}
                              >
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex flex-col leading-tight">
                                <span className="text-[10px] text-zinc-400 font-extrabold tracking-tight uppercase">
                                  {nut.label}
                                </span>
                                <span className="text-sm font-black text-zinc-950 mt-0.5">
                                  {nut.value}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1 w-full border-t border-zinc-50 pt-3">
                              <p className="text-[11px] text-zinc-500 leading-normal font-medium">
                                {nut.description}
                              </p>
                              <div className="mt-2">
                                <span className={getNutritionBadge(nut.rating)}>
                                  {nut.rating === "good"
                                    ? "Favorable"
                                    : nut.rating === "neutral"
                                      ? "Neutral"
                                      : "Unfavorable"}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Recommendations */}
                  <div className="mt-2 border-t border-zinc-100 pt-6">
                    <div className="flex flex-col gap-0.5 text-left">
                      <h4 className="text-sm font-black uppercase tracking-wider text-zinc-850">
                        AI Recommendations
                      </h4>
                      <p className="text-xs text-zinc-400 font-semibold leading-relaxed">
                        Smart suggestions based on your health goals.
                      </p>
                    </div>

                    <div className="mt-4 border border-zinc-100 rounded-3xl p-5 bg-zinc-50/20 flex flex-col md:flex-row gap-6 justify-between items-stretch relative overflow-hidden">
                      <div className="flex flex-col gap-3 w-full md:max-w-xl z-10 text-left">
                        <div className="flex gap-3 items-center bg-white border border-zinc-100 rounded-2xl p-3.5 shadow-sm">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 shrink-0">
                            <Leaf className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-bold text-zinc-800">
                              Eat in Moderation
                            </span>
                            <span className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                              High sugar and fats content. Limit to small
                              portions.
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-3 items-center bg-white border border-zinc-100 rounded-2xl p-3.5 shadow-sm">
                          <div className="w-9 h-9 rounded-xl bg-[#FFF1EF] border border-[#FFE3E0] flex items-center justify-center text-[#FF3B30] shrink-0">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-bold text-zinc-800">
                              Read Labels
                            </span>
                            <span className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                              Always check ingredient list before buying.
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Scientific Evidence & Regulatory Citations (RAG) */}
                  <div className="border-t border-zinc-100 pt-6">
                    <ScientificEvidenceCard
                      evidence={report.evidence}
                      productName={report.name}
                    />
                  </div>
                </div>
              )}

              {/* 2. INGREDIENTS PANEL */}
              {activeTab === "ingredients" && (
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 text-left">
                      Ingredients Breakdown
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1 text-left">
                      We color-coded the label&apos;s ingredients by safety
                      ranking. Click any item to explore its safety dossier.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    {/* Left: Ingredients List */}
                    <div className="md:col-span-7 flex flex-col gap-2">
                      {report.ingredients.map((ing, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedIngredient(ing)}
                          className={`border rounded-xl p-3.5 flex justify-between items-center cursor-pointer transition-all duration-200 ${getRatingStyle(
                            ing.rating,
                          )} ${
                            selectedIngredient?.name === ing.name
                              ? "ring-2 ring-red-500 border-transparent translate-x-1"
                              : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {getRatingIcon(ing.rating)}
                            <span className="text-sm font-bold">
                              {ing.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {ing.percentage && (
                              <span className="text-xs font-semibold px-2 py-0.5 bg-white/70 rounded-md border border-zinc-100">
                                {ing.percentage}
                              </span>
                            )}
                            <span className="text-xs font-bold opacity-60 text-zinc-500">
                              Details →
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Right: Ingredient Detail Card Panel */}
                    <div className="md:col-span-5 border border-zinc-100 rounded-2xl p-5 bg-zinc-50/50 flex flex-col justify-between min-h-[300px]">
                      {selectedIngredient ? (
                        <div className="flex flex-col gap-4 text-left animate-fade-in">
                          <div className="flex justify-between items-start">
                            <span
                              className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border ${
                                selectedIngredient.rating === "safe"
                                  ? "bg-emerald-105 text-emerald-800 border-emerald-200"
                                  : selectedIngredient.rating === "caution"
                                    ? "bg-amber-105 text-amber-805 border-amber-200"
                                    : selectedIngredient.rating === "avoid"
                                      ? "bg-red-105 text-red-800 border-red-200"
                                      : "bg-zinc-100 text-zinc-800 border-zinc-200"
                              }`}
                            >
                              {selectedIngredient.rating === "safe"
                                ? "Green - Safe"
                                : selectedIngredient.rating === "caution"
                                  ? "Yellow - Caution"
                                  : selectedIngredient.rating === "avoid"
                                    ? "Red - Avoid"
                                    : "Unknown"}
                            </span>
                          </div>
                          <h4 className="text-base font-black text-zinc-950">
                            {selectedIngredient.name}
                          </h4>

                          {selectedIngredient.commonUses && (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                Common Uses
                              </span>
                              <span className="text-xs font-semibold text-zinc-800">
                                {selectedIngredient.commonUses}
                              </span>
                            </div>
                          )}

                          {selectedIngredient.evidenceLevel && (
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                Evidence Level
                              </span>
                              <span
                                className={`text-[10px] font-bold w-fit px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                                  selectedIngredient.evidenceLevel.toLowerCase() ===
                                  "strong"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : selectedIngredient.evidenceLevel.toLowerCase() ===
                                        "moderate"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-zinc-100 text-zinc-650 border-zinc-200"
                                }`}
                              >
                                {selectedIngredient.evidenceLevel}
                              </span>
                            </div>
                          )}

                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              Description
                            </span>
                            <p className="text-xs text-zinc-600 leading-relaxed font-semibold">
                              {selectedIngredient.description}
                            </p>
                          </div>

                          {selectedIngredient.consumptionGuidance && (
                            <div className="bg-amber-50/40 border border-amber-100/60 rounded-xl p-3.5 mt-2 flex flex-col gap-1">
                              <span className="text-[10px] font-black text-amber-855 uppercase tracking-wider flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5 text-amber-600" />
                                Consumption Guidance
                              </span>
                              <p className="text-xs text-amber-955 font-bold leading-relaxed">
                                {selectedIngredient.consumptionGuidance}
                              </p>
                            </div>
                          )}

                          {/* Matched Scientific RAG Dossier */}
                          {(() => {
                            const matchedDoc = report.evidence?.find(
                              (doc) =>
                                doc.ingredientId ===
                                  (selectedIngredient as any).id ||
                                (selectedIngredient.name &&
                                  doc.title
                                    .toLowerCase()
                                    .includes(
                                      selectedIngredient.name.toLowerCase(),
                                    )) ||
                                (doc.category &&
                                  selectedIngredient.name
                                    .toLowerCase()
                                    .includes(doc.category.toLowerCase())),
                            );
                            if (!matchedDoc) return null;
                            return (
                              <div className="bg-orange-50/40 border border-orange-200/70 rounded-xl p-3.5 mt-2 flex flex-col gap-1.5 text-left">
                                <span className="text-[10px] font-black text-orange-800 uppercase tracking-wider flex items-center gap-1.5">
                                  <BookOpen className="w-3.5 h-3.5 text-orange-600" />
                                  Scientific Monograph (
                                  {matchedDoc.source || "Regulatory Review"})
                                </span>
                                <p className="text-xs text-zinc-700 leading-relaxed font-medium">
                                  {matchedDoc.content}
                                </p>
                                {matchedDoc.sourceUrl && (
                                  <a
                                    href={matchedDoc.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline inline-flex items-center gap-1 mt-1"
                                  >
                                    View Official Publication{" "}
                                    <ArrowRight className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center flex-1 py-12">
                          <Info className="w-10 h-10 text-zinc-300 mb-3" />
                          <h4 className="text-sm font-bold text-zinc-600">
                            No Ingredient Selected
                          </h4>
                          <p className="text-xs text-zinc-400 max-w-[200px] mt-1 mx-auto leading-normal font-normal">
                            Click on any ingredient card to review its
                            nutritional research dossiers.
                          </p>
                        </div>
                      )}

                      {selectedIngredient && (
                        <div className="border-t border-zinc-200/50 pt-4 mt-6 text-center">
                          <span className="text-xs text-zinc-400 font-semibold inline-flex items-center gap-1.5">
                            Verified with EFSA & WHO Guidelines{" "}
                            <Heart className="w-3 h-3 text-red-400 fill-red-400" />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. ADDITIVES PANEL */}
              {activeTab === "additives" && (
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 text-left">
                      Food Additives Profile
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1 text-left">
                      Chemical preservatives, emulsifiers, colorants, and
                      stabilizers detected.
                    </p>
                  </div>

                  {report.additives && report.additives.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      {report.additives.map((add, idx) => (
                        <div
                          key={idx}
                          className="border border-zinc-100 rounded-2xl p-5 hover:shadow-md transition-shadow text-left bg-white"
                        >
                          <div className="flex flex-wrap justify-between items-center gap-2 mb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs font-black px-2.5 py-1 rounded-lg">
                                {add.code}
                              </span>
                              <h4 className="text-sm font-bold text-zinc-900">
                                {add.name}
                              </h4>
                            </div>
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                                add.rating === "safe"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                                  : add.rating === "caution"
                                    ? "bg-amber-50 text-amber-800 border-amber-100"
                                    : "bg-red-50 text-red-800 border-red-100"
                              }`}
                            >
                              {add.rating === "safe"
                                ? "Safe additive"
                                : add.rating === "caution"
                                  ? "Moderate caution"
                                  : "Avoid/High risk"}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5" />
                            Purpose: {add.purpose}
                          </div>
                          <p className="text-xs text-zinc-500 leading-relaxed font-semibold">
                            {add.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-16">
                      <CheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
                      <h4 className="text-base font-bold text-zinc-700">
                        Zero Additives Detected
                      </h4>
                      <p className="text-sm text-zinc-400 max-w-sm mt-1 mx-auto leading-normal font-normal">
                        This product does not list any food additive E-numbers,
                        chemical stabilizers, or synthetic colorings.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 4. NUTRITION PANEL */}
              {activeTab === "nutrition" && (
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 text-left">
                      Simplified Nutrition Facts
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1 text-left">
                      High level nutritional analysis of primary macronutrients.
                    </p>
                  </div>

                  <div className="border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-150 text-xs font-black uppercase text-zinc-500 tracking-wider">
                          <th className="p-4">Nutrient Factor</th>
                          <th className="p-4">Detected Concentration</th>
                          <th className="p-4">AI Rating</th>
                          <th className="p-4 hidden md:table-cell">
                            Context Summary
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 text-sm">
                        {report.nutrition.map((nut, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50/50">
                            <td className="p-4 font-bold text-zinc-900 text-left">
                              {nut.label}
                            </td>
                            <td className="p-4 font-mono font-bold text-left">
                              {nut.value}
                            </td>
                            <td className="p-4 text-left">
                              <span className={getNutritionBadge(nut.rating)}>
                                {nut.rating === "good"
                                  ? "Favorable"
                                  : nut.rating === "neutral"
                                    ? "Neutral"
                                    : "Unfavorable"}
                              </span>
                            </td>
                            <td className="p-4 hidden md:table-cell text-zinc-500 text-xs leading-normal font-semibold text-left">
                              {nut.description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 5. DEDICATED SCIENTIFIC EVIDENCE PANEL */}
              {activeTab === "evidence" && (
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 text-left">
                      Scientific & Regulatory Research
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1 text-left">
                      Official toxicological evaluations and regulatory rulings
                      retrieved specifically for this product.
                    </p>
                  </div>

                  <ScientificEvidenceCard
                    evidence={report.evidence}
                    productName={report.name}
                  />
                </div>
              )}

              {/* 6. PRODUCT FAQ PANEL */}
              {activeTab === "faq" && (
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 text-left">
                      What to Know Before Buying
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1 text-left">
                      Frequently asked questions compiled dynamically about this
                      product's formulation.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    {[
                      {
                        q: "Is this product actually healthy?",
                        a:
                          report.score >= 70
                            ? `Yes. With a high health score of ${report.score}/100 and Nutri-Grade of ${report.grade}, this product is composed of nutritious and wholesome ingredients suitable for support of overall wellness.`
                            : report.score >= 40
                              ? `Moderately. It has a health score of ${report.score}/100 and a grade of ${report.grade}. It contains some refined ingredients, so it is best consumed in moderation.`
                              : `No. This product has a low health score of ${report.score}/100 and a grade of ${report.grade}, indicating a high concentration of refined sugars, unhealthy fats, or chemical additives.`,
                      },
                      {
                        q: "Are there any concerning ingredients or additives?",
                        a: (() => {
                          const concerning = report.ingredients.filter(
                            (i) =>
                              i.rating === "avoid" || i.rating === "caution",
                          );
                          const badAdditives = report.additives.filter(
                            (a) =>
                              a.rating === "avoid" || a.rating === "caution",
                          );
                          if (
                            concerning.length > 0 ||
                            badAdditives.length > 0
                          ) {
                            const list = [
                              ...concerning.map((i) => i.name),
                              ...badAdditives.map(
                                (a) => `${a.code} (${a.name})`,
                              ),
                            ];
                            return `Yes. You should watch out for: ${list.slice(0, 5).join(", ")}. Check the Ingredients and Additives tabs for more details.`;
                          }
                          return `No high-risk ingredients or synthetic additives were directly flagged in this product.`;
                        })(),
                      },
                      {
                        q: "Does it contain added sugar or sweeteners?",
                        a: (() => {
                          const sugars = report.ingredients.filter((i) =>
                            /sugar|sucrose|syrup|fructose|dextrose|maltodextrin|honey|juice concentrate/i.test(
                              i.name,
                            ),
                          );
                          return sugars.length > 0
                            ? `Yes, the product contains sugars or sweetening agents: ${sugars.map((i) => i.name).join(", ")}.`
                            : `No added refined sugars or syrups were matched in the ingredient list.`;
                        })(),
                      },
                      {
                        q: "Are there any allergens I should know about?",
                        a:
                          report.allergens.length > 0
                            ? `Yes. The ingredients panel lists the following allergen sensitizers: ${report.allergens.join(", ")}. If you have sensitivities, exercise caution.`
                            : `No major allergens were identified in the ingredient list.`,
                      },
                      {
                        q: "Is this highly processed?",
                        a:
                          report.grade === "D" ||
                          report.grade === "E" ||
                          report.additives.length > 3
                            ? `Yes. With a grade of ${report.grade} and multiple processing agents, this product is considered highly processed (Ultra-Processed Food or UPF).`
                            : report.grade === "C"
                              ? `Moderately. It contains some refined fats or sweeteners but retains a relatively simple base structure.`
                              : `No. This product is minimally processed or made entirely from wholesome base ingredients.`,
                      },
                      {
                        q: "Would you recommend buying this product?",
                        a:
                          report.score >= 70
                            ? `Yes, we recommend buying this product! It scored a high health score of ${report.score}/100 and consists of safe, wholesome ingredients.`
                            : report.score >= 40
                              ? `Buy with caution. It is safe for occasional snacking, but is not recommended as a daily health staple due to refined components.`
                              : `No, we do not recommend buying this product. It scored poorly (${report.score}/100) due to low-quality processing agents or excessive sodium/sugars. Check the Alternatives tab for better choices.`,
                      },
                    ].map((qa, index) => {
                      const isOpen = activeQaIndex === index;
                      return (
                        <div
                          key={index}
                          className="border border-zinc-100 rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 text-left"
                        >
                          <button
                            onClick={() =>
                              setActiveQaIndex(isOpen ? null : index)
                            }
                            className="w-full flex items-center justify-between gap-4 p-5 font-bold text-sm text-zinc-800 hover:bg-zinc-50 transition-colors cursor-pointer"
                          >
                            <span>{qa.q}</span>
                            <ChevronDown
                              className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-300 ${
                                isOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                          {isOpen && (
                            <div className="px-5 pb-5 pt-1 border-t border-zinc-50">
                              <p className="text-sm text-zinc-500 leading-relaxed font-normal">
                                {qa.a}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}
