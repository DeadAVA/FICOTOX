import { apiRoute } from "@/lib/server/http";
import { crearRespaldoApi, listarRespaldosApi } from "@/lib/server/modules/respaldos";

export const GET = apiRoute(listarRespaldosApi);
export const POST = apiRoute(crearRespaldoApi);
