import { apiRoute } from "@/lib/server/http";
import { anularInforme } from "@/lib/server/modules/informes";

export const POST = apiRoute(anularInforme);
