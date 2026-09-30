import { apiRoute } from "@/lib/server/http";
import { crearRespaldoPost, listarRespaldosApi } from "@/lib/server/modules/respaldos";

export const GET = apiRoute(listarRespaldosApi);
// Fase 12: sin apiRoute (maneja su propia sesion en tres tiempos; ver crearRespaldoPost).
export const POST = crearRespaldoPost;
