import { apiRoute } from "@/lib/server/http";
import { verificarNc } from "@/lib/server/modules/calidad/nc";

export const POST = apiRoute(verificarNc);
