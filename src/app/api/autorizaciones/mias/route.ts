import { apiRoute } from "@/lib/server/http";
import { misAutorizaciones } from "@/lib/server/autorizaciones";

export const GET = apiRoute(misAutorizaciones);
