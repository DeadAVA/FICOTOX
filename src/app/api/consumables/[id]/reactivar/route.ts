import { apiRoute } from "@/lib/server/http";
import { reactivarConsumable } from "@/lib/server/modules/consumables";

export const POST = apiRoute(reactivarConsumable);
