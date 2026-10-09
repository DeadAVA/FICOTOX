/*
 * Fase 6: libera un informe autorizado y registra un envio manual con evidencia
 * (multipart), como lo hace la interfaz. Devuelve { liberar, envio } con status y data.
 */
export async function liberar(base, token, informeId) {
  const r = await fetch(`${base}/informes/${informeId}/liberar`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: "{}" });
  return { status: r.status, data: await r.json().catch(() => null) };
}

export async function registrarEnvio(base, token, informeId, { nombre = "Cliente de prueba", correo = "cliente@ejemplo.mx", enviadoEn = new Date().toISOString(), observaciones = "", evidencia = "%PDF-1.4\n% evidencia de prueba\n" } = {}) {
  const form = new FormData();
  form.set("destinatario_nombre", nombre);
  form.set("destinatario_correo", correo);
  form.set("enviado_en", enviadoEn);
  if (observaciones) form.set("observaciones", observaciones);
  form.set("evidencia", new Blob([evidencia], { type: "application/pdf" }), "evidencia.pdf");
  const r = await fetch(`${base}/informes/${informeId}/envios`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
  return { status: r.status, data: await r.json().catch(() => null) };
}
