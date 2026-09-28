// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

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
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`} suppressHydrationWarning>
        <div data-theme-scope="website" className="min-h-screen bg-surface text-text font-sans">
          {children}
        </div>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}