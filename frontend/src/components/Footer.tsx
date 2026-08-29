"use client";

import { Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-200/60 bg-white py-12 px-6 md:px-12 flex flex-col items-center justify-center text-center gap-4">
      {/* Footer Cherry Logo */}
      <div className="flex items-center gap-1.5">
        <svg
          viewBox="0 0 32 32"
          className="w-5 h-5 fill-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M19 14C17.5 7.5 13 4.5 13 4.5"
            stroke="#15803d"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M13 4.5C9.5 5.5 7 9 7 9"
            stroke="#15803d"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="18" r="6" fill="#ef4444" />
          <circle cx="20" cy="16" r="6.5" fill="#dc2626" />
        </svg>
        <span className="text-sm font-black tracking-tight text-zinc-800">
          <span className="text-red-500">Food</span>Net
        </span>
      </div>

      <p className="text-xs text-zinc-400 font-medium">
        Made with{" "}
        <Heart className="w-3 h-3 text-red-500 inline fill-red-500" /> for
        healthier eating.
      </p>

      <div className="flex items-center gap-4 text-xs font-semibold text-zinc-400">
        <span className="hover:text-zinc-700 cursor-pointer transition-colors">
          Privacy Policy
        </span>
        <span>•</span>
        <span className="hover:text-zinc-700 cursor-pointer transition-colors">
          Terms of Service
        </span>
      </div>
    </footer>
  );
}
