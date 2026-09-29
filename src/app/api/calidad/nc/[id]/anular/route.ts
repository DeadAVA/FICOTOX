import { apiRoute } from "@/lib/server/http";
import { anularNc } from "@/lib/server/modules/calidad/nc";

export const POST = apiRoute(anularNc);
