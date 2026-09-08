import { apiRoute } from "@/lib/server/http";
import { importReactivos } from "@/lib/server/modules/inventory";

export const POST = apiRoute(importReactivos);
