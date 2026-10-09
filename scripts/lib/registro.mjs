/*
 * Fase 12: registro del servidor a archivo (lo usa scripts/start-ficotox.mjs).
 *
 * - <LOG_DIR o instancia/logs>/ficotox-AAAA-MM-DD.log, un archivo por dia;
 *   si pasa de LOG_MAX_MB (10) se rota a .1, .2, ... del mismo dia.
 * - Retencion: los archivos con mas de LOG_RETENCION_DIAS (90) dias se quitan
 *   al arrancar y una vez al dia (son registros tecnicos del servidor, no
 *   registros del laboratorio: la bitacora de auditoria vive en la base).
 * - Sin datos sensibles: se enmascaran correos (j***@dominio), tokens
 *   (Bearer, JWT, X-Reauth) y cualquier "password/contrasena/secret=valor".
 */
import fs from "node:fs";
import path from "node:path";

const dos = (n) => String(n).padStart(2, "0");
const dia = (d = new Date()) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;

/* Fecha y hora LOCALES del equipo con su desfase (p. ej. "2026-09-29 17:19:26 -07:00"): el laboratorio lee hora local. */
export function marcaLocal(d = new Date()) {
  const desfase = -d.getTimezoneOffset();
  const signo = desfase >= 0 ? "+" : "-";
  return `${dia(d)} ${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())} ${signo}${dos(Math.floor(Math.abs(desfase) / 60))}:${dos(Math.abs(desfase) % 60)}`;
}
/* Sello local para nombres de archivo: "2026-09-29-17-19-26". */
export const selloLocal = (d = new Date()) => `${dia(d)}-${dos(d.getHours())}-${dos(d.getMinutes())}-${dos(d.getSeconds())}`;

export function enmascarar(texto) {
  return String(texto)
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer ***")
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, "***jwt***")
    // Credenciales en URL (mysql://usuario:clave@servidor, https://u:c@h).
    .replace(/(\b[a-z][a-z0-9+.-]*:\/\/[^:\/\s@]+:)[^@\s\/]+@/gi, "$1***@")
    // Estilo .env (CLAVE=valor): el valor completo hasta el fin de la linea (puede llevar espacios).
    .replace(/^(\s*[\w-]*(?:password|passwd|pass|contrasena|contraseña|secret|token|clave)[\w-]*\s*=).*$/gim, "$1***")
    // Cualquier clave que contenga password/contrasena/secret/token (password_nueva, SMTP_PASS, jwt_secret, X-Reauth...)
    // y los campos de cambio de contrasena (actual, nueva, temporal).
    .replace(/("?(?:[\w-]*(?:password|passwd|pass|contrasena|contraseña|secret|token|x-reauth)[\w-]*|actual|nueva|temporal|password_temporal)"?\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;&}]+)/gi, "$1***")
    .replace(/\b([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g, "$1***@$2");
}

export class RegistroRotativo {
  constructor({ dir, maxMb = 10, retencionDias = 90 }) {
    this.dir = dir;
    this.max = Math.max(1, Number(maxMb) || 10) * 1024 * 1024;
    this.retencionDias = Math.max(1, Number(retencionDias) || 90);
    fs.mkdirSync(dir, { recursive: true });
    this.limpiar();
    this.ultimaLimpieza = dia();
  }

  archivo() {
    return path.join(this.dir, `ficotox-${dia()}.log`);
  }

  rotar(actual) {
    let n = 1;
    while (fs.existsSync(`${actual}.${n}`)) n += 1;
    fs.renameSync(actual, `${actual}.${n}`);
  }

  limpiar() {
    const limite = Date.now() - this.retencionDias * 86_400_000;
    for (const nombre of fs.readdirSync(this.dir)) {
      if (!/^ficotox-\d{4}-\d{2}-\d{2}\.log(\.\d+)?$/.test(nombre)) continue;
      const ruta = path.join(this.dir, nombre);
      try {
        if (fs.statSync(ruta).mtimeMs < limite) fs.rmSync(ruta, { force: true });
      } catch {
        /* otro proceso lo movio */
      }
    }
  }

  escribir(linea) {
    try {
      if (this.ultimaLimpieza !== dia()) {
        this.limpiar();
        this.ultimaLimpieza = dia();
      }
      const actual = this.archivo();
      if (fs.existsSync(actual) && fs.statSync(actual).size > this.max) this.rotar(actual);
      fs.appendFileSync(actual, `${marcaLocal()} ${enmascarar(linea)}\n`, { mode: 0o600 });
    } catch {
      /* el registro nunca detiene el servidor */
    }
  }
}
