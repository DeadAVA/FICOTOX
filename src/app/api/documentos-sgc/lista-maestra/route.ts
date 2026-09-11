import { apiRoute } from "@/lib/server/http";
import { listaMaestra } from "@/lib/server/modules/documentos-sgc";

export const GET = apiRoute(listaMaestra);
