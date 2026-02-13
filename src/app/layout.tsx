import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { SWRProvider } from "@/lib/swr/provider";
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
    default: "MeshIt - Find Your Perfect Match",
    template: "%s | MeshIt",
  },
  description:
    "AI-powered matching connects developers with projects that fit their skills and interests. Stop posting 'looking for teammates' in Slack.",
  keywords: [
    "collaboration",
    "project matching",
    "developers",
    "AI matching",
    "team building",
    "hackathon",
  ],
  authors: [{ name: "MeshIt" }],
  creator: "MeshIt",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MeshIt",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://meshit.app",
    title: "MeshIt - Find Your Perfect Match",
    description:
      "AI-powered matching connects developers with projects that fit their skills and interests.",
    siteName: "MeshIt",
  },
  twitter: {
    card: "summary_large_image",
    title: "MeshIt - Find Your Perfect Match",
    description:
      "AI-powered matching connects developers with projects that fit their skills and interests.",
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
          <ThemeProvider>{children}</ThemeProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
