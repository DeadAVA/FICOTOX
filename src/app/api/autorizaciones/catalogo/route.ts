import { apiRoute } from "@/lib/server/http";
import { catalogoAutorizaciones } from "@/lib/server/autorizaciones";

export const GET = apiRoute(catalogoAutorizaciones);
