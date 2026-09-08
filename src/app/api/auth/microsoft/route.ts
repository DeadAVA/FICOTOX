import { apiRoute } from "@/lib/server/http";
import { loginWithMicrosoft } from "@/lib/server/modules/auth";

export const POST = apiRoute(loginWithMicrosoft);
