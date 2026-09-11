import { apiRoute } from "@/lib/server/http";
import { inicioEnCurso } from "@/lib/server/modules/inicio";

export const GET = apiRoute(inicioEnCurso);
