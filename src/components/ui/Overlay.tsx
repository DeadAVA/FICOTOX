"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Dialog as RadixDialog, DropdownMenu as RadixDropdown, HoverCard as RadixHoverCard, Tooltip as RadixTooltip } from "radix-ui";
import { DotsThreeCircle, X } from "@phosphor-icons/react";
import { Button, IconButton } from "./Button";
import { cn } from "./cn";

/*
 * Capas: Sheet (panel lateral), Dialog (centrado), ConfirmDialog (con hook
 * useConfirm), Dropdown y Tooltip. Todas con Radix para foco y accesibilidad,
 * y animaciones CSS por data-state.
 */

/* Velo: oscurece y empuja el fondo hacia atras para enfocar la tarea. */
const OVERLAY_CLASS = "fixed inset-0 z-40 bg-deep/35 backdrop-blur-[3px] data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out";

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
            "fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-surface shadow-panel outline-none sm:inset-y-3 sm:right-3 sm:rounded-panel",
            "data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out",
            width,
          )}
        >
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
            <div className="flex min-w-0 flex-col gap-0.5">
              <RadixDialog.Title className="title-2 text-ink">{title}</RadixDialog.Title>
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
          {footer ? <footer className="material flex items-center justify-end gap-2 border-t border-line px-5 py-3.5 sm:px-6 sm:rounded-b-panel">{footer}</footer> : null}
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
              "flex max-h-full w-full flex-col overflow-hidden rounded-panel bg-surface shadow-panel outline-none",
              "data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out",
              width,
            )}
          >
            <header className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
              <div className="flex min-w-0 flex-col gap-1">
                <RadixDialog.Title className="title-2 text-ink">{title}</RadixDialog.Title>
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

/* ---------- Captura de motivo con promesa (anular, dar de baja, enmendar...) ---------- */

interface PromptOptions {
  title: ReactNode;
  description?: ReactNode;
  label?: ReactNode;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  /* Longitud minima del texto (los motivos de anulacion requieren al menos 5 caracteres). */
  minLength?: number;
  defaultValue?: string;
}

type PromptFn = (options: PromptOptions) => Promise<string | null>;

const PromptContext = createContext<PromptFn | null>(null);

export function PromptProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(PromptOptions & { open: boolean }) | null>(null);
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const resolver = useRef<((value: string | null) => void) | null>(null);

  const prompt = useCallback<PromptFn>((options) => {
    return new Promise<string | null>((resolve) => {
      resolver.current = resolve;
      setValue(options.defaultValue || "");
      setTouched(false);
      setState({ ...options, open: true });
    });
  }, []);

  const settle = useCallback((result: string | null) => {
    resolver.current?.(result);
    resolver.current = null;
    setState((prev) => (prev ? { ...prev, open: false } : prev));
  }, []);

  const minLength = state?.minLength ?? 5;
  const valid = value.trim().length >= minLength;
  const fieldId = "prompt-motivo";

  return (
    <PromptContext.Provider value={prompt}>
      {children}
      <Dialog
        open={!!state?.open}
        onOpenChange={(open) => {
          if (!open) settle(null);
        }}
        title={state?.title || ""}
        description={state?.description}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => settle(null)}>
              {state?.cancelLabel || "Cancelar"}
            </Button>
            <Button
              variant={state?.tone === "danger" ? "danger" : "primary"}
              onClick={() => {
                setTouched(true);
                if (valid) settle(value.trim());
              }}
            >
              {state?.confirmLabel || "Confirmar"}
            </Button>
          </>
        }
      >
        <label htmlFor={fieldId} className="mb-1.5 block text-[13px] font-medium text-ink-2">
          {state?.label || "Motivo"}
          <span className="ml-0.5 text-brand" aria-hidden="true">
            *
          </span>
        </label>
        <textarea
          id={fieldId}
          rows={3}
          autoFocus
          className={cn("w-full rounded-[10px] border bg-surface-2/80 px-3 py-2.5 text-[14px] text-ink placeholder:text-ink-4 focus:border-brand focus:bg-surface focus:outline-none focus:shadow-[var(--shadow-focus)]", touched && !valid ? "border-danger" : "border-line")}
          placeholder={state?.placeholder || "Describe el motivo; quedará registrado en la bitácora de auditoría"}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        {touched && !valid ? (
          <p className="mt-1.5 text-[12.5px] text-danger" role="alert">
            Escribe al menos {minLength} caracteres.
          </p>
        ) : (
          <p className="mt-1.5 text-[12.5px] text-ink-3">Queda registrado con tu usuario, fecha y hora.</p>
        )}
      </Dialog>
    </PromptContext.Provider>
  );
}

export function usePrompt(): PromptFn {
  const ctx = useContext(PromptContext);
  if (!ctx) throw new Error("usePrompt debe usarse dentro de PromptProvider");
  return ctx;
}

/* ---------- Dropdown ---------- */

export interface MenuItem {
  label: ReactNode;
  icon?: ReactNode;
  /* Linea secundaria bajo la etiqueta (que hace la accion). */
  description?: ReactNode;
  onSelect?: () => void;
  tone?: "neutral" | "brand" | "success" | "warning" | "danger";
  disabled?: boolean;
  separatorBefore?: boolean;
}

const ITEM_ICON_TONE: Record<NonNullable<MenuItem["tone"]>, string> = {
  neutral: "bg-surface-3 text-ink-2",
  brand: "bg-brand-soft text-brand",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

/*
 * Menu contextual: cada opcion lleva su icono en una cajita del color de su
 * tono (como los menus de macOS con SF Symbols) y, si hace falta, una linea
 * que explica que hace. Al resaltar, la fila entera toma el color de acento.
 */
export function Dropdown({ trigger, items, align = "end", label, header }: { trigger: ReactNode; items: MenuItem[]; align?: "start" | "end"; label?: string; header?: ReactNode }) {
  return (
    <RadixDropdown.Root>
      <RadixDropdown.Trigger asChild aria-label={label}>
        {trigger}
      </RadixDropdown.Trigger>
      <RadixDropdown.Portal>
        <RadixDropdown.Content
          align={align}
          sideOffset={6}
          className="material z-50 min-w-[220px] origin-[var(--radix-dropdown-menu-content-transform-origin)] rounded-[14px] p-1.5 shadow-pop data-[state=open]:animate-materialize"
        >
          {header ? <div className="px-2.5 pt-1.5 pb-2 text-[12px] text-ink-3">{header}</div> : null}
          {items.map((item, index) => {
            const tone = item.tone || "neutral";
            return (
              <div key={index}>
                {item.separatorBefore ? <RadixDropdown.Separator className="my-1.5 h-px bg-line" /> : null}
                <RadixDropdown.Item
                  disabled={item.disabled}
                  onSelect={() => item.onSelect?.()}
                  className={cn(
                    "group flex cursor-pointer select-none items-center gap-3 rounded-[9px] px-2 py-1.5 text-[13.5px] outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45",
                    tone === "danger" ? "text-danger data-[highlighted]:bg-danger data-[highlighted]:text-white" : "text-ink data-[highlighted]:bg-brand data-[highlighted]:text-white",
                  )}
                >
                  {item.icon ? <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] transition-colors group-data-[highlighted]:bg-white/20 group-data-[highlighted]:text-white", ITEM_ICON_TONE[tone])}>{item.icon}</span> : null}
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate font-medium">{item.label}</span>
                    {item.description ? <span className="truncate text-[11.5px] text-ink-3 group-data-[highlighted]:text-white/80">{item.description}</span> : null}
                  </span>
                </RadixDropdown.Item>
              </div>
            );
          })}
        </RadixDropdown.Content>
      </RadixDropdown.Portal>
    </RadixDropdown.Root>
  );
}

/* ---------- Menu de acciones de una fila ---------- */

/* Un solo boton "⋯" por fila que agrupa todas las acciones (abrir, editar, avanzar de etapa, anular...). */
export function ActionMenu({ items, header, label = "Acciones" }: { items: MenuItem[]; header?: ReactNode; label?: string }) {
  return (
    <Dropdown
      label={label}
      header={header}
      trigger={
        <IconButton label={label} className="text-ink-3 hover:bg-surface-3 hover:text-ink data-[state=open]:bg-surface-3 data-[state=open]:text-ink">
          <DotsThreeCircle size={22} weight="regular" />
        </IconButton>
      }
      items={items}
    />
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
        <RadixTooltip.Content side={side} sideOffset={6} className="material-dark z-50 max-w-xs rounded-[8px] px-2.5 py-1.5 text-[12.5px] text-white shadow-pop data-[state=delayed-open]:animate-menu-in">
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

/* ---------- HoverCard ---------- */

/*
 * Tarjeta al pasar el cursor (y al enfocar con teclado): detalle de un
 * elemento sin abrirlo. Sale del propio disparador (transform-origin) y se
 * materializa como una capa translúcida; en pantallas táctiles no aparece,
 * el enlace del disparador basta.
 */
export function HoverCard({ content, children, side = "left", align = "center", width = 320, openDelay = 220 }: { content: ReactNode; children: ReactNode; side?: "top" | "bottom" | "left" | "right"; align?: "start" | "center" | "end"; width?: number; openDelay?: number }) {
  return (
    <RadixHoverCard.Root openDelay={openDelay} closeDelay={120}>
      <RadixHoverCard.Trigger asChild>{children}</RadixHoverCard.Trigger>
      <RadixHoverCard.Portal>
        <RadixHoverCard.Content side={side} align={align} sideOffset={10} collisionPadding={12} style={{ width }} className="material z-50 origin-[var(--radix-hover-card-content-transform-origin)] rounded-[16px] p-1 shadow-panel outline-none data-[state=open]:animate-materialize data-[state=closed]:animate-dematerialize">
          {content}
        </RadixHoverCard.Content>
      </RadixHoverCard.Portal>
    </RadixHoverCard.Root>
  );
}
