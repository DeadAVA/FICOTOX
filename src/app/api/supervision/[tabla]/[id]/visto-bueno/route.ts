import { apiRoute } from "@/lib/server/http";
import { vistoBueno } from "@/lib/server/supervision";

export const POST = apiRoute(vistoBueno);
