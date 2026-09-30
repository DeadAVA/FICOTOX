/*
 * Se ejecuta una vez al arrancar el servidor Next.js (dev, start o standalone).
 * La verificacion vive en instrumentation-node.ts y solo se importa en el
 * runtime Node.js (usa process.exit y fs, que no existen en Edge).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { verificarArranque } = await import("./instrumentation-node");
    await verificarArranque();
  }
}
