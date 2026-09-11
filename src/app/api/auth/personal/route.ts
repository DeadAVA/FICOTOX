import { apiRoute } from "@/lib/server/http";
import { personal } from "@/lib/server/modules/auth";

export const GET = apiRoute(personal);
