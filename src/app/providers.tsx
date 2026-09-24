"use client";

import type { ReactNode } from "react";
import { ActuarComoProvider } from "@/components/session/ActuarComo";
import { SessionProvider } from "@/components/session/SessionProvider";
import { ConfirmProvider, PromptProvider, TooltipProvider } from "@/components/ui/Overlay";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <TooltipProvider>
        <ConfirmProvider>
          <PromptProvider>
            <ActuarComoProvider>{children}</ActuarComoProvider>
          </PromptProvider>
        </ConfirmProvider>
      </TooltipProvider>
    </SessionProvider>
  );
}
