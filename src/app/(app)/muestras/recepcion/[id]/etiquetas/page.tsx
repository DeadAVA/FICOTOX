"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ArrowLeft, Printer } from "@phosphor-icons/react";
import { toast } from "sonner";
import { PageBody } from "@/components/shell/AppShell";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { PageHeader, SegmentedTabs } from "@/components/ui/PageHeader";
import { ErrorState, Skeleton } from "@/components/ui/Primitives";
import { API_BASE_URL, getJsonAuth, sendJsonAuth } from "@/lib/client/api";
import { formatearFecha } from "@/lib/shared/fechas";

/*
 * Etiquetas imprimibles de una recepcion (Fase 5): una por muestra del lote.
 * "Etiqueta" imprime una etiqueta de 50 × 25 mm por pagina (impresora de
 * etiquetas); "Hoja completa" las acomoda en rejilla sobre carta/A4. Al imprimir
 * queda en la bitacora ("imprimió etiquetas").
 */
interface Etiqueta {
  folio: string;
  id_interno: string;
  organismo: string;
  fecha_muestreo: string | null;
  fecha_recepcion: string | null;
  resguardo: string;
}

type Formato = "etiqueta" | "hoja";

export default function EtiquetasRecepcionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireModule modules="muestras">
      <Etiquetas id={id} />
    </RequireModule>
  );
}

function Etiquetas({ id }: { id: string }) {
  const { token } = useSession();
  const [data, setData] = useState<{ folio: string; items: Etiqueta[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formato, setFormato] = useState<Formato>("etiqueta");
  const [imprimiendo, setImprimiendo] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getJsonAuth(`${API_BASE_URL}/samples/reception/${id}/etiquetas`, token)
      .then((res) => !cancelled && setData({ folio: String(res.folio || ""), items: (res.items as Etiqueta[]) || [] }))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "No se pudieron cargar las etiquetas"));
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  const imprimir = async () => {
    setImprimiendo(true);
    try {
      await sendJsonAuth("POST", `${API_BASE_URL}/samples/reception/${id}/etiquetas`, token, { formato });
      window.print();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo registrar la impresión");
    } finally {
      setImprimiendo(false);
    }
  };

  if (error) {
    return (
      <PageBody>
        <ErrorState message={error} />
      </PageBody>
    );
  }

  return (
    <PageBody>
      <style>{estilosImpresion(formato)}</style>
      <div className="no-imprimir flex flex-col gap-4">
        <PageHeader
          eyebrow={
            <Link href={`/muestras/recepcion/${id}`} className="inline-flex items-center gap-1 text-ink-3 hover:text-ink">
              <ArrowLeft size={13} /> Recepción {data?.folio || ""}
            </Link>
          }
          title="Imprimir etiquetas"
          description="Una etiqueta por muestra: folio, ID interno, organismo, fechas de muestreo y recepción, y lugar de resguardo."
          actions={
            <Button icon={<Printer size={16} weight="duotone" />} onClick={imprimir} loading={imprimiendo} disabled={!data?.items.length}>
              Imprimir
            </Button>
          }
        />
        <SegmentedTabs
          size="sm"
          label="Formato de impresión"
          value={formato}
          onChange={setFormato}
          options={[
            { value: "etiqueta", label: "Etiqueta 50 × 25 mm" },
            { value: "hoja", label: "Hoja completa" },
          ]}
        />
      </div>

      {!data ? (
        <Skeleton className="mt-4 h-[120px] w-full" />
      ) : data.items.length === 0 ? (
        <p className="no-imprimir mt-4 text-[13px] text-ink-3">La recepción no tiene muestras capturadas.</p>
      ) : (
        <div id="etiquetas-impresion" className={formato === "hoja" ? "etiquetas-hoja" : "etiquetas-sueltas"}>
          {data.items.map((e, index) => (
            <article key={`${e.id_interno}-${index}`} data-etiqueta className="etiqueta">
              <div className="etiqueta-folio">{e.folio}</div>
              <div className="etiqueta-id">{e.id_interno || "Sin ID interno"}</div>
              <div className="etiqueta-dato">{e.organismo || "—"}</div>
              <div className="etiqueta-dato">
                Muestreo {formatearFecha(e.fecha_muestreo)} · Recepción {formatearFecha(e.fecha_recepcion)}
              </div>
              <div className="etiqueta-dato">Resguardo: {e.resguardo || "—"}</div>
            </article>
          ))}
        </div>
      )}
    </PageBody>
  );
}

/* Tamaños en mm: en pantalla se ve igual que en papel. Al imprimir solo sale #etiquetas-impresion. */
function estilosImpresion(formato: Formato): string {
  return `
    .etiqueta { width: 50mm; height: 25mm; box-sizing: border-box; padding: 1.5mm 2mm; border: 0.2mm solid #999; background: #fff; color: #000;
      font-family: Arial, Helvetica, sans-serif; overflow: hidden; display: flex; flex-direction: column; gap: 0.3mm; line-height: 1.15; }
    .etiqueta-folio { font-size: 7.5pt; font-weight: 700; }
    .etiqueta-id { font-size: 9pt; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .etiqueta-dato { font-size: 6pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #etiquetas-impresion { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 4mm; }
    #etiquetas-impresion.etiquetas-hoja { display: grid; grid-template-columns: repeat(auto-fill, 50mm); gap: 2mm; }
    @media print {
      @page { ${formato === "hoja" ? "size: letter; margin: 10mm;" : "size: 50mm 25mm; margin: 0;"} }
      body * { visibility: hidden !important; }
      #etiquetas-impresion, #etiquetas-impresion * { visibility: visible !important; }
      #etiquetas-impresion { position: absolute; left: 0; top: 0; margin: 0; ${formato === "hoja" ? "" : "display: block;"} }
      .etiqueta { border: ${formato === "hoja" ? "0.2mm dashed #bbb" : "none"}; break-inside: avoid; }
      ${formato === "hoja" ? "" : ".etiquetas-sueltas .etiqueta { break-after: page; }"}
    }
  `;
}
