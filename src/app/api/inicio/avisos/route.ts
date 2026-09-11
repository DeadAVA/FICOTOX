import { apiRoute } from "@/lib/server/http";
import { inicioAvisos } from "@/lib/server/modules/inicio";

export const GET = apiRoute(inicioAvisos);
