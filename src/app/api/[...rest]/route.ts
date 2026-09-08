import { notFound } from "@/lib/server/http";

/* Cualquier ruta /api desconocida responde como lo hacia Flask. */
const handler = async () => notFound();

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
