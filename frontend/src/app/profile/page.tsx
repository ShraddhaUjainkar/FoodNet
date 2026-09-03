"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  User,
  Mail,
  ShieldCheck,
  Clock,
  ArrowRight,
  Sparkles,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  ScanLine,
  Activity,
  Zap,
  Copy,
  Check,
  XCircle,
  ShieldAlert,
} from "lucide-react";
import Header from "@/components/Header";
import { getOrCreateGuestId } from "@/lib/guest";
import { syncUserToDatabase } from "@/lib/user";

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

interface ScanSummary {
  id: string;
  score: number;
  grade: string;
  summary?: string;
  imageUrl?: string | null;
  createdAt?: string;
  expiresAt?: string;
  ingredientsCount: number;
  avoidsCount: number;
  cautionsCount: number;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [loadingScans, setLoadingScans] = useState(true);
  const [guestId, setGuestId] = useState<string>("");
  const [copiedGuestId, setCopiedGuestId] = useState(false);

  useEffect(() => {
    const currentGuestId = getOrCreateGuestId();
    setGuestId(currentGuestId);

    async function fetchScans() {
      const API_URL = (
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      ).replace(/\/$/, "");

      try {
        const headers: Record<string, string> = {};

        if (session?.user?.id) {
          headers["x-user-id"] = session.user.id;
        } else if (session?.user?.email) {
          headers["x-user-id"] = session.user.email;
        } else if (currentGuestId) {
          // Guest mode: fetch scans associated with this guest ID
          headers["x-guest-id"] = currentGuestId;
        }

        const res = await fetch(`${API_URL}/api/v1/scans?limit=50`, { headers });
        if (res.ok) {
          const data = await res.json();
          setScans(data);
        }
      } catch (err) {
        console.error("Failed to load scans for profile:", err);
      } finally {
        setLoadingScans(false);
      }
    }

    if (status !== "loading") {
      fetchScans();
      if (session?.user) {
        syncUserToDatabase(session.user);
      }
    }
  }, [session, status]);

  const handleCopyGuestId = () => {
    if (!guestId) return;
    navigator.clipboard.writeText(guestId);
    setCopiedGuestId(true);
    setTimeout(() => setCopiedGuestId(false), 2000);
  };

  // Aggregate stats
  const totalScans = scans.length;
  const totalAvoids = scans.reduce((acc, curr) => acc + (curr.avoidsCount || 0), 0);
  const totalCautions = scans.reduce((acc, curr) => acc + (curr.cautionsCount || 0), 0);
  const avgScore =
    totalScans > 0
      ? Math.round(scans.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalScans)
      : 0;

  // Guest Quota: 5 free scans
  const GUEST_LIMIT = 5;
  const guestScansRemaining = Math.max(0, GUEST_LIMIT - totalScans);
  const guestQuotaPercentage = Math.min(100, Math.round((totalScans / GUEST_LIMIT) * 100));

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50/60 font-sans text-zinc-900 selection:bg-red-100 selection:text-red-900">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 md:px-8 py-8 md:py-12">
        {status === "loading" ? (
          <div className="flex flex-col gap-6 animate-pulse">
            <div className="h-44 bg-zinc-200/70 rounded-3xl" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="h-28 bg-zinc-200/60 rounded-2xl" />
              <div className="h-28 bg-zinc-200/60 rounded-2xl" />
              <div className="h-28 bg-zinc-200/60 rounded-2xl" />
              <div className="h-28 bg-zinc-200/60 rounded-2xl" />
            </div>
          </div>
        ) : !session?.user ? (
          /* ================================================================= */
          /* GUEST USER SECTION (SHOWN WHEN USER IS GUEST)                     */
          /* ================================================================= */
          <div className="flex flex-col gap-8 animate-fade-in">
            {/* GUEST HERO CARD */}
            <div className="relative overflow-hidden rounded-3xl bg-white border border-amber-200/70 p-6 md:p-8 shadow-sm">
              <div className="absolute top-0 right-0 -mt-12 -mr-12 w-56 h-56 bg-gradient-to-bl from-amber-100/60 via-orange-50/30 to-transparent rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="w-20 h-20 md:w-22 md:h-22 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-black text-3xl flex items-center justify-center shadow-md ring-4 ring-amber-500/10">
                      G
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 border-2 border-white rounded-full flex items-center justify-center shadow-xs">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h1 className="text-2xl md:text-3xl font-black text-zinc-950 tracking-tight">
                        Guest Explorer
                      </h1>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        7-Day Temporary Storage
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                      <span className="font-mono text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200/60 truncate max-w-[220px]">
                        {guestId || "guest_temporary"}
                      </span>
                      <button
                        onClick={handleCopyGuestId}
                        className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-700 transition-colors"
                        title="Copy Guest ID"
                      >
                        {copiedGuestId ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-zinc-500 font-normal leading-relaxed mt-1">
                      You are in guest mode. Scans made on this browser are tracked here for 7 days.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
                  <button
                    onClick={() => signIn("google")}
                    className="text-xs font-bold text-zinc-800 bg-white border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 transition-all py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-xs active:scale-95 cursor-pointer"
                  >
                    <GoogleIcon />
                    <span>Claim & Save Forever</span>
                  </button>

                  <Link
                    href="/"
                    className="text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 transition-all py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                  >
                    <ScanLine className="w-3.5 h-3.5" />
                    <span>Scan Product</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* GUEST QUOTA & STATUS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* QUOTA TRACKER */}
              <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-2xs flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Guest Free Quota
                  </span>
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-2xl font-black text-zinc-950">
                      {totalScans} <span className="text-sm font-semibold text-zinc-400">/ {GUEST_LIMIT} Scans</span>
                    </span>
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                      {guestScansRemaining} remaining
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        totalScans >= GUEST_LIMIT
                          ? "bg-rose-500"
                          : totalScans >= 3
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${guestQuotaPercentage}%` }}
                    />
                  </div>
                </div>
                <span className="text-[11px] text-zinc-500 font-medium">
                  Sign in with Google to unlock unlimited scans.
                </span>
              </div>

              {/* 7-DAY EXPIRATION NOTICE */}
              <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-2xs flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Storage Lifespan
                  </span>
                  <Clock className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <div className="text-2xl font-black text-orange-600">7-Day Window</div>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    Unclaimed guest scans automatically purge after 7 days to preserve server memory.
                  </p>
                </div>
                <span className="text-[11px] text-orange-600 font-bold">
                  Auto-purges unless converted to permanent account
                </span>
              </div>

              {/* DEVICE LOCAL BOUND NOTICE */}
              <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-2xs flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Browser Scope
                  </span>
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-black text-zinc-950">Local Device</div>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    Scans are tied to this browser profile. They won&apos;t show on your other devices until you sign in.
                  </p>
                </div>
                <span className="text-[11px] text-blue-600 font-bold">
                  Connect Google to sync across all devices
                </span>
              </div>
            </div>

            {/* GUEST SCAN VAULT (SHOWS ACTUAL SCANS PERFORMED IN GUEST MODE) */}
            <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 md:p-8 shadow-sm flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg md:text-xl font-bold text-zinc-950">
                      Temporary Guest Scan Vault
                    </h2>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200/60">
                      {totalScans} recorded
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">
                    Scans performed in this browser during your guest session.
                  </p>
                </div>

                <Link
                  href="/"
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 group self-start sm:self-auto"
                >
                  <span>Scan Another Label</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {/* Expiration warning strip */}
              {totalScans > 0 && (
                <div className="flex items-center justify-between gap-3 p-3.5 bg-amber-50/70 border border-amber-200/70 rounded-2xl text-xs text-amber-900">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>Warning:</strong> These guest scans will expire in 7 days. Sign in with Google to transfer them to your permanent account.
                    </span>
                  </div>
                  <button
                    onClick={() => signIn("google")}
                    className="shrink-0 text-xs font-bold text-amber-800 underline hover:text-amber-950 cursor-pointer"
                  >
                    Save Now
                  </button>
                </div>
              )}

              {loadingScans ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
                  <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-semibold">Loading your guest history...</span>
                </div>
              ) : scans.length === 0 ? (
                <div className="py-16 text-center flex flex-col items-center justify-center gap-4 bg-zinc-50/60 rounded-2xl border border-dashed border-zinc-200">
                  <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                    <ScanLine className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col gap-1 max-w-sm">
                    <span className="text-sm font-bold text-zinc-900">No Guest Scans Yet</span>
                    <p className="text-xs text-zinc-500 font-normal leading-relaxed">
                      You haven&apos;t analyzed any food packaging in this session yet. Upload a label photo to test the AI scanner with your 5 free scans.
                    </p>
                  </div>
                  <Link
                    href="/"
                    className="text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 py-2.5 px-5 rounded-xl transition-colors shadow-sm mt-1"
                  >
                    Try Your First Scan
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {scans.map((scan) => (
                    <Link
                      key={scan.id}
                      href={`/scan/${scan.id}`}
                      className="group border border-zinc-200/80 rounded-2xl p-4 bg-white hover:border-amber-300 hover:bg-amber-50/10 shadow-2xs hover:shadow-sm transition-all duration-200 flex items-center justify-between"
                    >
                      <div className="flex flex-col gap-1.5 min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-800 truncate">
                            Scan #{scan.id.substring(0, 8)}
                          </span>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/50 px-1.5 py-0.5 rounded">
                            Guest
                          </span>
                        </div>

                        <span className="text-xs text-zinc-500 font-medium">
                          {scan.ingredientsCount} ingredients analyzed
                        </span>

                        <div className="flex gap-1.5 flex-wrap">
                          {scan.avoidsCount > 0 && (
                            <span className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200/60 px-1.5 py-0.5 rounded">
                              {scan.avoidsCount} avoid
                            </span>
                          )}
                          {scan.cautionsCount > 0 && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded">
                              {scan.cautionsCount} caution
                            </span>
                          )}
                          {scan.avoidsCount === 0 && scan.cautionsCount === 0 && (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              All Safe
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] font-black uppercase text-zinc-400">Score</span>
                          <span className="text-sm font-black text-zinc-950">{scan.score}/100</span>
                        </div>
                        <div
                          className={`w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center border shadow-2xs ${
                            scan.grade === "A" || scan.grade === "B"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/70"
                              : scan.grade === "C"
                              ? "bg-amber-50 text-amber-700 border-amber-200/70"
                              : "bg-rose-50 text-rose-700 border-rose-200/70"
                          }`}
                        >
                          {scan.grade}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* COMPARISON UPGRADE BANNER */}
            <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-zinc-800 flex flex-col gap-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-full mb-3">
                    <Sparkles className="w-3 h-3" />
                    Free Account Upgrade
                  </span>
                  <h3 className="text-xl md:text-2xl font-black tracking-tight">
                    Keep your scans forever & sync across devices
                  </h3>
                  <p className="text-zinc-400 text-xs md:text-sm font-normal leading-relaxed mt-1 max-w-xl">
                    Connecting your Google account takes 5 seconds, is 100% free, and automatically transfers your existing guest scans into a permanent cloud vault.
                  </p>
                </div>

                <button
                  onClick={() => signIn("google")}
                  className="self-start md:self-auto text-xs font-bold text-zinc-900 bg-white hover:bg-zinc-100 py-3 px-5 rounded-xl flex items-center gap-2.5 transition-all shadow-md active:scale-98 cursor-pointer shrink-0"
                >
                  <GoogleIcon />
                  <span>Sign In with Google</span>
                </button>
              </div>

              {/* Side-by-side feature matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-zinc-800 pt-6">
                <div className="bg-zinc-800/50 rounded-2xl p-4 border border-zinc-700/50 flex flex-col gap-2.5">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Guest Mode (Current)
                  </span>
                  <div className="flex items-center gap-2 text-xs text-zinc-300">
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Capped at 5 free scans lifetime</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-300">
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>History purges after 7 days</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-300">
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Single browser only (no cloud sync)</span>
                  </div>
                </div>

                <div className="bg-emerald-950/30 rounded-2xl p-4 border border-emerald-800/40 flex flex-col gap-2.5">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Full Account (Google Connected)
                  </span>
                  <div className="flex items-center gap-2 text-xs text-zinc-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Unlimited AI ingredient & allergen scans</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Permanent scan vault with no expiration</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Instant automatic migration of your guest scans</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ================================================================= */
          /* AUTHENTICATED USER SECTION (SHOWN WHEN LOGGED IN)                 */
          /* ================================================================= */
          <div className="flex flex-col gap-8 animate-fade-in">
            {/* PROFILE HERO CARD */}
            <div className="relative overflow-hidden rounded-3xl bg-white border border-zinc-200/80 p-6 md:p-8 shadow-sm">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-gradient-to-bl from-emerald-100/50 via-teal-50/30 to-transparent rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    {session.user.image ? (
                      <img
                        src={session.user.image}
                        alt={session.user.name || "User profile"}
                        className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border-2 border-white shadow-md ring-4 ring-emerald-500/10"
                      />
                    ) : (
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-3xl flex items-center justify-center shadow-md ring-4 ring-emerald-500/10">
                        {(session.user.name || session.user.email || "U")[0].toUpperCase()}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center shadow-xs">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h1 className="text-2xl md:text-3xl font-black text-zinc-950 tracking-tight">
                        {session.user.name || "FoodNet Member"}
                      </h1>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-xs font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verified Account
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs md:text-sm text-zinc-500 font-medium">
                      <Mail className="w-4 h-4 text-zinc-400" />
                      <span className="truncate">{session.user.email}</span>
                    </div>

                    <p className="text-xs text-zinc-400 font-medium mt-1">
                      Member of FoodNet AI Food Safety Analysis
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start md:self-auto">
                  <Link
                    href="/"
                    className="text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 transition-all py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                  >
                    <ScanLine className="w-3.5 h-3.5" />
                    <span>New Scan</span>
                  </Link>

                  <button
                    onClick={() => signOut()}
                    className="text-xs font-bold text-rose-600 bg-rose-50/60 hover:bg-rose-100/70 border border-rose-200/60 transition-all py-2.5 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>

            {/* METRICS & OVERVIEW GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-zinc-200/70 shadow-2xs flex flex-col gap-2">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Scans</span>
                  <Activity className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-3xl font-black text-zinc-950">{totalScans}</div>
                <span className="text-[11px] text-zinc-500 font-medium">Permanent vault scans</span>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-zinc-200/70 shadow-2xs flex flex-col gap-2">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Avg Score</span>
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-3xl font-black text-emerald-600">
                  {totalScans > 0 ? `${avgScore}/100` : "--"}
                </div>
                <span className="text-[11px] text-zinc-500 font-medium">Health & safety index</span>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-zinc-200/70 shadow-2xs flex flex-col gap-2">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Avoid Alerts</span>
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                </div>
                <div className="text-3xl font-black text-rose-600">{totalAvoids}</div>
                <span className="text-[11px] text-zinc-500 font-medium">Flagged risk ingredients</span>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-zinc-200/70 shadow-2xs flex flex-col gap-2">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Cautions</span>
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-3xl font-black text-amber-600">{totalCautions}</div>
                <span className="text-[11px] text-zinc-500 font-medium">Moderate caution alerts</span>
              </div>
            </div>

            {/* SAVED SCAN VAULT */}
            <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 md:p-8 shadow-sm flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-zinc-950">
                    Saved Scan Vault
                  </h2>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">
                    Your scans are safely saved to your Google account with permanent retention.
                  </p>
                </div>

                <Link
                  href="/"
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 group"
                >
                  <span>Scan More</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {loadingScans ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
                  <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-semibold">Loading your scan vault...</span>
                </div>
              ) : scans.length === 0 ? (
                <div className="py-16 text-center flex flex-col items-center justify-center gap-4 bg-zinc-50/60 rounded-2xl border border-dashed border-zinc-200">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ScanLine className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col gap-1 max-w-sm">
                    <span className="text-sm font-bold text-zinc-900">No Scans Recorded Yet</span>
                    <p className="text-xs text-zinc-500 font-normal leading-relaxed">
                      Upload an ingredient label from any packaged food to analyze additives, allergens, and nutritional grades.
                    </p>
                  </div>
                  <Link
                    href="/"
                    className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 py-2.5 px-5 rounded-xl transition-colors shadow-sm mt-1"
                  >
                    Scan Your First Product
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {scans.map((scan) => (
                    <Link
                      key={scan.id}
                      href={`/scan/${scan.id}`}
                      className="group border border-zinc-200/80 rounded-2xl p-4 bg-white hover:border-emerald-300 hover:bg-emerald-50/10 shadow-2xs hover:shadow-sm transition-all duration-200 flex items-center justify-between"
                    >
                      <div className="flex flex-col gap-1.5 min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-800 truncate">
                            Scan #{scan.id.substring(0, 8)}
                          </span>
                          {scan.createdAt && (
                            <span className="text-[10px] text-zinc-400 font-medium">
                              {new Date(scan.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                        </div>

                        <span className="text-xs text-zinc-500 font-medium">
                          {scan.ingredientsCount} ingredients analyzed
                        </span>

                        <div className="flex gap-1.5 flex-wrap">
                          {scan.avoidsCount > 0 && (
                            <span className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200/60 px-1.5 py-0.5 rounded">
                              {scan.avoidsCount} avoid
                            </span>
                          )}
                          {scan.cautionsCount > 0 && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded">
                              {scan.cautionsCount} caution
                            </span>
                          )}
                          {scan.avoidsCount === 0 && scan.cautionsCount === 0 && (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              All Safe
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] font-black uppercase text-zinc-400">Score</span>
                          <span className="text-sm font-black text-zinc-950">{scan.score}/100</span>
                        </div>
                        <div
                          className={`w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center border shadow-2xs ${
                            scan.grade === "A" || scan.grade === "B"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/70"
                              : scan.grade === "C"
                              ? "bg-amber-50 text-amber-700 border-amber-200/70"
                              : "bg-rose-50 text-rose-700 border-rose-200/70"
                          }`}
                        >
                          {scan.grade}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
