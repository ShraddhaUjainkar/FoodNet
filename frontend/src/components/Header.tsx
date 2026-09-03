"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { Menu, X, LogOut, User, ChevronDown } from "lucide-react";
import Logo from "./Logo";

const GoogleIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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

interface HeaderProps {
  onLogoClick?: () => void;
}

export default function Header({ onLogoClick }: HeaderProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    }
    if (isProfileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileMenuOpen]);

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

      {/* Desktop Navigation Links */}
      <nav className="hidden md:flex items-center gap-8">
        <Link
          href="/#features"
          className="text-sm font-semibold text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer"
        >
          Features
        </Link>
        <Link
          href="/#working"
          className="text-sm font-semibold text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer"
        >
          How it Works
        </Link>
        <Link
          href="/#faq"
          className="text-sm font-semibold text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer"
        >
          FAQ
        </Link>
      </nav>

      {/* Right Section: Profile & Actions */}
      <div className="hidden md:flex items-center gap-3">
        {status === "loading" ? (
          <div className="flex items-center gap-2 py-1 px-2.5 rounded-full border border-zinc-100 bg-zinc-50 animate-pulse">
            <div className="w-7 h-7 rounded-full bg-zinc-200" />
            <div className="w-12 h-3.5 bg-zinc-200 rounded" />
          </div>
        ) : session?.user ? (
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 py-1 pl-1 pr-2.5 rounded-full border border-zinc-200/90 bg-white hover:bg-zinc-50 hover:border-zinc-300 transition-all cursor-pointer shadow-xs active:scale-98 group"
              aria-label="User profile menu"
            >
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "Profile"}
                  className="w-7 h-7 rounded-full object-cover border border-zinc-200 shadow-2xs"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                  {(session.user.name ||
                    session.user.email ||
                    "U")[0].toUpperCase()}
                </div>
              )}
              <span className="text-xs font-semibold text-zinc-700 group-hover:text-zinc-950 max-w-[110px] truncate">
                {session.user.name?.split(" ")[0] || "Profile"}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                  isProfileMenuOpen
                    ? "rotate-180 text-zinc-700"
                    : "group-hover:text-zinc-600"
                }`}
              />
            </button>

            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-zinc-100/90 py-1.5 z-50 animate-slide-down">
                <div className="px-4 py-3 border-b border-zinc-100">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    {session.user.image ? (
                      <img
                        src={session.user.image}
                        alt={session.user.name || "Profile"}
                        className="w-9 h-9 rounded-full object-cover border border-zinc-200"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center text-xs">
                        {(session.user.name ||
                          session.user.email ||
                          "U")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <p className="text-xs font-bold text-zinc-900 truncate">
                        {session.user.name || "FoodNet Member"}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate">
                        {session.user.email}
                      </p>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] font-semibold text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Google Connected
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    href="/profile"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 flex items-center gap-2.5 cursor-pointer transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Manage Profile</span>
                  </Link>
                </div>

                <div className="border-t border-zinc-100 pt-1">
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      signOut();
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <Link
              href="/profile"
              className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 transition-all text-xs font-semibold text-zinc-700 shadow-2xs active:scale-95 group cursor-pointer"
              title="Profile"
            >
              <User className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-600 transition-colors" />
              <span>Profile</span>
            </Link>

            <button
              onClick={() => signIn("google")}
              className="text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 py-1.5 px-3.5 rounded-full flex items-center gap-2 transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <GoogleIcon />
              <span>Sign In</span>
            </button>
          </div>
        )}
      </div>

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
        <div className="absolute top-full left-0 right-0 bg-white border-b border-zinc-100 p-6 flex flex-col gap-2.5 shadow-xl z-30 md:hidden animate-slide-down">
          <Link
            href="/#features"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-sm font-bold text-zinc-700 hover:text-zinc-950 transition-colors py-2 px-4 hover:bg-zinc-50 rounded-xl"
          >
            Features
          </Link>
          <Link
            href="/#working"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-sm font-bold text-zinc-700 hover:text-zinc-950 transition-colors py-2 px-4 hover:bg-zinc-50 rounded-xl"
          >
            How it Works
          </Link>
          <Link
            href="/#faq"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-sm font-bold text-zinc-700 hover:text-zinc-950 transition-colors py-2 px-4 hover:bg-zinc-50 rounded-xl"
          >
            FAQ
          </Link>

          {session?.user ? (
            <div className="flex flex-col gap-2 border-t border-zinc-100 pt-4 mt-1">
              <div className="flex items-center gap-3 px-4 py-2.5 bg-zinc-50/80 rounded-2xl border border-zinc-100">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "Profile"}
                    className="w-9 h-9 rounded-full object-cover border border-zinc-200"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center text-xs">
                    {(session.user.name ||
                      session.user.email ||
                      "U")[0].toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-bold text-zinc-900 truncate">
                    {session.user.name || "FoodNet Member"}
                  </span>
                  <span className="text-[11px] text-zinc-500 truncate">
                    {session.user.email}
                  </span>
                </div>
              </div>

              <Link
                href="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-sm font-semibold text-zinc-700 hover:text-zinc-950 py-2 px-4 hover:bg-zinc-50 rounded-xl flex items-center gap-2.5 transition-colors"
              >
                <User className="w-4 h-4 text-emerald-600" />
                <span>Manage Profile</span>
              </Link>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  signOut();
                }}
                className="text-xs font-semibold text-rose-600 hover:bg-rose-50 py-2 px-4 rounded-xl flex items-center gap-2 cursor-pointer transition-colors mt-1"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 border-t border-zinc-100 pt-4 mt-1">
              <Link
                href="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-sm font-semibold text-zinc-700 hover:text-zinc-950 py-2.5 px-4 hover:bg-zinc-50 rounded-xl flex items-center gap-2.5 transition-colors"
              >
                <User className="w-4 h-4 text-zinc-600" />
                <span>Profile</span>
              </Link>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  signIn("google");
                }}
                className="w-full text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs active:scale-95 cursor-pointer mt-1"
              >
                <GoogleIcon />
                <span>Sign In with Google</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
