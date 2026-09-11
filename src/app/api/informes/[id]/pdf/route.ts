import { apiRoute } from "@/lib/server/http";
import { getInformePdf } from "@/lib/server/modules/informes";

export const GET = apiRoute(getInformePdf);
