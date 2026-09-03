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
} from "lucide-react";
import { ScanRecord } from "@/lib/db";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ReloadOverlay from "@/components/Loader";

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
    "overview" | "ingredients" | "additives" | "nutrition" | "faq"
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
      "w-12 h-12 rounded-full flex items-center justify-center text-xl font-black text-white shadow-inner";
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
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6 animate-fade-in">
        {/* Top Back Action Bar / Compact Scan Header */}
        <div className="flex flex-wrap justify-between items-center bg-white py-4 px-6 rounded-3xl border border-zinc-100 shadow-sm gap-4">
          <div className="flex flex-col gap-0.5 text-left">
            <Link
              href="/"
              className="flex items-center gap-1 text-xs font-bold text-zinc-400 hover:text-zinc-950 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Scan Another Food
            </Link>
            <h1 className="text-lg font-black text-zinc-955 tracking-tight mt-1">
              {report.name}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-50 py-2 px-4 rounded-full border border-zinc-150 font-bold">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            Analysis Complete
          </div>
        </div>

        {/* Product Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: Summary Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Product Image Card */}
            <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-4 overflow-hidden">
              <div className="relative aspect-square w-full bg-zinc-50 rounded-2xl border border-zinc-100 overflow-hidden flex items-center justify-center select-none group">
                {report.image ? (
                  <img
                    src={report.image}
                    alt={report.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950 flex flex-col items-center justify-center text-white p-6 gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 backdrop-blur-md shadow-inner text-red-400">
                      <FileText className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-1">
                      Text Lookup Scan
                    </span>
                    <span className="text-[11px] text-zinc-500 font-semibold max-w-[200px] text-center leading-normal">
                      Ingredient list analyzed via raw text pasted
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Product Profile & Score Card */}
            <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-6 flex flex-col gap-5 text-left">
              <div>
                <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider block">
                  {report.brand || "Food Product"}
                </span>
                <h2 className="text-xl font-black text-zinc-955 tracking-tight leading-tight mt-0.5">
                  {report.name}
                </h2>
              </div>

              {/* Visual Score Ring & Grade */}
              <div className="flex items-center gap-6 border-y border-zinc-100 py-5">
                {/* Gauge */}
                <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      stroke="#f4f4f5"
                      strokeWidth="6"
                      fill="transparent"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      stroke={
                        report.score >= 80
                          ? "#22c55e"
                          : report.score >= 60
                            ? "#10b981"
                            : report.score >= 40
                              ? "#ff6a00"
                              : "#ff3b30"
                      }
                      strokeWidth="6"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 34}
                      strokeDashoffset={
                        2 * Math.PI * 34 * (1 - report.score / 100)
                      }
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-xl font-black text-zinc-950 leading-none">
                      {report.score}
                    </span>
                    <span className="text-[8px] text-zinc-400 font-bold uppercase mt-0.5">
                      score
                    </span>
                  </div>
                </div>

                {/* Grade Badge */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
                    Nutri-Grade
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={getGradeBadge(report.grade)}>
                      {report.grade}
                    </div>
                    <span className="text-xs font-bold text-zinc-650">
                      {report.score >= 70
                        ? "Good Choice"
                        : report.score >= 40
                          ? "Moderate Caution"
                          : "Avoid / High Risk"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Split summary description */}
              <div className="flex flex-col gap-2">
                {(() => {
                  const split = splitSummary(report.summary);
                  return (
                    <>
                      <p className="text-zinc-500 text-xs leading-relaxed font-semibold">
                        {split.main}
                      </p>
                      {split.highlight && (
                        <p className="text-zinc-800 text-xs font-bold leading-relaxed border-l-2 border-[#FF6A00] pl-3.5 mt-1 bg-orange-50/10 py-2 rounded-r-xl">
                          {split.highlight}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Allergen Warning Widget */}
            {report.allergens.length > 0 && (
              <div className="bg-[#FFF1EF] rounded-3xl border border-[#FFE3E0] p-6 flex flex-col gap-3 text-left shadow-sm">
                <div className="flex items-center gap-2 text-[#FF3B30] font-bold text-xs uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4 text-[#FF3B30] shrink-0" />
                  Allergen Warning
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {report.allergens.map((allergen, idx) => (
                    <span
                      key={idx}
                      className="bg-white border border-[#FFE3E0] rounded-full px-3 py-1.5 text-xs font-bold text-[#FF3B30] shadow-sm flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] shrink-0" />
                      {allergen}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-[#FF4A3D] leading-normal font-medium mt-1">
                  Individuals with allergy conditions should exercise absolute
                  caution. Trace cross-contamination is possible.
                </p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Interactive Details Dashboard */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Tab Navigation Menu */}
            <div className="bg-white p-1.5 rounded-2xl border border-zinc-150 shadow-sm flex flex-wrap gap-1">
              {(
                [
                  { id: "overview", label: "Overview", icon: Home },
                  { id: "ingredients", label: "Ingredients", icon: Leaf },
                  { id: "additives", label: "Additives", icon: Beaker },
                  { id: "nutrition", label: "Nutrition", icon: Activity },
                  { id: "faq", label: "Product FAQ", icon: FileQuestionMark },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs md:text-sm font-bold tracking-tight transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-red-50 border border-red-100/50 text-red-800 shadow-sm"
                        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 border border-transparent"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* TAB PANEL CONTENTS */}
            <div className="bg-white rounded-3xl border border-zinc-100 shadow-md p-6 md:p-8 min-h-[400px]">
              {/* 1. OVERVIEW PANEL */}
              {activeTab === "overview" && (
                <div className="flex flex-col gap-6">
                  {/* AI Analysis Overview Banner */}
                  <div className="bg-gradient-to-r from-orange-50/30 to-red-50/20 rounded-2xl p-5 border border-orange-100/30 flex items-center justify-between shadow-sm">
                    <div className="flex flex-col gap-1 text-left">
                      <h3 className="text-base font-bold text-zinc-900 flex items-center gap-1.5">
                        AI Analysis Overview{" "}
                        <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
                      </h3>
                      <p className="text-zinc-500 text-xs font-semibold">
                        Comprehensive analysis of ingredients, additives,
                        nutrition, and warnings.
                      </p>
                    </div>
                    <img
                      src="/ai_robot_avatar.png"
                      alt="AI Robot Assistant"
                      className="w-12 h-12 object-contain"
                    />
                  </div>

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

              {/* 5. PRODUCT FAQ PANEL */}
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
          </div>
        </div>

        {/* Bottom Informational Banner */}
        <div className="bg-emerald-50/20 border border-emerald-100 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm mt-4 select-none animate-fade-in">
          <div className="flex flex-col gap-1 text-left">
            <h4 className="text-sm font-black text-emerald-900 tracking-tight uppercase">
              AI-Powered Food Analysis
            </h4>
            <p className="text-zinc-500 text-xs font-semibold leading-relaxed">
              We use advanced AI to scan, analyze and provide you with accurate
              food insights.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100/60 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div className="text-[10px] text-left">
                <span className="font-bold text-zinc-800 block leading-tight">
                  100% AI Verified
                </span>
                <span className="text-zinc-400 font-semibold leading-none block mt-0.5">
                  Trusted & reliable results
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100/60 flex items-center justify-center text-emerald-600 shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="text-[10px] text-left">
                <span className="font-bold text-zinc-800 block leading-tight">
                  Image Recognition
                </span>
                <span className="text-zinc-400 font-semibold leading-none block mt-0.5">
                  Advanced OCR & Vision
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100/60 flex items-center justify-center text-emerald-600 shrink-0">
                <Info className="w-4 h-4" />
              </div>
              <div className="text-[10px] text-left">
                <span className="font-bold text-zinc-800 block leading-tight">
                  Ingredient Database
                </span>
                <span className="text-zinc-400 font-semibold leading-none block mt-0.5">
                  10M+ Ingredients
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100/60 flex items-center justify-center text-emerald-600 shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div className="text-[10px] text-left">
                <span className="font-bold text-zinc-800 block leading-tight">
                  Health Intelligence
                </span>
                <span className="text-zinc-400 font-semibold leading-none block mt-0.5">
                  Evidence-based scoring
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}
