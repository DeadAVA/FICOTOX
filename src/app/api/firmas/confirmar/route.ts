import { apiRoute } from "@/lib/server/http";
import { confirmarFirmante } from "@/lib/server/firmas";

export const POST = apiRoute(confirmarFirmante);
