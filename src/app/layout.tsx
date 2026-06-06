import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/auth-context";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Spend Intelligence | Stop Overpaying for AI Tools",
  description: "Audit your AI tool spending, eliminate overlap, and save thousands annually. Free instant audit for startups and engineering teams.",
  keywords: ["AI spend", "AI tools audit", "cost optimization", "SaaS savings", "developer tools", "ChatGPT", "Copilot", "Cursor"],
  openGraph: {
    title: "AI Spend Intelligence | Stop Overpaying for AI Tools",
    description: "Discover wasted AI spend, eliminate tool overlap, and save thousands annually.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

