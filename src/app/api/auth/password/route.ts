import { apiRoute } from "@/lib/server/http";
import { cambiarPassword } from "@/lib/server/modules/auth";

export const POST = apiRoute(cambiarPassword);
