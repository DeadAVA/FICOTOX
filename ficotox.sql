-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1:3306
-- Tiempo de generación: 01-05-2026 a las 06:29:22
-- Versión del servidor: 9.1.0
-- Versión de PHP: 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `ficotox`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `muestras_procesamiento`
--

DROP TABLE IF EXISTS `muestras_extraccion`;
DROP TABLE IF EXISTS `muestras_procesamiento`;
CREATE TABLE IF NOT EXISTS `muestras_procesamiento` (
  `id` int NOT NULL AUTO_INCREMENT,
  `folio_num` int NOT NULL,
  `tipo_registro` varchar(2) NOT NULL DEFAULT 'P',
  `clave_revision` varchar(50) DEFAULT 'FX-TCF-GMP',
  `fecha_emision` date DEFAULT NULL,
  `fecha_procesamiento` date DEFAULT NULL,
  `hora_procesamiento` varchar(20) DEFAULT NULL,
  `recepcion_id` int DEFAULT NULL,
  `folio_recepcion_num` int DEFAULT NULL,
  `muestra_tipo` varchar(20) DEFAULT NULL,
  `id_interno` varchar(100) DEFAULT NULL,
  `tipo_organismo_json` longtext,
  `parte_organismo_json` longtext,
  `bivalvos_steps_json` longtext,
  `sardinas_steps_json` longtext,
  `otro_procesamiento` text,
  `resguardo_json` longtext,
  `observaciones_generales` text,
  `nombre_quien_proceso` varchar(180) DEFAULT NULL,
  `nombre_quien_superviso` varchar(180) DEFAULT NULL,
  `estado` varchar(30) NOT NULL DEFAULT 'registrada',
  `creado_por` int DEFAULT NULL,
  `actualizado_por` int DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_muestras_procesamiento_folio_num` (`folio_num`),
  KEY `recepcion_id` (`recepcion_id`),
  KEY `creado_por` (`creado_por`),
  KEY `actualizado_por` (`actualizado_por`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `muestras_extraccion`
--

DROP TABLE IF EXISTS `muestras_extraccion`;
CREATE TABLE IF NOT EXISTS `muestras_extraccion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `folio_num` int NOT NULL,
  `tipo_registro` varchar(4) NOT NULL DEFAULT 'E-A',
  `clave_revision` varchar(50) DEFAULT 'FX-TCF-GME-A',
  `fecha_emision` date DEFAULT NULL,
  `fecha_extraccion` date DEFAULT NULL,
  `hora_extraccion` varchar(20) DEFAULT NULL,
  `procesamiento_id` int DEFAULT NULL,
  `folio_procesamiento_num` int DEFAULT NULL,
  `muestra_tipo` varchar(20) DEFAULT NULL,
  `id_interno` varchar(100) DEFAULT NULL,
  `tipo_molienda` varchar(20) DEFAULT NULL,
  `pasos_json` longtext,
  `registro_pesos_json` longtext,
  `observaciones_generales` text,
  `nombre_quien_extrajo` varchar(180) DEFAULT NULL,
  `nombre_quien_superviso` varchar(180) DEFAULT NULL,
  `estado` varchar(30) NOT NULL DEFAULT 'registrada',
  `creado_por` int DEFAULT NULL,
  `actualizado_por` int DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_muestras_extraccion_folio_num` (`folio_num`),
  KEY `procesamiento_id` (`procesamiento_id`),
  KEY `creado_por` (`creado_por`),
  KEY `actualizado_por` (`actualizado_por`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `muestras_recepcion`
--

DROP TABLE IF EXISTS `muestras_recepcion`;
CREATE TABLE IF NOT EXISTS `muestras_recepcion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `folio_num` int NOT NULL,
  `tipo_registro` varchar(2) NOT NULL DEFAULT 'R',
  `clave_revision` varchar(50) DEFAULT 'FX-TCF-GMR',
  `fecha_emision` date DEFAULT NULL,
  `fecha_recepcion` date DEFAULT NULL,
  `hora_recepcion` varchar(20) DEFAULT NULL,
  `solicitante` varchar(180) DEFAULT NULL,
  `muestra_unica` tinyint(1) DEFAULT '0',
  `fecha_muestra` date DEFAULT NULL,
  `id_interno` varchar(100) DEFAULT NULL,
  `especificaciones` text,
  `lote_muestras_json` longtext,
  `analisis_json` longtext,
  `inspeccion_json` longtext,
  `datos_solicitante_json` longtext,
  `datos_custodio_json` longtext,
  `estado` varchar(30) NOT NULL DEFAULT 'registrada',
  `creado_por` int DEFAULT NULL,
  `actualizado_por` int DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_muestras_recepcion_folio_num` (`folio_num`),
  KEY `creado_por` (`creado_por`),
  KEY `actualizado_por` (`actualizado_por`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `consumibles`
--

DROP TABLE IF EXISTS `consumibles`;
CREATE TABLE IF NOT EXISTS `consumibles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `producto` varchar(150) NOT NULL,
  `marca` varchar(100) DEFAULT NULL,
  `proveedor` varchar(150) DEFAULT NULL,
  `catalogo_parte_cas` varchar(150) DEFAULT NULL,
  `fecha_ingreso` date DEFAULT NULL,
  `tamano_capacidad` varchar(100) DEFAULT NULL,
  `contenedor` varchar(100) DEFAULT NULL,
  `piezas` int DEFAULT NULL,
  `cantidad_por_pieza` int DEFAULT NULL,
  `creado_por` int DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `creado_por` (`creado_por`),
  FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `equipos`
--

DROP TABLE IF EXISTS `equipos`;
CREATE TABLE IF NOT EXISTS `equipos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `marca` varchar(100) DEFAULT NULL,
  `modelo` varchar(100) DEFAULT NULL,
  `numero_serie` varchar(100) DEFAULT NULL,
  `ubicacion` varchar(150) DEFAULT NULL,
  `id_responsable` int DEFAULT NULL,
  `fecha_prox_calibracion` date DEFAULT NULL,
  `estado` enum('operativo','mantenimiento','fuera_servicio','calibracion_pendiente') NOT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_serie` (`numero_serie`),
  KEY `id_responsable` (`id_responsable`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `equipos_utilizados`
--

DROP TABLE IF EXISTS `equipos_utilizados`;
CREATE TABLE IF NOT EXISTS `equipos_utilizados` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_muestra` int NOT NULL,
  `id_equipo` int NOT NULL,
  `fecha_uso` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `id_muestra` (`id_muestra`),
  KEY `id_equipo` (`id_equipo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `mantenimientos`
--

DROP TABLE IF EXISTS `mantenimientos`;
CREATE TABLE IF NOT EXISTS `mantenimientos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_equipo` int NOT NULL,
  `tipo` enum('preventivo','correctivo','calibracion') NOT NULL,
  `fecha_programada` date NOT NULL,
  `tecnico_proveedor` varchar(150) DEFAULT NULL,
  `estado` enum('programado','en_proceso','completado','vencido') DEFAULT 'programado',
  `observaciones` text,
  `id_responsable` int DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `id_equipo` (`id_equipo`),
  KEY `id_responsable` (`id_responsable`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `movimientos`
--

DROP TABLE IF EXISTS `movimientos`;
CREATE TABLE IF NOT EXISTS `movimientos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `referencia` varchar(50) NOT NULL,
  `tipo` enum('entrada','salida','ajuste') NOT NULL,
  `tabla_origen` enum('reactivos','consumibles') NOT NULL,
  `id_item` int NOT NULL,
  `cantidad` decimal(10,2) NOT NULL,
  `motivo` text,
  `id_usuario` int DEFAULT NULL,
  `fecha_hora` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `referencia` (`referencia`),
  KEY `id_usuario` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `muestras`
--

DROP TABLE IF EXISTS `muestras`;
CREATE TABLE IF NOT EXISTS `muestras` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) NOT NULL,
  `cliente` varchar(150) NOT NULL,
  `tipo` varchar(100) NOT NULL,
  `prioridad` enum('alta','media','normal') DEFAULT 'normal',
  `estado` enum('pendiente','en_proceso','completada') DEFAULT 'pendiente',
  `id_analista` int DEFAULT NULL,
  `fecha_ingreso` date NOT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `id_analista` (`id_analista`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reactivos`
--

DROP TABLE IF EXISTS `reactivos`;
CREATE TABLE IF NOT EXISTS `reactivos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `numero_cas` varchar(50) DEFAULT NULL,
  `categoria` varchar(100) DEFAULT NULL,
  `cantidad_actual` decimal(10,2) NOT NULL DEFAULT '0.00',
  `unidad` enum('mL','g','L','piezas') NOT NULL,
  `ubicacion` varchar(150) DEFAULT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  `stock_minimo` decimal(10,2) NOT NULL DEFAULT '0.00',
  `creado_por` int DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `creado_por` (`creado_por`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reactivos_usados`
--

DROP TABLE IF EXISTS `reactivos_usados`;
CREATE TABLE IF NOT EXISTS `reactivos_usados` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_muestra` int NOT NULL,
  `id_reactivo` int NOT NULL,
  `cantidad_usada` decimal(10,2) NOT NULL,
  `fecha_uso` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `id_muestra` (`id_muestra`),
  KEY `id_reactivo` (`id_reactivo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reportes_mantenimiento`
--

DROP TABLE IF EXISTS `reportes_mantenimiento`;
CREATE TABLE IF NOT EXISTS `reportes_mantenimiento` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) NOT NULL,
  `id_mantenimiento` int NOT NULL,
  `version` varchar(20) NOT NULL,
  `estado` enum('borrador','en_revision','aprobado','publicado') DEFAULT 'borrador',
  `id_responsable` int DEFAULT NULL,
  `fecha_reporte` date NOT NULL,
  `archivo_url` text,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `id_mantenimiento` (`id_mantenimiento`),
  KEY `id_responsable` (`id_responsable`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

DROP TABLE IF EXISTS `roles`;
CREATE TABLE IF NOT EXISTS `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `descripcion` text,
  `es_sistemico` tinyint(1) DEFAULT '0',
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `id_rol` int NOT NULL,
  `departamento` varchar(100) DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `id_rol` (`id_rol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `consumibles`
--
ALTER TABLE `consumibles`
  ADD CONSTRAINT `consumibles_ibfk_1` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `equipos`
--
ALTER TABLE `equipos`
  ADD CONSTRAINT `equipos_ibfk_1` FOREIGN KEY (`id_responsable`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `equipos_utilizados`
--
ALTER TABLE `equipos_utilizados`
  ADD CONSTRAINT `equipos_utilizados_ibfk_1` FOREIGN KEY (`id_muestra`) REFERENCES `muestras` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `equipos_utilizados_ibfk_2` FOREIGN KEY (`id_equipo`) REFERENCES `equipos` (`id`) ON DELETE RESTRICT;

--
-- Filtros para la tabla `mantenimientos`
--
ALTER TABLE `mantenimientos`
  ADD CONSTRAINT `mantenimientos_ibfk_1` FOREIGN KEY (`id_equipo`) REFERENCES `equipos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `mantenimientos_ibfk_2` FOREIGN KEY (`id_responsable`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `movimientos`
--
ALTER TABLE `movimientos`
  ADD CONSTRAINT `movimientos_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT;

--
-- Filtros para la tabla `muestras`
--
ALTER TABLE `muestras`
  ADD CONSTRAINT `muestras_ibfk_1` FOREIGN KEY (`id_analista`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `muestras_recepcion`
--
ALTER TABLE `muestras_recepcion`
  ADD CONSTRAINT `muestras_recepcion_ibfk_1` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `muestras_recepcion_ibfk_2` FOREIGN KEY (`actualizado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `muestras_procesamiento`
--
ALTER TABLE `muestras_procesamiento`
  ADD CONSTRAINT `muestras_procesamiento_ibfk_1` FOREIGN KEY (`recepcion_id`) REFERENCES `muestras_recepcion` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `muestras_procesamiento_ibfk_2` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `muestras_procesamiento_ibfk_3` FOREIGN KEY (`actualizado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `muestras_extraccion`
--
ALTER TABLE `muestras_extraccion`
  ADD CONSTRAINT `muestras_extraccion_ibfk_1` FOREIGN KEY (`procesamiento_id`) REFERENCES `muestras_procesamiento` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `muestras_extraccion_ibfk_2` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `muestras_extraccion_ibfk_3` FOREIGN KEY (`actualizado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `reactivos`
--
ALTER TABLE `reactivos`
  ADD CONSTRAINT `reactivos_ibfk_1` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `reactivos_usados`
--
ALTER TABLE `reactivos_usados`
  ADD CONSTRAINT `reactivos_usados_ibfk_1` FOREIGN KEY (`id_muestra`) REFERENCES `muestras` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reactivos_usados_ibfk_2` FOREIGN KEY (`id_reactivo`) REFERENCES `reactivos` (`id`) ON DELETE RESTRICT;

--
-- Filtros para la tabla `reportes_mantenimiento`
--
ALTER TABLE `reportes_mantenimiento`
  ADD CONSTRAINT `reportes_mantenimiento_ibfk_1` FOREIGN KEY (`id_mantenimiento`) REFERENCES `mantenimientos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reportes_mantenimiento_ibfk_2` FOREIGN KEY (`id_responsable`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id`) ON DELETE RESTRICT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
