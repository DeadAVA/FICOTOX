import { apiRoute } from "@/lib/server/http";
import { refillConsumable } from "@/lib/server/modules/consumables";

export const POST = apiRoute(refillConsumable);
