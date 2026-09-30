"use client";

import { Suspense, useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import AdminFooter from "./AdminFooter";

interface AdminShellProps {
  name: string;
  email: string;
  children: React.ReactNode;
}

export default function AdminShell({ name, email, children }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-dvh overflow-hidden flex bg-[#F5F7FA]">
      <AdminSidebar open={sidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 h-full">
        <div className="shrink-0">
          <Suspense fallback={<header className="h-16 bg-white border-b border-gray-100" />}>
            <AdminTopbar
              name={name}
              email={email}
              onMenuClick={() => setSidebarOpen((v) => !v)}
            />
          </Suspense>
        </div>

        {/* Scroll hoga, lekin scrollbar hidden rahega */}
        <div className="flex-1 overflow-y-auto flex flex-col [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <main className="flex-1 p-4 sm:p-6 lg:p-10 pb-2">{children}</main>
          <AdminFooter />
        </div>
      </div>
    </div>
  );
}