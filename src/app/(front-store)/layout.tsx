// app/(front-store)/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import { Toaster } from "sonner";

import ReduxProvider from "@/store/Provider";
import Navbar from "@/app/components/storefront/layout/Navbar";
import Footer from "@/app/components/storefront/layout/Footer";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Nextcent",
  description: "Manage your entire community in a single system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} min-h-screen bg-surface text-text font-sans`}
        suppressHydrationWarning
      >
        <ReduxProvider>
          <div
            data-theme-scope="store"
            data-store-theme="brown"
            className="min-h-screen flex flex-col bg-surface text-text"
          >
            <Navbar />

            <main className="flex-1">{children}</main>

            <Footer />
          </div>

          <Toaster position="top-right" richColors />
        </ReduxProvider>
      </body>
    </html>
  );
}