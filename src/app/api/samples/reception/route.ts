import { apiRoute } from "@/lib/server/http";
import { createReceptionSample, listReceptionSamples } from "@/lib/server/modules/samples/recepcion";

export const GET = apiRoute(listReceptionSamples);
export const POST = apiRoute(createReceptionSample);
