import { apiRoute } from "@/lib/server/http";
import { anularProcessingSample } from "@/lib/server/modules/samples/procesamiento";

export const POST = apiRoute(anularProcessingSample);
