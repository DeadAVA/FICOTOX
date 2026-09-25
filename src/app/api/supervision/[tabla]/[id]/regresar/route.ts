import { apiRoute } from "@/lib/server/http";
import { regresarSupervision } from "@/lib/server/supervision";

export const POST = apiRoute(regresarSupervision);
