import { apiRoute } from "@/lib/server/http";
import { getDocumentFile } from "@/lib/server/modules/documents";

export const GET = apiRoute(getDocumentFile);
