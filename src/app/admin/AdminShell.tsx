"use client";

import { useState } from "react";
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
    <div className="min-h-screen flex bg-[#F5F7FA]">
      <AdminSidebar open={sidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar
          name={name}
          email={email}
          onMenuClick={() => setSidebarOpen((v) => !v)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-10">{children}</main>
        <AdminFooter />
      </div>
    </div>
  );
}