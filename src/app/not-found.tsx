import Link from "next/link";
import { BrandLockup } from "@/components/shell/Brand";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <BrandLockup />
      <div className="flex flex-col gap-2">
        <p className="display text-[40px] text-ink">Esta página no existe</p>
        <p className="max-w-sm text-[14px] text-ink-3">La dirección puede estar mal escrita o la sección se movió con el rediseño.</p>
      </div>
      <Link href="/" className="press inline-flex h-9 items-center rounded-control bg-brand px-4 text-sm font-medium text-white hover:bg-brand-strong">
        Ir al inicio
      </Link>
    </main>
  );
}
