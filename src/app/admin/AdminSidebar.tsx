"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaTachometerAlt, FaUsers } from "react-icons/fa";
import LogoutButton from "@/app/components/LogoutButton";

// Add more items here as you build out more admin pages
const menuItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: FaTachometerAlt },
  { label: "Users", href: "/admin/users", icon: FaUsers },
];

interface AdminSidebarProps {
  open: boolean;
}

export default function AdminSidebar({ open }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`${open ? "flex" : "hidden"} lg:flex flex-col
      fixed lg:static top-16 lg:top-0 bottom-0 left-0 z-40 bg-[#1e2b32] shrink-0
      w-16 md:w-64
      rounded-tr-2xl lg:rounded-none shadow-xl lg:shadow-none`}
    >
      {/* Logo — icon only below md, full wordmark at md+ */}
      <div className="h-16 flex items-center justify-center md:justify-start px-0 md:px-6 border-b border-white/10">
        <span className="hidden md:inline text-lg font-semibold text-white">
          Nextcent <span className="text-[#4CAF4F]">Admin</span>
        </span>
        <span className="md:hidden text-lg font-bold text-[#4CAF4F]">N</span>
      </div>

      {/* Menu — icon only below md, icon + label at md+ */}
      <nav className="flex-1 px-2 md:px-3 py-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              title={item.label}
              className={`flex items-center justify-center md:justify-start gap-3 px-0 md:px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#4CAF4F]/15 text-[#4CAF4F]"
                  : "text-gray-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout pinned to the bottom of the menu — icon only below md */}
      <div className="p-2 md:p-3 border-t border-white/10">
        <LogoutButton fullWidth hideLabelOnMobile />
      </div>
    </aside>
  );
}