import { apiRoute } from "@/lib/server/http";
import { agregarInformeAfectado } from "@/lib/server/modules/calidad/nc";

export const POST = apiRoute(agregarInformeAfectado);
