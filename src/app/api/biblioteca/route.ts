import { apiRoute } from "@/lib/server/http";
import { listarBiblioteca, subirDocumento } from "@/lib/server/modules/biblioteca";

export const GET = apiRoute(listarBiblioteca);
export const POST = apiRoute(subirDocumento);
