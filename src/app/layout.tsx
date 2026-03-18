import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./global.css";
import { AppShell } from "@/components/layout/AppShell";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Luzo",
  description: "An AI-powered API testing and development playground",
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
    apple: [{ url: "/logo.svg", type: "image/svg+xml" }],
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
      className={`${inter.variable} ${geistMono.variable} h-screen overflow-hidden`}
    >
      <body className="antialiased h-full overflow-hidden">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
