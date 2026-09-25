import { apiRoute } from "@/lib/server/http";
import { porLeer } from "@/lib/server/modules/documentos-flujo";

export const GET = apiRoute(porLeer);
