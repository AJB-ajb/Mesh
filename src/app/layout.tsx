import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { SWRProvider } from "@/lib/swr/provider";
import { FeedbackWidget } from "@/components/feedback/feedback-widget";
import { labels } from "@/lib/labels";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: labels.meta.title,
    template: "%s | MeshIt",
  },
  description: labels.meta.description,
  keywords: [
    "collaboration",
    "project matching",
    "developers",
    "activity matching",
    "team building",
    "hackathon",
  ],
  authors: [{ name: labels.meta.appName }],
  creator: labels.meta.appName,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: labels.meta.appName,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://meshit.app",
    title: labels.meta.title,
    description: labels.meta.description,
    siteName: labels.meta.appName,
  },
  twitter: {
    card: "summary_large_image",
    title: labels.meta.title,
    description: labels.meta.description,
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <SWRProvider>
          <ThemeProvider>
            {children}
            <FeedbackWidget />
          </ThemeProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
