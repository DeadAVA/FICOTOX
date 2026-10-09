"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/*
 * Calidad › Documentos ahora es la Biblioteca de documentos (decisión
 * confirmada por el laboratorio: reemplaza el flujo de control documental).
 * La ruta anterior lleva a la nueva para no romper enlaces guardados.
 */
export default function DocumentosRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/calidad/biblioteca");
  }, [router]);
  return null;
}
