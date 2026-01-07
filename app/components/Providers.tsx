"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import ThemeAutoManager from "./theme/ThemeAutoManager";
import { ensureSettingsInitialized } from "@/lib/settings";

type ProvidersProps = {
  children: ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  useEffect(() => {
    void ensureSettingsInitialized();
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
      <ThemeAutoManager />
    </ThemeProvider>
  );
}
