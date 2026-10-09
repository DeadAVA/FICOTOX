import { apiRoute } from "@/lib/server/http";
import { descargarEvidencia } from "@/lib/server/envios";

export const GET = apiRoute(descargarEvidencia);
