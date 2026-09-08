"use client";

import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "./cn";

/*
 * Tabla de datos: cabecera fija con fondo tenue, filas con hover suave,
 * numeros tabulares y celdas de acciones alineadas a la derecha.
 */

export function TableShell({ children, className, footer }: { children: ReactNode; className?: string; footer?: ReactNode }) {
  return (
    <div className={cn("overflow-hidden rounded-card border border-line bg-surface shadow-card", className)}>
      <div className="scroll-thin overflow-x-auto">{children}</div>
      {footer ? <div className="border-t border-line bg-surface px-4 py-2.5 text-[12.5px] text-ink-3">{footer}</div> : null}
    </div>
  );
}

export function Table({ className, children, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn("w-full border-collapse text-left text-[13.5px] text-ink", className)} {...rest}>
      {children}
    </table>
  );
}

export function THead({ children, className }: { children: ReactNode; className?: string }) {
  return <thead className={cn("bg-surface-2/70 text-[12px] font-medium text-ink-3", className)}>{children}</thead>;
}

export function TBody({ children, className }: { children: ReactNode; className?: string }) {
  return <tbody className={cn("divide-y divide-line", className)}>{children}</tbody>;
}

export function Tr({ className, interactive, children, ...rest }: HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) {
  return (
    <tr className={cn("group transition-colors duration-100", interactive && "cursor-pointer hover:bg-brand-faint", !interactive && "hover:bg-surface-2/50", className)} {...rest}>
      {children}
    </tr>
  );
}

export function Th({ className, children, align, ...rest }: ThHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center" }) {
  return (
    <th scope="col" className={cn("h-10 whitespace-nowrap px-4 font-medium", align === "right" && "text-right", align === "center" && "text-center", className)} {...rest}>
      {children}
    </th>
  );
}

export function Td({ className, children, align, muted, mono, ...rest }: TdHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center"; muted?: boolean; mono?: boolean }) {
  return (
    <td className={cn("px-4 py-2.5 align-middle", align === "right" && "tnum text-right", align === "center" && "text-center", muted && "text-ink-3", mono && "code text-ink-2", className)} {...rest}>
      {children}
    </td>
  );
}

export function RowActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex items-center justify-end gap-0.5 opacity-70 transition-opacity group-hover:opacity-100", className)}>{children}</div>;
}

export function CellPrimary({ title, subtitle, mono }: { title: ReactNode; subtitle?: ReactNode; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className={cn("truncate font-medium text-ink", mono && "code")}>{title}</span>
      {subtitle ? <span className="truncate text-[12px] text-ink-3">{subtitle}</span> : null}
    </div>
  );
}

export function TableMessage({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-[13px] text-ink-3">
        {children}
      </td>
    </tr>
  );
}
