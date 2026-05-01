-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1:3306
-- Tiempo de generación: 01-05-2026 a las 11:44:12
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
  KEY `creado_por` (`creado_por`)
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `consumibles`
--

INSERT INTO `consumibles` (`id`, `producto`, `marca`, `proveedor`, `catalogo_parte_cas`, `fecha_ingreso`, `tamano_capacidad`, `contenedor`, `piezas`, `cantidad_por_pieza`, `creado_por`, `creado_en`) VALUES
(2, 'p', 'p', 'p', 'p', '2026-05-01', '70', 'p', 4, 46, 1, '2026-05-01 10:39:53'),
(3, 'Preview Test', 'Marca', 'Prov', 'CAT-X', '2026-05-01', '50ml', 'Frasco', 2, 1, NULL, '2026-05-01 10:42:44'),
(4, 'Microtubo conico para microcentrifuga', 'Axygen', '-', 'SCT-200-C-S', '0000-00-00', '2 mL', 'Caja', 3, 100, NULL, '2026-05-01 10:45:27'),
(5, 'Tapón de rosca azul', 'Agilent', 'Agilent', NULL, NULL, '-', 'Bolsa', 2, 100, NULL, '2026-05-01 10:45:27'),
(6, 'Septos de silicona roja', 'Agilent', 'Agilent', 'Lot: 304304', '2023-11-13', '-', 'Bolsa', 0, 100, NULL, '2026-05-01 10:45:27'),
(7, 'Bolsa roja RPBI', NULL, NULL, NULL, '0000-00-00', 'mediana', 'Rollo', 1, 100, NULL, '2026-05-01 10:45:27'),
(8, 'Bolsas amarillas desechos RPBI', 'VWR', NULL, '129-1148', '0000-00-00', 'chica', 'Caja', 2, 200, NULL, '2026-05-01 10:45:27'),
(9, 'Bolsas amarillas desechos RPBI', NULL, NULL, NULL, NULL, 'mediana', 'Rollo', 1, 100, NULL, '2026-05-01 10:45:27'),
(10, 'Bolsas resellable', '-', NULL, NULL, NULL, '3*3', 'Bolsa', 1, 100, NULL, '2026-05-01 10:45:27'),
(11, 'Bolsas resellable', 'First street', NULL, NULL, NULL, '3,78 L', 'Caja', 1, 90, NULL, '2026-05-01 10:45:27'),
(12, 'Bolsas resellable', 'Ziploc', NULL, NULL, NULL, '3,78 L', 'Caja', 1, 38, NULL, '2026-05-01 10:45:27'),
(13, 'Bolsas resellable', 'First street', NULL, NULL, NULL, '946 mL', 'Caja', 1, 40, NULL, '2026-05-01 10:45:27'),
(14, 'Cartucho LC-SAX', 'Supelco', NULL, NULL, NULL, '500ug, 3 ml', 'Caja', 1, 54, NULL, '2026-05-01 10:45:27'),
(15, 'Cartuchos Silica', 'Phenomenex', NULL, 'Lot: 5212-57', NULL, '500mg, 6ml', 'Bolsa', 1, 5, NULL, '2026-05-01 10:45:27'),
(16, 'Cartuchos SPE/Silica', 'Grace', NULL, NULL, '0000-00-00', ' 600 mg', 'Caja', 1, 50, NULL, '2026-05-01 10:45:27'),
(17, 'Cartuchos Strata WCX', 'Phenomenex', NULL, 'Part. 8B-5027-FBJ', NULL, ' 200 mg,3ml', 'Caja', 2, 50, NULL, '2026-05-01 10:45:27'),
(18, 'Cartuchos Supelclean LC-18', 'Supelco', NULL, 'Lot: 11228002', NULL, '3 ml', 'Caja', 1, 54, NULL, '2026-05-01 10:45:27'),
(19, 'Cartuchos SPE EnviCarb', 'Supelco', NULL, '57088', '0000-00-00', ' 250mg, 3ml', 'Caja', NULL, 54, NULL, '2026-05-01 10:45:27'),
(20, 'Cartucho Bond Elut SAX', 'Agilent', 'Agilent', NULL, NULL, '500 mg, 3 mL', 'Caja', 0, 50, NULL, '2026-05-01 10:45:27'),
(21, 'Tubo ambar para centrifuga', 'Eppendorf', NULL, '4427B', '0000-00-00', '50mL', 'Bolsa', 7, 25, NULL, '2026-05-01 10:45:27'),
(22, 'Tubo para centrifuga', NULL, 'El Matraz', 'B00679WA', '2025-06-17', '15 ml', 'Bolsa', 1, 50, NULL, '2026-05-01 10:45:27'),
(23, 'Tubo ambar para centrifuga', 'VWR', 'VWR', '801501', '0000-00-00', '50 ml', 'Bolsa', 3, 50, NULL, '2026-05-01 10:45:27'),
(24, 'Criotubos base cónica con tapa anaranjada (para Mini-Beadbeater)', 'VIAND', 'El Matraz', 'MCTB02-500', '2025-06-17', '2 mL', 'Bolsa', 1, 500, NULL, '2026-05-01 10:45:27'),
(25, 'Econofiltro Nylon', 'Agilent', 'Agilent', '5190-5270', '0000-00-00', '13mm, 0.45um', 'Bolsa', 2, 250, NULL, '2026-05-01 10:45:27'),
(26, 'Econofiltro Nylon', 'Agilent', 'Agilent', '5190-5271', '0000-00-00', '25mm, 0.2um', 'Bolsa', 4, 250, NULL, '2026-05-01 10:45:27'),
(27, 'Econofiltro PTFE', 'Agilent', 'Agilent', '5190-5265', '0000-00-00', '13mm, 0.2um', 'Bolsa', 5, 250, NULL, '2026-05-01 10:45:27'),
(28, 'Econofiltro PTFE', 'Agilent', 'Agilent', '5190-5267', '0000-00-00', '25mm, 0.2um', 'Bolsa', 8, 250, NULL, '2026-05-01 10:45:27'),
(29, 'Econofiltro PVDF', 'Agilent', 'Agilent', 'Lot: 335027148', NULL, '25mm, 0.45um ', 'Bolsa', 4, 250, NULL, '2026-05-01 10:45:27'),
(30, 'Guantes nitrilo L', 'Duraskin', NULL, 'T2010WC/L', '0000-00-00', 'Grande', 'Caja', 9, 100, NULL, '2026-05-01 10:45:27'),
(31, 'Guantes nitrilo M', 'Duraskin', NULL, 'T2010WC/M', '0000-00-00', 'Mediano', 'Caja', 9, 100, NULL, '2026-05-01 10:45:27'),
(32, 'Guantes nitrilo S', 'Duraskin', NULL, 'T2010WC/S', '0000-00-00', 'Chico', 'Caja', 8, 100, NULL, '2026-05-01 10:45:27'),
(33, 'Guantes nitrilo XS', 'Tuff Grip', NULL, '43-20WN-XS', '0000-00-00', 'Extrachico', 'Caja', 4, 100, NULL, '2026-05-01 10:45:27'),
(34, 'Inserto de vidrio', 'VWR', 'VWR', NULL, '0000-00-00', '0.25 ml ', 'Bolsa', 2, 250, NULL, '2026-05-01 10:45:27'),
(35, 'Inserto de vidrio', 'Agilent', 'Agilent', NULL, NULL, '250 ul', 'Caja', 1, 100, NULL, '2026-05-01 10:45:27'),
(36, 'Toallitas de limpieza delicada', 'Kimberly-Clark', NULL, '34155', '0000-00-00', '11.2 x 21.3 cm', 'Caja', 9, 286, NULL, '2026-05-01 10:45:27'),
(37, 'Filtro de membrana Nylon', NULL, NULL, NULL, '0000-00-00', ' 0.45 um, 47 mm', 'Caja', 2, 100, NULL, '2026-05-01 10:45:27'),
(38, 'Filtro de membrana PTFE', 'CTR scientific', NULL, 'Lot: A29547351', '2023-11-13', '47mm, 0.2um', 'Caja', 1, 100, NULL, '2026-05-01 10:45:27'),
(39, 'Microtubo conico con tapa de rosca color negro', 'VWR', 'VWR', 'Lot: 101800T1', NULL, '1,5 mL', 'Bolsa', 1, 100, NULL, '2026-05-01 10:45:27'),
(40, 'Microtubo con tapa de rosca color negro', 'Axygen', NULL, 'MCT-175-C', '0000-00-00', '2 mL', 'Caja', 1, 100, NULL, '2026-05-01 10:45:27'),
(41, 'Microtubo con tapas planas unidas', 'Axygen', NULL, NULL, NULL, '1,7 mL', 'Caja', 2, 500, NULL, '2026-05-01 10:45:27'),
(42, 'Microtubo cónico de plástico con tapas planas unidas', NULL, 'Favelab', NULL, '0000-00-00', '1,5 mL', 'Caja', 1, 1000, NULL, '2026-05-01 10:45:27'),
(43, 'Microtubos conico con tapas planas unidas', 'Neptune', 'Favelab', '3745.A.X', '0000-00-00', '1.6 mL', 'Caja', 3, 500, NULL, '2026-05-01 10:45:27'),
(44, 'Microtubos de centrífuga con tapas planas unidas', 'Neptune', 'Favelab', '3765.X', '2007-02-23', '2 mL', 'Caja', 2, 500, NULL, '2026-05-01 10:45:27'),
(45, 'Papel Parafilm', 'Parafilm', NULL, 'Lot: P0600135', '2023-11-13', '10 cm x 38 mt', 'Rollo', 1, 1, NULL, '2026-05-01 10:45:27'),
(46, 'Caja con puntas para micropipeta 10 uL', NULL, NULL, 'RT-10', '0000-00-00', '10 ul', 'Caja', 2, 1, NULL, '2026-05-01 10:45:27'),
(47, 'Punta para micropipeta 10 uL', 'QSP', NULL, '104-Q', '0000-00-00', '10 ul', 'Bolsa', 9, 1000, NULL, '2026-05-01 10:45:27'),
(48, 'Punta para micropipeta 200uL', NULL, 'Favelab', NULL, '0000-00-00', '200 ul', 'Bolsa', 9, 1000, NULL, '2026-05-01 10:45:27'),
(49, 'Punta para micropipeta 1000 uL', 'QSP', NULL, '111-Q', '0000-00-00', '1000 ul', 'Bolsa', 5, 1000, NULL, '2026-05-01 10:45:27'),
(50, 'Punta para micropipeta 5000 uL', 'RAININ', NULL, 'Lot:3405', '0000-00-00', '5000 ul', 'Bolsa', 2, 500, NULL, '2026-05-01 10:45:27'),
(51, 'Papel secante color café', NULL, NULL, NULL, '2024-09-26', '-', 'Rollo', 0, 1, NULL, '2026-05-01 10:45:27'),
(52, 'Papel secante color azul', 'Scott Shop', NULL, NULL, '2024-09-26', '-', 'Rollo', 11, 1, NULL, '2026-05-01 10:45:27'),
(53, 'Contenedor para punzocortantes', 'Bemis Manufacturing Company', NULL, NULL, '0000-00-00', '2 L', 'Bote', 1, 1, NULL, '2026-05-01 10:45:27'),
(54, 'Contenedor para punzocortantes', NULL, NULL, NULL, '0000-00-00', '500 mL', 'Bote', 11, 1, NULL, '2026-05-01 10:45:27'),
(55, 'Tiras reactivas de pH 0-6', NULL, NULL, NULL, '0000-00-00', '-', 'Caja', 1, 100, NULL, '2026-05-01 10:45:27'),
(56, 'Tiras reactivas de pH 1-14', NULL, NULL, NULL, '0000-00-00', '-', 'Caja', 1, 100, NULL, '2026-05-01 10:45:27'),
(57, 'Mircrovial de vidrio ámbar con tapa y rosca', 'KIMBLE', NULL, 'ART.NO 60793A-1232', '0000-00-00', '1,5 mL', 'Caja', 2, 100, NULL, '2026-05-01 10:45:27'),
(58, 'Mircrovial de vidrio ámbar con rosca sin tapa', 'Agilent', NULL, 'Lot: 22339222', '2023-11-13', '2 mL', 'Caja', 2, 100, NULL, '2026-05-01 10:45:27'),
(59, 'Microvial de vidrio PTFE/Silicone', 'Phenomenex', NULL, NULL, NULL, '700 uL', 'Bolsa', 1, 100, NULL, '2026-05-01 10:45:27'),
(60, 'Viales centello con taparrosca color blanco', '-', '-', '14672-380', '0000-00-00', '20 mL', 'Caja', 2, 100, NULL, '2026-05-01 10:45:27'),
(61, 'Whirl-Pak® Sample Bags, Nasco®, Capacity:207 mL (7oz.)', 'Favelab', NULL, 'B00992WA', '0000-00-00', NULL, NULL, 1, NULL, NULL, '2026-05-01 10:45:27'),
(62, 'Whirl-Pak® Sample Bags, Nasco®, Capacity=1065 mL (36oz.)', 'Favelab', NULL, 'B00994WA', '0000-00-00', NULL, NULL, 1, NULL, NULL, '2026-05-01 10:45:27'),
(63, 'Whirl-Pak® Sample Bags, Nasco®, Capacity=118 mL (4oz.)', 'Favelab', NULL, 'B00679WA', '0000-00-00', NULL, NULL, 1, NULL, NULL, '2026-05-01 10:45:27'),
(64, 'Bata quirúrgica unitalla', NULL, NULL, NULL, '0000-00-00', NULL, 'Bolsa', 2, 1, NULL, '2026-05-01 10:45:27'),
(65, 'Bolsas plastico sandwich', 'First street', NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, '2026-05-01 10:45:27'),
(66, 'Bolsas Rojas RPBI XG', NULL, NULL, 'Lot: A29547351', '2023-08-14', NULL, NULL, 1, NULL, NULL, '2026-05-01 10:45:27'),
(67, 'Jeringa desechable 26G 5/8” 1ml', 'intermedic', NULL, '14672-608', '0000-00-00', NULL, NULL, 1, NULL, NULL, '2026-05-01 10:45:27'),
(68, 'Filtro venteo p/desionizador', 'MiliQ', NULL, 'TANKMPK03', '0000-00-00', NULL, NULL, 1, NULL, NULL, '2026-05-01 10:45:27'),
(69, 'Papel autoadherible transparente', 'PLASTIFLEX', NULL, NULL, '0000-00-00', NULL, NULL, 1, NULL, NULL, '2026-05-01 10:45:27'),
(70, 'Papel encerado', 'CUT-RITE Reynolds', NULL, NULL, '0000-00-00', NULL, NULL, 1, NULL, NULL, '2026-05-01 10:45:27'),
(71, 'Pipetas Pasteur 5 ¾”', 'VWR', NULL, '14672-608', '0000-00-00', NULL, NULL, 6, NULL, NULL, '2026-05-01 10:45:27'),
(72, 'Pipetas Pasteur 9”', 'VWR', NULL, '14672-380', '0000-00-00', NULL, NULL, 9, NULL, NULL, '2026-05-01 10:45:27');

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
  KEY `idx_muestras_extraccion_procesamiento_id` (`procesamiento_id`),
  KEY `idx_muestras_extraccion_creado_por` (`creado_por`),
  KEY `idx_muestras_extraccion_actualizado_por` (`actualizado_por`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `muestras_procesamiento`
--

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
  KEY `idx_muestras_procesamiento_recepcion_id` (`recepcion_id`),
  KEY `idx_muestras_procesamiento_creado_por` (`creado_por`),
  KEY `idx_muestras_procesamiento_actualizado_por` (`actualizado_por`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
  KEY `idx_muestras_recepcion_creado_por` (`creado_por`),
  KEY `idx_muestras_recepcion_actualizado_por` (`actualizado_por`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `permisos`
--

DROP TABLE IF EXISTS `permisos`;
CREATE TABLE IF NOT EXISTS `permisos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clave` varchar(80) NOT NULL,
  `nombre` varchar(120) NOT NULL,
  `descripcion` text,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_permisos_clave` (`clave`)
) ENGINE=InnoDB AUTO_INCREMENT=1961 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `permisos`
--

INSERT INTO `permisos` (`id`, `clave`, `nombre`, `descripcion`, `activo`) VALUES
(1, 'dashboard', 'Dashboard', 'Acceso al panel principal', 1),
(2, 'reactivos', 'Reactivos', 'Gestion de catalogo de reactivos', 1),
(3, 'consumibles', 'Consumibles', 'Gestion de consumibles', 1),
(4, 'equipos', 'Equipos', 'Gestion de equipos', 1),
(5, 'muestras', 'Muestras', 'Gestion de muestras', 1),
(6, 'movimientos', 'Movimientos', 'Gestion de movimientos de inventario', 1),
(7, 'mantenimiento', 'Mantenimiento', 'Gestion de mantenimientos', 1),
(8, 'documentos', 'Documentos SGC', 'Gestion documental', 1),
(9, 'roles', 'Roles', 'Administracion de roles y permisos', 1),
(10, 'usuarios', 'Usuarios', 'Administracion de usuarios', 1);

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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`id`, `nombre`, `descripcion`, `es_sistemico`, `activo`) VALUES
(1, 'Super Admin', 'Administrador principal con acceso total a todos los módulos y permisos del sistema.', 1, 1),
(3, 'Consulta', 'Rol base de solo lectura', 1, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rol_permisos`
--

DROP TABLE IF EXISTS `rol_permisos`;
CREATE TABLE IF NOT EXISTS `rol_permisos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_rol` int NOT NULL,
  `id_permiso` int NOT NULL,
  `can_read` tinyint(1) NOT NULL DEFAULT '0',
  `can_create` tinyint(1) NOT NULL DEFAULT '0',
  `can_update` tinyint(1) NOT NULL DEFAULT '0',
  `can_delete` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rol_permiso` (`id_rol`,`id_permiso`),
  KEY `fk_rol_permisos_permiso` (`id_permiso`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `rol_permisos`
--

INSERT INTO `rol_permisos` (`id`, `id_rol`, `id_permiso`, `can_read`, `can_create`, `can_update`, `can_delete`) VALUES
(1, 1, 1, 1, 1, 1, 1),
(2, 1, 2, 1, 1, 1, 1),
(3, 1, 3, 1, 1, 1, 1),
(4, 1, 4, 1, 1, 1, 1),
(5, 1, 5, 1, 1, 1, 1),
(6, 1, 6, 1, 1, 1, 1),
(7, 1, 7, 1, 1, 1, 1),
(8, 1, 8, 1, 1, 1, 1),
(9, 1, 9, 1, 1, 1, 1),
(10, 1, 10, 1, 1, 1, 1),
(21, 3, 1, 1, 1, 1, 1),
(22, 3, 2, 1, 1, 1, 1),
(23, 3, 3, 1, 1, 1, 1),
(24, 3, 4, 1, 1, 1, 1),
(25, 3, 5, 1, 1, 1, 1),
(26, 3, 6, 1, 1, 1, 1),
(27, 3, 7, 1, 1, 1, 1),
(28, 3, 8, 1, 1, 1, 1),
(29, 3, 9, 1, 1, 1, 1),
(30, 3, 10, 1, 1, 1, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `id_rol` int NOT NULL,
  `departamento` varchar(100) DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `id_rol` (`id_rol`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombre`, `email`, `activo`, `id_rol`, `departamento`, `creado_en`) VALUES
(1, 'Administrador Ficotox', 'ficotox108@cicese.mx', 1, 1, 'Administración', '2026-05-01 10:20:05'),
(2, 'qa.consumibles', 'qa.consumibles@ficotox.com', 1, 3, NULL, '2026-05-01 10:33:20');

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
-- Filtros para la tabla `muestras_extraccion`
--
ALTER TABLE `muestras_extraccion`
  ADD CONSTRAINT `fk_muestras_extraccion_actualizado_por` FOREIGN KEY (`actualizado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_muestras_extraccion_creado_por` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_muestras_extraccion_procesamiento` FOREIGN KEY (`procesamiento_id`) REFERENCES `muestras_procesamiento` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `muestras_procesamiento`
--
ALTER TABLE `muestras_procesamiento`
  ADD CONSTRAINT `fk_muestras_procesamiento_actualizado_por` FOREIGN KEY (`actualizado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_muestras_procesamiento_creado_por` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_muestras_procesamiento_recepcion` FOREIGN KEY (`recepcion_id`) REFERENCES `muestras_recepcion` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `muestras_recepcion`
--
ALTER TABLE `muestras_recepcion`
  ADD CONSTRAINT `fk_muestras_recepcion_actualizado_por` FOREIGN KEY (`actualizado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_muestras_recepcion_creado_por` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

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
-- Filtros para la tabla `rol_permisos`
--
ALTER TABLE `rol_permisos`
  ADD CONSTRAINT `fk_rol_permisos_permiso` FOREIGN KEY (`id_permiso`) REFERENCES `permisos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rol_permisos_rol` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id`) ON DELETE RESTRICT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
