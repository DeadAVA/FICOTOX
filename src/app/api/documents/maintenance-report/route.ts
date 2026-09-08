import { apiRoute } from "@/lib/server/http";
import { createMaintenanceReport } from "@/lib/server/modules/documents";

export const POST = apiRoute(createMaintenanceReport);
