"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { cn } from "./cn";

/*
 * Controles de formulario. Etiqueta arriba, ayuda opcional, error abajo.
 * Superficie ligeramente rellena (como los campos de iOS/macOS), 40 px de
 * alto, y un anillo de foco del color de acento.
 */

/* Sin alto ni tamaño de letra: los fija la variante (clsx no fusiona clases de Tailwind, así que no se pueden sobrescribir después). */
export const controlBase =
  "w-full rounded-[10px] border border-line bg-surface-2/80 px-3 text-ink placeholder:text-ink-4 transition-[border-color,box-shadow,background-color] duration-150 ease-[var(--ease-spring)] hover:border-line-strong focus:border-brand focus:bg-surface focus:outline-none focus:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:bg-surface-3/60 disabled:text-ink-3 read-only:bg-surface-3/50";
export const controlClass = `${controlBase} text-[14px]`;
/* Control compacto para tablas y tarjetas por fila. */
export const controlClassSm = `${controlBase} h-8 text-[13px]`;

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
            {required ? <span className="ml-0.5 text-brand" aria-hidden="true">*</span> : null}
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
  /* Variante compacta (32 px) para filas y tablas. */
  small?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, invalid, leading, trailing, mono, small, ...rest }, ref) {
  const input = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(controlBase, small ? "h-8 text-[13px]" : "h-10", !small && (mono ? "text-[13px]" : "text-[14px]"), leading && "pl-9", trailing && "pr-9", mono && "font-mono", invalid && "border-danger focus:border-danger focus:shadow-[0_0_0_4px_rgba(200,67,59,0.18)]", className)}
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
  return <textarea ref={ref} rows={rows} aria-invalid={invalid || undefined} className={cn(controlClass, "min-h-10 resize-y py-2.5 leading-relaxed", invalid && "border-danger", className)} {...rest} />;
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, invalid, children, ...rest }, ref) {
  return (
    <div className="relative">
      <select ref={ref} aria-invalid={invalid || undefined} className={cn(controlClass, "h-10 appearance-none pr-9", invalid && "border-danger", className)} {...rest}>
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

export const checkboxClass =
  "checkbox-mark h-[18px] w-[18px] shrink-0 cursor-pointer appearance-none rounded-[5px] border border-line-strong bg-surface transition-[background-color,border-color,transform] duration-150 ease-[var(--ease-spring)] checked:border-brand checked:bg-brand hover:border-ink-4 active:scale-95 focus-visible:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed";

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ label, description, className, id, ...rest }, ref) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <label htmlFor={inputId} className={cn("flex cursor-pointer items-start gap-2.5 text-[14px] text-ink", rest.disabled && "cursor-not-allowed opacity-60", className)}>
      <input ref={ref} id={inputId} type="checkbox" className={cn(checkboxClass, "mt-0.5")} {...rest} />
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

export const radioClass =
  "h-[18px] w-[18px] shrink-0 cursor-pointer appearance-none rounded-full border border-line-strong bg-surface transition-[border-color,border-width,transform] duration-150 ease-[var(--ease-spring)] checked:border-[6px] checked:border-brand hover:border-ink-4 active:scale-95 focus-visible:shadow-[var(--shadow-focus)]";

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio({ label, className, id, ...rest }, ref) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <label htmlFor={inputId} className={cn("inline-flex cursor-pointer items-center gap-2 text-[14px] text-ink", rest.disabled && "cursor-not-allowed opacity-60", className)}>
      <input ref={ref} id={inputId} type="radio" className={radioClass} {...rest} />
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
    <label htmlFor={switchId} className={cn("flex cursor-pointer items-center justify-between gap-4 text-[14px]", disabled && "cursor-not-allowed opacity-60")}>
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
        className={cn("relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors duration-200 ease-[var(--ease-spring)] focus-visible:shadow-[var(--shadow-focus)]", checked ? "bg-success" : "bg-line-strong")}
      >
        <span className={cn("absolute top-[2px] left-[2px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform duration-250 ease-[var(--ease-spring)]", checked && "translate-x-[18px]")} />
      </button>
    </label>
  );
}

export function FormGrid({ children, className, cols = 2 }: { children: ReactNode; className?: string; cols?: 1 | 2 | 3 | 4 }) {
  const colClass = { 1: "grid-cols-1", 2: "grid-cols-1 sm:grid-cols-2", 3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3", 4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" }[cols];
  return <div className={cn("grid gap-x-4 gap-y-5", colClass, className)}>{children}</div>;
}

export function FormSection({ title, description, children, className }: { title: ReactNode; description?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-0.5">
        <h3 className="title-3 text-ink">{title}</h3>
        {description ? <p className="text-[13px] text-ink-3">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
