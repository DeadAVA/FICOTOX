import { apiRoute } from "@/lib/server/http";
import { createInforme, listInformes } from "@/lib/server/modules/informes";

export const GET = apiRoute(listInformes);
export const POST = apiRoute(createInforme);
