import { apiRoute } from "@/lib/server/http";
import { proponerCambioDocumental } from "@/lib/server/modules/calidad/nc";

export const POST = apiRoute(proponerCambioDocumental);
