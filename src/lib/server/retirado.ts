import { NextResponse } from "next/server";

/*
 * Biblioteca de documentos: el flujo de control documental de Documentos SGC se
 * retiro por decision confirmada del laboratorio (Calidad › Documentos funciona
 * como biblioteca de consulta). Sus escrituras responden 410; las tablas y los
 * archivos se conservan sin uso (la migracion 13 los copio a la biblioteca).
 */
export const MENSAJE_RETIRADO = "Funcionalidad retirada: Calidad › Documentos ahora es la Biblioteca";

export async function funcionalidadRetirada(): Promise<Response> {
  return NextResponse.json({ message: MENSAJE_RETIRADO, codigo: "retirado" }, { status: 410 });
}
