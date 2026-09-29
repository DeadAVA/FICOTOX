import { apiRoute } from "@/lib/server/http";
import { editarNc, getNc } from "@/lib/server/modules/calidad/nc";

export const GET = apiRoute(getNc);
export const PUT = apiRoute(editarNc);
