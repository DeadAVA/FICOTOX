"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Dialog as RadixDialog, DropdownMenu as RadixDropdown, Tooltip as RadixTooltip } from "radix-ui";
import { X } from "@phosphor-icons/react";
import { Button, IconButton } from "./Button";
import { cn } from "./cn";

/*
 * Capas: Sheet (panel lateral), Dialog (centrado), ConfirmDialog (con hook
 * useConfirm), Dropdown y Tooltip. Todas con Radix para foco y accesibilidad,
 * y animaciones CSS por data-state.
 */

const OVERLAY_CLASS = "fixed inset-0 z-40 bg-deep/45 backdrop-blur-[2px] data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg" | "xl";
  headerExtra?: ReactNode;
}

export function Sheet({ open, onOpenChange, title, description, children, footer, size = "md", headerExtra }: SheetProps) {
  const width = { md: "sm:max-w-[520px]", lg: "sm:max-w-[720px]", xl: "sm:max-w-[960px]" }[size];
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={OVERLAY_CLASS} />
        <RadixDialog.Content
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-surface shadow-panel outline-none sm:inset-y-2 sm:right-2 sm:rounded-panel sm:border sm:border-line",
            "data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out",
            width,
          )}
        >
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
            <div className="flex min-w-0 flex-col gap-0.5">
              <RadixDialog.Title className="text-[17px] font-semibold text-ink">{title}</RadixDialog.Title>
              {description ? <RadixDialog.Description className="text-[13px] text-ink-3">{description}</RadixDialog.Description> : <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {headerExtra}
              <RadixDialog.Close asChild>
                <IconButton label="Cerrar">
                  <X size={16} weight="bold" />
                </IconButton>
              </RadixDialog.Close>
            </div>
          </header>
          <div className="scroll-thin flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          {footer ? <footer className="flex items-center justify-end gap-2 border-t border-line bg-surface px-5 py-3.5 sm:px-6 sm:rounded-b-panel">{footer}</footer> : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Dialog({ open, onOpenChange, title, description, children, footer, size = "md" }: DialogProps) {
  const width = { sm: "max-w-[420px]", md: "max-w-[560px]", lg: "max-w-[760px]" }[size];
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={OVERLAY_CLASS} />
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6">
          <RadixDialog.Content
            className={cn(
              "flex max-h-full w-full flex-col overflow-hidden rounded-panel border border-line bg-surface shadow-panel outline-none",
              "data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out",
              width,
            )}
          >
            <header className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
              <div className="flex min-w-0 flex-col gap-1">
                <RadixDialog.Title className="text-[17px] font-semibold text-ink">{title}</RadixDialog.Title>
                {description ? <RadixDialog.Description className="text-[13.5px] text-ink-2">{description}</RadixDialog.Description> : <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>}
              </div>
              <RadixDialog.Close asChild>
                <IconButton label="Cerrar">
                  <X size={16} weight="bold" />
                </IconButton>
              </RadixDialog.Close>
            </header>
            {children ? <div className="scroll-thin overflow-y-auto px-5 pb-4">{children}</div> : null}
            {footer ? <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</footer> : null}
          </RadixDialog.Content>
        </div>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/* ---------- Confirmación con promesa ---------- */

interface ConfirmOptions {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { open: boolean }) | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setState({ ...options, open: true });
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setState((prev) => (prev ? { ...prev, open: false } : prev));
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Dialog
        open={!!state?.open}
        onOpenChange={(open) => {
          if (!open) settle(false);
        }}
        title={state?.title || ""}
        description={state?.description}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => settle(false)}>
              {state?.cancelLabel || "Cancelar"}
            </Button>
            <Button variant={state?.tone === "danger" ? "danger" : "primary"} onClick={() => settle(true)} autoFocus>
              {state?.confirmLabel || "Confirmar"}
            </Button>
          </>
        }
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm debe usarse dentro de ConfirmProvider");
  return ctx;
}

/* ---------- Dropdown ---------- */

export interface MenuItem {
  label: ReactNode;
  icon?: ReactNode;
  onSelect?: () => void;
  tone?: "neutral" | "danger";
  disabled?: boolean;
  separatorBefore?: boolean;
}

export function Dropdown({ trigger, items, align = "end", label }: { trigger: ReactNode; items: MenuItem[]; align?: "start" | "end"; label?: string }) {
  return (
    <RadixDropdown.Root>
      <RadixDropdown.Trigger asChild aria-label={label}>
        {trigger}
      </RadixDropdown.Trigger>
      <RadixDropdown.Portal>
        <RadixDropdown.Content
          align={align}
          sideOffset={6}
          className="z-50 min-w-[200px] rounded-[10px] border border-line bg-surface p-1 shadow-pop data-[state=open]:animate-menu-in"
        >
          {items.map((item, index) => (
            <div key={index}>
              {item.separatorBefore ? <RadixDropdown.Separator className="my-1 h-px bg-line" /> : null}
              <RadixDropdown.Item
                disabled={item.disabled}
                onSelect={() => item.onSelect?.()}
                className={cn(
                  "flex cursor-pointer select-none items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-[13.5px] outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
                  item.tone === "danger" ? "text-danger data-[highlighted]:bg-danger-soft" : "text-ink data-[highlighted]:bg-surface-2",
                )}
              >
                {item.icon ? <span className={cn("text-ink-3", item.tone === "danger" && "text-danger")}>{item.icon}</span> : null}
                {item.label}
              </RadixDropdown.Item>
            </div>
          ))}
        </RadixDropdown.Content>
      </RadixDropdown.Portal>
    </RadixDropdown.Root>
  );
}

/* ---------- Tooltip ---------- */

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <RadixTooltip.Provider delayDuration={300}>{children}</RadixTooltip.Provider>;
}

export function Tooltip({ content, children, side = "top" }: { content: ReactNode; children: ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content side={side} sideOffset={6} className="z-50 max-w-xs rounded-[7px] bg-ink px-2.5 py-1.5 text-[12.5px] text-white shadow-pop data-[state=delayed-open]:animate-menu-in">
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
