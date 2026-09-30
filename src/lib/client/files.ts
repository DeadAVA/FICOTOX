import { toast } from "sonner";

/*
 * Abre en una pestaña nueva un archivo protegido por token (PDF de informe,
 * archivo de documento controlado): se descarga con el encabezado
 * Authorization y se muestra desde un blob local.
 */
export async function openProtectedFile(url: string, token: string, filename?: string): Promise<void> {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      let message = `No se pudo abrir el archivo (${res.status})`;
      try {
        const data = await res.json();
        if (data?.message) message = String(data.message);
      } catch {
        /* sin cuerpo JSON */
      }
      throw new Error(message);
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const opened = window.open(objectUrl, "_blank", "noopener");
    if (!opened) {
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename || "archivo";
      link.click();
    }
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "No se pudo abrir el archivo");
  }
}

/* Descarga un CSV protegido por token (bitacora, historial de un registro). */
export async function descargarCsv(url: string, token: string, filename: string): Promise<boolean> {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      let message = `No se pudo exportar (${res.status})`;
      try {
        const data = await res.json();
        if (data?.message) message = String(data.message);
      } catch {
        /* sin cuerpo JSON */
      }
      throw new Error(message);
    }
    const objectUrl = URL.createObjectURL(await res.blob());
    const link = document.createElement("a");
    link.href = objectUrl;
    // Fase 12: si la bitacora se corto (demasiadas filas), el archivo lo dice y aqui se avisa: nunca en silencio.
    const truncado = res.headers.get("x-bitacora-truncado") === "1";
    link.download = truncado ? filename.replace(/\.csv$/, "-parcial.csv") : filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
    if (truncado) toast.warning(`Exportación parcial: se descargaron ${Number(res.headers.get("x-bitacora-filas") || 0).toLocaleString("es-MX")} filas y hay más. Exporta por periodo (filtros Desde/Hasta) para obtener el resto; el archivo lo indica en su última fila.`, { duration: 12_000 });
    return true;
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "No se pudo exportar");
    return false;
  }
}
