"use client";

import { FaBars } from "react-icons/fa";

interface AdminTopbarProps {
  name: string;
  email: string;
  onMenuClick: () => void;
}

export default function AdminTopbar({ name, email, onMenuClick }: AdminTopbarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-3 sm:px-6 lg:px-10 gap-2">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Hamburger — only below lg, since sidebar is always visible at lg+ */}
        <button
          onClick={onMenuClick}
          aria-label="Toggle sidebar"
          className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-[#263238] hover:bg-gray-100 transition-colors shrink-0"
        >
          <FaBars className="w-4 h-4" />
        </button>

        <h1 className="text-sm sm:text-base lg:text-lg font-semibold text-[#263238] truncate">
          Dashboard
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-[#263238] leading-tight">
            {name}
          </p>
          <p className="text-xs text-[#717171]">{email}</p>
        </div>
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#4CAF4F] flex items-center justify-center text-white text-[11px] sm:text-xs font-bold shrink-0">
          {initials}
        </div>
      </div>
    </header>
  );
}