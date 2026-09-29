/*
 * Evidencia instrumental de prueba (Fase 10). Con EVIDENCIA_OBLIGATORIA_ANALISIS
 * (true por omision) un analisis no se envia a revision sin al menos un adjunto
 * vigente. Las suites anteriores lo hacen a traves de reauth-auto.mjs, que llama
 * a `adjuntarEvidencia` cuando el servidor responde 409 `evidencia_requerida`.
 */

/* PDF minimo y valido; `texto` lo hace unico (el mismo archivo no se adjunta dos veces al mismo analisis). */
export function pdfDePrueba(texto = "Cromatograma de prueba") {
  const contenido = `BT /F1 12 Tf 72 720 Td (${String(texto).replace(/[()\\]/g, "")}) Tj ET`;
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objetos.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

/* Adjunta un archivo a un analisis. `base` termina en /api/. Devuelve la respuesta. */
export async function adjuntarEvidencia(base, token, analisisId, { bytes, nombre = "cromatograma.pdf", tipo = "cromatograma", descripcion, headers = {}, fetchFn = fetch } = {}) {
  const form = new FormData();
  const contenido = bytes || pdfDePrueba(`Cromatograma analisis ${analisisId} ${Date.now()} ${Math.random()}`);
  form.append("archivo", new Blob([contenido]), nombre);
  form.append("tipo_evidencia", tipo);
  form.append("descripcion", descripcion || `Cromatograma del análisis ${analisisId}`);
  return fetchFn(`${base.replace(/\/?$/, "/")}samples/analysis/${analisisId}/adjuntos`, { method: "POST", headers: { Authorization: `Bearer ${token}`, ...headers }, body: form });
}
