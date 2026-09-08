"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { CircleNotch } from "@phosphor-icons/react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "soft";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  block?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-strong shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] disabled:bg-ink-4",
  secondary: "bg-surface text-ink border border-line-strong hover:border-ink-3 hover:bg-surface-2 disabled:text-ink-4 disabled:border-line",
  soft: "bg-brand-soft text-brand-strong hover:bg-[#cfe9ea] disabled:bg-surface-2 disabled:text-ink-4",
  ghost: "bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink disabled:text-ink-4",
  danger: "bg-danger text-white hover:bg-[#b23a32] disabled:bg-ink-4",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-control",
  md: "h-9 px-3.5 text-sm gap-2 rounded-control",
  lg: "h-11 px-5 text-[15px] gap-2 rounded-[8px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, icon, iconRight, block, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "press inline-flex items-center justify-center font-medium whitespace-nowrap select-none disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <CircleNotch className="animate-spin" size={16} weight="bold" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: "sm" | "md";
  tone?: "neutral" | "danger";
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = "md", tone = "neutral", className, children, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "press inline-flex items-center justify-center rounded-control border border-transparent text-ink-2 hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:text-ink-4 disabled:hover:bg-transparent",
        size === "sm" ? "h-7 w-7" : "h-8 w-8",
        tone === "danger" && "hover:bg-danger-soft hover:text-danger",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
