/*
 * Migracion 12 (Fase 12): tokens de firma con contrasena del firmante (Fase 5).
 *
 * El codigo anterior creaba esta tabla al primer uso (no en el arranque), asi
 * que unas bases la tienen y otras no. Se crea solo si falta; la deteccion de
 * la linea base la acepta presente o ausente en las versiones 9 a 11 (con esta
 * misma definicion). Con esto, toda base queda con el mismo esquema.
 */
import { ejecutarPasos } from "./pasos.mjs";

export const version = 12;
export const nombre = "Tokens de firma (tabla que antes se creaba al primer uso)";

export const pasos = [
  {
    tipo: "tabla",
    nombre: "firmas_tokens",
    sqlite: `CREATE TABLE firmas_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT, token_hash VARCHAR(64) NOT NULL UNIQUE, usuario_id INTEGER NOT NULL,
          solicitado_por INTEGER NOT NULL, creado_en VARCHAR(40) NOT NULL, expira_en VARCHAR(40) NOT NULL, usado_en VARCHAR(40) DEFAULT NULL)`,
    mysql: `CREATE TABLE IF NOT EXISTS firmas_tokens (
          id INT AUTO_INCREMENT PRIMARY KEY, token_hash VARCHAR(64) NOT NULL, usuario_id INT NOT NULL,
          solicitado_por INT NOT NULL, creado_en VARCHAR(40) NOT NULL, expira_en VARCHAR(40) NOT NULL, usado_en VARCHAR(40) DEFAULT NULL,
          UNIQUE KEY uq_firmas_tokens_hash (token_hash)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  },
];

export const up = (db, motor) => ejecutarPasos(db, motor, pasos);
