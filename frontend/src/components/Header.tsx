"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, Clock, Sun } from "lucide-react";
import Logo from "./Logo";
import { ScanRecord } from "../lib/db";

interface HeaderProps {
  onLogoClick?: () => void;
}

export default function Header({ onLogoClick }: HeaderProps) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<ScanRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleLogoClick = (e: React.MouseEvent) => {
    setIsMobileMenuOpen(false);
    if (onLogoClick) {
      e.preventDefault();
      onLogoClick();
    } else {
      router.push("/");
    }
  };

  const openHistory = async () => {
    setIsHistoryOpen(true);
    setIsMobileMenuOpen(false);
    setLoadingHistory(true);
    const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
    try {
      const res = await fetch(`${API_URL}/api/v1/scans`);
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data);
      }
    } catch (e) {
      console.error("Failed to fetch scan history:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-zinc-100 py-4 px-6 md:px-12 flex justify-between items-center transition-all duration-300">
        <Link
          href="/"
          onClick={handleLogoClick}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-8 h-8 relative flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300">
            <Logo />
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-900">
            <span className="text-red-500">Food</span>Net
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/#working"
            className="text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            How it Works
          </Link>
          <Link
            href="/about"
            className="text-sm font-semibold text-zinc-500 hover:text-zinc-900 cursor-pointer transition-colors"
          >
            About
          </Link>

          {/* Scan History Button */}
          <button
            onClick={openHistory}
            className="text-xs font-semibold text-amber-800/80 bg-amber-50/30 border border-amber-100 hover:bg-amber-50 hover:border-amber-200 transition-all duration-300 py-2 px-4 rounded-full flex items-center gap-1.5 cursor-pointer shadow-sm shadow-amber-500/5 active:scale-95"
          >
            <Clock className="w-3.5 h-3.5 text-amber-700/80" />
            Scan History
          </button>

          {/* Sun/Moon lightmode toggle icon */}
          <button className="text-zinc-400 hover:text-zinc-700 transition-colors p-1.5 hover:bg-zinc-50 rounded-full cursor-pointer">
            <Sun className="w-4 h-4 stroke-[2]" />
          </button>

          {/* Profile Circle Avatar */}
          <div className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-800 transition-colors text-white font-bold flex items-center justify-center text-sm cursor-pointer shadow-sm">
            N
          </div>
        </nav>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>

        {/* Mobile Drawer Dropdown */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border-b border-zinc-100 p-6 flex flex-col gap-4 shadow-xl z-30 md:hidden animate-slide-down">
            <Link
              href="/#working"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm font-bold text-zinc-600 hover:text-zinc-900 transition-colors py-2.5 px-4 hover:bg-zinc-50 rounded-xl"
            >
              How it Works
            </Link>
            <Link
              href="/about"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm font-bold text-zinc-600 hover:text-zinc-900 cursor-pointer transition-colors py-2.5 px-4 hover:bg-zinc-50 rounded-xl"
            >
              About
            </Link>
            
            <button
              onClick={openHistory}
              className="text-sm font-bold text-amber-800 bg-amber-50/30 border border-amber-100 py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-4 h-4 text-amber-700" />
              Scan History
            </button>

            <div className="flex items-center gap-3 border-t border-zinc-100 pt-4 mt-1 px-4">
              <div className="w-8 h-8 rounded-full bg-slate-700 text-white font-bold flex items-center justify-center text-sm">
                N
              </div>
              <span className="text-sm font-bold text-zinc-700">Profile (N)</span>
            </div>
          </div>
        )}
      </header>

      {/* Scan History Drawer */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsHistoryOpen(false)}
          />
          {/* Drawer Panel */}
          <div className="relative w-full max-w-md h-full bg-white/95 backdrop-blur-md shadow-2xl border-l border-zinc-100 flex flex-col z-10 animate-slide-in-right">
            {/* Header */}
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <h2 className="text-lg font-bold text-zinc-900">Scan History</h2>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="p-1.5 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-600 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-400">
                  <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-semibold">Retrieving history...</span>
                </div>
              ) : historyList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 shadow-inner">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-zinc-800">No Scans Yet</span>
                    <span className="text-xs text-zinc-400 max-w-[200px] leading-relaxed font-semibold">
                      Your scanned products will appear here for easy lookup.
                    </span>
                  </div>
                </div>
              ) : (
                historyList.map((scan) => {
                  const avoids = scan.ingredients?.filter((i: any) => i.rating === "avoid").length || 0;
                  const cautions = scan.ingredients?.filter((i: any) => i.rating === "caution").length || 0;
                  return (
                    <Link
                      key={scan.id}
                      href={`/scan/${scan.id}`}
                      onClick={() => setIsHistoryOpen(false)}
                      className="group border border-zinc-100 rounded-2xl p-4 bg-white hover:border-amber-200 hover:bg-amber-50/10 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between"
                    >
                      <div className="flex flex-col gap-1 text-left">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                          Scan #{scan.id.substring(0, 8)}
                        </span>
                        <span className="text-xs text-zinc-500 font-semibold mt-0.5">
                          {scan.ingredients?.length || 0} ingredients analyzed
                        </span>
                        <div className="flex gap-2 mt-1.5">
                          {avoids > 0 && (
                            <span className="text-[9px] font-bold text-red-700 bg-red-50 border border-red-100/50 px-1.5 py-0.5 rounded">
                              {avoids} avoid
                            </span>
                          )}
                          {cautions > 0 && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100/50 px-1.5 py-0.5 rounded">
                              {cautions} caution
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] font-black text-zinc-400 uppercase">Score</span>
                          <span className="text-sm font-black text-zinc-950">{scan.score}/100</span>
                        </div>
                        <div className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shadow-sm border ${
                          scan.grade === 'A' || scan.grade === 'B' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : scan.grade === 'C' 
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : 'bg-red-50 text-red-700 border-red-100'
                        }`}>
                          {scan.grade}
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
