"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "@/components/session/SessionProvider";
import { ConfirmProvider, PromptProvider, TooltipProvider } from "@/components/ui/Overlay";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <TooltipProvider>
        <ConfirmProvider>
          <PromptProvider>{children}</PromptProvider>
        </ConfirmProvider>
      </TooltipProvider>
    </SessionProvider>
  );
}
