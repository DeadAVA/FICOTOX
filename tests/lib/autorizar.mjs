/*
 * Fase 4: da a una persona creada dentro de una prueba todas las autorizaciones
 * FX-THF-AP de actividades y metodos (las otorga quien llama, p. ej. QA, que tiene
 * ensayos:A). Asi las suites que prueban roles y segregacion no dependen de ellas.
 */
const ACTIVIDADES = ["recepcion", "procesamiento", "extraccion", "analisis", "revision_resultados", "aprobacion_resultados", "revision_informe", "autorizacion_informe"];
const METODOS = ["ASP", "DSP", "PSP", "pigmentos", "plancton", "otro"];

export async function autorizarTodo(base, token, usuarioId) {
  if (!usuarioId) return;
  const pedidas = [...ACTIVIDADES.map((clave) => ({ tipo: "actividad", clave })), ...METODOS.map((clave) => ({ tipo: "metodo", clave }))];
  for (const cuerpo of pedidas) {
    await fetch(`${base}/admin/usuarios/${usuarioId}/autorizaciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...cuerpo, folio_fx_thf_ap: "FX-THF-AP-PRUEBAS", motivo: "Persona creada en la prueba" }),
    });
  }
}

/* Fase 5: asigna una recepcion a varias personas (lo hace quien llama, p. ej. QA, que tiene muestras:A). */
export async function asignarRecepcion(base, token, recepcionId, usuarioIds) {
  for (const usuarioId of usuarioIds.filter(Boolean)) {
    await fetch(`${base}/samples/reception/${recepcionId}/asignaciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ usuario_id: usuarioId, motivo: "Asignación de prueba" }),
    });
  }
}
