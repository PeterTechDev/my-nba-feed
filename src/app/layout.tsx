import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import TeamThemeProvider from "@/components/TeamThemeProvider";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { SpoilerModeProvider } from "@/components/SpoilerModeProvider";
import { getSiteUrl, siteDescription, siteName } from "@/lib/site";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    type: "website",
    siteName,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} flex min-h-dvh flex-col font-sans antialiased bg-[#0a0a0a] text-white`}>
        <TeamThemeProvider>
          <SpoilerModeProvider>
            <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-amber-300 focus:px-4 focus:py-3 focus:text-black">Skip to content</a>
            <NavBar />
            <div id="main-content" tabIndex={-1} className="flex-1">{children}</div>
            <Footer />
          </SpoilerModeProvider>
        </TeamThemeProvider>
      </body>
    </html>
  );
}
