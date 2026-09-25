/*
 * Fechas (Fase 3): src/lib/shared/fechas.ts debe dar el mismo resultado sin
 * importar la zona horaria del proceso. El corredor la ejecuta dos veces:
 *
 *   TZ=UTC node tests/fechas.mjs
 *   TZ=America/Tijuana node tests/fechas.mjs
 *
 * Una fecha sola ("AAAA-MM-DD") se formatea como texto (nunca "un dia antes");
 * un instante se muestra en America/Tijuana.
 */
import { diaSemana, diasEntre, fechaSola, finDiaLocal, formatearFecha, formatearFechaHora, formatearFechaLarga, formatearHora, hoyLocal, inicioDiaLocal, parsearFechaEscrita, sumarDias, sumarMeses, tonoVencimiento, fechaValida, instanteDe } from "../src/lib/shared/fechas.ts";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  [TZ=${process.env.TZ || "(sistema)"}] ${name}${detail ? ` — ${detail}` : ""}`);
};

check("una fecha sola se muestra como texto dd/mm/aaaa", formatearFecha("2026-09-07") === "07/09/2026", formatearFecha("2026-09-07"));
check("la fecha sola no pasa por Date: no se corre un dia", fechaSola("2026-09-07") === "2026-09-07" && formatearFecha("2026-01-01") === "01/01/2026");
check("un instante UTC se muestra en America/Tijuana (dia)", fechaSola("2026-09-11T02:30:00.000Z") === "2026-09-10", fechaSola("2026-09-11T02:30:00.000Z"));
check("un instante UTC se muestra en America/Tijuana (dia y hora)", formatearFechaHora("2026-09-11T02:30:00.000Z") === "10/09/2026 19:30", formatearFechaHora("2026-09-11T02:30:00.000Z"));
check("un TIMESTAMP de la base sin zona se trata como UTC", formatearFechaHora("2026-09-11 02:30:00") === "10/09/2026 19:30" && formatearHora("2026-09-11 02:30:00") === "19:30", formatearFechaHora("2026-09-11 02:30:00"));
check("en invierno (UTC-8) tambien", formatearFechaHora("2026-01-15T06:30:00.000Z") === "14/01/2026 22:30", formatearFechaHora("2026-01-15T06:30:00.000Z"));
check("valores vacios", formatearFecha(null) === "—" && formatearFecha("", "-") === "-" && fechaSola(undefined) === "" && instanteDe("2026-09-07") === null);
check("sumarDias cruza mes y anio", sumarDias("2026-01-31", 1) === "2026-02-01" && sumarDias("2026-12-31", 1) === "2027-01-01" && sumarDias("2026-03-01", -1) === "2026-02-28");
check("sumarMeses acota al fin de mes", sumarMeses("2026-01-31", 1) === "2026-02-28" && sumarMeses("2026-03-15", 6) === "2026-09-15");
check("diasEntre", diasEntre("2026-09-01", "2026-09-24") === 23 && diasEntre("2026-09-24", "2026-09-01") === -23 && diasEntre("x", "2026-09-01") === null);
check("parsearFechaEscrita dd/mm/aaaa", parsearFechaEscrita("07/09/2026") === "2026-09-07" && parsearFechaEscrita("7-9-2026") === "2026-09-07" && parsearFechaEscrita("31/02/2026") === "" && parsearFechaEscrita("2026-09-07") === "");
check("fechaValida rechaza fechas imposibles", fechaValida("2026-02-29") === null && fechaValida("2024-02-29") === "2024-02-29" && fechaValida("2026-13-01") === null);
check("inicio y fin del dia local en UTC (verano, UTC-7)", inicioDiaLocal("2026-09-24") === "2026-09-24T07:00:00.000Z" && finDiaLocal("2026-09-24") === "2026-09-25T06:59:59.999Z", `${inicioDiaLocal("2026-09-24")} ${finDiaLocal("2026-09-24")}`);
check("inicio y fin del dia local en UTC (invierno, UTC-8)", inicioDiaLocal("2026-01-15") === "2026-01-15T08:00:00.000Z" && finDiaLocal("2026-01-15") === "2026-01-16T07:59:59.999Z", `${inicioDiaLocal("2026-01-15")}`);
check("el instante de fin de dia vuelve al mismo dia local", fechaSola(finDiaLocal("2026-09-24")) === "2026-09-24" && fechaSola(inicioDiaLocal("2026-09-24")) === "2026-09-24");
check("hoyLocal es el dia de America/Tijuana del instante dado", hoyLocal(new Date("2026-09-11T02:30:00.000Z")) === "2026-09-10" && /^\d{4}-\d{2}-\d{2}$/.test(hoyLocal()));
check("diaSemana y fecha larga", diaSemana("2026-09-24") === "jueves" && formatearFechaLarga("2026-09-24") === "24 de septiembre de 2026");
check("tonoVencimiento por dia local", tonoVencimiento(sumarDias(hoyLocal(), -1)) === "danger" && tonoVencimiento(sumarDias(hoyLocal(), 5)) === "warning" && tonoVencimiento(sumarDias(hoyLocal(), 60)) === null && tonoVencimiento(null) === null);

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} pruebas de fechas pasaron (TZ=${process.env.TZ || "(sistema)"})`);
process.exit(failed ? 1 : 0);
