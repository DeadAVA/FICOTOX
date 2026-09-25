import { apiRoute } from "@/lib/server/http";
import { confirmarLectura } from "@/lib/server/modules/documentos-flujo";

export const POST = apiRoute(confirmarLectura);
