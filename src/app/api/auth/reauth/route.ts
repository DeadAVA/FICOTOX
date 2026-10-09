import { apiRoute } from "@/lib/server/http";
import { reautenticar } from "@/lib/server/modules/auth";

export const POST = apiRoute(reautenticar);
