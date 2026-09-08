"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Eraser, PaintBrush, UploadSimple } from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";

/*
 * Lienzo de firma: subir una imagen o dibujar con el puntero.
 * El valor es un data URL PNG; vacio significa sin firma.
 */

const drawPlaceholder = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.fillStyle = "#9aabb7";
  ctx.font = "500 16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Firma aquí con el puntero o sube una imagen", canvas.width / 2, canvas.height / 2 + 6);
  ctx.restore();
};

export function SignaturePad({ value, onChange, label }: { value: string; onChange: (dataUrl: string) => void; label?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drawingRef = useRef(false);
  const lastDrawn = useRef<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const isEmpty = !value && !drawing;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (lastDrawn.current === value) return;
    lastDrawn.current = value;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!value) {
      drawPlaceholder(canvas);
      return;
    }
    const image = new Image();
    image.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    };
    image.src = value;
  }, [value]);

  const point = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * canvas.width, y: ((event.clientY - rect.top) / rect.height) * canvas.height };
  };

  const start = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(event.pointerId);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0b1f2a";
    drawingRef.current = true;
    setDrawing(true);
    if (isEmpty) ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { x, y } = point(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    event.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = point(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stop = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    lastDrawn.current = dataUrl;
    setDrawing(false);
    onChange(dataUrl);
  };

  const handleFile = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className={cn("relative overflow-hidden rounded-card border bg-surface", isEmpty ? "border-dashed border-line-strong" : "border-line")}>
        <canvas ref={canvasRef} width={520} height={180} aria-label={label || "Lienzo de firma"} className="block aspect-[520/180] w-full touch-none cursor-crosshair" onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop} />
        <span className="pointer-events-none absolute right-3 bottom-2 text-[10.5px] text-ink-4">
          <PaintBrush size={12} className="mr-1 inline" />
          Pincel activo
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleFile} />
        <button type="button" onClick={() => fileRef.current?.click()} className="press inline-flex h-7 items-center gap-1.5 rounded-control border border-line bg-surface px-2.5 text-[12.5px] font-medium text-ink-2 hover:bg-surface-2">
          <UploadSimple size={13} /> Subir imagen
        </button>
        <button type="button" onClick={() => onChange("")} disabled={!value} className="press inline-flex h-7 items-center gap-1.5 rounded-control px-2.5 text-[12.5px] font-medium text-ink-3 hover:bg-surface-2 hover:text-danger disabled:opacity-40">
          <Eraser size={13} /> Limpiar
        </button>
      </div>
    </div>
  );
}
