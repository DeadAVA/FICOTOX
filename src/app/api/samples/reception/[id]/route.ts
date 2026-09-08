import { apiRoute } from "@/lib/server/http";
import { deleteReceptionSample, getReceptionSample, updateReceptionSample } from "@/lib/server/modules/samples/recepcion";

export const GET = apiRoute(getReceptionSample);
export const PUT = apiRoute(updateReceptionSample);
export const DELETE = apiRoute(deleteReceptionSample);
