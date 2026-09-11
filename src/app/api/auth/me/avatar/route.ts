import { apiRoute } from "@/lib/server/http";
import { updateMyAvatar } from "@/lib/server/modules/auth";

export const PUT = apiRoute(updateMyAvatar);
