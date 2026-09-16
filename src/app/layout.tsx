import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/providers";
import { SplashScreen } from "@/components/brand/splash";
import { Toaster, toast } from "@/components/ui/toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: {
    default: "FixMind AI — Troubleshoot with AI, earn verified FIX rewards",
    template: "%s · FixMind AI",
  },
  description:
    "FixMind AI analyzes your software, coding and device problems, recommends the best verified fixes, learns from real outcomes, and rewards useful contributions with FIX tokens.",
  keywords: [
    "FixMind AI",
    "AI troubleshooting",
    "verified fixes",
    "FIX tokens",
    "developer support",
    "Web3 rewards",
  ],
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "FixMind AI",
    description:
      "AI that learns from what actually works. Solve problems, verify outcomes, earn FIX.",
    type: "website",
  },
} satisfies Metadata;

export const viewport: Viewport = {
  themeColor: "#0a0a13",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="dark"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <SplashScreen />
          {children}
          <Toaster toastManager={toast} />
        </ThemeProvider>
      </body>
    </html>
  );
}