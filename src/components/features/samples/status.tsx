import { Badge, type Tone } from "@/components/ui/Primitives";
import { normalizeSampleStatus, sampleStatusLabel } from "@/lib/client/samples";

const TONES: Record<string, Tone> = {
  registrada: "brand",
  procesamiento: "warning",
  en_proceso: "warning",
  extraccion: "warning",
  completada: "success",
  finalizada: "success",
  cancelada: "danger",
  pendiente: "neutral",
};

export function SampleStatus({ status }: { status: unknown }) {
  const normalized = normalizeSampleStatus(status);
  return (
    <Badge tone={TONES[normalized] || "neutral"} dot>
      {sampleStatusLabel(status)}
    </Badge>
  );
}

/* Chip de folio: letra de etapa + numero con siete digitos. */
export function FolioChip({ type, num }: { type: "R" | "P" | "E-A" | string; num: unknown }) {
  const n = Number(num || 0);
  const tone = type === "R" ? "bg-brand-soft text-brand-strong" : type === "P" ? "bg-warning-soft text-[#8d6011]" : "bg-[#e9e4f8] text-[#5b3fa6]";
  return (
    <span className={`code inline-flex h-6 items-center gap-1.5 rounded-[6px] px-2 text-[12px] font-medium ${tone}`}>
      <span className="opacity-70">{type}</span>
      {n ? String(n).padStart(7, "0") : "-"}
    </span>
  );
}
