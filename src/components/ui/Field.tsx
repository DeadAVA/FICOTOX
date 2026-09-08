"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { cn } from "./cn";

/*
 * Controles de formulario. Etiqueta arriba, ayuda opcional, error abajo.
 * Todos comparten la misma altura (36 px) y el mismo anillo de foco.
 */

export const controlClass =
  "w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-4 transition-[border-color,box-shadow] duration-150 hover:border-ink-4 focus:border-brand focus:outline-none focus:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-3 read-only:bg-surface-2";

export interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
  inline?: ReactNode;
}

export function Field({ label, hint, error, required, htmlFor, className, children, inline }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-2">
            {label}
            {required ? <span className="ml-0.5 text-bloom" aria-hidden="true">*</span> : null}
          </label>
          {inline}
        </div>
      ) : null}
      {children}
      {error ? (
        <p className="text-[12.5px] text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12.5px] text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  mono?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, invalid, leading, trailing, mono, ...rest }, ref) {
  const input = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(controlClass, "h-9", leading && "pl-9", trailing && "pr-9", mono && "font-mono text-[13px]", invalid && "border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgba(201,70,61,0.18)]", className)}
      {...rest}
    />
  );
  if (!leading && !trailing) return input;
  return (
    <div className="relative">
      {leading ? <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-3">{leading}</span> : null}
      {input}
      {trailing ? <span className="absolute inset-y-0 right-2 flex items-center text-ink-3">{trailing}</span> : null}
    </div>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, invalid, rows = 3, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} aria-invalid={invalid || undefined} className={cn(controlClass, "min-h-9 resize-y py-2 leading-relaxed", invalid && "border-danger", className)} {...rest} />;
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, invalid, children, ...rest }, ref) {
  return (
    <div className="relative">
      <select ref={ref} aria-invalid={invalid || undefined} className={cn(controlClass, "h-9 appearance-none pr-9", invalid && "border-danger", className)} {...rest}>
        {children}
      </select>
      <CaretDown size={14} weight="bold" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3" />
    </div>
  );
});

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
  description?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ label, description, className, id, ...rest }, ref) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <label htmlFor={inputId} className={cn("flex cursor-pointer items-start gap-2.5 text-sm text-ink", rest.disabled && "cursor-not-allowed opacity-60", className)}>
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        className="checkbox-mark mt-0.5 h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-[4px] border border-line-strong bg-surface transition-colors checked:border-brand checked:bg-brand hover:border-ink-3 focus-visible:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed"
        {...rest}
      />
      {label || description ? (
        <span className="flex flex-col gap-0.5 leading-snug">
          {label ? <span>{label}</span> : null}
          {description ? <span className="text-[12.5px] text-ink-3">{description}</span> : null}
        </span>
      ) : null}
    </label>
  );
});

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio({ label, className, id, ...rest }, ref) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <label htmlFor={inputId} className={cn("inline-flex cursor-pointer items-center gap-2 text-sm text-ink", rest.disabled && "cursor-not-allowed opacity-60", className)}>
      <input
        ref={ref}
        id={inputId}
        type="radio"
        className="h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-full border border-line-strong bg-surface transition-colors checked:border-[5px] checked:border-brand hover:border-ink-3 focus-visible:shadow-[var(--shadow-focus)]"
        {...rest}
      />
      {label ? <span>{label}</span> : null}
    </label>
  );
});

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  id?: string;
}

export function Switch({ checked, onCheckedChange, label, description, disabled, id }: SwitchProps) {
  const autoId = useId();
  const switchId = id || autoId;
  return (
    <label htmlFor={switchId} className={cn("flex cursor-pointer items-center justify-between gap-4 text-sm", disabled && "cursor-not-allowed opacity-60")}>
      {label || description ? (
        <span className="flex flex-col gap-0.5">
          {label ? <span className="font-medium text-ink">{label}</span> : null}
          {description ? <span className="text-[12.5px] text-ink-3">{description}</span> : null}
        </span>
      ) : null}
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus-visible:shadow-[var(--shadow-focus)]",
          checked ? "bg-brand" : "bg-line-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-[var(--ease-fluid)]",
            checked && "translate-x-4",
          )}
        />
      </button>
    </label>
  );
}

export function FormGrid({ children, className, cols = 2 }: { children: ReactNode; className?: string; cols?: 1 | 2 | 3 | 4 }) {
  const colClass = { 1: "grid-cols-1", 2: "grid-cols-1 sm:grid-cols-2", 3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3", 4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" }[cols];
  return <div className={cn("grid gap-4", colClass, className)}>{children}</div>;
}

export function FormSection({ title, description, children, className }: { title: ReactNode; description?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        {description ? <p className="text-[13px] text-ink-3">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
