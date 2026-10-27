import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import TeamThemeProvider from "@/components/TeamThemeProvider";
import NavBar from "@/components/NavBar";
import { SpoilerModeProvider } from "@/components/SpoilerModeProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "NBA Feed",
  description: "Your personalized NBA dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-[#0a0a0a] text-white`}>
        <TeamThemeProvider>
          <SpoilerModeProvider>
            <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-amber-300 focus:px-4 focus:py-3 focus:text-black">Skip to content</a>
            <NavBar />
            <div id="main-content" tabIndex={-1}>{children}</div>
          </SpoilerModeProvider>
        </TeamThemeProvider>
      </body>
    </html>
  );
}
