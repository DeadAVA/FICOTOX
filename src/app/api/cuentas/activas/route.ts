import { apiRoute } from "@/lib/server/http";
import { listarCuentasActivas } from "@/lib/server/firmas";

export const GET = apiRoute(listarCuentasActivas);
