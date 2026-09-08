import { apiRoute } from "@/lib/server/http";
import { createConsumable, getConsumables } from "@/lib/server/modules/consumables";

export const GET = apiRoute(getConsumables);
export const POST = apiRoute(createConsumable);
