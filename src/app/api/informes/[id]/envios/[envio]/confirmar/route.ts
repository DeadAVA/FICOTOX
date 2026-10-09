import { apiRoute } from "@/lib/server/http";
import { confirmarEnvio } from "@/lib/server/envios";

export const POST = apiRoute(confirmarEnvio);
