// app/components/LogoutButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaSignOutAlt } from "react-icons/fa";

interface LogoutButtonProps {
  fullWidth?: boolean;
  hideLabelOnMobile?: boolean; // used inside the icon-only mobile sidebar
}

export default function LogoutButton({
  fullWidth = false,
  hideLabelOnMobile = false,
}: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      title="Logout"
      className={`flex items-center justify-center gap-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:bg-gray-400 px-4 py-2.5 rounded-lg transition-colors ${
        fullWidth ? "w-full" : ""
      }`}
    >
      <FaSignOutAlt className="w-3.5 h-3.5 shrink-0" />
      <span className={hideLabelOnMobile ? "hidden md:inline" : ""}>
        {loading ? "Logging out..." : "Logout"}
      </span>
    </button>
  );
}