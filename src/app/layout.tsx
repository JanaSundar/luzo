import type { Metadata } from "next";
import "./global.css";
import { AppShell } from "@/components/layout/AppShell";
import { Providers } from "./providers";

function normalizeAppUrl(value?: string): URL {
  const fallback = "http://localhost:3000";
  const raw = (value ?? fallback).trim();
  const prefixed = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    return new URL(prefixed);
  } catch {
    return new URL(fallback);
  }
}

const appUrl = normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL);
const siteTitle = "Luzo";
const siteDescription =
  "Design API workflows like a flowchart. Debug them like a timeline with a developer-first API playground, pipeline builder, and AI-powered reporting.";
const fontVariables =
  "[--font-sans:Inter,ui-sans-serif,system-ui,sans-serif] [--font-geist-mono:'SFMono-Regular',ui-monospace,monospace]";

export const metadata: Metadata = {
  metadataBase: appUrl,
  applicationName: siteTitle,
  title: {
    default: siteTitle,
    template: `%s | ${siteTitle}`,
  },
  description: siteDescription,
  keywords: [
    "API playground",
    "API workflow builder",
    "pipeline orchestration",
    "request debugging",
    "JSON response viewer",
    "developer tools",
  ],
  authors: [{ name: "Luzo" }],
  creator: "Luzo",
  publisher: "Luzo",
  alternates: {
    canonical: "/",
  },
  category: "developer tools",
  openGraph: {
    type: "website",
    url: "/",
    siteName: siteTitle,
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: "/og-image.jpeg",
        width: 1200,
        height: 630,
        alt: "Luzo — API Workflow Builder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    images: ["/og-image.jpeg"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteTitle,
  },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: [{ url: "/logo.svg", type: "image/svg+xml" }, { url: "/favicon.ico" }],
    apple: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontVariables} h-screen overflow-hidden`}
    >
      <body className="antialiased h-full overflow-hidden">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
