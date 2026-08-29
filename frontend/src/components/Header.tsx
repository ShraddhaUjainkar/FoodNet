"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, Clock, Sun } from "lucide-react";
import Logo from "./Logo";

interface HeaderProps {
  onLogoClick?: () => void;
}

export default function Header({ onLogoClick }: HeaderProps) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogoClick = (e: React.MouseEvent) => {
    setIsMobileMenuOpen(false);
    if (onLogoClick) {
      e.preventDefault();
      onLogoClick();
    } else {
      router.push("/");
    }
  };

  return (
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
          onClick={() => alert("Scan History feature coming soon!")}
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
            onClick={() => {
              setIsMobileMenuOpen(false);
              alert("Scan History feature coming soon!");
            }}
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
  );
}
