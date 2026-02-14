import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import TeamThemeProvider from "@/components/TeamThemeProvider";
import NavBar from "@/components/NavBar";

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
          <NavBar />
          {children}
        </TeamThemeProvider>
      </body>
    </html>
  );
}
