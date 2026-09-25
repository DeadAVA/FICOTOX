import { apiRoute } from "@/lib/server/http";
import { revisionAccesos } from "@/lib/server/modules/admin";

export const GET = apiRoute(revisionAccesos);
