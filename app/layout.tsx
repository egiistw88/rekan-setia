import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/app/components/Providers";
import AppShell from "@/app/components/AppShell";

export const metadata: Metadata = {
  title: "Rekan Setia",
  description: "Pendamping harian yang ringan dan stabil.",
  applicationName: "Rekan Setia",
  manifest: "/manifest.webmanifest",
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

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f14" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className="min-h-dvh bg-[color:var(--bg)] text-[color:var(--text)] antialiased"
      >
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
