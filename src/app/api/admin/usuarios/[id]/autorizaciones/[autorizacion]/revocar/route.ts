import { apiRoute } from "@/lib/server/http";
import { revocarAutorizacion } from "@/lib/server/autorizaciones";

export const POST = apiRoute(revocarAutorizacion);
