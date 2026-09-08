import { apiRoute } from "@/lib/server/http";
import { deleteProcessingSample, getProcessingSample, updateProcessingSample } from "@/lib/server/modules/samples/procesamiento";

export const GET = apiRoute(getProcessingSample);
export const PUT = apiRoute(updateProcessingSample);
export const DELETE = apiRoute(deleteProcessingSample);
