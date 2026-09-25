import { Badge, type Tone } from "@/components/ui/Primitives";
import type { ApiRecord } from "@/lib/client/types";
import { Callout } from "./FormLayout";
import { normalizeSampleStatus, sampleStatusLabel } from "@/lib/client/samples";
import { ANALYSIS_STATES, DOCUMENT_STATES, REPORT_STATES, SAMPLE_STATES } from "@/lib/shared/sgc";

export function SampleStatus({ status }: { status: unknown }) {
  const normalized = normalizeSampleStatus(status);
  const meta = SAMPLE_STATES[normalized];
  return (
    <Badge tone={(meta?.tone as Tone) || "neutral"} dot>
      {sampleStatusLabel(status)}
    </Badge>
  );
}

/* Badge generico para los estados de analisis, informes y documentos controlados. */
export function StateBadge({ kind, status }: { kind: "analisis" | "informe" | "documento"; status: unknown }) {
  const table = kind === "analisis" ? ANALYSIS_STATES : kind === "informe" ? REPORT_STATES : DOCUMENT_STATES;
  const key = String(status || "").toLowerCase();
  const meta = table[key];
  return (
    <Badge tone={(meta?.tone as Tone) || "neutral"} dot>
      {meta?.label || key || "—"}
    </Badge>
  );
}

const CHIP_TONES: Record<string, string> = {
  R: "bg-brand-soft text-brand-strong",
  P: "bg-warning-soft text-warning-text",
  "E-A": "bg-[#e9e4f8] text-[#5b3fa6]",
  "E-D": "bg-bloom-soft text-[#8a3b2a]",
  A: "bg-success-soft text-success-text",
  IR: "bg-ink text-white",
};

/* Chip de folio: letra de etapa + numero con siete digitos. Cada tipo tiene su color. */
export function FolioChip({ type, num }: { type: "R" | "P" | "E-A" | "E-D" | "A" | "IR" | string; num: unknown }) {
  const n = Number(num || 0);
  const tone = CHIP_TONES[type] || CHIP_TONES["E-A"];
  return (
    <span className={`code inline-flex h-6 items-center gap-1.5 rounded-[6px] px-2 text-[12px] font-medium ${tone}`}>
      <span className="opacity-70">{type}</span>
      {n ? String(n).padStart(7, "0") : "-"}
    </span>
  );
}

/*
 * Supervision (Fase 2): lo que captura una persona supervisada queda pendiente
 * del visto bueno de su supervisor, o regresado con observaciones. Mientras
 * tanto no avanza (no se cierra, no se revisa ni aprueba, no es origen).
 */
export function SupervisionBadge({ estado }: { estado: unknown }) {
  const key = String(estado || "");
  if (key === "pendiente") return <Badge tone="warning" className="ml-1.5">Pendiente de visto bueno</Badge>;
  if (key === "regresado") return <Badge tone="danger" className="ml-1.5">Regresado</Badge>;
  return null;
}

export function SupervisionCallout({ item }: { item: ApiRecord | null | undefined }) {
  const estado = String(item?.supervision_estado || "");
  if (!item || !Number(item.requiere_supervision || 0)) return null;
  if (estado === "pendiente") {
    return (
      <Callout tone="warning" title="Pendiente del visto bueno del supervisor">
        Lo capturó una persona bajo supervisión. No avanza (no se cierra, no se revisa ni aprueba y no sirve de origen de la etapa siguiente) hasta que su supervisor dé el visto bueno.
      </Callout>
    );
  }
  if (estado === "regresado") {
    return (
      <Callout tone="danger" title="Regresado por el supervisor">
        {item.supervision_observaciones ? `Observaciones: ${String(item.supervision_observaciones)}. ` : ""}Corrige el registro y guárdalo: vuelve a quedar pendiente del visto bueno. Mientras tanto no avanza.
      </Callout>
    );
  }
  return null;
}
