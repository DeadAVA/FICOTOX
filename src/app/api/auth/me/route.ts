import { apiRoute } from "@/lib/server/http";
import { me } from "@/lib/server/modules/auth";

export const GET = apiRoute(me);
