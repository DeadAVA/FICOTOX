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
