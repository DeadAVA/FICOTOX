import { apiRoute } from "@/lib/server/http";
import { iniciarAccion } from "@/lib/server/modules/calidad/nc";

export const POST = apiRoute(iniciarAccion);
