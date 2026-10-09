import { apiRoute } from "@/lib/server/http";
import { suspender } from "@/lib/server/modules/calidad/nc";

export const POST = apiRoute(suspender);
