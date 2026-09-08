import { apiRoute } from "@/lib/server/http";
import { listDocuments } from "@/lib/server/modules/documents";

export const GET = apiRoute(listDocuments);
