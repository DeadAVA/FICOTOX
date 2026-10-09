import { apiRoute } from "@/lib/server/http";
import { listarSuspensionesActivas } from "@/lib/server/modules/calidad/nc";

export const GET = apiRoute(listarSuspensionesActivas);
