/*
 * Migracion 9: esquema completo de FICOTOX al cierre de la Fase 9 (usuarios y
 * roles, bitacora con sus triggers, seguridad, solicitudes, autorizaciones,
 * asignaciones, muestras, analisis, informes y envios, documentos SGC,
 * inventario, equipos y mantenimientos) y el catalogo de modulos (permisos).
 * Empieza en 9 para que las versiones coincidan con ESQUEMA_VERSION de los
 * respaldos existentes (10 = Fase 10, 11 = Fase 11).
 *
 * Generada desde una base nueva creada por el codigo anterior (sqlite_master); la
 * variante MySQL traduce los tipos como la rama MySQL de ese codigo. No se edita
 * despues de aplicarse: su checksum queda en schema_migraciones.
 */
import { ejecutarPasos } from "./pasos.mjs";

export const version = 9;
export const nombre = "Esquema base (Fase 9)";

export const pasos = [
  {
    "tipo": "tabla",
    "nombre": "roles",
    "sqlite": "CREATE TABLE roles (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        nombre VARCHAR(100) NOT NULL UNIQUE,\n        descripcion TEXT,\n        es_sistemico INTEGER NOT NULL DEFAULT 0,\n        activo INTEGER NOT NULL DEFAULT 1\n      , \"clave\" VARCHAR(60) DEFAULT NULL)",
    "mysql": "CREATE TABLE IF NOT EXISTS `roles` (\n        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n        nombre VARCHAR(100) NOT NULL UNIQUE,\n        descripcion LONGTEXT,\n        es_sistemico INT NOT NULL DEFAULT 0,\n        activo INT NOT NULL DEFAULT 1\n      , `clave` VARCHAR(60) DEFAULT NULL\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "tabla",
    "nombre": "permisos",
    "sqlite": "CREATE TABLE permisos (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        clave VARCHAR(80) NOT NULL UNIQUE,\n        nombre VARCHAR(120) NOT NULL,\n        descripcion TEXT,\n        activo INTEGER NOT NULL DEFAULT 1\n      )",
    "mysql": "CREATE TABLE IF NOT EXISTS `permisos` (\n        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n        clave VARCHAR(80) NOT NULL UNIQUE,\n        nombre VARCHAR(120) NOT NULL,\n        descripcion LONGTEXT,\n        activo INT NOT NULL DEFAULT 1\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "tabla",
    "nombre": "rol_permisos",
    "sqlite": "CREATE TABLE rol_permisos (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        id_rol INTEGER NOT NULL,\n        id_permiso INTEGER NOT NULL,\n        can_read INTEGER NOT NULL DEFAULT 0,\n        can_create INTEGER NOT NULL DEFAULT 0,\n        can_update INTEGER NOT NULL DEFAULT 0,\n        can_delete INTEGER NOT NULL DEFAULT 0,\n        UNIQUE (id_rol, id_permiso)\n      )",
    "mysql": "CREATE TABLE IF NOT EXISTS `rol_permisos` (\n        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n        id_rol INT NOT NULL,\n        id_permiso INT NOT NULL,\n        can_read INT NOT NULL DEFAULT 0,\n        can_create INT NOT NULL DEFAULT 0,\n        can_update INT NOT NULL DEFAULT 0,\n        can_delete INT NOT NULL DEFAULT 0,\n        UNIQUE (id_rol, id_permiso)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "tabla",
    "nombre": "rol_acciones",
    "sqlite": "CREATE TABLE rol_acciones (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        id_rol INTEGER NOT NULL,\n        modulo VARCHAR(30) NOT NULL,\n        accion VARCHAR(4) NOT NULL,\n        alcance VARCHAR(30) NOT NULL DEFAULT 'total',\n        UNIQUE (id_rol, modulo, accion, alcance)\n      )",
    "mysql": "CREATE TABLE IF NOT EXISTS `rol_acciones` (\n        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n        id_rol INT NOT NULL,\n        modulo VARCHAR(30) NOT NULL,\n        accion VARCHAR(4) NOT NULL,\n        alcance VARCHAR(30) NOT NULL DEFAULT 'total',\n        UNIQUE (id_rol, modulo, accion, alcance)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "tabla",
    "nombre": "usuario_roles",
    "sqlite": "CREATE TABLE usuario_roles (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        usuario_id INTEGER NOT NULL,\n        rol_id INTEGER NOT NULL,\n        vigente_desde VARCHAR(10) NOT NULL,\n        vigente_hasta VARCHAR(10) DEFAULT NULL,\n        motivo TEXT NOT NULL,\n        asignado_por INTEGER DEFAULT NULL,\n        asignado_en VARCHAR(40) NOT NULL,\n        revocado_en VARCHAR(40) DEFAULT NULL,\n        revocado_por INTEGER DEFAULT NULL,\n        motivo_revocacion TEXT,\n        vencimiento_registrado_en VARCHAR(40) DEFAULT NULL\n      )",
    "mysql": "CREATE TABLE IF NOT EXISTS `usuario_roles` (\n        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n        usuario_id INT NOT NULL,\n        rol_id INT NOT NULL,\n        vigente_desde VARCHAR(10) NOT NULL,\n        vigente_hasta VARCHAR(10) DEFAULT NULL,\n        motivo LONGTEXT NOT NULL,\n        asignado_por INT DEFAULT NULL,\n        asignado_en VARCHAR(40) NOT NULL,\n        revocado_en VARCHAR(40) DEFAULT NULL,\n        revocado_por INT DEFAULT NULL,\n        motivo_revocacion LONGTEXT,\n        vencimiento_registrado_en VARCHAR(40) DEFAULT NULL\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "indice",
    "nombre": "idx_usuario_roles_usuario",
    "tabla": "usuario_roles",
    "columnas": [
      "usuario_id"
    ],
    "unico": false
  },
  {
    "tipo": "indice",
    "nombre": "idx_rol_acciones_rol",
    "tabla": "rol_acciones",
    "columnas": [
      "id_rol"
    ],
    "unico": false
  },
  {
    "tipo": "tabla",
    "nombre": "usuarios",
    "sqlite": "CREATE TABLE usuarios (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        nombre VARCHAR(100) NOT NULL,\n        email VARCHAR(100) NOT NULL UNIQUE,\n        activo INTEGER DEFAULT 1,\n        id_rol INTEGER NOT NULL,\n        departamento VARCHAR(100) DEFAULT NULL,\n        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n        ultimo_acceso TIMESTAMP DEFAULT NULL\n      , \"password_hash\" VARCHAR(255) DEFAULT NULL, \"avatar\" VARCHAR(40) DEFAULT NULL, \"tipo_cuenta\" VARCHAR(20) NOT NULL DEFAULT 'permanente', \"vigente_desde\" VARCHAR(10) DEFAULT NULL, \"vigente_hasta\" VARCHAR(10) DEFAULT NULL, \"supervisor_id\" INT DEFAULT NULL, \"motivo_ultimo_cambio\" TEXT, \"token_version\" INT NOT NULL DEFAULT 0, \"debe_cambiar_password\" INT NOT NULL DEFAULT 0, \"bloqueado_hasta\" VARCHAR(40) DEFAULT NULL, \"intentos_desde\" VARCHAR(40) DEFAULT NULL, \"cargo_predeterminado\" INT DEFAULT NULL)",
    "mysql": "CREATE TABLE IF NOT EXISTS `usuarios` (\n        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n        nombre VARCHAR(100) NOT NULL,\n        email VARCHAR(100) NOT NULL UNIQUE,\n        activo INT DEFAULT 1,\n        id_rol INT NOT NULL,\n        departamento VARCHAR(100) DEFAULT NULL,\n        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n        ultimo_acceso TIMESTAMP DEFAULT NULL\n      , `password_hash` VARCHAR(255) DEFAULT NULL, `avatar` VARCHAR(40) DEFAULT NULL, `tipo_cuenta` VARCHAR(20) NOT NULL DEFAULT 'permanente', `vigente_desde` VARCHAR(10) DEFAULT NULL, `vigente_hasta` VARCHAR(10) DEFAULT NULL, `supervisor_id` INT DEFAULT NULL, `motivo_ultimo_cambio` LONGTEXT, `token_version` INT NOT NULL DEFAULT 0, `debe_cambiar_password` INT NOT NULL DEFAULT 0, `bloqueado_hasta` VARCHAR(40) DEFAULT NULL, `intentos_desde` VARCHAR(40) DEFAULT NULL, `cargo_predeterminado` INT DEFAULT NULL\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "tabla",
    "nombre": "auditoria",
    "sqlite": "CREATE TABLE auditoria (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        fecha_hora TEXT NOT NULL,\n        usuario_id INTEGER DEFAULT NULL,\n        usuario_nombre VARCHAR(150) DEFAULT NULL,\n        usuario_email VARCHAR(150) DEFAULT NULL,\n        accion VARCHAR(30) NOT NULL,\n        entidad VARCHAR(60) NOT NULL,\n        entidad_id VARCHAR(60) DEFAULT NULL,\n        referencia VARCHAR(160) DEFAULT NULL,\n        motivo TEXT,\n        cambios_json TEXT,\n        datos_anteriores_json TEXT,\n        datos_nuevos_json TEXT,\n        hash_anterior VARCHAR(64) DEFAULT NULL,\n        hash VARCHAR(64) NOT NULL\n      )",
    "mysql": "CREATE TABLE IF NOT EXISTS `auditoria` (\n        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n        fecha_hora LONGTEXT NOT NULL,\n        usuario_id INT DEFAULT NULL,\n        usuario_nombre VARCHAR(150) DEFAULT NULL,\n        usuario_email VARCHAR(150) DEFAULT NULL,\n        accion VARCHAR(30) NOT NULL,\n        entidad VARCHAR(60) NOT NULL,\n        entidad_id VARCHAR(60) DEFAULT NULL,\n        referencia VARCHAR(160) DEFAULT NULL,\n        motivo LONGTEXT,\n        cambios_json LONGTEXT,\n        datos_anteriores_json LONGTEXT,\n        datos_nuevos_json LONGTEXT,\n        hash_anterior VARCHAR(64) DEFAULT NULL,\n        hash VARCHAR(64) NOT NULL\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "indice",
    "nombre": "idx_auditoria_entidad",
    "tabla": "auditoria",
    "columnas": [
      "entidad",
      "entidad_id"
    ],
    "unico": false
  },
  {
    "tipo": "indice",
    "nombre": "idx_auditoria_fecha",
    "tabla": "auditoria",
    "columnas": [
      "fecha_hora"
    ],
    "unico": false
  },
  {
    "tipo": "trigger",
    "nombre": "auditoria_sin_update",
    "tabla": "auditoria",
    "sqlite": "CREATE TRIGGER auditoria_sin_update BEFORE UPDATE ON auditoria BEGIN SELECT RAISE(ABORT, 'La bitacora de auditoria no se modifica'); END",
    "mysql": "CREATE TRIGGER auditoria_sin_update BEFORE UPDATE ON auditoria FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La bitacora de auditoria es inmutable'"
  },
  {
    "tipo": "trigger",
    "nombre": "auditoria_sin_delete",
    "tabla": "auditoria",
    "sqlite": "CREATE TRIGGER auditoria_sin_delete BEFORE DELETE ON auditoria BEGIN SELECT RAISE(ABORT, 'La bitacora de auditoria no se elimina'); END",
    "mysql": "CREATE TRIGGER auditoria_sin_delete BEFORE DELETE ON auditoria FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La bitacora de auditoria es inmutable'"
  },
  {
    "tipo": "tabla",
    "nombre": "intentos_acceso",
    "sqlite": "CREATE TABLE intentos_acceso (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        email VARCHAR(150) NOT NULL,\n        usuario_id INTEGER DEFAULT NULL,\n        ip VARCHAR(64) NOT NULL,\n        tipo VARCHAR(20) NOT NULL,\n        exito INTEGER NOT NULL DEFAULT 0,\n        fecha VARCHAR(40) NOT NULL\n      )",
    "mysql": "CREATE TABLE IF NOT EXISTS `intentos_acceso` (\n        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n        email VARCHAR(150) NOT NULL,\n        usuario_id INT DEFAULT NULL,\n        ip VARCHAR(64) NOT NULL,\n        tipo VARCHAR(20) NOT NULL,\n        exito INT NOT NULL DEFAULT 0,\n        fecha VARCHAR(40) NOT NULL\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "tabla",
    "nombre": "reautenticaciones",
    "sqlite": "CREATE TABLE reautenticaciones (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        token_hash VARCHAR(64) NOT NULL UNIQUE,\n        usuario_id INTEGER NOT NULL,\n        accion VARCHAR(60) NOT NULL,\n        creado_en VARCHAR(40) NOT NULL,\n        expira_en VARCHAR(40) NOT NULL,\n        usado_en VARCHAR(40) DEFAULT NULL\n      )",
    "mysql": "CREATE TABLE IF NOT EXISTS `reautenticaciones` (\n        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n        token_hash VARCHAR(64) NOT NULL UNIQUE,\n        usuario_id INT NOT NULL,\n        accion VARCHAR(60) NOT NULL,\n        creado_en VARCHAR(40) NOT NULL,\n        expira_en VARCHAR(40) NOT NULL,\n        usado_en VARCHAR(40) DEFAULT NULL\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "indice",
    "nombre": "idx_intentos_email",
    "tabla": "intentos_acceso",
    "columnas": [
      "email",
      "fecha"
    ],
    "unico": false
  },
  {
    "tipo": "indice",
    "nombre": "idx_intentos_ip",
    "tabla": "intentos_acceso",
    "columnas": [
      "ip",
      "fecha"
    ],
    "unico": false
  },
  {
    "tipo": "tabla",
    "nombre": "solicitudes_autorizacion",
    "sqlite": "CREATE TABLE solicitudes_autorizacion (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        tipo VARCHAR(40) NOT NULL,\n        modulo VARCHAR(30) NOT NULL,\n        entidad VARCHAR(60) NOT NULL,\n        entidad_id VARCHAR(40) NOT NULL,\n        referencia VARCHAR(160) DEFAULT NULL,\n        accion VARCHAR(40) NOT NULL,\n        datos_json TEXT,\n        motivo TEXT NOT NULL,\n        solicitado_por INTEGER NOT NULL,\n        solicitado_rol VARCHAR(120) DEFAULT NULL,\n        solicitado_en VARCHAR(40) NOT NULL,\n        estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',\n        resuelto_por INTEGER DEFAULT NULL,\n        resuelto_rol VARCHAR(120) DEFAULT NULL,\n        resuelto_en VARCHAR(40) DEFAULT NULL,\n        motivo_resolucion TEXT,\n        vence_en VARCHAR(40) NOT NULL\n      )",
    "mysql": "CREATE TABLE IF NOT EXISTS `solicitudes_autorizacion` (\n        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n        tipo VARCHAR(40) NOT NULL,\n        modulo VARCHAR(30) NOT NULL,\n        entidad VARCHAR(60) NOT NULL,\n        entidad_id VARCHAR(40) NOT NULL,\n        referencia VARCHAR(160) DEFAULT NULL,\n        accion VARCHAR(40) NOT NULL,\n        datos_json LONGTEXT,\n        motivo LONGTEXT NOT NULL,\n        solicitado_por INT NOT NULL,\n        solicitado_rol VARCHAR(120) DEFAULT NULL,\n        solicitado_en VARCHAR(40) NOT NULL,\n        estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',\n        resuelto_por INT DEFAULT NULL,\n        resuelto_rol VARCHAR(120) DEFAULT NULL,\n        resuelto_en VARCHAR(40) DEFAULT NULL,\n        motivo_resolucion LONGTEXT,\n        vence_en VARCHAR(40) NOT NULL\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "indice",
    "nombre": "idx_solicitudes_entidad",
    "tabla": "solicitudes_autorizacion",
    "columnas": [
      "entidad",
      "entidad_id",
      "estado"
    ],
    "unico": false
  },
  {
    "tipo": "indice",
    "nombre": "idx_solicitudes_estado",
    "tabla": "solicitudes_autorizacion",
    "columnas": [
      "estado",
      "vence_en"
    ],
    "unico": false
  },
  {
    "tipo": "tabla",
    "nombre": "autorizaciones_personal",
    "sqlite": "CREATE TABLE autorizaciones_personal (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        usuario_id INTEGER NOT NULL,\n        tipo VARCHAR(20) NOT NULL,\n        clave VARCHAR(60) NOT NULL,\n        vigente_desde VARCHAR(10) NOT NULL,\n        vigente_hasta VARCHAR(10) DEFAULT NULL,\n        folio_fx_thf_ap VARCHAR(80) DEFAULT NULL,\n        otorgada_por INTEGER DEFAULT NULL,\n        otorgada_rol VARCHAR(120) DEFAULT NULL,\n        otorgada_en VARCHAR(40) DEFAULT NULL,\n        motivo TEXT,\n        revocada_en VARCHAR(40) DEFAULT NULL,\n        revocada_por INTEGER DEFAULT NULL,\n        motivo_revocacion TEXT,\n        vencimiento_registrado_en VARCHAR(40) DEFAULT NULL\n      )",
    "mysql": "CREATE TABLE IF NOT EXISTS `autorizaciones_personal` (\n        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n        usuario_id INT NOT NULL,\n        tipo VARCHAR(20) NOT NULL,\n        clave VARCHAR(60) NOT NULL,\n        vigente_desde VARCHAR(10) NOT NULL,\n        vigente_hasta VARCHAR(10) DEFAULT NULL,\n        folio_fx_thf_ap VARCHAR(80) DEFAULT NULL,\n        otorgada_por INT DEFAULT NULL,\n        otorgada_rol VARCHAR(120) DEFAULT NULL,\n        otorgada_en VARCHAR(40) DEFAULT NULL,\n        motivo LONGTEXT,\n        revocada_en VARCHAR(40) DEFAULT NULL,\n        revocada_por INT DEFAULT NULL,\n        motivo_revocacion LONGTEXT,\n        vencimiento_registrado_en VARCHAR(40) DEFAULT NULL\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "indice",
    "nombre": "idx_autorizaciones_usuario",
    "tabla": "autorizaciones_personal",
    "columnas": [
      "usuario_id"
    ],
    "unico": false
  },
  {
    "tipo": "tabla",
    "nombre": "asignaciones_muestra",
    "sqlite": "CREATE TABLE asignaciones_muestra (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        recepcion_id INTEGER NOT NULL,\n        usuario_id INTEGER NOT NULL,\n        asignado_por INTEGER DEFAULT NULL,\n        asignado_en VARCHAR(40) NOT NULL,\n        motivo TEXT,\n        revocado_en VARCHAR(40) DEFAULT NULL,\n        revocado_por INTEGER DEFAULT NULL,\n        motivo_revocacion TEXT\n      )",
    "mysql": "CREATE TABLE IF NOT EXISTS `asignaciones_muestra` (\n        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n        recepcion_id INT NOT NULL,\n        usuario_id INT NOT NULL,\n        asignado_por INT DEFAULT NULL,\n        asignado_en VARCHAR(40) NOT NULL,\n        motivo LONGTEXT,\n        revocado_en VARCHAR(40) DEFAULT NULL,\n        revocado_por INT DEFAULT NULL,\n        motivo_revocacion LONGTEXT\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "indice",
    "nombre": "idx_asignaciones_recepcion",
    "tabla": "asignaciones_muestra",
    "columnas": [
      "recepcion_id"
    ],
    "unico": false
  },
  {
    "tipo": "indice",
    "nombre": "idx_asignaciones_usuario",
    "tabla": "asignaciones_muestra",
    "columnas": [
      "usuario_id"
    ],
    "unico": false
  },
  {
    "tipo": "tabla",
    "nombre": "envios_informe",
    "sqlite": "CREATE TABLE envios_informe (\n          id INTEGER PRIMARY KEY AUTOINCREMENT, informe_id INTEGER NOT NULL, version INTEGER NOT NULL,\n          destinatario_nombre VARCHAR(180) NOT NULL, destinatario_correo VARCHAR(180) NOT NULL, enviado_en VARCHAR(40) NOT NULL,\n          enviado_por INTEGER DEFAULT NULL, enviado_rol VARCHAR(120) DEFAULT NULL, medio VARCHAR(10) NOT NULL,\n          evidencia_archivo VARCHAR(200) DEFAULT NULL, evidencia_sha256 VARCHAR(64) DEFAULT NULL, message_id VARCHAR(250) DEFAULT NULL,\n          observaciones TEXT, confirmacion_en VARCHAR(40) DEFAULT NULL, confirmacion_nota TEXT, registrado_en VARCHAR(40) NOT NULL)",
    "mysql": "CREATE TABLE IF NOT EXISTS `envios_informe` (\n          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, informe_id INT NOT NULL, version INT NOT NULL,\n          destinatario_nombre VARCHAR(180) NOT NULL, destinatario_correo VARCHAR(180) NOT NULL, enviado_en VARCHAR(40) NOT NULL,\n          enviado_por INT DEFAULT NULL, enviado_rol VARCHAR(120) DEFAULT NULL, medio VARCHAR(10) NOT NULL,\n          evidencia_archivo VARCHAR(200) DEFAULT NULL, evidencia_sha256 VARCHAR(64) DEFAULT NULL, message_id VARCHAR(250) DEFAULT NULL,\n          observaciones LONGTEXT, confirmacion_en VARCHAR(40) DEFAULT NULL, confirmacion_nota LONGTEXT, registrado_en VARCHAR(40) NOT NULL\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "tabla",
    "nombre": "muestras_recepcion",
    "sqlite": "CREATE TABLE muestras_recepcion (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        folio_num INTEGER NOT NULL UNIQUE,\n        tipo_registro VARCHAR(2) NOT NULL DEFAULT 'R',\n        clave_revision VARCHAR(50) DEFAULT 'FX-TCF-GMR',\n        fecha_emision DATE DEFAULT NULL,\n        fecha_recepcion DATE DEFAULT NULL,\n        hora_recepcion VARCHAR(20) DEFAULT NULL,\n        recibido_por VARCHAR(150) DEFAULT NULL,\n        medio_recepcion VARCHAR(50) DEFAULT NULL,\n        solicitante VARCHAR(180) DEFAULT NULL,\n        muestra_unica INTEGER DEFAULT 0,\n        fecha_muestra DATE DEFAULT NULL,\n        id_interno VARCHAR(100) DEFAULT NULL,\n        especificaciones TEXT,\n        lote_muestras_json TEXT,\n        analisis_json TEXT,\n        inspeccion_json TEXT,\n        datos_solicitante_json TEXT,\n        datos_custodio_json TEXT,\n        decision_aceptacion VARCHAR(30) DEFAULT NULL,\n        aceptacion_json TEXT,\n        disposicion_json TEXT,\n        estado VARCHAR(30) NOT NULL DEFAULT 'registrada',\n        creado_por INTEGER DEFAULT NULL,\n        actualizado_por INTEGER DEFAULT NULL,\n        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n      , \"anulado_en\" VARCHAR(40) DEFAULT NULL, \"anulado_por\" INT DEFAULT NULL, \"motivo_anulacion\" TEXT, \"estado_previo\" VARCHAR(30) DEFAULT NULL, \"anulado_rol_id\" INT DEFAULT NULL, \"anulado_cargo\" VARCHAR(120) DEFAULT NULL, \"creado_rol_id\" INT DEFAULT NULL, \"creado_cargo\" VARCHAR(120) DEFAULT NULL, \"requiere_supervision\" INT NOT NULL DEFAULT 0, \"supervision_estado\" VARCHAR(20) DEFAULT NULL, \"supervisor_id\" INT DEFAULT NULL, \"supervision_solicitada_por\" INT DEFAULT NULL, \"supervision_solicitada_en\" VARCHAR(40) DEFAULT NULL, \"supervision_observaciones\" TEXT, \"supervisado_por\" INT DEFAULT NULL, \"supervisado_en\" VARCHAR(40) DEFAULT NULL, \"estado_antes_cierre\" VARCHAR(30) DEFAULT NULL, \"recibio_usuario_id\" INT DEFAULT NULL, \"recibio_cargo\" VARCHAR(120) DEFAULT NULL)",
    "mysql": "CREATE TABLE IF NOT EXISTS `muestras_recepcion` (\n        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n        folio_num INT NOT NULL UNIQUE,\n        tipo_registro VARCHAR(2) NOT NULL DEFAULT 'R',\n        clave_revision VARCHAR(50) DEFAULT 'FX-TCF-GMR',\n        fecha_emision DATE DEFAULT NULL,\n        fecha_recepcion DATE DEFAULT NULL,\n        hora_recepcion VARCHAR(20) DEFAULT NULL,\n        recibido_por VARCHAR(150) DEFAULT NULL,\n        medio_recepcion VARCHAR(50) DEFAULT NULL,\n        solicitante VARCHAR(180) DEFAULT NULL,\n        muestra_unica INT DEFAULT 0,\n        fecha_muestra DATE DEFAULT NULL,\n        id_interno VARCHAR(100) DEFAULT NULL,\n        especificaciones LONGTEXT,\n        lote_muestras_json LONGTEXT,\n        analisis_json LONGTEXT,\n        inspeccion_json LONGTEXT,\n        datos_solicitante_json LONGTEXT,\n        datos_custodio_json LONGTEXT,\n        decision_aceptacion VARCHAR(30) DEFAULT NULL,\n        aceptacion_json LONGTEXT,\n        disposicion_json LONGTEXT,\n        estado VARCHAR(30) NOT NULL DEFAULT 'registrada',\n        creado_por INT DEFAULT NULL,\n        actualizado_por INT DEFAULT NULL,\n        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n      , `anulado_en` VARCHAR(40) DEFAULT NULL, `anulado_por` INT DEFAULT NULL, `motivo_anulacion` LONGTEXT, `estado_previo` VARCHAR(30) DEFAULT NULL, `anulado_rol_id` INT DEFAULT NULL, `anulado_cargo` VARCHAR(120) DEFAULT NULL, `creado_rol_id` INT DEFAULT NULL, `creado_cargo` VARCHAR(120) DEFAULT NULL, `requiere_supervision` INT NOT NULL DEFAULT 0, `supervision_estado` VARCHAR(20) DEFAULT NULL, `supervisor_id` INT DEFAULT NULL, `supervision_solicitada_por` INT DEFAULT NULL, `supervision_solicitada_en` VARCHAR(40) DEFAULT NULL, `supervision_observaciones` LONGTEXT, `supervisado_por` INT DEFAULT NULL, `supervisado_en` VARCHAR(40) DEFAULT NULL, `estado_antes_cierre` VARCHAR(30) DEFAULT NULL, `recibio_usuario_id` INT DEFAULT NULL, `recibio_cargo` VARCHAR(120) DEFAULT NULL\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "tabla",
    "nombre": "muestras_procesamiento",
    "sqlite": "CREATE TABLE muestras_procesamiento (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        folio_num INTEGER NOT NULL UNIQUE,\n        tipo_registro VARCHAR(2) NOT NULL DEFAULT 'P',\n        clave_revision VARCHAR(50) DEFAULT 'FX-TCF-GMP',\n        fecha_emision DATE DEFAULT NULL,\n        fecha_procesamiento DATE DEFAULT NULL,\n        hora_procesamiento VARCHAR(20) DEFAULT NULL,\n        recepcion_id INTEGER DEFAULT NULL,\n        folio_recepcion_num INTEGER DEFAULT NULL,\n        muestra_tipo VARCHAR(20) DEFAULT NULL,\n        id_interno VARCHAR(100) DEFAULT NULL,\n        lote_seleccion_json TEXT,\n        tipo_organismo_json TEXT,\n        parte_organismo_json TEXT,\n        bivalvos_steps_json TEXT,\n        sardinas_steps_json TEXT,\n        otro_procesamiento TEXT,\n        resguardo_json TEXT,\n        observaciones_generales TEXT,\n        nombre_quien_proceso VARCHAR(180) DEFAULT NULL,\n        nombre_quien_superviso VARCHAR(180) DEFAULT NULL,\n        firma_quien_proceso TEXT,\n        firma_quien_superviso TEXT,\n        estado VARCHAR(30) NOT NULL DEFAULT 'registrada',\n        creado_por INTEGER DEFAULT NULL,\n        actualizado_por INTEGER DEFAULT NULL,\n        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n      , \"uso_inventario_json\" TEXT DEFAULT NULL, \"tipo_organismo_otro\" VARCHAR(180) DEFAULT NULL, \"parte_organismo_otro\" VARCHAR(180) DEFAULT NULL, \"anulado_en\" VARCHAR(40) DEFAULT NULL, \"anulado_por\" INT DEFAULT NULL, \"motivo_anulacion\" TEXT, \"estado_previo\" VARCHAR(30) DEFAULT NULL, \"anulado_rol_id\" INT DEFAULT NULL, \"anulado_cargo\" VARCHAR(120) DEFAULT NULL, \"creado_rol_id\" INT DEFAULT NULL, \"creado_cargo\" VARCHAR(120) DEFAULT NULL, \"requiere_supervision\" INT NOT NULL DEFAULT 0, \"supervision_estado\" VARCHAR(20) DEFAULT NULL, \"supervisor_id\" INT DEFAULT NULL, \"supervision_solicitada_por\" INT DEFAULT NULL, \"supervision_solicitada_en\" VARCHAR(40) DEFAULT NULL, \"supervision_observaciones\" TEXT, \"supervisado_por\" INT DEFAULT NULL, \"supervisado_en\" VARCHAR(40) DEFAULT NULL, \"proceso_usuario_id\" INT DEFAULT NULL, \"proceso_cargo\" VARCHAR(120) DEFAULT NULL, \"superviso_usuario_id\" INT DEFAULT NULL, \"superviso_cargo\" VARCHAR(120) DEFAULT NULL)",
    "mysql": "CREATE TABLE IF NOT EXISTS `muestras_procesamiento` (\n        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n        folio_num INT NOT NULL UNIQUE,\n        tipo_registro VARCHAR(2) NOT NULL DEFAULT 'P',\n        clave_revision VARCHAR(50) DEFAULT 'FX-TCF-GMP',\n        fecha_emision DATE DEFAULT NULL,\n        fecha_procesamiento DATE DEFAULT NULL,\n        hora_procesamiento VARCHAR(20) DEFAULT NULL,\n        recepcion_id INT DEFAULT NULL,\n        folio_recepcion_num INT DEFAULT NULL,\n        muestra_tipo VARCHAR(20) DEFAULT NULL,\n        id_interno VARCHAR(100) DEFAULT NULL,\n        lote_seleccion_json LONGTEXT,\n        tipo_organismo_json LONGTEXT,\n        parte_organismo_json LONGTEXT,\n        bivalvos_steps_json LONGTEXT,\n        sardinas_steps_json LONGTEXT,\n        otro_procesamiento LONGTEXT,\n        resguardo_json LONGTEXT,\n        observaciones_generales LONGTEXT,\n        nombre_quien_proceso VARCHAR(180) DEFAULT NULL,\n        nombre_quien_superviso VARCHAR(180) DEFAULT NULL,\n        firma_quien_proceso LONGTEXT,\n        firma_quien_superviso LONGTEXT,\n        estado VARCHAR(30) NOT NULL DEFAULT 'registrada',\n        creado_por INT DEFAULT NULL,\n        actualizado_por INT DEFAULT NULL,\n        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n      , `uso_inventario_json` LONGTEXT DEFAULT NULL, `tipo_organismo_otro` VARCHAR(180) DEFAULT NULL, `parte_organismo_otro` VARCHAR(180) DEFAULT NULL, `anulado_en` VARCHAR(40) DEFAULT NULL, `anulado_por` INT DEFAULT NULL, `motivo_anulacion` LONGTEXT, `estado_previo` VARCHAR(30) DEFAULT NULL, `anulado_rol_id` INT DEFAULT NULL, `anulado_cargo` VARCHAR(120) DEFAULT NULL, `creado_rol_id` INT DEFAULT NULL, `creado_cargo` VARCHAR(120) DEFAULT NULL, `requiere_supervision` INT NOT NULL DEFAULT 0, `supervision_estado` VARCHAR(20) DEFAULT NULL, `supervisor_id` INT DEFAULT NULL, `supervision_solicitada_por` INT DEFAULT NULL, `supervision_solicitada_en` VARCHAR(40) DEFAULT NULL, `supervision_observaciones` LONGTEXT, `supervisado_por` INT DEFAULT NULL, `supervisado_en` VARCHAR(40) DEFAULT NULL, `proceso_usuario_id` INT DEFAULT NULL, `proceso_cargo` VARCHAR(120) DEFAULT NULL, `superviso_usuario_id` INT DEFAULT NULL, `superviso_cargo` VARCHAR(120) DEFAULT NULL\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "tabla",
    "nombre": "muestras_extraccion",
    "sqlite": "CREATE TABLE muestras_extraccion (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  folio_num INTEGER NOT NULL,\n  tipo_registro VARCHAR(4) NOT NULL DEFAULT 'E-A',\n  clave_revision VARCHAR(50) DEFAULT 'FX-TCF-GME-A',\n  fecha_emision DATE DEFAULT NULL,\n  fecha_extraccion DATE DEFAULT NULL,\n  hora_extraccion VARCHAR(20) DEFAULT NULL,\n  procesamiento_id INTEGER DEFAULT NULL,\n  folio_procesamiento_num INTEGER DEFAULT NULL,\n  muestra_tipo VARCHAR(20) DEFAULT NULL,\n  id_interno VARCHAR(100) DEFAULT NULL,\n  tipo_molienda VARCHAR(20) DEFAULT NULL,\n  pasos_json TEXT,\n  registro_pesos_json TEXT,\n  equipos_json TEXT,\n  uso_inventario_json TEXT DEFAULT NULL,\n  observaciones_generales TEXT,\n  nombre_quien_extrajo VARCHAR(180) DEFAULT NULL,\n  nombre_quien_limpieza VARCHAR(180) DEFAULT NULL,\n  nombre_quien_superviso VARCHAR(180) DEFAULT NULL,\n  firma_quien_extrajo TEXT,\n  firma_quien_limpieza TEXT,\n  firma_quien_superviso TEXT,\n  estado VARCHAR(30) NOT NULL DEFAULT 'registrada',\n  creado_por INTEGER DEFAULT NULL,\n  actualizado_por INTEGER DEFAULT NULL,\n  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n  anulado_en VARCHAR(40) DEFAULT NULL,\n  anulado_por INTEGER DEFAULT NULL,\n  motivo_anulacion TEXT,\n  estado_previo VARCHAR(30) DEFAULT NULL, \"anulado_rol_id\" INT DEFAULT NULL, \"anulado_cargo\" VARCHAR(120) DEFAULT NULL, \"creado_rol_id\" INT DEFAULT NULL, \"creado_cargo\" VARCHAR(120) DEFAULT NULL, \"requiere_supervision\" INT NOT NULL DEFAULT 0, \"supervision_estado\" VARCHAR(20) DEFAULT NULL, \"supervisor_id\" INT DEFAULT NULL, \"supervision_solicitada_por\" INT DEFAULT NULL, \"supervision_solicitada_en\" VARCHAR(40) DEFAULT NULL, \"supervision_observaciones\" TEXT, \"supervisado_por\" INT DEFAULT NULL, \"supervisado_en\" VARCHAR(40) DEFAULT NULL, \"extrajo_usuario_id\" INT DEFAULT NULL, \"extrajo_cargo\" VARCHAR(120) DEFAULT NULL, \"limpio_usuario_id\" INT DEFAULT NULL, \"limpio_cargo\" VARCHAR(120) DEFAULT NULL, \"superviso_usuario_id\" INT DEFAULT NULL, \"superviso_cargo\" VARCHAR(120) DEFAULT NULL,\n  UNIQUE (tipo_registro, folio_num)\n)",
    "mysql": "CREATE TABLE IF NOT EXISTS `muestras_extraccion` (\n  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n  folio_num INT NOT NULL,\n  tipo_registro VARCHAR(4) NOT NULL DEFAULT 'E-A',\n  clave_revision VARCHAR(50) DEFAULT 'FX-TCF-GME-A',\n  fecha_emision DATE DEFAULT NULL,\n  fecha_extraccion DATE DEFAULT NULL,\n  hora_extraccion VARCHAR(20) DEFAULT NULL,\n  procesamiento_id INT DEFAULT NULL,\n  folio_procesamiento_num INT DEFAULT NULL,\n  muestra_tipo VARCHAR(20) DEFAULT NULL,\n  id_interno VARCHAR(100) DEFAULT NULL,\n  tipo_molienda VARCHAR(20) DEFAULT NULL,\n  pasos_json LONGTEXT,\n  registro_pesos_json LONGTEXT,\n  equipos_json LONGTEXT,\n  uso_inventario_json LONGTEXT DEFAULT NULL,\n  observaciones_generales LONGTEXT,\n  nombre_quien_extrajo VARCHAR(180) DEFAULT NULL,\n  nombre_quien_limpieza VARCHAR(180) DEFAULT NULL,\n  nombre_quien_superviso VARCHAR(180) DEFAULT NULL,\n  firma_quien_extrajo LONGTEXT,\n  firma_quien_limpieza LONGTEXT,\n  firma_quien_superviso LONGTEXT,\n  estado VARCHAR(30) NOT NULL DEFAULT 'registrada',\n  creado_por INT DEFAULT NULL,\n  actualizado_por INT DEFAULT NULL,\n  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n  anulado_en VARCHAR(40) DEFAULT NULL,\n  anulado_por INT DEFAULT NULL,\n  motivo_anulacion LONGTEXT,\n  estado_previo VARCHAR(30) DEFAULT NULL, `anulado_rol_id` INT DEFAULT NULL, `anulado_cargo` VARCHAR(120) DEFAULT NULL, `creado_rol_id` INT DEFAULT NULL, `creado_cargo` VARCHAR(120) DEFAULT NULL, `requiere_supervision` INT NOT NULL DEFAULT 0, `supervision_estado` VARCHAR(20) DEFAULT NULL, `supervisor_id` INT DEFAULT NULL, `supervision_solicitada_por` INT DEFAULT NULL, `supervision_solicitada_en` VARCHAR(40) DEFAULT NULL, `supervision_observaciones` LONGTEXT, `supervisado_por` INT DEFAULT NULL, `supervisado_en` VARCHAR(40) DEFAULT NULL, `extrajo_usuario_id` INT DEFAULT NULL, `extrajo_cargo` VARCHAR(120) DEFAULT NULL, `limpio_usuario_id` INT DEFAULT NULL, `limpio_cargo` VARCHAR(120) DEFAULT NULL, `superviso_usuario_id` INT DEFAULT NULL, `superviso_cargo` VARCHAR(120) DEFAULT NULL,\n  UNIQUE (tipo_registro, folio_num)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "tabla",
    "nombre": "muestras_analisis",
    "sqlite": "CREATE TABLE \"muestras_analisis\" (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        folio_num INTEGER NOT NULL,\n        tipo_registro VARCHAR(2) NOT NULL DEFAULT 'A',\n        tipo_analisis VARCHAR(40) NOT NULL,\n        metodo VARCHAR(40) NOT NULL,\n        metodo_otro VARCHAR(160) DEFAULT NULL,\n        metodo_referencia VARCHAR(160) DEFAULT NULL,\n        metodo_documento_id INTEGER DEFAULT NULL,\n        recepcion_id INTEGER DEFAULT NULL,\n        procesamiento_id INTEGER DEFAULT NULL,\n        extraccion_id INTEGER DEFAULT NULL,\n        fecha_analisis DATE DEFAULT NULL,\n        hora_inicio VARCHAR(20) DEFAULT NULL,\n        hora_fin VARCHAR(20) DEFAULT NULL,\n        equipo_id INTEGER DEFAULT NULL,\n        equipo_nombre VARCHAR(150) DEFAULT NULL,\n        equipo_clave_bitacora VARCHAR(60) DEFAULT NULL,\n        equipo_folio_bitacora VARCHAR(60) DEFAULT NULL,\n        condiciones_json TEXT,\n        resultados_json TEXT,\n        controles_json TEXT,\n        uso_inventario_json TEXT,\n        observaciones TEXT,\n        analista_nombre VARCHAR(180) DEFAULT NULL,\n        analista_firma TEXT,\n        revisado_por INTEGER DEFAULT NULL,\n        revisado_nombre VARCHAR(180) DEFAULT NULL,\n        revisado_en VARCHAR(40) DEFAULT NULL,\n        revisado_firma TEXT,\n        revision_observaciones TEXT,\n        aprobado_por INTEGER DEFAULT NULL,\n        aprobado_nombre VARCHAR(180) DEFAULT NULL,\n        aprobado_en VARCHAR(40) DEFAULT NULL,\n        aprobado_firma TEXT,\n        estado VARCHAR(30) NOT NULL DEFAULT 'registrado',\n        creado_por INTEGER DEFAULT NULL,\n        actualizado_por INTEGER DEFAULT NULL,\n        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n      , \"anulado_en\" VARCHAR(40) DEFAULT NULL, \"anulado_por\" INT DEFAULT NULL, \"motivo_anulacion\" TEXT, \"estado_previo\" VARCHAR(30) DEFAULT NULL, \"anulado_rol_id\" INT DEFAULT NULL, \"anulado_cargo\" VARCHAR(120) DEFAULT NULL, \"creado_rol_id\" INT DEFAULT NULL, \"creado_cargo\" VARCHAR(120) DEFAULT NULL, \"revisado_rol_id\" INT DEFAULT NULL, \"revisado_cargo\" VARCHAR(120) DEFAULT NULL, \"aprobado_rol_id\" INT DEFAULT NULL, \"aprobado_cargo\" VARCHAR(120) DEFAULT NULL, \"requiere_supervision\" INT NOT NULL DEFAULT 0, \"supervision_estado\" VARCHAR(20) DEFAULT NULL, \"supervisor_id\" INT DEFAULT NULL, \"supervision_solicitada_por\" INT DEFAULT NULL, \"supervision_solicitada_en\" VARCHAR(40) DEFAULT NULL, \"supervision_observaciones\" TEXT, \"supervisado_por\" INT DEFAULT NULL, \"supervisado_en\" VARCHAR(40) DEFAULT NULL, \"excepciones_json\" TEXT, \"version\" INT NOT NULL DEFAULT 1, \"sustituye_a\" INT DEFAULT NULL, \"motivo_enmienda\" TEXT, \"enviado_revision_por\" INT DEFAULT NULL, \"enviado_revision_en\" VARCHAR(40) DEFAULT NULL, \"devolucion_observaciones\" TEXT, \"analista_usuario_id\" INT DEFAULT NULL, \"analista_cargo\" VARCHAR(120) DEFAULT NULL, UNIQUE (folio_num, version))",
    "mysql": "CREATE TABLE IF NOT EXISTS `muestras_analisis` (\n        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n        folio_num INT NOT NULL,\n        tipo_registro VARCHAR(2) NOT NULL DEFAULT 'A',\n        tipo_analisis VARCHAR(40) NOT NULL,\n        metodo VARCHAR(40) NOT NULL,\n        metodo_otro VARCHAR(160) DEFAULT NULL,\n        metodo_referencia VARCHAR(160) DEFAULT NULL,\n        metodo_documento_id INT DEFAULT NULL,\n        recepcion_id INT DEFAULT NULL,\n        procesamiento_id INT DEFAULT NULL,\n        extraccion_id INT DEFAULT NULL,\n        fecha_analisis DATE DEFAULT NULL,\n        hora_inicio VARCHAR(20) DEFAULT NULL,\n        hora_fin VARCHAR(20) DEFAULT NULL,\n        equipo_id INT DEFAULT NULL,\n        equipo_nombre VARCHAR(150) DEFAULT NULL,\n        equipo_clave_bitacora VARCHAR(60) DEFAULT NULL,\n        equipo_folio_bitacora VARCHAR(60) DEFAULT NULL,\n        condiciones_json LONGTEXT,\n        resultados_json LONGTEXT,\n        controles_json LONGTEXT,\n        uso_inventario_json LONGTEXT,\n        observaciones LONGTEXT,\n        analista_nombre VARCHAR(180) DEFAULT NULL,\n        analista_firma LONGTEXT,\n        revisado_por INT DEFAULT NULL,\n        revisado_nombre VARCHAR(180) DEFAULT NULL,\n        revisado_en VARCHAR(40) DEFAULT NULL,\n        revisado_firma LONGTEXT,\n        revision_observaciones LONGTEXT,\n        aprobado_por INT DEFAULT NULL,\n        aprobado_nombre VARCHAR(180) DEFAULT NULL,\n        aprobado_en VARCHAR(40) DEFAULT NULL,\n        aprobado_firma LONGTEXT,\n        estado VARCHAR(30) NOT NULL DEFAULT 'registrado',\n        creado_por INT DEFAULT NULL,\n        actualizado_por INT DEFAULT NULL,\n        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n      , `anulado_en` VARCHAR(40) DEFAULT NULL, `anulado_por` INT DEFAULT NULL, `motivo_anulacion` LONGTEXT, `estado_previo` VARCHAR(30) DEFAULT NULL, `anulado_rol_id` INT DEFAULT NULL, `anulado_cargo` VARCHAR(120) DEFAULT NULL, `creado_rol_id` INT DEFAULT NULL, `creado_cargo` VARCHAR(120) DEFAULT NULL, `revisado_rol_id` INT DEFAULT NULL, `revisado_cargo` VARCHAR(120) DEFAULT NULL, `aprobado_rol_id` INT DEFAULT NULL, `aprobado_cargo` VARCHAR(120) DEFAULT NULL, `requiere_supervision` INT NOT NULL DEFAULT 0, `supervision_estado` VARCHAR(20) DEFAULT NULL, `supervisor_id` INT DEFAULT NULL, `supervision_solicitada_por` INT DEFAULT NULL, `supervision_solicitada_en` VARCHAR(40) DEFAULT NULL, `supervision_observaciones` LONGTEXT, `supervisado_por` INT DEFAULT NULL, `supervisado_en` VARCHAR(40) DEFAULT NULL, `excepciones_json` LONGTEXT, `version` INT NOT NULL DEFAULT 1, `sustituye_a` INT DEFAULT NULL, `motivo_enmienda` LONGTEXT, `enviado_revision_por` INT DEFAULT NULL, `enviado_revision_en` VARCHAR(40) DEFAULT NULL, `devolucion_observaciones` LONGTEXT, `analista_usuario_id` INT DEFAULT NULL, `analista_cargo` VARCHAR(120) DEFAULT NULL, UNIQUE (folio_num, version)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "tabla",
    "nombre": "informes",
    "sqlite": "CREATE TABLE informes (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        folio_num INTEGER NOT NULL,\n        version INTEGER NOT NULL DEFAULT 1,\n        clave_revision VARCHAR(50) DEFAULT 'FX-TCF-IR',\n        recepcion_id INTEGER NOT NULL,\n        sustituye_a INTEGER DEFAULT NULL,\n        motivo_enmienda TEXT,\n        cliente_json TEXT,\n        muestras_json TEXT,\n        analisis_ids_json TEXT,\n        resultados_json TEXT,\n        declaraciones_json TEXT,\n        fecha_emision DATE DEFAULT NULL,\n        elaborado_por INTEGER DEFAULT NULL,\n        elaborado_nombre VARCHAR(180) DEFAULT NULL,\n        elaborado_cargo VARCHAR(120) DEFAULT NULL,\n        elaborado_firma TEXT,\n        revisado_por INTEGER DEFAULT NULL,\n        revisado_nombre VARCHAR(180) DEFAULT NULL,\n        revisado_cargo VARCHAR(120) DEFAULT NULL,\n        revisado_en VARCHAR(40) DEFAULT NULL,\n        revisado_firma TEXT,\n        autorizado_por INTEGER DEFAULT NULL,\n        autorizado_nombre VARCHAR(180) DEFAULT NULL,\n        autorizado_cargo VARCHAR(120) DEFAULT NULL,\n        autorizado_en VARCHAR(40) DEFAULT NULL,\n        autorizado_firma TEXT,\n        entrega_json TEXT,\n        archivo_pdf VARCHAR(255) DEFAULT NULL,\n        pdf_sha256 VARCHAR(64) DEFAULT NULL,\n        observaciones TEXT,\n        estado VARCHAR(30) NOT NULL DEFAULT 'borrador',\n        creado_por INTEGER DEFAULT NULL,\n        actualizado_por INTEGER DEFAULT NULL,\n        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP, \"elaborado_rol_id\" INT DEFAULT NULL, \"revisado_rol_id\" INT DEFAULT NULL, \"autorizado_rol_id\" INT DEFAULT NULL, \"anulado_en\" VARCHAR(40) DEFAULT NULL, \"anulado_por\" INT DEFAULT NULL, \"motivo_anulacion\" TEXT, \"estado_previo\" VARCHAR(30) DEFAULT NULL, \"anulado_rol_id\" INT DEFAULT NULL, \"anulado_cargo\" VARCHAR(120) DEFAULT NULL, \"requiere_supervision\" INT NOT NULL DEFAULT 0, \"supervision_estado\" VARCHAR(20) DEFAULT NULL, \"supervisor_id\" INT DEFAULT NULL, \"supervision_solicitada_por\" INT DEFAULT NULL, \"supervision_solicitada_en\" VARCHAR(40) DEFAULT NULL, \"supervision_observaciones\" TEXT, \"supervisado_por\" INT DEFAULT NULL, \"supervisado_en\" VARCHAR(40) DEFAULT NULL, \"excepciones_json\" TEXT, \"liberado_por\" INT DEFAULT NULL, \"liberado_nombre\" VARCHAR(180) DEFAULT NULL, \"liberado_cargo\" VARCHAR(120) DEFAULT NULL, \"liberado_rol_id\" INT DEFAULT NULL, \"liberado_en\" VARCHAR(40) DEFAULT NULL, \"requiere_enmienda\" INT NOT NULL DEFAULT 0, \"requiere_enmienda_motivo\" TEXT,\n        UNIQUE (folio_num, version)\n      )",
    "mysql": "CREATE TABLE IF NOT EXISTS `informes` (\n        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n        folio_num INT NOT NULL,\n        version INT NOT NULL DEFAULT 1,\n        clave_revision VARCHAR(50) DEFAULT 'FX-TCF-IR',\n        recepcion_id INT NOT NULL,\n        sustituye_a INT DEFAULT NULL,\n        motivo_enmienda LONGTEXT,\n        cliente_json LONGTEXT,\n        muestras_json LONGTEXT,\n        analisis_ids_json LONGTEXT,\n        resultados_json LONGTEXT,\n        declaraciones_json LONGTEXT,\n        fecha_emision DATE DEFAULT NULL,\n        elaborado_por INT DEFAULT NULL,\n        elaborado_nombre VARCHAR(180) DEFAULT NULL,\n        elaborado_cargo VARCHAR(120) DEFAULT NULL,\n        elaborado_firma LONGTEXT,\n        revisado_por INT DEFAULT NULL,\n        revisado_nombre VARCHAR(180) DEFAULT NULL,\n        revisado_cargo VARCHAR(120) DEFAULT NULL,\n        revisado_en VARCHAR(40) DEFAULT NULL,\n        revisado_firma LONGTEXT,\n        autorizado_por INT DEFAULT NULL,\n        autorizado_nombre VARCHAR(180) DEFAULT NULL,\n        autorizado_cargo VARCHAR(120) DEFAULT NULL,\n        autorizado_en VARCHAR(40) DEFAULT NULL,\n        autorizado_firma LONGTEXT,\n        entrega_json LONGTEXT,\n        archivo_pdf VARCHAR(255) DEFAULT NULL,\n        pdf_sha256 VARCHAR(64) DEFAULT NULL,\n        observaciones LONGTEXT,\n        estado VARCHAR(30) NOT NULL DEFAULT 'borrador',\n        creado_por INT DEFAULT NULL,\n        actualizado_por INT DEFAULT NULL,\n        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP, `elaborado_rol_id` INT DEFAULT NULL, `revisado_rol_id` INT DEFAULT NULL, `autorizado_rol_id` INT DEFAULT NULL, `anulado_en` VARCHAR(40) DEFAULT NULL, `anulado_por` INT DEFAULT NULL, `motivo_anulacion` LONGTEXT, `estado_previo` VARCHAR(30) DEFAULT NULL, `anulado_rol_id` INT DEFAULT NULL, `anulado_cargo` VARCHAR(120) DEFAULT NULL, `requiere_supervision` INT NOT NULL DEFAULT 0, `supervision_estado` VARCHAR(20) DEFAULT NULL, `supervisor_id` INT DEFAULT NULL, `supervision_solicitada_por` INT DEFAULT NULL, `supervision_solicitada_en` VARCHAR(40) DEFAULT NULL, `supervision_observaciones` LONGTEXT, `supervisado_por` INT DEFAULT NULL, `supervisado_en` VARCHAR(40) DEFAULT NULL, `excepciones_json` LONGTEXT, `liberado_por` INT DEFAULT NULL, `liberado_nombre` VARCHAR(180) DEFAULT NULL, `liberado_cargo` VARCHAR(120) DEFAULT NULL, `liberado_rol_id` INT DEFAULT NULL, `liberado_en` VARCHAR(40) DEFAULT NULL, `requiere_enmienda` INT NOT NULL DEFAULT 0, `requiere_enmienda_motivo` LONGTEXT,\n        UNIQUE (folio_num, version)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "tabla",
    "nombre": "documentos_sgc",
    "sqlite": "CREATE TABLE documentos_sgc (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        clave VARCHAR(40) NOT NULL,\n        revision INTEGER NOT NULL DEFAULT 1,\n        titulo VARCHAR(220) NOT NULL,\n        tipo VARCHAR(2) NOT NULL,\n        area VARCHAR(4) NOT NULL,\n        es_externo INTEGER NOT NULL DEFAULT 0,\n        origen_externo VARCHAR(180) DEFAULT NULL,\n        descripcion TEXT,\n        cambios TEXT,\n        fecha_emision DATE DEFAULT NULL,\n        fecha_vigencia DATE DEFAULT NULL,\n        fecha_proxima_revision DATE DEFAULT NULL,\n        elaboro_json TEXT,\n        reviso_json TEXT,\n        aprobo_json TEXT,\n        distribucion TEXT,\n        archivo_nombre VARCHAR(255) DEFAULT NULL,\n        archivo_original VARCHAR(255) DEFAULT NULL,\n        archivo_sha256 VARCHAR(64) DEFAULT NULL,\n        reemplaza_id INTEGER DEFAULT NULL,\n        estado VARCHAR(20) NOT NULL DEFAULT 'borrador',\n        motivo_estado TEXT,\n        creado_por INTEGER DEFAULT NULL,\n        actualizado_por INTEGER DEFAULT NULL,\n        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP, \"excepciones_json\" TEXT, \"requiere_revision_tecnica\" INT NOT NULL DEFAULT 0, \"revision_tecnica_json\" TEXT, \"publico_json\" TEXT, \"asignado_a\" INT DEFAULT NULL, \"devolucion_observaciones\" TEXT,\n        UNIQUE (clave, revision)\n      )",
    "mysql": "CREATE TABLE IF NOT EXISTS `documentos_sgc` (\n        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n        clave VARCHAR(40) NOT NULL,\n        revision INT NOT NULL DEFAULT 1,\n        titulo VARCHAR(220) NOT NULL,\n        tipo VARCHAR(2) NOT NULL,\n        area VARCHAR(4) NOT NULL,\n        es_externo INT NOT NULL DEFAULT 0,\n        origen_externo VARCHAR(180) DEFAULT NULL,\n        descripcion LONGTEXT,\n        cambios LONGTEXT,\n        fecha_emision DATE DEFAULT NULL,\n        fecha_vigencia DATE DEFAULT NULL,\n        fecha_proxima_revision DATE DEFAULT NULL,\n        elaboro_json LONGTEXT,\n        reviso_json LONGTEXT,\n        aprobo_json LONGTEXT,\n        distribucion LONGTEXT,\n        archivo_nombre VARCHAR(255) DEFAULT NULL,\n        archivo_original VARCHAR(255) DEFAULT NULL,\n        archivo_sha256 VARCHAR(64) DEFAULT NULL,\n        reemplaza_id INT DEFAULT NULL,\n        estado VARCHAR(20) NOT NULL DEFAULT 'borrador',\n        motivo_estado LONGTEXT,\n        creado_por INT DEFAULT NULL,\n        actualizado_por INT DEFAULT NULL,\n        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP, `excepciones_json` LONGTEXT, `requiere_revision_tecnica` INT NOT NULL DEFAULT 0, `revision_tecnica_json` LONGTEXT, `publico_json` LONGTEXT, `asignado_a` INT DEFAULT NULL, `devolucion_observaciones` LONGTEXT,\n        UNIQUE (clave, revision)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "tabla",
    "nombre": "distribucion_documento",
    "sqlite": "CREATE TABLE distribucion_documento (id INTEGER PRIMARY KEY AUTOINCREMENT, documento_id INT NOT NULL, usuario_id INT NOT NULL, distribuido_por INT DEFAULT NULL, distribuido_en VARCHAR(40) NOT NULL, leido_en VARCHAR(40) DEFAULT NULL)",
    "mysql": "CREATE TABLE IF NOT EXISTS `distribucion_documento` (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, documento_id INT NOT NULL, usuario_id INT NOT NULL, distribuido_por INT DEFAULT NULL, distribuido_en VARCHAR(40) NOT NULL, leido_en VARCHAR(40) DEFAULT NULL\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "tabla",
    "nombre": "propuestas_documento",
    "sqlite": "CREATE TABLE propuestas_documento (id INTEGER PRIMARY KEY AUTOINCREMENT, tipo VARCHAR(10) NOT NULL, documento_id INT DEFAULT NULL, titulo VARCHAR(220) NOT NULL, motivo TEXT, propuesto_por INT DEFAULT NULL, propuesto_en VARCHAR(40) NOT NULL,\n      estado VARCHAR(12) NOT NULL DEFAULT 'pendiente', resuelto_por INT DEFAULT NULL, resuelto_en VARCHAR(40) DEFAULT NULL, motivo_resolucion TEXT, asignado_a INT DEFAULT NULL, documento_creado_id INT DEFAULT NULL)",
    "mysql": "CREATE TABLE IF NOT EXISTS `propuestas_documento` (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, tipo VARCHAR(10) NOT NULL, documento_id INT DEFAULT NULL, titulo VARCHAR(220) NOT NULL, motivo LONGTEXT, propuesto_por INT DEFAULT NULL, propuesto_en VARCHAR(40) NOT NULL,\n      estado VARCHAR(12) NOT NULL DEFAULT 'pendiente', resuelto_por INT DEFAULT NULL, resuelto_en VARCHAR(40) DEFAULT NULL, motivo_resolucion LONGTEXT, asignado_a INT DEFAULT NULL, documento_creado_id INT DEFAULT NULL\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "tabla",
    "nombre": "reportes_mantenimiento",
    "sqlite": "CREATE TABLE reportes_mantenimiento (\n          id INTEGER PRIMARY KEY AUTOINCREMENT,\n          codigo VARCHAR(50) NOT NULL UNIQUE,\n          id_mantenimiento INTEGER NOT NULL,\n          version VARCHAR(20) NOT NULL,\n          estado VARCHAR(40) DEFAULT 'borrador',\n          id_responsable INTEGER DEFAULT NULL,\n          fecha_reporte DATE NOT NULL,\n          archivo_url TEXT,\n          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n      )",
    "mysql": "CREATE TABLE IF NOT EXISTS `reportes_mantenimiento` (\n          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n          codigo VARCHAR(50) NOT NULL UNIQUE,\n          id_mantenimiento INT NOT NULL,\n          version VARCHAR(20) NOT NULL,\n          estado VARCHAR(40) DEFAULT 'borrador',\n          id_responsable INT DEFAULT NULL,\n          fecha_reporte DATE NOT NULL,\n          archivo_url LONGTEXT,\n          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "tabla",
    "nombre": "reactivos",
    "sqlite": "CREATE TABLE reactivos (\n          id INTEGER PRIMARY KEY AUTOINCREMENT,\n          nombre VARCHAR(180) DEFAULT NULL,\n          numero_cas VARCHAR(120) DEFAULT NULL,\n          categoria VARCHAR(120) DEFAULT NULL,\n          cantidad_actual REAL DEFAULT 0,\n          unidad VARCHAR(40) DEFAULT NULL,\n          ubicacion VARCHAR(180) DEFAULT NULL,\n          fecha_vencimiento DATE DEFAULT NULL,\n          stock_minimo REAL DEFAULT 0\n      , \"tipo_reactivo\" VARCHAR(80) DEFAULT NULL, \"id_reactivo\" VARCHAR(120) DEFAULT NULL, \"codigo_interno\" VARCHAR(120) DEFAULT NULL, \"producto\" VARCHAR(180) DEFAULT NULL, \"marca\" VARCHAR(120) DEFAULT NULL, \"proveedor\" VARCHAR(180) DEFAULT NULL, \"catalogo\" VARCHAR(120) DEFAULT NULL, \"numero_parte\" VARCHAR(120) DEFAULT NULL, \"cas\" VARCHAR(120) DEFAULT NULL, \"catalogo_parte_cas_lote\" VARCHAR(180) DEFAULT NULL, \"localizacion\" VARCHAR(180) DEFAULT NULL, \"sub_localizacion\" VARCHAR(180) DEFAULT NULL, \"caducidad\" DATE DEFAULT NULL, \"fecha_apertura\" DATE DEFAULT NULL, \"fecha_ingreso\" DATE DEFAULT NULL, \"fecha_preparacion\" DATE DEFAULT NULL, \"contenedor\" VARCHAR(120) DEFAULT NULL, \"capacidad_litros\" REAL DEFAULT NULL, \"capacidad_kilos\" REAL DEFAULT NULL, \"capacidad\" REAL DEFAULT NULL, \"unidad_capacidad\" VARCHAR(40) DEFAULT NULL, \"piezas\" INT DEFAULT NULL, \"total_litros_2025\" REAL DEFAULT NULL, \"cantidad_total\" REAL DEFAULT NULL, \"unidad_total\" VARCHAR(40) DEFAULT NULL, \"restante_190126\" REAL DEFAULT NULL, \"restante\" REAL DEFAULT NULL, \"lote\" VARCHAR(120) DEFAULT NULL, \"parte\" VARCHAR(120) DEFAULT NULL, \"serie\" VARCHAR(120) DEFAULT NULL, \"descripcion\" TEXT, \"nuevo_usado\" VARCHAR(30) DEFAULT NULL, \"estado\" VARCHAR(80) DEFAULT NULL, \"metodo\" VARCHAR(120) DEFAULT NULL, \"observaciones\" TEXT, \"item_name\" VARCHAR(180) DEFAULT NULL, \"informacion_extra\" TEXT, \"nombre_crm\" VARCHAR(180) DEFAULT NULL, \"lot_number\" VARCHAR(120) DEFAULT NULL, \"url\" VARCHAR(255) DEFAULT NULL, \"estado_reactivo\" VARCHAR(40) DEFAULT NULL, \"volumen\" VARCHAR(80) DEFAULT NULL, \"vendor\" VARCHAR(180) DEFAULT NULL, \"amount_in_stock\" REAL DEFAULT NULL, \"expiration_date\" DATE DEFAULT NULL, \"cas_number\" VARCHAR(120) DEFAULT NULL, \"bottle_tag_color\" VARCHAR(80) DEFAULT NULL, \"date_opened\" DATE DEFAULT NULL, \"formula\" VARCHAR(180) DEFAULT NULL, \"id_interno\" VARCHAR(120) DEFAULT NULL, \"physical_state\" VARCHAR(80) DEFAULT NULL, \"estado_fisico\" VARCHAR(80) DEFAULT NULL, \"presentacion\" VARCHAR(120) DEFAULT NULL, \"tipo_sustancia\" VARCHAR(120) DEFAULT NULL, \"extra_json\" TEXT, \"creado_en\" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP, \"actualizado_en\" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP, \"stock_maximo\" REAL DEFAULT NULL, \"activo\" INTEGER NOT NULL DEFAULT 1, \"baja_motivo\" TEXT, \"baja_en\" VARCHAR(40) DEFAULT NULL, \"baja_por\" INT DEFAULT NULL, \"requiere_supervision\" INT NOT NULL DEFAULT 0, \"supervision_estado\" VARCHAR(20) DEFAULT NULL, \"supervisor_id\" INT DEFAULT NULL, \"supervision_solicitada_por\" INT DEFAULT NULL, \"supervision_solicitada_en\" VARCHAR(40) DEFAULT NULL, \"supervision_observaciones\" TEXT, \"supervisado_por\" INT DEFAULT NULL, \"supervisado_en\" VARCHAR(40) DEFAULT NULL)",
    "mysql": "CREATE TABLE IF NOT EXISTS `reactivos` (\n          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n          nombre VARCHAR(180) DEFAULT NULL,\n          numero_cas VARCHAR(120) DEFAULT NULL,\n          categoria VARCHAR(120) DEFAULT NULL,\n          cantidad_actual DOUBLE DEFAULT 0,\n          unidad VARCHAR(40) DEFAULT NULL,\n          ubicacion VARCHAR(180) DEFAULT NULL,\n          fecha_vencimiento DATE DEFAULT NULL,\n          stock_minimo DOUBLE DEFAULT 0\n      , `tipo_reactivo` VARCHAR(80) DEFAULT NULL, `id_reactivo` VARCHAR(120) DEFAULT NULL, `codigo_interno` VARCHAR(120) DEFAULT NULL, `producto` VARCHAR(180) DEFAULT NULL, `marca` VARCHAR(120) DEFAULT NULL, `proveedor` VARCHAR(180) DEFAULT NULL, `catalogo` VARCHAR(120) DEFAULT NULL, `numero_parte` VARCHAR(120) DEFAULT NULL, `cas` VARCHAR(120) DEFAULT NULL, `catalogo_parte_cas_lote` VARCHAR(180) DEFAULT NULL, `localizacion` VARCHAR(180) DEFAULT NULL, `sub_localizacion` VARCHAR(180) DEFAULT NULL, `caducidad` DATE DEFAULT NULL, `fecha_apertura` DATE DEFAULT NULL, `fecha_ingreso` DATE DEFAULT NULL, `fecha_preparacion` DATE DEFAULT NULL, `contenedor` VARCHAR(120) DEFAULT NULL, `capacidad_litros` DOUBLE DEFAULT NULL, `capacidad_kilos` DOUBLE DEFAULT NULL, `capacidad` DOUBLE DEFAULT NULL, `unidad_capacidad` VARCHAR(40) DEFAULT NULL, `piezas` INT DEFAULT NULL, `total_litros_2025` DOUBLE DEFAULT NULL, `cantidad_total` DOUBLE DEFAULT NULL, `unidad_total` VARCHAR(40) DEFAULT NULL, `restante_190126` DOUBLE DEFAULT NULL, `restante` DOUBLE DEFAULT NULL, `lote` VARCHAR(120) DEFAULT NULL, `parte` VARCHAR(120) DEFAULT NULL, `serie` VARCHAR(120) DEFAULT NULL, `descripcion` LONGTEXT, `nuevo_usado` VARCHAR(30) DEFAULT NULL, `estado` VARCHAR(80) DEFAULT NULL, `metodo` VARCHAR(120) DEFAULT NULL, `observaciones` LONGTEXT, `item_name` VARCHAR(180) DEFAULT NULL, `informacion_extra` LONGTEXT, `nombre_crm` VARCHAR(180) DEFAULT NULL, `lot_number` VARCHAR(120) DEFAULT NULL, `url` VARCHAR(255) DEFAULT NULL, `estado_reactivo` VARCHAR(40) DEFAULT NULL, `volumen` VARCHAR(80) DEFAULT NULL, `vendor` VARCHAR(180) DEFAULT NULL, `amount_in_stock` DOUBLE DEFAULT NULL, `expiration_date` DATE DEFAULT NULL, `cas_number` VARCHAR(120) DEFAULT NULL, `bottle_tag_color` VARCHAR(80) DEFAULT NULL, `date_opened` DATE DEFAULT NULL, `formula` VARCHAR(180) DEFAULT NULL, `id_interno` VARCHAR(120) DEFAULT NULL, `physical_state` VARCHAR(80) DEFAULT NULL, `estado_fisico` VARCHAR(80) DEFAULT NULL, `presentacion` VARCHAR(120) DEFAULT NULL, `tipo_sustancia` VARCHAR(120) DEFAULT NULL, `extra_json` LONGTEXT, `creado_en` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP, `actualizado_en` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP, `stock_maximo` DOUBLE DEFAULT NULL, `activo` INT NOT NULL DEFAULT 1, `baja_motivo` LONGTEXT, `baja_en` VARCHAR(40) DEFAULT NULL, `baja_por` INT DEFAULT NULL, `requiere_supervision` INT NOT NULL DEFAULT 0, `supervision_estado` VARCHAR(20) DEFAULT NULL, `supervisor_id` INT DEFAULT NULL, `supervision_solicitada_por` INT DEFAULT NULL, `supervision_solicitada_en` VARCHAR(40) DEFAULT NULL, `supervision_observaciones` LONGTEXT, `supervisado_por` INT DEFAULT NULL, `supervisado_en` VARCHAR(40) DEFAULT NULL\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "tabla",
    "nombre": "consumibles",
    "sqlite": "CREATE TABLE consumibles (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        producto VARCHAR(180) NOT NULL,\n        marca VARCHAR(120) DEFAULT NULL,\n        proveedor VARCHAR(180) DEFAULT NULL,\n        catalogo_parte_cas VARCHAR(180) DEFAULT NULL,\n        fecha_ingreso DATE DEFAULT NULL,\n        tamano_capacidad VARCHAR(120) DEFAULT NULL,\n        contenedor VARCHAR(120) DEFAULT NULL,\n        piezas INTEGER DEFAULT 0,\n        cantidad_por_pieza INTEGER DEFAULT NULL,\n        stock_maximo INTEGER DEFAULT NULL,\n        creado_por INTEGER DEFAULT NULL,\n        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n    , \"activo\" INTEGER NOT NULL DEFAULT 1, \"baja_motivo\" TEXT, \"baja_en\" VARCHAR(40) DEFAULT NULL, \"baja_por\" INT DEFAULT NULL, \"requiere_supervision\" INT NOT NULL DEFAULT 0, \"supervision_estado\" VARCHAR(20) DEFAULT NULL, \"supervisor_id\" INT DEFAULT NULL, \"supervision_solicitada_por\" INT DEFAULT NULL, \"supervision_solicitada_en\" VARCHAR(40) DEFAULT NULL, \"supervision_observaciones\" TEXT, \"supervisado_por\" INT DEFAULT NULL, \"supervisado_en\" VARCHAR(40) DEFAULT NULL)",
    "mysql": "CREATE TABLE IF NOT EXISTS `consumibles` (\n        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n        producto VARCHAR(180) NOT NULL,\n        marca VARCHAR(120) DEFAULT NULL,\n        proveedor VARCHAR(180) DEFAULT NULL,\n        catalogo_parte_cas VARCHAR(180) DEFAULT NULL,\n        fecha_ingreso DATE DEFAULT NULL,\n        tamano_capacidad VARCHAR(120) DEFAULT NULL,\n        contenedor VARCHAR(120) DEFAULT NULL,\n        piezas INT DEFAULT 0,\n        cantidad_por_pieza INT DEFAULT NULL,\n        stock_maximo INT DEFAULT NULL,\n        creado_por INT DEFAULT NULL,\n        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n    , `activo` INT NOT NULL DEFAULT 1, `baja_motivo` LONGTEXT, `baja_en` VARCHAR(40) DEFAULT NULL, `baja_por` INT DEFAULT NULL, `requiere_supervision` INT NOT NULL DEFAULT 0, `supervision_estado` VARCHAR(20) DEFAULT NULL, `supervisor_id` INT DEFAULT NULL, `supervision_solicitada_por` INT DEFAULT NULL, `supervision_solicitada_en` VARCHAR(40) DEFAULT NULL, `supervision_observaciones` LONGTEXT, `supervisado_por` INT DEFAULT NULL, `supervisado_en` VARCHAR(40) DEFAULT NULL\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "tabla",
    "nombre": "equipos",
    "sqlite": "CREATE TABLE equipos (\n          id INTEGER PRIMARY KEY AUTOINCREMENT,\n          nombre VARCHAR(150) NOT NULL,\n          marca VARCHAR(100) DEFAULT NULL,\n          modelo VARCHAR(100) DEFAULT NULL,\n          numero_serie VARCHAR(100) DEFAULT NULL UNIQUE,\n          ubicacion VARCHAR(150) DEFAULT NULL,\n          id_responsable INTEGER DEFAULT NULL,\n          fecha_prox_calibracion DATE DEFAULT NULL,\n          estado VARCHAR(40) NOT NULL DEFAULT 'operativo',\n          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n      , \"clave_bitacora\" VARCHAR(60) DEFAULT NULL, \"activo\" INTEGER NOT NULL DEFAULT 1, \"baja_motivo\" TEXT, \"baja_en\" VARCHAR(40) DEFAULT NULL, \"baja_por\" INT DEFAULT NULL, \"ultimo_folio_bitacora\" VARCHAR(60) DEFAULT NULL, \"requiere_supervision\" INT NOT NULL DEFAULT 0, \"supervision_estado\" VARCHAR(20) DEFAULT NULL, \"supervisor_id\" INT DEFAULT NULL, \"supervision_solicitada_por\" INT DEFAULT NULL, \"supervision_solicitada_en\" VARCHAR(40) DEFAULT NULL, \"supervision_observaciones\" TEXT, \"supervisado_por\" INT DEFAULT NULL, \"supervisado_en\" VARCHAR(40) DEFAULT NULL)",
    "mysql": "CREATE TABLE IF NOT EXISTS `equipos` (\n          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n          nombre VARCHAR(150) NOT NULL,\n          marca VARCHAR(100) DEFAULT NULL,\n          modelo VARCHAR(100) DEFAULT NULL,\n          numero_serie VARCHAR(100) DEFAULT NULL UNIQUE,\n          ubicacion VARCHAR(150) DEFAULT NULL,\n          id_responsable INT DEFAULT NULL,\n          fecha_prox_calibracion DATE DEFAULT NULL,\n          estado VARCHAR(40) NOT NULL DEFAULT 'operativo',\n          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n      , `clave_bitacora` VARCHAR(60) DEFAULT NULL, `activo` INT NOT NULL DEFAULT 1, `baja_motivo` LONGTEXT, `baja_en` VARCHAR(40) DEFAULT NULL, `baja_por` INT DEFAULT NULL, `ultimo_folio_bitacora` VARCHAR(60) DEFAULT NULL, `requiere_supervision` INT NOT NULL DEFAULT 0, `supervision_estado` VARCHAR(20) DEFAULT NULL, `supervisor_id` INT DEFAULT NULL, `supervision_solicitada_por` INT DEFAULT NULL, `supervision_solicitada_en` VARCHAR(40) DEFAULT NULL, `supervision_observaciones` LONGTEXT, `supervisado_por` INT DEFAULT NULL, `supervisado_en` VARCHAR(40) DEFAULT NULL\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "tabla",
    "nombre": "mantenimientos",
    "sqlite": "CREATE TABLE mantenimientos (\n          id INTEGER PRIMARY KEY AUTOINCREMENT,\n          id_equipo INTEGER NOT NULL,\n          tipo VARCHAR(40) NOT NULL,\n          fecha_programada DATE NOT NULL,\n          fecha_realizado DATE DEFAULT NULL,\n          tecnico_proveedor VARCHAR(150) DEFAULT NULL,\n          estado VARCHAR(40) DEFAULT 'programado',\n          observaciones TEXT,\n          id_responsable INTEGER DEFAULT NULL,\n          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n      , \"requiere_supervision\" INT NOT NULL DEFAULT 0, \"supervision_estado\" VARCHAR(20) DEFAULT NULL, \"supervisor_id\" INT DEFAULT NULL, \"supervision_solicitada_por\" INT DEFAULT NULL, \"supervision_solicitada_en\" VARCHAR(40) DEFAULT NULL, \"supervision_observaciones\" TEXT, \"supervisado_por\" INT DEFAULT NULL, \"supervisado_en\" VARCHAR(40) DEFAULT NULL)",
    "mysql": "CREATE TABLE IF NOT EXISTS `mantenimientos` (\n          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n          id_equipo INT NOT NULL,\n          tipo VARCHAR(40) NOT NULL,\n          fecha_programada DATE NOT NULL,\n          fecha_realizado DATE DEFAULT NULL,\n          tecnico_proveedor VARCHAR(150) DEFAULT NULL,\n          estado VARCHAR(40) DEFAULT 'programado',\n          observaciones LONGTEXT,\n          id_responsable INT DEFAULT NULL,\n          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n      , `requiere_supervision` INT NOT NULL DEFAULT 0, `supervision_estado` VARCHAR(20) DEFAULT NULL, `supervisor_id` INT DEFAULT NULL, `supervision_solicitada_por` INT DEFAULT NULL, `supervision_solicitada_en` VARCHAR(40) DEFAULT NULL, `supervision_observaciones` LONGTEXT, `supervisado_por` INT DEFAULT NULL, `supervisado_en` VARCHAR(40) DEFAULT NULL\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "tabla",
    "nombre": "movimientos",
    "sqlite": "CREATE TABLE movimientos (\n          id INTEGER PRIMARY KEY AUTOINCREMENT,\n          tipo VARCHAR(20) NOT NULL,\n          tabla_origen VARCHAR(40) NOT NULL,\n          id_item INTEGER NOT NULL,\n          cantidad REAL NOT NULL DEFAULT 0,\n          motivo TEXT,\n          referencia VARCHAR(120) UNIQUE,\n          id_usuario INTEGER DEFAULT NULL,\n          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n      )",
    "mysql": "CREATE TABLE IF NOT EXISTS `movimientos` (\n          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n          tipo VARCHAR(20) NOT NULL,\n          tabla_origen VARCHAR(40) NOT NULL,\n          id_item INT NOT NULL,\n          cantidad DOUBLE NOT NULL DEFAULT 0,\n          motivo LONGTEXT,\n          referencia VARCHAR(120) UNIQUE,\n          id_usuario INT DEFAULT NULL,\n          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "catalogo",
    "tabla": "permisos",
    "clave": "clave",
    "filas": [
      {
        "clave": "usuarios",
        "nombre": "Usuarios y roles",
        "descripcion": "Cuentas, roles y asignacion de roles",
        "activo": 1
      },
      {
        "clave": "documentos",
        "nombre": "Documentos SGC",
        "descripcion": "Documentos controlados (apagado por ahora)",
        "activo": 1
      },
      {
        "clave": "muestras",
        "nombre": "Muestras",
        "descripcion": "Recepcion, custodia y disposicion final",
        "activo": 1
      },
      {
        "clave": "ensayos",
        "nombre": "Ensayos",
        "descripcion": "Procesamiento, extraccion y analisis (revision y aprobacion de analisis)",
        "activo": 1
      },
      {
        "clave": "informes",
        "nombre": "Informes",
        "descripcion": "Informes de resultados",
        "activo": 1
      },
      {
        "clave": "equipos",
        "nombre": "Equipos",
        "descripcion": "Equipos y mantenimientos",
        "activo": 1
      },
      {
        "clave": "inventario",
        "nombre": "Inventario",
        "descripcion": "Reactivos, consumibles y movimientos",
        "activo": 1
      },
      {
        "clave": "calidad",
        "nombre": "Calidad",
        "descripcion": "Bitacora de auditoria (incidencias, no conformidades y auditorias internas en Fase 8)",
        "activo": 1
      },
      {
        "clave": "compras",
        "nombre": "Compras",
        "descripcion": "Sin pantallas todavia (Fase 8)",
        "activo": 1
      }
    ]
  }
];

export const up = (db, motor) => ejecutarPasos(db, motor, pasos);
