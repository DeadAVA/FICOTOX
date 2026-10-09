import { apiRoute } from "@/lib/server/http";
import { listarEnvios, registrarEnvioManual } from "@/lib/server/envios";

export const GET = apiRoute(listarEnvios);
export const POST = apiRoute(registrarEnvioManual);
