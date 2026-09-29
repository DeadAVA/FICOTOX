import { apiRoute } from "@/lib/server/http";
import { descargarActa } from "@/lib/server/modules/respaldos";

export const GET = apiRoute(descargarActa);
