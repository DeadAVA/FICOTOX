import { apiRoute } from "@/lib/server/http";
import { enviarPorSmtp } from "@/lib/server/envios";

export const POST = apiRoute(enviarPorSmtp);
