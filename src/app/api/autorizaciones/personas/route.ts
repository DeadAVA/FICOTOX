import { apiRoute } from "@/lib/server/http";
import { personasAutorizables } from "@/lib/server/autorizaciones";

export const GET = apiRoute(personasAutorizables);
