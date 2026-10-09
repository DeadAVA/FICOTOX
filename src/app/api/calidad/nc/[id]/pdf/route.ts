import { apiRoute } from "@/lib/server/http";
import { pdfNc } from "@/lib/server/modules/calidad/nc";

export const GET = apiRoute(pdfNc);
