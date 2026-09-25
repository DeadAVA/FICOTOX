import { apiRoute } from "@/lib/server/http";
import { restablecerPassword } from "@/lib/server/modules/admin";

export const POST = apiRoute(restablecerPassword);
