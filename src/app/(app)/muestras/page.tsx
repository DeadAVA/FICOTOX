"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MuestrasIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/muestras/recepcion");
  }, [router]);
  return null;
}
