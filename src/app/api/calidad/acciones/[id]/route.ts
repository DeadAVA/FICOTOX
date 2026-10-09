import { apiRoute } from "@/lib/server/http";
import { editarAccion } from "@/lib/server/modules/calidad/nc";

export const PUT = apiRoute(editarAccion);
