"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/*
 * La pantalla Respaldos se retiró: los respaldos y las pruebas de restauración se
 * hacen por línea de comandos (npm run respaldar, npm run restaurar, tarea
 * programada) y su estado se revisa con npm run verificar-instalacion. La ruta
 * anterior lleva al Inicio.
 */
export default function RespaldosRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return null;
}
