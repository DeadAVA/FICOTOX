/*
 * Fase 11 · incidencias (contra el servidor de prueba, base de instance/test):
 * - reportar (calidad:C, cualquier alcance; el Estudiante sin visto bueno), ver,
 *   evaluar (calidad:R), regla 7 (quien reporta no evalua), escalar (tambien
 *   varias a la misma NC), cerrar sin NC, anular con segundo usuario;
 * - alcance "incidencias": Mariana solo ve las suyas por la lista, la ficha, la
 *   busqueda, el filtro por registro, el CSV, el historial y los adjuntos, y
 *   recibe 403 en la bitacora; el Admin tecnico no ve incidencias;
 * - incidencias automaticas (desviacion y rechazo de recepcion, equipo no apto,
 *   alerta de integridad), sin duplicados y sin crearse si la transaccion falla;
 * - casos limite: escalar ya escalada o cerrada (409), anular escalada con NC vigente (409).
 */
import "./lib/reauth-auto.mjs";
import fs from "node:fs";
import path from "node:path";
import { adjuntarEvidencia, pdfDePrueba } from "./lib/evidencia.mjs";
import { api, BASE, cadena, crearCheck, Database, fila, filas, sesiones } from "./lib/calidad.mjs";

const { check, terminar } = crearCheck();
const { t, id } = await sesiones();
const ahora = new Date().toISOString();
const reportar = (token, extra = {}) => api("POST", "/calidad/incidencias", { tipo: "falla_equipo", fecha_hora_ocurrencia: ahora, descripcion: "La centrífuga se detuvo a mitad del ciclo de 10 minutos", impacto_resultados: "desconocido", ...extra }, token);

/* ---------- Reportar ---------- */
const c1 = await cadena(t, "INC1", { asignar: [id.luis] });
const r1 = await reportar(t.luis, { accion_inmediata: "Se repitió la centrifugación en otro equipo", registros: [{ entidad: "muestras_extraccion", entidad_id: c1.E }] });
check("Luis (C incidencias) reporta una incidencia ligada a su extracción (201, folio INC)", r1.status === 201 && /^INC \d{7}$/.test(r1.data?.folio || ""), `${r1.status} ${r1.data?.message}`);
const I1 = r1.data?.id;
const corta = await reportar(t.luis, { descripcion: "muy corta" });
check("la descripción exige al menos 20 caracteres (400)", corta.status === 400, `${corta.status}`);
const jorgeReporta = await reportar(t.jorge);
check("el Admin técnico (V bitácora, sin C) no reporta (403)", jorgeReporta.status === 403, `${jorgeReporta.status}`);
const rD = await reportar(t.diego, { tipo: "seguridad", descripcion: "Se derramó metanol en la campana de extracción sin lesionados" });
const incD = rD.data?.id ? fila("SELECT * FROM incidencias WHERE id = ?", rD.data.id) : null;
check("el Estudiante (cuenta supervisada) reporta sin visto bueno: queda 'reportada', sin supervisión pendiente", rD.status === 201 && incD?.estado === "reportada" && !("supervision_estado" in (incD || {})), `${rD.status} ${incD?.estado}`);
const rM = await reportar(t.mariana, { tipo: "insumo", descripcion: "El metanol HPLC llegó con el sello de la tapa roto" });
const IM = rM.data?.id;
check("Mariana (Técnico Auxiliar, C incidencias) reporta (201)", rM.status === 201, `${rM.status}`);

/* ---------- Alcance "incidencias" ---------- */
{
  const lista = (await api("GET", "/calidad/incidencias", undefined, t.mariana)).data;
  check("Mariana solo ve sus incidencias en la lista", lista?.items?.length >= 1 && lista.items.every((i) => i.reportada_por === id.mariana) && lista.alcance === "incidencias", `${lista?.items?.length} ${lista?.alcance}`);
  const ajena = await api("GET", `/calidad/incidencias/${I1}`, undefined, t.mariana);
  check("la ficha de una incidencia ajena responde 404 (no revela que existe)", ajena.status === 404, `${ajena.status}`);
  const busca = (await api("GET", `/calidad/incidencias?search=${encodeURIComponent("centrífuga")}`, undefined, t.mariana)).data?.items || [];
  const porRegistro = (await api("GET", `/calidad/incidencias?entidad=muestras_extraccion&entidad_id=${c1.E}`, undefined, t.mariana)).data?.items || [];
  check("ni la búsqueda ni el filtro por registro exponen incidencias ajenas", busca.length === 0 && porRegistro.length === 0, `${busca.length} ${porRegistro.length}`);
  const csv = await api("GET", "/calidad/incidencias?formato=csv", undefined, t.mariana);
  check("el CSV de Mariana solo trae las suyas", csv.status === 200 && !String(csv.data).includes("centrífuga se detuvo") && String(csv.data).includes("sello de la tapa"), `${csv.status}`);
  const hist = await api("GET", `/audit?entidad=incidencias&entidad_id=${I1}`, undefined, t.mariana);
  const histPropio = await api("GET", `/audit?entidad=incidencias&entidad_id=${IM}`, undefined, t.mariana);
  check("el historial de una incidencia ajena responde 404; el de la propia, 200", hist.status === 404 && histPropio.status === 200, `${hist.status} ${histPropio.status}`);
  const adjAjeno = await api("GET", `/calidad/incidencias/${I1}/adjuntos`, undefined, t.mariana);
  check("los adjuntos de una incidencia ajena responden 404", adjAjeno.status === 404, `${adjAjeno.status}`);
  const bitacora = await api("GET", "/audit?limit=5", undefined, t.mariana);
  const verify = await api("GET", "/audit/verify", undefined, t.mariana);
  check("con alcance 'incidencias' la bitácora completa y su verificación dan 403", bitacora.status === 403 && verify.status === 403, `${bitacora.status} ${verify.status}`);
  const campana = (await api("GET", "/notificaciones", undefined, t.mariana)).data?.items || [];
  check("la campana de Mariana no muestra incidencias ajenas", !campana.some((n) => n.href === `/calidad/incidencias/${I1}`), `${campana.length}`);
  const admin = await api("GET", "/calidad/incidencias", undefined, t.jorge);
  const adminFicha = await api("GET", `/calidad/incidencias/${I1}`, undefined, t.jorge);
  check("el Admin técnico no ve incidencias (lista y ficha 403)", admin.status === 403 && adminFicha.status === 403, `${admin.status} ${adminFicha.status}`);
  const auditor = (await api("GET", "/calidad/incidencias", undefined, t.hector)).data;
  check("el Auditor (calidad:V total) ve todas", auditor?.alcance === "total" && auditor.items.some((i) => i.id === I1) && auditor.items.some((i) => i.id === IM), `${auditor?.items?.length}`);
  const entradas = (await api("GET", "/audit?entidad=incidencias&limit=50", undefined, t.jorge)).data?.items || [];
  check("en la bitácora completa, el Admin técnico ve los eventos de incidencias sin sus datos ni motivo", entradas.length > 0 && entradas.every((e) => e.datos_restringidos && !e.motivo), `${entradas.length}`);
}

/* ---------- Adjuntos de la incidencia (Fase 10) ---------- */
{
  const foto = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from(`foto centrifuga ${Date.now()}`)]);
  const form = new FormData();
  form.append("archivo", new Blob([foto]), "centrifuga.png");
  form.append("tipo_evidencia", "foto");
  form.append("descripcion", "Foto del panel de la centrífuga");
  const sube = await api("POST", `/calidad/incidencias/${I1}/adjuntos`, form, t.luis);
  const html = new FormData();
  html.append("archivo", new Blob(["<html><script>alert(1)</script></html>"]), "x.pdf");
  html.append("tipo_evidencia", "otro");
  html.append("descripcion", "Intento de HTML");
  const malo = await api("POST", `/calidad/incidencias/${I1}/adjuntos`, html, t.luis);
  const otro = new FormData();
  otro.append("archivo", new Blob([pdfDePrueba("otro")]), "x.pdf");
  otro.append("tipo_evidencia", "otro");
  otro.append("descripcion", "Adjunto de otra persona");
  const ajeno = await api("POST", `/calidad/incidencias/${I1}/adjuntos`, otro, t.hector);
  check("quien reportó adjunta una foto (201); con las validaciones de la Fase 10 (HTML -> 400); otra persona sin calidad:G no (403)", sube.status === 201 && malo.status === 400 && ajeno.status === 403, `${sube.status} ${malo.status} ${ajeno.status}`);
  const baja = await api("GET", `/adjuntos/${sube.data?.item?.id}/archivo`, undefined, t.hector);
  const bajaM = await api("GET", `/adjuntos/${sube.data?.item?.id}/archivo`, undefined, t.mariana);
  check("el adjunto lo descarga quien ve la incidencia (Auditor 200) y no quien no la ve (Mariana 404)", baja.status === 200 && baja.headers.get("x-integridad-adjunto") === "ok" && bajaM.status === 404, `${baja.status} ${bajaM.status}`);
}

/* ---------- Evaluar, regla 7, escalar y cerrar ---------- */
{
  const lEval = await api("POST", `/calidad/incidencias/${I1}/evaluacion`, {}, t.luis);
  check("Luis (sin calidad:R) no evalúa (403)", lEval.status === 403, `${lEval.status}`);
  const rR = await reportar(t.ricardo, { tipo: "condicion_ambiental", descripcion: "La temperatura del laboratorio llegó a 29 °C durante la tarde" });
  const propia = await api("POST", `/calidad/incidencias/${rR.data?.id}/evaluar`, { decision: "cerrar_sin_nc", justificacion: "Sin impacto en los ensayos del día" }, t.ricardo);
  check("regla 7: quien reportó no la evalúa (409 segregacion)", propia.status === 409 && propia.data?.codigo === "segregacion" && propia.data?.regla === 7, `${propia.status} ${propia.data?.regla}`);
  const anaCierra = await api("POST", `/calidad/incidencias/${rR.data?.id}/evaluar`, { decision: "cerrar_sin_nc", justificacion: "Sin impacto en los ensayos del día" }, t.ana);
  check("otra persona con calidad:R la cierra sin NC (200)", anaCierra.status === 200 && fila("SELECT estado FROM incidencias WHERE id = ?", rR.data?.id)?.estado === "cerrada_sin_nc", `${anaCierra.status}`);
  const oraculo = (await api("GET", `/audit?search=${encodeURIComponent("Sin impacto en los ensayos")}&limit=50`, undefined, t.jorge)).data?.items || [];
  const oraculoAna = (await api("GET", `/audit?search=${encodeURIComponent("Sin impacto en los ensayos")}&limit=50`, undefined, t.ana)).data?.items || [];
  check("la búsqueda de la bitácora no revela motivos de calidad al Admin técnico (sí a calidad:V total)", oraculo.length === 0 && oraculoAna.length >= 1, `${oraculo.length} ${oraculoAna.length}`);
  const solMariana = await api("GET", `/solicitudes?entidad=incidencias&entidad_id=${IM}`, undefined, t.mariana);
  const solAjena = await api("GET", `/solicitudes?entidad=incidencias&entidad_id=${I1}`, undefined, t.mariana);
  const solJorge = await api("GET", `/solicitudes?entidad=incidencias&entidad_id=${IM}`, undefined, t.jorge);
  check("solicitudes por registro: Mariana ve las de su incidencia; no las de otra (404) ni el Admin técnico (403)", solMariana.status === 200 && solAjena.status === 404 && solJorge.status === 403, `${solMariana.status} ${solAjena.status} ${solJorge.status}`);
  const ligaAjena = await reportar(t.carmen, { descripcion: "Intento de ligar una extracción que no veo en ensayos", registros: [{ entidad: "muestras_extraccion", entidad_id: c1.E }] });
  check("no se liga a una incidencia un registro que la persona no ve (404, como si no existiera)", ligaAjena.status === 404, `${ligaAjena.status}`);
  const noAsignada = await cadena(t, "NOASIG");
  const ligaNoAsignada = await reportar(t.luis, { descripcion: "Intento de ligar una recepción que no tengo asignada", registros: [{ entidad: "muestras_recepcion", entidad_id: noAsignada.R }] });
  const ligaAsignada = await reportar(t.luis, { descripcion: "Incidencia ligada a la recepción que sí tengo asignada", registros: [{ entidad: "muestras_recepcion", entidad_id: c1.R }] });
  check("con alcance «asignado» solo se ligan recepciones asignadas (otra -> 404; la suya -> 201)", ligaNoAsignada.status === 404 && ligaAsignada.status === 201, `${ligaNoAsignada.status} ${ligaAsignada.status}`);
  const escalarCerrada = await api("POST", `/calidad/incidencias/${rR.data?.id}/evaluar`, { decision: "escalar", justificacion: "Reconsideración posterior" }, t.ana);
  check("escalar una incidencia ya cerrada -> 409", escalarCerrada.status === 409, `${escalarCerrada.status}`);
  const inicio = await api("POST", `/calidad/incidencias/${I1}/evaluacion`, {}, t.ricardo);
  const esc = await api("POST", `/calidad/incidencias/${I1}/evaluar`, { decision: "escalar", justificacion: "La falla pudo afectar la extracción del lote", nc: { clasificacion: "mayor", requisito_incumplido: "ISO/IEC 17025 6.4.13" } }, t.ricardo);
  check("Ricardo inicia la evaluación y la escala a una NC nueva", inicio.status === 200 && esc.status === 200 && !!esc.data?.nc_id, `${inicio.status} ${esc.status} ${esc.data?.message}`);
  const again = await api("POST", `/calidad/incidencias/${I1}/evaluar`, { decision: "escalar", justificacion: "Otra vez la misma incidencia" }, t.ana);
  check("escalar una incidencia ya escalada -> 409", again.status === 409, `${again.status}`);
  const segunda = await reportar(t.luis, { descripcion: "La misma centrífuga volvió a detenerse en otra corrida" });
  const agrupa = await api("POST", `/calidad/incidencias/${segunda.data?.id}/evaluar`, { decision: "escalar", justificacion: "Mismo problema que la NC ya abierta", nc_id: esc.data?.nc_id }, t.ana);
  const nc = (await api("GET", `/calidad/nc/${esc.data?.nc_id}`, undefined, t.ana)).data?.item;
  check("escalar varias incidencias a la misma NC (la NC las agrupa)", agrupa.status === 200 && nc?.incidencias?.length === 2, `${agrupa.status} ${nc?.incidencias?.length}`);

  /* Anular: segundo usuario; escalada solo si su NC esta anulada. */
  const anularEsc = await api("POST", `/calidad/incidencias/${I1}/anular`, { motivo: "Registro duplicado" }, t.ana, { "X-Sin-Aprobar-Auto": "1" });
  check("anular una incidencia escalada con su NC vigente -> 409", anularEsc.status === 409 && anularEsc.data?.codigo === "nc_vigente", `${anularEsc.status} ${anularEsc.data?.codigo}`);
  const luisAnula = await api("POST", `/calidad/incidencias/${rD.data?.id}/anular`, { motivo: "Duplicada" }, t.luis);
  check("sin calidad:AN no se anula (403)", luisAnula.status === 403, `${luisAnula.status}`);
  const pide = await api("POST", `/calidad/incidencias/${rD.data?.id}/anular`, { motivo: "Registrada dos veces por error" }, t.ana, { "X-Sin-Aprobar-Auto": "1" });
  const propiaAprob = await api("POST", `/solicitudes/${pide.data?.solicitud?.id}/aprobar`, { motivo: "La apruebo yo misma" }, t.ana);
  const aprueba = await api("POST", `/solicitudes/${pide.data?.solicitud?.id}/aprobar`, { motivo: "Procede la anulación" }, t.patricia);
  check("anular es acción crítica: 202 solicitud; la solicitante no la aprueba (409); Patricia sí y queda anulada", pide.status === 202 && propiaAprob.status === 409 && aprueba.status === 200 && fila("SELECT estado FROM incidencias WHERE id = ?", rD.data?.id)?.estado === "anulada", `${pide.status} ${propiaAprob.status} ${aprueba.status}`);
  // Anular la NC y despues la incidencia escalada.
  const ncAnula = await api("POST", `/calidad/nc/${esc.data?.nc_id}/anular`, { motivo: "NC abierta para la prueba de anulación" }, t.ana);
  const incAnula = await api("POST", `/calidad/incidencias/${segunda.data?.id}/anular`, { motivo: "Su NC quedó anulada" }, t.ana);
  check("con su NC anulada, la incidencia escalada ya se anula", ncAnula.status === 200 && incAnula.status === 200 && fila("SELECT estado FROM incidencias WHERE id = ?", segunda.data?.id)?.estado === "anulada", `${ncAnula.status} ${ncAnula.data?.message} ${incAnula.status} ${incAnula.data?.message}`);
}

/* ---------- Incidencias automaticas ---------- */
{
  const antes = Number(fila("SELECT COUNT(*) AS n FROM incidencias WHERE origen_automatico = 'desviacion_recepcion'").n);
  const desv = await cadena(t, "DESV", { decision: "aceptada_con_desviacion" });
  const auto = filas("SELECT i.* FROM incidencias i JOIN incidencia_registros r ON r.incidencia_id = i.id WHERE r.entidad = 'muestras_recepcion' AND r.entidad_id = ?", desv.R);
  check("recepción aceptada con desviación -> incidencia automática reportada por quien decidió", auto.length === 1 && auto[0].origen_automatico === "desviacion_recepcion" && auto[0].reportada_por === id.qa, `${desv.R} ${auto.length} ${auto[0]?.reportada_por}`);
  // Editar la recepcion otra vez con la misma decision no duplica.
  const ficha = (await api("GET", `/samples/reception/${desv.R}`, undefined, t.qa)).data?.item;
  const ed = await api("PUT", `/samples/reception/${desv.R}`, { ...ficha, observaciones: "Edición posterior" }, t.qa);
  check("el mismo evento sobre el mismo registro no duplica la incidencia", Number(fila("SELECT COUNT(*) AS n FROM incidencias WHERE origen_automatico = 'desviacion_recepcion'").n) === antes + 1, `${ed.status}`);
  const rech = await cadena(t, "RECH", { decision: "rechazada" });
  check("recepción rechazada -> incidencia automática (rechazo_recepcion)", !!fila("SELECT i.id FROM incidencias i JOIN incidencia_registros r ON r.incidencia_id = i.id WHERE i.origen_automatico = 'rechazo_recepcion' AND r.entidad_id = ?", rech.R), `${rech.R}`);

  // Equipo no apto: Centrifuga (datos de apoyo) tiene la calibracion vencida.
  const apoyo = JSON.parse(fs.readFileSync(process.env.DATOS_APOYO_FILE, "utf8"));
  const eq = [{ equipo_id: apoyo.equipo_id, uso: "Centrifugación", folio_bitacora: `CEN-${Date.now()}` }];
  const noApto = await cadena(t, "EQ", { equipos: eq });
  const incEq = filas("SELECT i.* FROM incidencias i JOIN incidencia_registros r ON r.incidencia_id = i.id WHERE i.origen_automatico = 'equipo_no_apto' AND r.entidad = 'muestras_extraccion' AND r.entidad_id = ?", noApto.E);
  check("usar un equipo con calibración vencida -> incidencia automática ligada a la extracción y al equipo", noApto.extraccion.status === 201 && incEq.length === 1 && !!fila("SELECT id FROM incidencia_registros WHERE incidencia_id = ? AND entidad = 'equipos'", incEq[0]?.id), `${noApto.extraccion.status} ${incEq.length}`);
  const fichaE = (await api("GET", `/samples/extraction/${noApto.E}`, undefined, t.qa)).data?.item;
  await api("PUT", `/samples/extraction/${noApto.E}`, { ...fichaE, equipos: eq, observaciones_generales: "Se volvió a guardar" }, t.qa);
  check("volver a guardar la extracción no duplica la incidencia del equipo", filas("SELECT i.id FROM incidencias i JOIN incidencia_registros r ON r.incidencia_id = i.id WHERE i.origen_automatico = 'equipo_no_apto' AND r.entidad = 'muestras_extraccion' AND r.entidad_id = ?", noApto.E).length === 1);

  // Transaccion que falla despues de crear la incidencia: no queda nada (trigger de prueba en la base de prueba).
  const w = new Database(process.env.TEST_DB_PATH);
  w.exec("CREATE TRIGGER IF NOT EXISTS prueba_falla_bitacora_equipo BEFORE UPDATE OF ultimo_folio_bitacora ON equipos WHEN NEW.ultimo_folio_bitacora = 'FALLA-PRUEBA' BEGIN SELECT RAISE(ABORT, 'falla de prueba'); END");
  w.close();
  const falla = await cadena(t, "FALLA", { equipos: [{ equipo_id: apoyo.equipo_id, uso: "Centrifugación", folio_bitacora: "FALLA-PRUEBA" }] });
  const w2 = new Database(process.env.TEST_DB_PATH);
  w2.exec("DROP TRIGGER IF EXISTS prueba_falla_bitacora_equipo");
  w2.close();
  const huerfanas = filas("SELECT i.id FROM incidencias i WHERE i.descripcion LIKE ? AND i.origen_automatico = 'equipo_no_apto'", `%FALLA%`);
  check("si la transacción del evento falla (500), la incidencia automática no se crea", falla.extraccion.status === 500 && !falla.E && huerfanas.length === 0 && !fila("SELECT id FROM incidencias WHERE clave_automatica LIKE ? ", `equipo_no_apto:muestras_extraccion:%`.replace("%", String(Number(fila("SELECT MAX(id) AS m FROM muestras_extraccion").m) + 1))), `${falla.extraccion.status}`);

  // Alerta de integridad de un adjunto: la reporta el sistema; repetir la descarga no duplica.
  const cI = await cadena(t, "INTEG");
  const A = (await api("POST", "/samples/analysis", { tipo_analisis: "toxinas_lipofilicas", metodo: "hplc_ms_ms", extraccion_id: cI.E, fecha_analisis: "2026-09-20", analista_nombre: "QA", resultados: [{ id_muestra: cI.idInt, resultado: 50, unidad: "µg/kg", limite_regulatorio: 160, cumple: "cumple" }] }, t.qa)).data?.id;
  const bytes = pdfDePrueba(`integridad ${Date.now()}`);
  const adj = await (await adjuntarEvidencia(BASE, t.qa, A, { bytes, descripcion: "Cromatograma que se altera" })).json();
  const ruta = path.join(path.dirname(process.env.TEST_DB_PATH), "evidencias", fila("SELECT nombre_almacenado FROM adjuntos WHERE id = ?", adj.item.id).nombre_almacenado);
  fs.appendFileSync(ruta, "x");
  await api("GET", `/adjuntos/${adj.item.id}/archivo`, undefined, t.qa);
  await api("GET", `/adjuntos/${adj.item.id}/archivo`, undefined, t.qa);
  const alertas = filas("SELECT * FROM incidencias WHERE clave_automatica = ?", `alerta_integridad:adjunto:${adj.item.id}:alterado`);
  check("alerta de integridad -> incidencia automática reportada por el sistema, sin duplicar", alertas.length === 1 && alertas[0].reportada_por === null && alertas[0].reportada_nombre === "Sistema" && alertas[0].tipo === "sistema", `${alertas.length} ${alertas[0]?.reportada_nombre}`);
  // Anulada como falso positivo, no renace con la siguiente descarga (la clave identifica un hecho inmutable).
  const anulaAlerta = await api("POST", `/calidad/incidencias/${alertas[0]?.id}/anular`, { motivo: "Falso positivo: archivo restaurado" }, t.ana);
  await api("GET", `/adjuntos/${adj.item.id}/archivo`, undefined, t.qa);
  fs.writeFileSync(ruta, bytes);
  const tras = filas("SELECT id, estado FROM incidencias WHERE clave_automatica = ?", `alerta_integridad:adjunto:${adj.item.id}:alterado`);
  check("una alerta de integridad anulada no se vuelve a crear en la siguiente descarga", anulaAlerta.status === 200 && tras.length === 1 && tras[0].estado === "anulada", `${anulaAlerta.status} ${tras.length} ${tras[0]?.estado}`);
}

/* ---------- Frases de la bitacora y cadena ---------- */
{
  const entradas = (await api("GET", `/audit?entidad=incidencias&entidad_id=${I1}`, undefined, t.ana)).data?.items || [];
  const acciones = entradas.map((e) => e.accion);
  check("la bitácora de la incidencia registra reportar, adjuntar, evaluar y escalar", ["reportar", "adjuntar", "evaluar", "escalar"].every((a) => acciones.includes(a)), acciones.join(","));
  const verif = await api("GET", "/audit/verify", undefined, t.qa);
  check("la cadena de la bitácora sigue íntegra", verif.data?.ok === true, JSON.stringify(verif.data).slice(0, 120));
}

terminar();
