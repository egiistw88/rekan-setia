"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import ThemeAutoManager from "./theme/ThemeAutoManager";

type ProvidersProps = {
  children: ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
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
