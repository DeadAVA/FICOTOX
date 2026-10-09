/*
 * Migracion 11: incidencias, no conformidades, acciones correctivas, verificaciones,
 * comunicaciones, suspensiones y retenciones; propuestas_documento.nc_id y la
 * descripcion del modulo calidad en el catalogo.
 *
 * Generada desde una base nueva creada por el codigo anterior (sqlite_master); la
 * variante MySQL traduce los tipos como la rama MySQL de ese codigo. No se edita
 * despues de aplicarse: su checksum queda en schema_migraciones.
 */
import { ejecutarPasos } from "./pasos.mjs";

export const version = 11;
export const nombre = "Incidencias, no conformidades y acciones correctivas (Fase 11)";

export const pasos = [
  {
    "tipo": "tabla",
    "nombre": "incidencias",
    "sqlite": "CREATE TABLE incidencias (\n      id INTEGER PRIMARY KEY AUTOINCREMENT, folio_num INT NOT NULL, tipo VARCHAR(30) NOT NULL, fecha_hora_ocurrencia VARCHAR(40) NOT NULL,\n      descripcion TEXT NOT NULL, accion_inmediata TEXT, impacto_resultados VARCHAR(12) NOT NULL DEFAULT 'desconocido',\n      estado VARCHAR(20) NOT NULL DEFAULT 'reportada',\n      reportada_por INT DEFAULT NULL, reportada_nombre VARCHAR(180) DEFAULT NULL, reportada_rol VARCHAR(120) DEFAULT NULL, reportada_en VARCHAR(40) NOT NULL,\n      origen_automatico VARCHAR(30) DEFAULT NULL, clave_automatica VARCHAR(200) DEFAULT NULL,\n      en_evaluacion_por INT DEFAULT NULL, en_evaluacion_en VARCHAR(40) DEFAULT NULL,\n      evaluada_por INT DEFAULT NULL, evaluada_rol VARCHAR(120) DEFAULT NULL, evaluada_en VARCHAR(40) DEFAULT NULL,\n      decision_evaluacion VARCHAR(20) DEFAULT NULL, justificacion TEXT, nc_id INT DEFAULT NULL,\n      anulado_en VARCHAR(40) DEFAULT NULL, anulado_por INT DEFAULT NULL, anulado_rol VARCHAR(120) DEFAULT NULL, motivo_anulacion TEXT, estado_previo VARCHAR(30) DEFAULT NULL, excepciones_json TEXT\n    )",
    "mysql": "CREATE TABLE IF NOT EXISTS `incidencias` (\n      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, folio_num INT NOT NULL, tipo VARCHAR(30) NOT NULL, fecha_hora_ocurrencia VARCHAR(40) NOT NULL,\n      descripcion LONGTEXT NOT NULL, accion_inmediata LONGTEXT, impacto_resultados VARCHAR(12) NOT NULL DEFAULT 'desconocido',\n      estado VARCHAR(20) NOT NULL DEFAULT 'reportada',\n      reportada_por INT DEFAULT NULL, reportada_nombre VARCHAR(180) DEFAULT NULL, reportada_rol VARCHAR(120) DEFAULT NULL, reportada_en VARCHAR(40) NOT NULL,\n      origen_automatico VARCHAR(30) DEFAULT NULL, clave_automatica VARCHAR(200) DEFAULT NULL,\n      en_evaluacion_por INT DEFAULT NULL, en_evaluacion_en VARCHAR(40) DEFAULT NULL,\n      evaluada_por INT DEFAULT NULL, evaluada_rol VARCHAR(120) DEFAULT NULL, evaluada_en VARCHAR(40) DEFAULT NULL,\n      decision_evaluacion VARCHAR(20) DEFAULT NULL, justificacion LONGTEXT, nc_id INT DEFAULT NULL,\n      anulado_en VARCHAR(40) DEFAULT NULL, anulado_por INT DEFAULT NULL, anulado_rol VARCHAR(120) DEFAULT NULL, motivo_anulacion LONGTEXT, estado_previo VARCHAR(30) DEFAULT NULL, excepciones_json LONGTEXT\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "indice",
    "nombre": "uq_incidencias_folio",
    "tabla": "incidencias",
    "columnas": [
      "folio_num"
    ],
    "unico": true
  },
  {
    "tipo": "indice",
    "nombre": "idx_incidencias_reportada",
    "tabla": "incidencias",
    "columnas": [
      "reportada_por"
    ],
    "unico": false
  },
  {
    "tipo": "indice",
    "nombre": "idx_incidencias_clave_auto",
    "tabla": "incidencias",
    "columnas": [
      "clave_automatica"
    ],
    "unico": false
  },
  {
    "tipo": "tabla",
    "nombre": "incidencia_registros",
    "sqlite": "CREATE TABLE incidencia_registros (id INTEGER PRIMARY KEY AUTOINCREMENT, incidencia_id INT NOT NULL, entidad VARCHAR(40) NOT NULL, entidad_id INT NOT NULL, referencia VARCHAR(160) DEFAULT NULL)",
    "mysql": "CREATE TABLE IF NOT EXISTS `incidencia_registros` (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, incidencia_id INT NOT NULL, entidad VARCHAR(40) NOT NULL, entidad_id INT NOT NULL, referencia VARCHAR(160) DEFAULT NULL\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "indice",
    "nombre": "idx_inc_registros_inc",
    "tabla": "incidencia_registros",
    "columnas": [
      "incidencia_id"
    ],
    "unico": false
  },
  {
    "tipo": "indice",
    "nombre": "idx_inc_registros_entidad",
    "tabla": "incidencia_registros",
    "columnas": [
      "entidad",
      "entidad_id"
    ],
    "unico": false
  },
  {
    "tipo": "tabla",
    "nombre": "no_conformidades",
    "sqlite": "CREATE TABLE no_conformidades (\n      id INTEGER PRIMARY KEY AUTOINCREMENT, folio_num INT NOT NULL, origen VARCHAR(30) NOT NULL, incidencia_id INT DEFAULT NULL,\n      clasificacion VARCHAR(12) DEFAULT NULL, requisito_incumplido TEXT, descripcion TEXT NOT NULL,\n      responsable_id INT DEFAULT NULL, estado VARCHAR(24) NOT NULL DEFAULT 'abierta',\n      creada_por INT DEFAULT NULL, creada_rol VARCHAR(120) DEFAULT NULL, creada_en VARCHAR(40) NOT NULL,\n      analisis_iniciado_en VARCHAR(40) DEFAULT NULL, acciones_iniciadas_en VARCHAR(40) DEFAULT NULL, verificacion_iniciada_en VARCHAR(40) DEFAULT NULL,\n      afecta_resultados_emitidos VARCHAR(12) DEFAULT NULL, trabajo_detenido VARCHAR(12) DEFAULT NULL, notificar_cliente VARCHAR(12) DEFAULT NULL,\n      impacto_notas TEXT, impacto_evaluado_por INT DEFAULT NULL, impacto_evaluado_en VARCHAR(40) DEFAULT NULL,\n      metodo_causa VARCHAR(20) DEFAULT NULL, desarrollo_causa TEXT, causa_raiz TEXT,\n      requiere_accion_correctiva VARCHAR(4) DEFAULT NULL, justificacion_sin_accion TEXT,\n      requiere_actualizar_riesgos INT NOT NULL DEFAULT 0, nota_riesgos TEXT,\n      requiere_cambio_documental INT NOT NULL DEFAULT 0, propuesta_documento_id INT DEFAULT NULL,\n      verificacion_programada VARCHAR(10) DEFAULT NULL, reaperturas INT NOT NULL DEFAULT 0,\n      cerrada_por INT DEFAULT NULL, cerrada_rol VARCHAR(120) DEFAULT NULL, cerrada_en VARCHAR(40) DEFAULT NULL, conclusion TEXT,\n      archivo_pdf VARCHAR(200) DEFAULT NULL, pdf_sha256 VARCHAR(64) DEFAULT NULL,\n      anulado_en VARCHAR(40) DEFAULT NULL, anulado_por INT DEFAULT NULL, anulado_rol VARCHAR(120) DEFAULT NULL, motivo_anulacion TEXT, estado_previo VARCHAR(30) DEFAULT NULL, excepciones_json TEXT\n    , \"responsables_previos\" TEXT)",
    "mysql": "CREATE TABLE IF NOT EXISTS `no_conformidades` (\n      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, folio_num INT NOT NULL, origen VARCHAR(30) NOT NULL, incidencia_id INT DEFAULT NULL,\n      clasificacion VARCHAR(12) DEFAULT NULL, requisito_incumplido LONGTEXT, descripcion LONGTEXT NOT NULL,\n      responsable_id INT DEFAULT NULL, estado VARCHAR(24) NOT NULL DEFAULT 'abierta',\n      creada_por INT DEFAULT NULL, creada_rol VARCHAR(120) DEFAULT NULL, creada_en VARCHAR(40) NOT NULL,\n      analisis_iniciado_en VARCHAR(40) DEFAULT NULL, acciones_iniciadas_en VARCHAR(40) DEFAULT NULL, verificacion_iniciada_en VARCHAR(40) DEFAULT NULL,\n      afecta_resultados_emitidos VARCHAR(12) DEFAULT NULL, trabajo_detenido VARCHAR(12) DEFAULT NULL, notificar_cliente VARCHAR(12) DEFAULT NULL,\n      impacto_notas LONGTEXT, impacto_evaluado_por INT DEFAULT NULL, impacto_evaluado_en VARCHAR(40) DEFAULT NULL,\n      metodo_causa VARCHAR(20) DEFAULT NULL, desarrollo_causa LONGTEXT, causa_raiz LONGTEXT,\n      requiere_accion_correctiva VARCHAR(4) DEFAULT NULL, justificacion_sin_accion LONGTEXT,\n      requiere_actualizar_riesgos INT NOT NULL DEFAULT 0, nota_riesgos LONGTEXT,\n      requiere_cambio_documental INT NOT NULL DEFAULT 0, propuesta_documento_id INT DEFAULT NULL,\n      verificacion_programada VARCHAR(10) DEFAULT NULL, reaperturas INT NOT NULL DEFAULT 0,\n      cerrada_por INT DEFAULT NULL, cerrada_rol VARCHAR(120) DEFAULT NULL, cerrada_en VARCHAR(40) DEFAULT NULL, conclusion LONGTEXT,\n      archivo_pdf VARCHAR(200) DEFAULT NULL, pdf_sha256 VARCHAR(64) DEFAULT NULL,\n      anulado_en VARCHAR(40) DEFAULT NULL, anulado_por INT DEFAULT NULL, anulado_rol VARCHAR(120) DEFAULT NULL, motivo_anulacion LONGTEXT, estado_previo VARCHAR(30) DEFAULT NULL, excepciones_json LONGTEXT\n    , `responsables_previos` LONGTEXT\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "indice",
    "nombre": "uq_no_conformidades_folio",
    "tabla": "no_conformidades",
    "columnas": [
      "folio_num"
    ],
    "unico": true
  },
  {
    "tipo": "indice",
    "nombre": "idx_nc_responsable",
    "tabla": "no_conformidades",
    "columnas": [
      "responsable_id"
    ],
    "unico": false
  },
  {
    "tipo": "tabla",
    "nombre": "nc_registros_afectados",
    "sqlite": "CREATE TABLE nc_registros_afectados (id INTEGER PRIMARY KEY AUTOINCREMENT, nc_id INT NOT NULL, entidad VARCHAR(40) NOT NULL, entidad_id INT NOT NULL, referencia VARCHAR(160) DEFAULT NULL, agregado_por INT DEFAULT NULL, agregado_en VARCHAR(40) NOT NULL)",
    "mysql": "CREATE TABLE IF NOT EXISTS `nc_registros_afectados` (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, nc_id INT NOT NULL, entidad VARCHAR(40) NOT NULL, entidad_id INT NOT NULL, referencia VARCHAR(160) DEFAULT NULL, agregado_por INT DEFAULT NULL, agregado_en VARCHAR(40) NOT NULL\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "indice",
    "nombre": "idx_nc_afectados_nc",
    "tabla": "nc_registros_afectados",
    "columnas": [
      "nc_id"
    ],
    "unico": false
  },
  {
    "tipo": "tabla",
    "nombre": "nc_verificaciones",
    "sqlite": "CREATE TABLE nc_verificaciones (id INTEGER PRIMARY KEY AUTOINCREMENT, nc_id INT NOT NULL, fecha_programada VARCHAR(10) DEFAULT NULL, verificada_por INT DEFAULT NULL, verificada_rol VARCHAR(120) DEFAULT NULL,\n      verificada_en VARCHAR(40) NOT NULL, resultado VARCHAR(12) NOT NULL, comentarios TEXT)",
    "mysql": "CREATE TABLE IF NOT EXISTS `nc_verificaciones` (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, nc_id INT NOT NULL, fecha_programada VARCHAR(10) DEFAULT NULL, verificada_por INT DEFAULT NULL, verificada_rol VARCHAR(120) DEFAULT NULL,\n      verificada_en VARCHAR(40) NOT NULL, resultado VARCHAR(12) NOT NULL, comentarios LONGTEXT\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "indice",
    "nombre": "idx_nc_verif_nc",
    "tabla": "nc_verificaciones",
    "columnas": [
      "nc_id"
    ],
    "unico": false
  },
  {
    "tipo": "tabla",
    "nombre": "acciones_correctivas",
    "sqlite": "CREATE TABLE acciones_correctivas (\n      id INTEGER PRIMARY KEY AUTOINCREMENT, nc_id INT NOT NULL, descripcion TEXT NOT NULL, responsable_id INT DEFAULT NULL, fecha_compromiso VARCHAR(10) DEFAULT NULL,\n      estado VARCHAR(16) NOT NULL DEFAULT 'pendiente', creada_por INT DEFAULT NULL, creada_en VARCHAR(40) NOT NULL, iniciada_en VARCHAR(40) DEFAULT NULL,\n      implementada_por INT DEFAULT NULL, implementada_en VARCHAR(40) DEFAULT NULL, descripcion_implementacion TEXT,\n      cancelada_por INT DEFAULT NULL, cancelada_en VARCHAR(40) DEFAULT NULL, motivo_cancelacion TEXT,\n      reasignada_en VARCHAR(40) DEFAULT NULL, motivo_reasignacion TEXT\n    , \"responsables_previos\" TEXT)",
    "mysql": "CREATE TABLE IF NOT EXISTS `acciones_correctivas` (\n      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, nc_id INT NOT NULL, descripcion LONGTEXT NOT NULL, responsable_id INT DEFAULT NULL, fecha_compromiso VARCHAR(10) DEFAULT NULL,\n      estado VARCHAR(16) NOT NULL DEFAULT 'pendiente', creada_por INT DEFAULT NULL, creada_en VARCHAR(40) NOT NULL, iniciada_en VARCHAR(40) DEFAULT NULL,\n      implementada_por INT DEFAULT NULL, implementada_en VARCHAR(40) DEFAULT NULL, descripcion_implementacion LONGTEXT,\n      cancelada_por INT DEFAULT NULL, cancelada_en VARCHAR(40) DEFAULT NULL, motivo_cancelacion LONGTEXT,\n      reasignada_en VARCHAR(40) DEFAULT NULL, motivo_reasignacion LONGTEXT\n    , `responsables_previos` LONGTEXT\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "indice",
    "nombre": "idx_acciones_nc",
    "tabla": "acciones_correctivas",
    "columnas": [
      "nc_id"
    ],
    "unico": false
  },
  {
    "tipo": "indice",
    "nombre": "idx_acciones_responsable",
    "tabla": "acciones_correctivas",
    "columnas": [
      "responsable_id"
    ],
    "unico": false
  },
  {
    "tipo": "tabla",
    "nombre": "nc_comunicaciones",
    "sqlite": "CREATE TABLE nc_comunicaciones (id INTEGER PRIMARY KEY AUTOINCREMENT, nc_id INT NOT NULL, fecha VARCHAR(10) NOT NULL, medio VARCHAR(20) NOT NULL, contacto VARCHAR(180) NOT NULL, resumen TEXT NOT NULL, informe_ids_json TEXT, registrado_por INT DEFAULT NULL, registrado_en VARCHAR(40) NOT NULL)",
    "mysql": "CREATE TABLE IF NOT EXISTS `nc_comunicaciones` (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, nc_id INT NOT NULL, fecha VARCHAR(10) NOT NULL, medio VARCHAR(20) NOT NULL, contacto VARCHAR(180) NOT NULL, resumen LONGTEXT NOT NULL, informe_ids_json LONGTEXT, registrado_por INT DEFAULT NULL, registrado_en VARCHAR(40) NOT NULL\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "indice",
    "nombre": "idx_nc_com_nc",
    "tabla": "nc_comunicaciones",
    "columnas": [
      "nc_id"
    ],
    "unico": false
  },
  {
    "tipo": "tabla",
    "nombre": "suspensiones",
    "sqlite": "CREATE TABLE suspensiones (\n      id INTEGER PRIMARY KEY AUTOINCREMENT, tipo VARCHAR(10) NOT NULL, clave VARCHAR(40) NOT NULL, nc_id INT NOT NULL, motivo TEXT NOT NULL,\n      suspendida_por INT DEFAULT NULL, suspendida_rol VARCHAR(120) DEFAULT NULL, suspendida_en VARCHAR(40) NOT NULL, estado_previo_equipo VARCHAR(30) DEFAULT NULL,\n      reanudada_por INT DEFAULT NULL, reanudada_rol VARCHAR(120) DEFAULT NULL, reanudada_en VARCHAR(40) DEFAULT NULL, motivo_reanudacion TEXT, excepciones_json TEXT\n    )",
    "mysql": "CREATE TABLE IF NOT EXISTS `suspensiones` (\n      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, tipo VARCHAR(10) NOT NULL, clave VARCHAR(40) NOT NULL, nc_id INT NOT NULL, motivo LONGTEXT NOT NULL,\n      suspendida_por INT DEFAULT NULL, suspendida_rol VARCHAR(120) DEFAULT NULL, suspendida_en VARCHAR(40) NOT NULL, estado_previo_equipo VARCHAR(30) DEFAULT NULL,\n      reanudada_por INT DEFAULT NULL, reanudada_rol VARCHAR(120) DEFAULT NULL, reanudada_en VARCHAR(40) DEFAULT NULL, motivo_reanudacion LONGTEXT, excepciones_json LONGTEXT\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "indice",
    "nombre": "idx_suspensiones_clave",
    "tabla": "suspensiones",
    "columnas": [
      "tipo",
      "clave"
    ],
    "unico": false
  },
  {
    "tipo": "tabla",
    "nombre": "retenciones_informe",
    "sqlite": "CREATE TABLE retenciones_informe (id INTEGER PRIMARY KEY AUTOINCREMENT, nc_id INT NOT NULL, informe_id INT NOT NULL, motivo TEXT NOT NULL, retenido_por INT DEFAULT NULL, retenido_rol VARCHAR(120) DEFAULT NULL, retenido_en VARCHAR(40) NOT NULL,\n      liberada_por INT DEFAULT NULL, liberada_rol VARCHAR(120) DEFAULT NULL, liberada_en VARCHAR(40) DEFAULT NULL, motivo_liberacion TEXT)",
    "mysql": "CREATE TABLE IF NOT EXISTS `retenciones_informe` (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, nc_id INT NOT NULL, informe_id INT NOT NULL, motivo LONGTEXT NOT NULL, retenido_por INT DEFAULT NULL, retenido_rol VARCHAR(120) DEFAULT NULL, retenido_en VARCHAR(40) NOT NULL,\n      liberada_por INT DEFAULT NULL, liberada_rol VARCHAR(120) DEFAULT NULL, liberada_en VARCHAR(40) DEFAULT NULL, motivo_liberacion LONGTEXT\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  },
  {
    "tipo": "indice",
    "nombre": "idx_retenciones_informe",
    "tabla": "retenciones_informe",
    "columnas": [
      "informe_id"
    ],
    "unico": false
  },
  {
    "tipo": "columna",
    "tabla": "propuestas_documento",
    "columna": "nc_id",
    "sqlite": "INT DEFAULT NULL",
    "mysql": "INT DEFAULT NULL"
  },
  {
    "tipo": "catalogo",
    "tabla": "permisos",
    "clave": "clave",
    "filas": [
      {
        "clave": "calidad",
        "nombre": "Calidad",
        "descripcion": "Bitacora de auditoria, incidencias, no conformidades y acciones correctivas (auditorias internas en una fase posterior)",
        "activo": 1
      }
    ]
  }
];

export const up = (db, motor) => ejecutarPasos(db, motor, pasos);
