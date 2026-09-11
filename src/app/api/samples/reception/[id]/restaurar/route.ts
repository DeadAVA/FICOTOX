import { apiRoute } from "@/lib/server/http";
import { restaurarReceptionSample } from "@/lib/server/modules/samples/recepcion";

export const POST = apiRoute(restaurarReceptionSample);
