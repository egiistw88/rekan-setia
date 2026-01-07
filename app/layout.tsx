import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/app/components/Providers";
import BottomNav from "@/app/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rekan Setia",
  description: "Pendamping harian yang ringan dan stabil.",
  applicationName: "Rekan Setia",
  manifest: "/manifest.webmanifest",
  themeColor: "#f8f7f3",
  appleWebApp: {
    title: "Rekan Setia",
    statusBarStyle: "default",
    capable: true,
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-[color:var(--background)] text-[color:var(--foreground)] antialiased`}
      >
        <Providers>
          <div className="flex min-h-dvh flex-col">
            {children}
            <BottomNav />
          </div>
        </Providers>
      </body>
    </html>
  );
}
