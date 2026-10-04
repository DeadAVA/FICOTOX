import { pantallaRetirada } from "@/lib/server/retirado";

/*
 * La pantalla Administración › Respaldos se retiró: los respaldos y las pruebas de
 * restauración se hacen por línea de comandos (npm run respaldar, npm run restaurar,
 * tarea programada) y su estado se revisa con npm run verificar-instalacion.
 */
const retirada = () => pantallaRetirada("los respaldos se hacen y se revisan por línea de comandos");
export const GET = retirada;
export const POST = retirada;
