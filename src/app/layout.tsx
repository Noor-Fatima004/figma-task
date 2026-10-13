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
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} min-h-screen bg-surface text-text font-sans`}
        suppressHydrationWarning
      >
        <div
          data-theme-scope="store"
          data-store-theme="brown"
          className="min-h-screen flex flex-col bg-surface text-text"
        >

          <main className="flex-1">
            {children}
          </main>

        </div>

        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}