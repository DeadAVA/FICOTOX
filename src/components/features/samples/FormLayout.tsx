"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft } from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";
import { Badge, type Tone } from "@/components/ui/Primitives";
import { SignaturePad } from "./SignaturePad";

/*
 * Formatos de muestra como pagina: cabecera fija con folio, estado y
 * acciones, indice lateral de secciones y contenido en tarjetas.
 */

export interface FormSectionDef {
  id: string;
  label: string;
}

export function FormPage({ backHref, backLabel, code, title, status, statusTone = "brand", actions, sections, children, error }: { backHref: string; backLabel: string; code: string; title: ReactNode; status?: string; statusTone?: Tone; actions: ReactNode; sections: FormSectionDef[]; children: ReactNode; error?: string | null }) {
  const [current, setCurrent] = useState(sections[0]?.id || "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setCurrent(visible[0].target.id);
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: 0 },
    );
    sections.forEach((section) => {
      const node = document.getElementById(section.id);
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="animate-rise-in flex flex-col gap-6">
      <div className="sticky top-16 z-20 -mx-4 border-b border-line/80 bg-canvas/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link href={backHref} className="press inline-flex h-8 shrink-0 items-center gap-1 rounded-control px-2 text-[13px] font-medium text-ink-3 hover:bg-surface-2 hover:text-ink">
              <ArrowLeft size={14} /> {backLabel}
            </Link>
            <span className="hidden h-4 w-px bg-line sm:block" />
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="code hidden whitespace-nowrap rounded-[5px] bg-ink px-1.5 py-0.5 text-[11.5px] text-white sm:inline-block">{code}</span>
              <h1 className="text-[16px] font-semibold text-ink sm:truncate">{title}</h1>
              {status ? (
                <Badge tone={statusTone} dot>
                  {status}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {error ? <p className="mr-2 w-full text-[12.5px] text-danger md:w-auto">{error}</p> : null}
            {actions}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <nav className="hidden lg:block" aria-label="Secciones del formato">
          <ol className="sticky top-36 flex flex-col gap-0.5">
            {sections.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    setCurrent(section.id);
                  }}
                  className={cn("flex items-center gap-2.5 rounded-[7px] px-2.5 py-1.5 text-[13px] transition-colors", current === section.id ? "bg-surface font-medium text-ink shadow-[inset_0_0_0_1px_var(--color-line)]" : "text-ink-3 hover:text-ink-2")}
                >
                  <span className={cn("tnum flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px]", current === section.id ? "bg-brand text-white" : "bg-surface-2 text-ink-3")}>{index + 1}</span>
                  {section.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="flex min-w-0 flex-col gap-5">{children}</div>
      </div>
    </div>
  );
}

export function FormCard({ id, title, description, children, aside }: { id: string; title: ReactNode; description?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-36 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
          {description ? <p className="text-[13px] text-ink-3">{description}</p> : null}
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}

/* Fila de un paso con casilla, texto y campos adicionales alineados. */
export function StepRow({ number, label, checked, onCheckedChange, children, disabled }: { number?: ReactNode; label: ReactNode; checked: boolean; onCheckedChange: (checked: boolean) => void; children?: ReactNode; disabled?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-3 border-b border-line py-3 first:pt-0 last:border-b-0 last:pb-0 md:flex-row md:items-start", disabled && "opacity-60")}>
      <label className="flex flex-1 cursor-pointer items-start gap-3">
        <input type="checkbox" className="checkbox-mark mt-0.5 h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-[4px] border border-line-strong bg-surface transition-colors checked:border-brand checked:bg-brand hover:border-ink-3 focus-visible:shadow-[var(--shadow-focus)]" checked={checked} disabled={disabled} onChange={(event) => onCheckedChange(event.target.checked)} />
        <span className="flex gap-2 text-[13.5px] leading-snug text-ink">
          {number !== undefined ? <span className="tnum w-5 shrink-0 text-ink-3">{number}</span> : null}
          <span>{label}</span>
        </span>
      </label>
      {children ? <div className="flex w-full flex-col gap-2 md:w-[380px] md:shrink-0">{children}</div> : null}
    </div>
  );
}

export function ChoiceGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-2 sm:grid-cols-2 lg:grid-cols-3", className)}>{children}</div>;
}

/* Tarjeta seleccionable (checkbox o radio) con aspecto de opcion. */
export function ChoiceCard({ checked, onChange, label, description, type = "checkbox", name, disabled }: { checked: boolean; onChange: (checked: boolean) => void; label: ReactNode; description?: ReactNode; type?: "checkbox" | "radio"; name?: string; disabled?: boolean }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 rounded-card border px-3 py-2.5 transition-colors", checked ? "border-brand bg-brand-faint" : "border-line bg-surface hover:border-line-strong", disabled && "cursor-not-allowed opacity-60")}>
      <input
        type={type}
        name={name}
        disabled={disabled}
        className={cn("mt-0.5 h-4 w-4 shrink-0 cursor-pointer appearance-none border border-line-strong bg-surface transition-colors hover:border-ink-3 focus-visible:shadow-[var(--shadow-focus)]", type === "radio" ? "rounded-full checked:border-[5px] checked:border-brand" : "checkbox-mark rounded-[4px] checked:border-brand checked:bg-brand")}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-[13.5px] font-medium text-ink">{label}</span>
        {description ? <span className="text-[12px] text-ink-3">{description}</span> : null}
      </span>
    </label>
  );
}

export function PersonCard({ title, name, onName, cargo, onCargo, signature, onSignature }: { title: string; name: string; onName: (v: string) => void; cargo: string; onCargo: (v: string) => void; signature: string; onSignature: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-surface-2/40 p-4">
      <p className="text-[13.5px] font-semibold text-ink">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink-2">
          Nombre
          <input className="h-9 w-full rounded-control border border-line-strong bg-surface px-3 text-sm font-normal text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none focus:shadow-[var(--shadow-focus)]" maxLength={180} placeholder="Nombre completo" value={name} onChange={(event) => onName(event.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink-2">
          Cargo
          <input className="h-9 w-full rounded-control border border-line-strong bg-surface px-3 text-sm font-normal text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none focus:shadow-[var(--shadow-focus)]" maxLength={120} placeholder="Cargo o puesto" value={cargo} onChange={(event) => onCargo(event.target.value)} />
        </label>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-ink-2">Firma</span>
        <SignaturePad value={signature} onChange={onSignature} label={`Firma de ${title.toLowerCase()}`} />
      </div>
    </div>
  );
}

