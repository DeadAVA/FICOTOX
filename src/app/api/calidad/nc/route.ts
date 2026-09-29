import { apiRoute } from "@/lib/server/http";
import { crearNc, listarNc } from "@/lib/server/modules/calidad/nc";

export const GET = apiRoute(listarNc);
export const POST = apiRoute(crearNc);
