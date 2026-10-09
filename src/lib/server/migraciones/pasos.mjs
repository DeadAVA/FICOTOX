/*
 * Fase 12: ejecucion de los pasos de una migracion (JavaScript plano; lo usan
 * el servidor y los scripts, como audit-chain.mjs y respaldo.mjs).
 *
 * Una migracion es una lista de pasos declarativos (datos, no codigo), de modo
 * que su checksum es el mismo en el servidor empaquetado y en los scripts:
 *   { tipo: "tabla", nombre, sqlite, mysql }            CREATE TABLE (en MySQL con IF NOT EXISTS)
 *   { tipo: "indice", nombre, tabla, columnas, unico }  CREATE [UNIQUE] INDEX si no existe
 *   { tipo: "columna", tabla, columna, sqlite, mysql }  ALTER TABLE ADD COLUMN si no existe
 *   { tipo: "trigger", nombre, tabla, sqlite, mysql }   CREATE TRIGGER si no existe
 *   { tipo: "catalogo", tabla, clave, filas }           inserta o actualiza filas por su clave unica
 *
 * `db` es un adaptador del motor (ver motor.mjs): all/get/run/exec con
 * parametros posicionales "?". En SQLite todo corre dentro de la transaccion de
 * la migracion; en MySQL el DDL confirma implicitamente, por eso cada paso
 * comprueba si ya se hizo (una migracion interrumpida se puede reanudar).
 */

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function ident(nombre) {
  if (!IDENT.test(String(nombre || ""))) throw new Error(`Identificador SQL invalido en una migracion: ${JSON.stringify(nombre)}`);
  return nombre;
}

async function existeTabla(db, motor, tabla) {
  if (motor === "sqlite") return !!(await db.get("SELECT 1 AS x FROM sqlite_master WHERE type = 'table' AND name = ?", [tabla]));
  return !!(await db.get("SELECT 1 AS x FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?", [tabla]));
}

async function existeColumna(db, motor, tabla, columna) {
  if (motor === "sqlite") return (await db.all(`PRAGMA table_info("${ident(tabla)}")`)).some((c) => c.name === columna);
  return !!(await db.get("SELECT 1 AS x FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?", [tabla, columna]));
}

async function existeIndice(db, motor, tabla, nombre) {
  if (motor === "sqlite") return !!(await db.get("SELECT 1 AS x FROM sqlite_master WHERE type = 'index' AND name = ?", [nombre]));
  return !!(await db.get("SELECT 1 AS x FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?", [tabla, nombre]));
}

async function existeTrigger(db, motor, nombre) {
  if (motor === "sqlite") return !!(await db.get("SELECT 1 AS x FROM sqlite_master WHERE type = 'trigger' AND name = ?", [nombre]));
  return !!(await db.get("SELECT 1 AS x FROM INFORMATION_SCHEMA.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME = ?", [nombre]));
}

export async function ejecutarPasos(db, motor, pasos) {
  for (const paso of pasos) {
    switch (paso.tipo) {
      case "tabla":
        if (!(await existeTabla(db, motor, ident(paso.nombre)))) await db.exec(motor === "sqlite" ? paso.sqlite : paso.mysql);
        break;
      case "indice": {
        if (await existeIndice(db, motor, ident(paso.tabla), ident(paso.nombre))) break;
        const columnas = paso.columnas.map(ident).join(", ");
        await db.exec(`CREATE ${paso.unico ? "UNIQUE " : ""}INDEX ${paso.nombre} ON ${paso.tabla} (${columnas})`);
        break;
      }
      case "columna":
        if (!(await existeColumna(db, motor, ident(paso.tabla), ident(paso.columna)))) await db.exec(`ALTER TABLE ${paso.tabla} ADD COLUMN ${paso.columna} ${motor === "sqlite" ? paso.sqlite : paso.mysql}`);
        break;
      case "trigger":
        if (!(await existeTrigger(db, motor, ident(paso.nombre)))) await db.exec(motor === "sqlite" ? paso.sqlite : paso.mysql);
        break;
      case "catalogo": {
        const tabla = ident(paso.tabla);
        const clave = ident(paso.clave);
        for (const fila of paso.filas) {
          const columnas = Object.keys(fila).map(ident);
          const existe = await db.get(`SELECT 1 AS x FROM ${tabla} WHERE ${clave} = ?`, [fila[clave]]);
          if (existe) {
            const otras = columnas.filter((c) => c !== clave);
            if (otras.length) await db.run(`UPDATE ${tabla} SET ${otras.map((c) => `${c} = ?`).join(", ")} WHERE ${clave} = ?`, [...otras.map((c) => fila[c]), fila[clave]]);
          } else {
            await db.run(`INSERT INTO ${tabla} (${columnas.join(", ")}) VALUES (${columnas.map(() => "?").join(", ")})`, columnas.map((c) => fila[c]));
          }
        }
        break;
      }
      default:
        throw new Error(`Paso de migracion desconocido: ${JSON.stringify(paso.tipo)}`);
    }
  }
}
