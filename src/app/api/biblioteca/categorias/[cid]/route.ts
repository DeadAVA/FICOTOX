import { apiRoute } from "@/lib/server/http";
import { editarCategoria } from "@/lib/server/modules/biblioteca";

export const PUT = apiRoute(editarCategoria);
