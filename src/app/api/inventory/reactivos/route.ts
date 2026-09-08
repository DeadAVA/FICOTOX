import { apiRoute } from "@/lib/server/http";
import { createReactivo, listReactivos } from "@/lib/server/modules/inventory";

export const GET = apiRoute(listReactivos);
export const POST = apiRoute(createReactivo);
