import { apiRoute } from "@/lib/server/http";
import { listConsumiblesInventory } from "@/lib/server/modules/inventory";

export const GET = apiRoute(listConsumiblesInventory);
