import { apiRoute } from "@/lib/server/http";
import { loginWithEmail } from "@/lib/server/modules/auth";

export const POST = apiRoute(loginWithEmail);
