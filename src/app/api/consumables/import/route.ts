import { apiRoute } from "@/lib/server/http";
import { importConsumables } from "@/lib/server/modules/consumables";

export const POST = apiRoute(importConsumables);
