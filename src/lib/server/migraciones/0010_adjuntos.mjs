/*
 * Migracion 10: tabla generica de adjuntos (evidencia instrumental de los analisis) y sus indices.
 *
 * Generada desde una base nueva creada por el codigo anterior (sqlite_master); la
 * variante MySQL traduce los tipos como la rama MySQL de ese codigo. No se edita
 * despues de aplicarse: su checksum queda en schema_migraciones.
 */
import { ejecutarPasos } from "./pasos.mjs";

export const version = 10;
export const nombre = "Evidencia instrumental: tabla adjuntos (Fase 10)";

export const pasos = [
  {
    "tipo": "tabla",
    "nombre": "adjuntos",
    "sqlite": "CREATE TABLE adjuntos (\n      id INTEGER PRIMARY KEY AUTOINCREMENT,\n      entidad VARCHAR(40) NOT NULL,\n      entidad_id INTEGER NOT NULL,\n      tipo_evidencia VARCHAR(40) NOT NULL,\n      descripcion TEXT NOT NULL,\n      nombre_original VARCHAR(255) NOT NULL,\n      nombre_almacenado VARCHAR(255) NOT NULL,\n      mime VARCHAR(120) NOT NULL,\n      extension VARCHAR(10) NOT NULL,\n      tamano_bytes INTEGER NOT NULL,\n      sha256 VARCHAR(64) NOT NULL,\n      subido_por INTEGER DEFAULT NULL,\n      subido_rol VARCHAR(120) DEFAULT NULL,\n      subido_en VARCHAR(40) NOT NULL,\n      heredado_de INTEGER DEFAULT NULL,\n      anulado_en VARCHAR(40) DEFAULT NULL,\n      anulado_por INTEGER DEFAULT NULL,\n      anulado_rol VARCHAR(120) DEFAULT NULL,\n      motivo_anulacion TEXT\n    )",
    "mysql": "CREATE TABLE IF NOT EXISTS `adjuntos` (\n      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n      entidad VARCHAR(40) NOT NULL,\n      entidad_id INT NOT NULL,\n      tipo_evidencia VARCHAR(40) NOT NULL,\n      descripcion LONGTEXT NOT NULL,\n      nombre_original VARCHAR(255) NOT NULL,\n      nombre_almacenado VARCHAR(255) NOT NULL,\n      mime VARCHAR(120) NOT NULL,\n      extension VARCHAR(10) NOT NULL,\n      tamano_bytes INT NOT NULL,\n      sha256 VARCHAR(64) NOT NULL,\n      subido_por INT DEFAULT NULL,\n      subido_rol VARCHAR(120) DEFAULT NULL,\n      subido_en VARCHAR(40) NOT NULL,\n      heredado_de INT DEFAULT NULL,\n      anulado_en VARCHAR(40) DEFAULT NULL,\n      anulado_por INT DEFAULT NULL,\n      anulado_rol VARCHAR(120) DEFAULT NULL,\n      motivo_anulacion LONGTEXT\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "indice",
    "nombre": "idx_adjuntos_entidad",
    "tabla": "adjuntos",
    "columnas": [
      "entidad",
      "entidad_id"
    ],
    "unico": false
  },
  {
    "tipo": "indice",
    "nombre": "idx_adjuntos_sha256",
    "tabla": "adjuntos",
    "columnas": [
      "sha256"
    ],
    "unico": false
  }
];

export const up = (db, motor) => ejecutarPasos(db, motor, pasos);
