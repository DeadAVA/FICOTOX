import { cn } from "@/components/ui/cn";

/*
 * Marca: una gota de agua con una celula de plancton al centro.
 * Se dibuja en SVG para heredar el color del texto (currentColor).
 */
export function BrandMark({ size = 28, className, inverted = false }: { size?: number; className?: string; inverted?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className={cn("shrink-0", className)}>
      <rect width="32" height="32" rx="9" fill={inverted ? "rgba(255,255,255,0.12)" : "#0E7C82"} />
      <path d="M16 6.5c3.2 4.1 6.5 7.8 6.5 11.7a6.5 6.5 0 0 1-13 0c0-3.9 3.3-7.6 6.5-11.7Z" fill={inverted ? "#fff" : "#DDF1F2"} opacity="0.92" />
      <circle cx="16" cy="18.4" r="2.6" fill={inverted ? "#0E7C82" : "#0A5F66"} />
      <circle cx="16" cy="18.4" r="4.6" stroke={inverted ? "#0E7C82" : "#0A5F66"} strokeWidth="0.9" strokeDasharray="1.8 2.2" opacity="0.7" />
    </svg>
  );
}

export function BrandLockup({ inverted = false, className }: { inverted?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark inverted={inverted} />
      <span className={cn("text-[15px] font-semibold tracking-tight", inverted ? "text-white" : "text-ink")}>FICOTOX</span>
    </span>
  );
}
