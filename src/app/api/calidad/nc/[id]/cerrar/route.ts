import { apiRoute } from "@/lib/server/http";
import { cerrarNc } from "@/lib/server/modules/calidad/nc";

export const POST = apiRoute(cerrarNc);
