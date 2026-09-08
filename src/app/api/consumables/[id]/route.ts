import { apiRoute } from "@/lib/server/http";
import { deleteConsumable, getConsumable, updateConsumable } from "@/lib/server/modules/consumables";

export const GET = apiRoute(getConsumable);
export const PUT = apiRoute(updateConsumable);
export const DELETE = apiRoute(deleteConsumable);
