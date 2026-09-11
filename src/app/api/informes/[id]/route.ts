import { apiRoute } from "@/lib/server/http";
import { deleteInforme, getInforme, updateInforme } from "@/lib/server/modules/informes";

export const GET = apiRoute(getInforme);
export const PUT = apiRoute(updateInforme);
export const DELETE = apiRoute(deleteInforme);
