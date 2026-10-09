import { apiRoute } from "@/lib/server/http";
import { bandejaSupervision } from "@/lib/server/supervision";

export const GET = apiRoute(bandejaSupervision);
