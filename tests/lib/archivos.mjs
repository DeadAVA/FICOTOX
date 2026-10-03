/*
 * Biblioteca: archivos reales para las pruebas (PDF de varias paginas con
 * texto e indice, docx, xlsx y png), generados en el momento.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/* PDF de `paginas` paginas con texto seleccionable (pdfkit) y marcadores. */
export async function pdfConTexto(paginas = 4, titulo = "Procedimiento de prueba") {
  const PDFDocument = require("pdfkit");
  const doc = new PDFDocument({ size: "LETTER", margin: 72, info: { Title: titulo } });
  const trozos = [];
  doc.on("data", (c) => trozos.push(c));
  const fin = new Promise((r) => doc.on("end", r));
  const raiz = doc.outline;
  for (let n = 1; n <= paginas; n += 1) {
    if (n > 1) doc.addPage();
    raiz.addItem(`Sección ${n}`);
    doc.fontSize(20).text(`${titulo} — página ${n}`);
    doc.moveDown().fontSize(12).text(`Contenido de la página ${n}. Determinación de ácido domoico por HPLC en mejillón. Palabra clave: saxitoxina${n === paginas ? " fitoplancton" : ""}.`);
  }
  doc.end();
  await fin;
  return Buffer.concat(trozos);
}

/* ZIP sin compresion (store), suficiente para docx minimos. */
function zipStore(archivos) {
  const crcTabla = new Int32Array(256).map((_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c;
  });
  const crc32 = (buf) => {
    let c = -1;
    for (const b of buf) c = crcTabla[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
  const locales = [];
  const centrales = [];
  let offset = 0;
  for (const [nombre, contenido] of Object.entries(archivos)) {
    const datos = Buffer.from(contenido);
    const nom = Buffer.from(nombre);
    const crc = crc32(datos);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(datos.length, 18);
    local.writeUInt32LE(datos.length, 22);
    local.writeUInt16LE(nom.length, 26);
    locales.push(local, nom, datos);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(datos.length, 20);
    central.writeUInt32LE(datos.length, 24);
    central.writeUInt16LE(nom.length, 28);
    central.writeUInt32LE(offset, 42);
    centrales.push(central, nom);
    offset += 30 + nom.length + datos.length;
  }
  const dir = Buffer.concat(centrales);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(Object.keys(archivos).length, 8);
  fin.writeUInt16LE(Object.keys(archivos).length, 10);
  fin.writeUInt32LE(dir.length, 12);
  fin.writeUInt32LE(offset, 16);
  return Buffer.concat([...locales, dir, fin]);
}

/* docx minimo valido (Word lo abre; mammoth lo convierte) con un titulo y dos parrafos. */
export function docxSimple(titulo = "Instructivo de muestreo", parrafos = ["Primer párrafo del instructivo.", "Segundo párrafo con la palabra ficotoxina."]) {
  const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const cuerpo = [`<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${esc(titulo)}</w:t></w:r></w:p>`, ...parrafos.map((p) => `<w:p><w:r><w:t xml:space="preserve">${esc(p)}</w:t></w:r></w:p>`)].join("");
  return zipStore({
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${cuerpo}</w:body></w:document>`,
  });
}

/* xlsx con dos hojas (SheetJS vendorizado en public/vendor/xlsx). */
export function xlsxDosHojas() {
  const contexto = { console, Uint8Array, ArrayBuffer, Buffer, Date, Math };
  contexto.self = contexto;
  vm.createContext(contexto);
  vm.runInContext(readFileSync(path.join(root, "public/vendor/xlsx/xlsx.full.min.js"), "utf8"), contexto);
  const X = contexto.XLSX;
  const wb = X.utils.book_new();
  X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([["Muestra", "Resultado (µg/kg)"], ["D26-101", 42], ["D26-102", 175]]), "Resultados");
  X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([["Equipo", "Calibración"], ["HPLC-1", "2026-09-01"]]), "Equipos");
  return Buffer.from(X.write(wb, { type: "buffer", bookType: "xlsx" }));
}

/* PNG valido de w × h con un degradado (sin dependencias). */
export function pngSimple(w = 64, h = 48) {
  const crcTabla = new Int32Array(256).map((_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c;
  });
  const crc32 = (buf) => {
    let c = -1;
    for (const b of buf) c = crcTabla[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
  const bloque = (tipo, datos) => {
    const t = Buffer.from(tipo);
    const largo = Buffer.alloc(4);
    largo.writeUInt32BE(datos.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, datos])));
    return Buffer.concat([largo, t, datos, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const filas = [];
  for (let y = 0; y < h; y += 1) {
    const fila = Buffer.alloc(1 + w * 3);
    for (let x = 0; x < w; x += 1) {
      fila[1 + x * 3] = 15;
      fila[2 + x * 3] = Math.round((122 * x) / w);
      fila[3 + x * 3] = Math.round(149 + (100 * y) / h);
    }
    filas.push(fila);
  }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), bloque("IHDR", ihdr), bloque("IDAT", zlib.deflateSync(Buffer.concat(filas))), bloque("IEND", Buffer.alloc(0))]);
}
