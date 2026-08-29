"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileText,
  Lock,
  UserCheck,
  Sparkles,
  ShieldAlert,
  Scale,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Layers,
  Apple,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AnalysisProgressOverlay from "@/components/Progress";

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<"home" | "loading">("home");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(
    "Initializing food scanner...",
  );
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [inputType, setInputType] = useState<"image" | "text">("image");
  const [pastedText, setPastedText] = useState("");
  const [progressState, setProgressState] = useState<any>(null);

  const handleProgressClose = () => {
    setProgressState(null);
    setStep("home");
  };

  // Process file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPG, WEBP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  // Clear loaded image
  const handleClearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImage(null);
    setFileName(null);
  };

  // Triggers API scan analysis pipeline and redirects
  const triggerAnalysis = async () => {
    if (inputType === "image" && !selectedImage) return;
    if (inputType === "text" && !pastedText.trim()) return;

    setStep("loading");

    // Sequence loading strings
    const timings =
      inputType === "image"
        ? [
            { t: 0, text: "Scanning text from image..." },
            { t: 700, text: "Extracting ingredient statement..." },
            { t: 1400, text: "Cross-referencing E-numbers & additives..." },
            { t: 2100, text: "Evaluating nutritional ratios..." },
            { t: 2800, text: "Formulating health grade scores..." },
          ]
        : [
            { t: 0, text: "Analyzing ingredients text..." },
            { t: 700, text: "Extracting ingredient statement..." },
            { t: 1400, text: "Cross-referencing E-numbers & additives..." },
            { t: 2100, text: "Evaluating nutritional ratios..." },
            { t: 2800, text: "Formulating health grade scores..." },
          ];

    timings.forEach(({ t, text }) => {
      setTimeout(() => {
        setLoadingText(text);
      }, t);
    });

    const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
    const startMs = Date.now();
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    const minUXPromise = delay(3500);

    try {
      const res = await fetch(`${API_URL}/api/v1/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          inputType === "image"
            ? {
                image: selectedImage,
                filename: fileName,
              }
            : {
                text: pastedText,
              },
        ),
      });

      if (!res.ok) {
        throw new Error("Analysis request failed");
      }

      const data = await res.json();

      let animationDone = false;
      const onCompleteCallback = () => {
        animationDone = true;
      };

      if (data.jobId) {
        // Async background worker job path
        const jobId = data.jobId;
        let finalScanId = "";

        // Reset progress state for new scan
        setProgressState({
          progress: 0,
          currentStep: "upload",
          steps: {
            upload: "processing",
            ocr: "pending",
            identify: "pending",
            health: "pending",
            report: "pending",
          },
          error: null,
          onComplete: onCompleteCallback,
        });

        const pollStatus = async (): Promise<string> => {
          const statusRes = await fetch(
            `${API_URL}/api/v1/analyze/status/${jobId}`,
          );
          if (!statusRes.ok) {
            throw new Error("Failed to check analysis progress");
          }
          const statusData = await statusRes.json();

          setProgressState({
            ...statusData,
            onComplete: onCompleteCallback,
          });

          if (statusData.status === "completed" && statusData.scan?.id) {
            return statusData.scan.id;
          }
          if (statusData.status === "failed") {
            throw new Error(
              statusData.error ||
                "Analysis failed during background processing",
            );
          }
          // Return empty string to continue polling
          return "";
        };

        // Poll every 1500ms
        while (!finalScanId) {
          const elapsed = Date.now() - startMs;
          if (elapsed > 8000) {
            setLoadingText("Finalizing analysis (this may take a moment)...");
          }
          await delay(1500);
          finalScanId = await pollStatus();
        }

        // Wait until visual scan animation finishes
        await minUXPromise;
        while (!animationDone) {
          await delay(100);
        }
        router.push(`/scan/${finalScanId}`);
      } else {
        // Synchronous scan path
        setProgressState({
          isFallback: true,
          onComplete: onCompleteCallback,
        });
        const scanId = data.id || data.scanId;
        await minUXPromise;
        while (!animationDone) {
          await delay(100);
        }
        router.push(`/scan/${scanId}`);
      }
    } catch (err) {
      console.error(err);
      setProgressState((prev: any) => ({
        ...(prev || {}),
        status: "failed",
        error:
          err instanceof Error ? err.message : "An unexpected error occurred.",
      }));
    }
  };

  // Trigger predefined mock run
  const triggerExampleAnalysis = async () => {
    setFileName("example_hazelnut_cocoa_spread.png");
    setSelectedImage("");
    setStep("loading");

    const timings = [
      { t: 0, text: "Loading sample product label..." },
      { t: 600, text: "Analyzing hazelnut cocoa percentage..." },
      { t: 1200, text: "Identifying palm oil & refined sugars..." },
      { t: 1800, text: "Analyzing soy lecithin allergen flags..." },
      { t: 2400, text: "Assembling rating database..." },
    ];

    timings.forEach(({ t, text }) => {
      setTimeout(() => {
        setLoadingText(text);
      }, t);
    });

    const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    const minUXPromise = delay(3500);

    try {
      const res = await fetch(`${API_URL}/api/v1/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: "",
          filename: "example_hazelnut_cocoa_spread.png",
        }),
      });

      if (!res.ok) {
        throw new Error("Example analysis failed");
      }

      const data = await res.json();
      const scanId = data.id || data.scanId;

      await minUXPromise;
      router.push(`/scan/${scanId}`);
    } catch (err) {
      console.error(err);
      alert("Failed to run example analysis.");
      setStep("home");
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-zinc-50/60 font-sans text-zinc-900 selection:bg-red-100 selection:text-red-900">
      {/* HEADER NAVBAR */}
      <Header onLogoClick={() => setStep("home")} />

      {/* STEP 1: HOME VIEW */}
      {step === "home" && (
        <div className="flex-1 w-full flex flex-col items-center">
          {/* Main Hero & Upload Card Section */}
          <section className="py-16 px-4 md:px-8 max-w-4xl mx-auto w-full flex flex-col items-center justify-center animate-fade-in">
            {/* Hero Section */}
            <div className="text-center max-w-2xl mb-12">
              <h1 className="text-4xl md:text-5xl font-black text-zinc-950 tracking-tight leading-[1.1] mb-5">
                Understand Your Food{" "}
                <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                  in Seconds.
                </span>
              </h1>
              <p className="text-zinc-600 text-base md:text-lg font-normal leading-relaxed">
                Upload a food package or nutrition label and let AI explain
                ingredients, additives, allergens, and nutritional information
                in simple language.
              </p>
            </div>

            {/* Upload Card Container */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-zinc-100 shadow-xl shadow-zinc-100/50 max-w-xl w-full flex flex-col gap-6">
              {/* Tabs Selector */}
              <div className="flex bg-zinc-100/80 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setInputType("image")}
                  className={`flex-1 text-xs font-bold py-2.5 rounded-lg transition-all duration-200 cursor-pointer ${
                    inputType === "image"
                      ? "bg-white text-zinc-950 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  Upload Label Image
                </button>
                <button
                  type="button"
                  onClick={() => setInputType("text")}
                  className={`flex-1 text-xs font-bold py-2.5 rounded-lg transition-all duration-200 cursor-pointer ${
                    inputType === "text"
                      ? "bg-white text-zinc-950 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  Paste Ingredients Text
                </button>
              </div>

              {inputType === "image" ? (
                /* Drag Zone */
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 md:p-10 flex flex-col items-center justify-center text-center transition-all duration-300 relative group overflow-hidden ${
                    isDragOver
                      ? "border-red-400 bg-red-50/30"
                      : selectedImage
                        ? "border-zinc-300 bg-zinc-50/50"
                        : "border-zinc-200 bg-zinc-50/40 hover:bg-zinc-50/90"
                  }`}
                >
                  {!selectedImage && (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                  )}

                  {selectedImage ? (
                    <div className="w-full flex flex-col items-center gap-4">
                      {/* Image Preview Container */}
                      <div className="relative w-36 h-36 rounded-xl overflow-hidden shadow-md border border-zinc-200 group-hover:scale-102 transition-transform duration-300 bg-zinc-200 flex items-center justify-center cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <img
                          src={selectedImage}
                          alt="Uploaded Food Label"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-xs font-semibold px-2.5 py-1 bg-black/60 rounded-full">
                            Change Image
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-center px-4 w-full">
                        <span className="text-sm font-semibold text-zinc-800 truncate max-w-[280px]">
                          {fileName}
                        </span>
                        <button
                          onClick={handleClearImage}
                          className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors py-1 px-3 hover:bg-red-50 rounded-full border border-transparent hover:border-red-100 flex items-center gap-1 mt-1"
                        >
                          Remove file
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      {/* Upload Icon */}
                      <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform duration-300 border border-red-100/60 shadow-sm">
                        <div className="relative flex items-center justify-center">
                          <FileText className="w-8 h-8 stroke-[1.5]" />
                          <div className="absolute -bottom-1 -right-1 bg-red-500 text-white rounded-full p-0.5 border-2 border-white">
                            <UploadCloud className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-zinc-800 tracking-tight group-hover:text-zinc-955 transition-colors">
                          Drag and drop label image
                        </h3>
                        <p className="text-zinc-400 text-xs mt-1 font-medium">
                          Supported formats: JPG, PNG, WEBP
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Textarea Zone */
                <div className="flex flex-col gap-2">
                  <textarea
                    rows={6}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Example: INGREDIENTS: Sugar, Citric Acid, Acesulfame Potassium, Cocoa Butter..."
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/40 p-4 text-sm leading-relaxed text-zinc-800 placeholder-zinc-450 outline-none transition-all focus:border-red-400 focus:bg-white focus:ring-1 focus:ring-red-400 font-sans"
                  />
                  <div className="flex justify-between items-center text-[10px] text-zinc-400 px-1 font-semibold">
                    <span>
                      Paste ingredients list from any product packaging
                    </span>
                    <span>{pastedText.length} characters</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  disabled={
                    inputType === "image" ? !selectedImage : !pastedText.trim()
                  }
                  onClick={triggerAnalysis}
                  className={`w-full font-bold py-4 px-6 rounded-2xl text-base tracking-tight transition-all duration-300 shadow-md flex items-center justify-center gap-2 ${
                    (inputType === "image" && selectedImage) ||
                    (inputType === "text" && pastedText.trim())
                      ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/10 cursor-pointer active:scale-[0.99] hover:shadow-lg hover:shadow-red-500/20"
                      : "bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none"
                  }`}
                >
                  <Sparkles className="w-5 h-5 shrink-0" />
                  Analyze Food
                </button>

                <button
                  onClick={triggerExampleAnalysis}
                  className="text-sm font-semibold text-zinc-500 hover:text-zinc-800 transition-colors border border-transparent hover:border-zinc-200 py-2.5 rounded-xl block text-center"
                >
                  View example analysis
                </button>
              </div>
            </div>

            {/* Core Info Pills */}
            <div className="flex flex-wrap justify-center items-center gap-4 mt-12 max-w-xl">
              <div className="bg-zinc-100/50 hover:bg-zinc-100 border border-zinc-200/40 py-2.5 px-4 rounded-full text-xs font-semibold text-zinc-600 flex items-center gap-2 shadow-sm transition-colors">
                <UserCheck className="w-4 h-4 text-zinc-500" />
                No Account Required
              </div>
              <div className="bg-zinc-100/50 hover:bg-zinc-100 border border-zinc-200/40 py-2.5 px-4 rounded-full text-xs font-semibold text-zinc-600 flex items-center gap-2 shadow-sm transition-colors">
                <Lock className="w-4 h-4 text-zinc-500" />
                Private & Secure
              </div>
              <div className="bg-zinc-100/50 hover:bg-zinc-100 border border-zinc-200/40 py-2.5 px-4 rounded-full text-xs font-semibold text-zinc-600 flex items-center gap-2 shadow-sm transition-colors">
                <Sparkles className="w-4 h-4 text-red-500" />
                Instant AI Analysis
              </div>
            </div>
          </section>

          {/* Section: How It Works */}
          <section className="w-full bg-white border-y border-zinc-100 py-20 px-6 md:px-12 flex flex-col items-center">
            <div className="max-w-4xl w-full text-center mb-16">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50/50 border border-red-100 px-3 py-1 rounded-full shadow-inner shadow-red-500/5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Process Flow
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-zinc-900 tracking-tight mt-6 mb-4">
                How FoodNet Works in 3 Steps
              </h2>
              <p className="text-zinc-500 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
                Scan your groceries and reveal the chemical makeup behind
                complex ingredients panels instantly.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full">
              {[
                {
                  step: "01",
                  title: "Snap or Upload Label",
                  desc: "Take a picture of the ingredients list or nutrition facts label on any food item from your pantry or grocery store.",
                },
                {
                  step: "02",
                  title: "Instant AI Deciphering",
                  desc: "Our neural network reads the packaging label, identifying hidden sugars, chemical E-numbers, processing methods, and allergen markers.",
                },
                {
                  step: "03",
                  title: "Eat Healthier",
                  desc: "Review your unified safety grade, read plain-English translations of chemicals, and view cleaner substitute products.",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-zinc-50/50 border border-zinc-100 p-6 rounded-2xl flex flex-col gap-4 hover:shadow-md hover:bg-zinc-50 transition-all duration-300"
                >
                  <span className="text-3xl font-black text-red-500/20 tracking-wider">
                    {item.step}
                  </span>
                  <h3 className="text-lg font-bold text-zinc-900 leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-zinc-500 text-sm leading-relaxed font-normal">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Section: Landing Page Features Grid */}
          <section className="w-full py-20 px-6 md:px-12 flex flex-col items-center">
            <div className="max-w-4xl w-full text-center mb-16">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50/50 border border-red-100 px-3 py-1 rounded-full shadow-inner shadow-red-500/5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Key Features
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-zinc-900 tracking-tight mt-6 mb-4">
                Everything you need to eat clean
              </h2>
              <p className="text-zinc-500 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
                We simplify processed food regulations so you can make confident
                dietary decisions for you and your family.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
              {[
                {
                  icon: ShieldAlert,
                  iconColor: "text-red-500 bg-red-50 border-red-100/60",
                  title: "Allergen Watchdog",
                  desc: "Instantly flags hidden allergens like soy, gluten, dairy, yeast, or nuts. Essential for families managing sensitive autoimmune conditions.",
                },
                {
                  icon: Layers,
                  iconColor: "text-amber-500 bg-amber-50 border-amber-100/60",
                  title: "Additive Decoder",
                  desc: "Translates artificial E-number codes into common terms. Understand instantly which additives are benign and which trigger metabolic stress.",
                },
                {
                  icon: Scale,
                  iconColor:
                    "text-emerald-500 bg-emerald-50 border-emerald-100/60",
                  title: "Simplified Nutrition Profiles",
                  desc: "Rates macronutrients against World Health Organization standards, calculating clear sugar ratios and fat energy densities.",
                },
                {
                  icon: Apple,
                  iconColor: "text-green-650 bg-green-50 border-green-100/60",
                  title: "Better Alternatives",
                  desc: "Discovers higher-scoring natural, organic, or less processed alternatives for similar snack categories so you can swap seamlessly.",
                },
              ].map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={idx}
                    className="bg-white border border-zinc-100 shadow-sm p-6 rounded-2xl hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 flex gap-4"
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${feat.iconColor}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h3 className="text-base font-bold text-zinc-900 leading-tight">
                        {feat.title}
                      </h3>
                      <p className="text-zinc-500 text-sm leading-relaxed">
                        {feat.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section: Live System Stats */}
          <section className="w-full bg-zinc-900 text-white py-16 px-6 md:px-12 flex justify-center">
            <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-zinc-800">
              <div className="flex flex-col gap-1.5 py-6 md:py-0">
                <span className="text-4xl md:text-5xl font-black text-red-500">
                  50,000+
                </span>
                <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
                  Ingredients Mapped
                </span>
              </div>
              <div className="flex flex-col gap-1.5 py-6 md:py-0">
                <span className="text-4xl md:text-5xl font-black text-orange-500">
                  2,500+
                </span>
                <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
                  Additives Monitored
                </span>
              </div>
              <div className="flex flex-col gap-1.5 py-6 md:py-0">
                <span className="text-4xl md:text-5xl font-black text-emerald-500">
                  100%
                </span>
                <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
                  Private & Encryption Secure
                </span>
              </div>
            </div>
          </section>

          {/* Section: Interactive FAQ Accordion */}
          <section className="w-full py-20 px-6 md:px-12 flex flex-col items-center">
            <div className="max-w-4xl w-full text-center mb-16">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50/50 border border-red-100 px-3 py-1 rounded-full shadow-inner shadow-red-500/5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                F.A.Q.
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-zinc-900 tracking-tight mt-6 mb-4">
                Got Questions? We have answers.
              </h2>
              <p className="text-zinc-500 text-sm max-w-md mx-auto leading-relaxed">
                Learn more about our ingredients databases, validation
                pipelines, and data security policies.
              </p>
            </div>

            <div className="max-w-2xl w-full flex flex-col gap-3">
              {[
                {
                  q: "How does FoodNet analyze the food packaging label?",
                  a: "FoodNet uses computer vision OCR to detect the exact text on your uploaded food image. Our rating engine then identifies individual ingredient items and E-numbers, checking them against global scientific databases.",
                },
                {
                  q: "Which safety databases do you use for evaluations?",
                  a: "Our food classification weights compile research findings from leading international safety authorities, including the European Food Safety Authority (EFSA), World Health Organization (WHO), and the Food and Drug Administration (FDA).",
                },
                {
                  q: "Is my uploaded label data kept private?",
                  a: "Yes. FoodNet runs scans in secure, ephemeral memory scopes. Your photos are analyzed to create the report and are immediately discarded—we never catalog or sell your images.",
                },
                {
                  q: "Does this replace medical diagnostic support?",
                  a: "No. FoodNet is designed to translate complex scientific listings and provide general nutritional summaries. It is for educational purposes and is not a substitute for specialized advice from a medical advisor or dietician.",
                },
              ].map((faq, idx) => {
                const isOpen = activeFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="border border-zinc-100 rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
                  >
                    <button
                      onClick={() => setActiveFaqIndex(isOpen ? null : idx)}
                      className="w-full text-left p-5 flex justify-between items-center gap-4 cursor-pointer focus:outline-none"
                    >
                      <span className="text-sm font-bold text-zinc-800 hover:text-zinc-950 transition-colors">
                        {faq.q}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 border-t border-zinc-50 pt-3">
                        <p className="text-xs md:text-sm text-zinc-500 leading-relaxed font-normal">
                          {faq.a}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section: CTA Banner */}
          <section className="py-12 px-6 md:px-12 w-full max-w-4xl mx-auto mb-16">
            <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-3xl p-8 md:p-12 text-center text-white shadow-xl shadow-red-500/10 flex flex-col items-center gap-6">
              <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight max-w-lg">
                Ready to understand what is inside your daily groceries?
              </h2>
              <p className="text-red-50 text-sm max-w-md leading-relaxed">
                Scroll back to the top of the page and drop an ingredients list
                photo to analyze your first product instantly.
              </p>
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="bg-white text-red-600 hover:bg-zinc-50 font-bold py-3.5 px-7 rounded-2xl text-sm transition-all duration-300 shadow-lg cursor-pointer active:scale-95 animate-pulse"
              >
                Scan Product Now
              </button>
            </div>
          </section>
        </div>
      )}

      {/* STEP 2: LOADING VIEW */}
      {step === "loading" && (
        <AnalysisProgressOverlay
          progressState={progressState}
          onClose={handleProgressClose}
          onAnimationComplete={progressState?.onComplete}
        />
      )}

      {/* FOOTER AREA */}
      <Footer />
    </div>
  );
}
