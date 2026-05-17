# Reporte del proyecto FICOTOX

## 1. Introduccion

FICOTOX es una aplicacion web orientada a la gestion operativa de un laboratorio. Su objetivo principal es centralizar el control de inventario, muestras, movimientos, mantenimiento, documentos y usuarios en un solo sistema accesible desde navegador.

La aplicacion esta pensada para apoyar actividades de laboratorio donde es importante mantener trazabilidad: saber que reactivos o consumibles se tienen disponibles, que materiales se descontaron durante el procesamiento de muestras, que equipos requieren mantenimiento, que documentos se han cargado y que usuarios tienen permiso para realizar cada accion.

El proyecto esta dividido en tres partes principales:

- Backend: API desarrollada en Python con Flask.
- Frontend: interfaz web estatica construida con HTML, CSS, JavaScript, Bootstrap y Bootstrap Icons.
- Scripts de respaldo: herramientas para generar copias de seguridad de la base de datos y del codigo, con opcion de copiarlas a OneDrive.

## 2. Objetivo de la aplicacion

El objetivo de FICOTOX es facilitar la administracion digital de procesos de laboratorio, reduciendo el uso de registros dispersos y permitiendo que la informacion se consulte, capture y actualice desde una interfaz unica.

La aplicacion permite:

- Registrar y consultar reactivos por categoria.
- Registrar y consultar consumibles.
- Gestionar equipos de laboratorio.
- Programar y controlar mantenimientos.
- Registrar recepcion, procesamiento y extraccion de muestras.
- Descontar insumos del inventario cuando se usan en muestras.
- Consultar movimientos de entrada y salida.
- Gestionar documentos y reportes PDF.
- Administrar usuarios, roles y permisos.
- Consultar metricas generales desde un dashboard.
- Generar respaldos automaticos o manuales de base de datos y codigo.

## 3. Alcance funcional

FICOTOX cubre varios procesos clave del laboratorio. No se limita a ser un inventario simple, sino que relaciona inventario, muestras, movimientos, mantenimiento y control documental.

### Dashboard

El dashboard muestra indicadores generales del sistema. Presenta totales de reactivos, consumibles, equipos y muestras, ademas de entradas y salidas de inventario. Tambien muestra mantenimientos proximos, pendientes, realizados o vencidos, junto con movimientos recientes.

Este modulo funciona como una vista ejecutiva para revisar rapidamente el estado actual del laboratorio.

### Inventario de reactivos

El modulo de reactivos permite registrar sustancias, materiales de referencia, columnas cromatograficas y otros insumos quimicos. Los reactivos se manejan por categorias para adaptar los campos del formulario al tipo de material capturado.

Entre las categorias contempladas estan:

- Acidos.
- Alcoholes y solventes organicos.
- Compuestos de Amonio.
- Compuestos de Sodio.
- Estandares preparados.
- Materiales de Referencia.
- Miscelaneos.
- Columnas cromatograficas.

El sistema permite captura manual, edicion, eliminacion, consulta e importacion desde archivos Excel. Durante la importacion, el backend normaliza encabezados, identifica hojas validas, ignora hojas que no corresponden a reactivos y reporta errores por fila sin detener toda la carga.

### Inventario de consumibles

El modulo de consumibles permite administrar materiales de uso frecuente dentro del laboratorio. Estos materiales tambien pueden participar en movimientos de inventario y descontarse cuando se utilizan en procesos de muestras.

El sistema permite listar, crear, actualizar, eliminar e importar consumibles.

### Equipos y mantenimiento

FICOTOX incluye gestion de equipos y mantenimientos. Los equipos pueden registrarse y consultarse, mientras que los mantenimientos permiten llevar control de actividades programadas, en proceso, completadas o vencidas.

Este modulo es importante para mantener evidencia del estado operativo de los equipos y para relacionar reportes de mantenimiento con documentos PDF.

### Muestras

El modulo de muestras esta dividido en tres etapas:

- Recepcion.
- Procesamiento.
- Extraccion.

La recepcion permite registrar la entrada de muestras al sistema. El procesamiento y la extraccion permiten documentar actividades posteriores y relacionar los insumos utilizados.

Una caracteristica importante es que el uso de reactivos o consumibles durante procesamiento o extraccion puede generar descuentos automaticos en inventario. Esto evita que el inventario quede separado de la operacion real del laboratorio.

### Movimientos

El modulo de movimientos registra entradas y salidas de inventario. En particular, muestra descuentos de reactivos y consumibles, asi como un historial general.

La pantalla de movimientos presenta conteos por:

- Total.
- Hoy.
- Semana.
- Mes.
- Reactivos.
- Consumibles.

Esto permite revisar rapidamente la actividad reciente del inventario y consultar en que procesos se utilizaron los insumos.

### Documentos SGC y reportes

El sistema permite registrar documentos del Sistema de Gestion de Calidad, especialmente reportes de mantenimiento en formato PDF.

Los reportes se guardan con codigo, version, estado, fecha y archivo asociado. Tambien se relacionan con un mantenimiento existente, lo cual ayuda a conservar evidencia documental vinculada al proceso operativo.

### Trazabilidad

El modulo de trazabilidad resume el flujo general del sistema. Permite consultar eventos recientes, movimientos y enlaces entre muestras e insumos utilizados.

La trazabilidad es uno de los aspectos mas relevantes del proyecto porque permite reconstruir que ocurrio con los materiales, que muestras fueron procesadas y que movimientos se generaron.

### Usuarios, roles y permisos

FICOTOX incluye administracion de usuarios y roles. El backend utiliza autenticacion con JWT y validacion de permisos por modulo y accion.

El sistema contempla permisos para modulos como:

- Dashboard.
- Reactivos.
- Consumibles.
- Movimientos.
- Muestras.
- Documentos.
- Usuarios.
- Roles.

Esto permite que no todos los usuarios tengan acceso a las mismas operaciones. Por ejemplo, un usuario puede tener permiso de lectura en inventario, pero no permiso para eliminar registros o administrar roles.

## 4. Arquitectura general

La aplicacion sigue una arquitectura cliente-servidor.

El frontend corre en el navegador y se comunica con el backend mediante peticiones HTTP a endpoints REST. El backend procesa las solicitudes, valida permisos, consulta o modifica la base de datos y devuelve respuestas JSON.

La estructura general es:

```text
frontend/
  index.html
  styles.css
  app.js

backend/
  run.py
  requirements.txt
  app/
    __init__.py
    config.py
    extensions.py
    modules/
    utils/

scripts/
  backup_ficotox.py
  backup-ficotox.cmd
  install-ficotox-backup-tasks.cmd

docs/
  backups.md
  reporte_ficotox.md
```

### Backend

El backend esta construido con Flask. Usa una fabrica de aplicacion en `backend/app/__init__.py`, donde se inicializan extensiones, se registran blueprints y se aseguran los esquemas necesarios al arrancar.

Los modulos se organizan por dominio funcional:

- `auth`: autenticacion local y Microsoft.
- `admin`: usuarios, roles y permisos.
- `dashboard`: metricas generales.
- `inventory`: reactivos, consumibles, equipos, mantenimientos y movimientos.
- `samples`: recepcion, procesamiento y extraccion de muestras.
- `documents`: documentos y reportes PDF.
- `traceability`: consultas de trazabilidad.

### Frontend

El frontend es una aplicacion estatica que no requiere proceso de compilacion. Esta formada por:

- `index.html`: estructura de pantallas, tablas, formularios y modales.
- `styles.css`: estilos visuales y responsivos.
- `app.js`: estado de la aplicacion, llamadas a la API, renderizado de tablas, formularios y eventos.

La navegacion se maneja desde JavaScript. Segun los permisos del usuario, se muestran u ocultan secciones de la interfaz.

### Base de datos

Por defecto, el sistema usa SQLite local en `backend/instance/ficotox.sqlite3`. Tambien permite usar MySQL o MariaDB mediante la variable `DATABASE_URL`.

El backend incluye funciones para asegurar tablas y columnas al iniciar. Esto actua como una migracion ligera, adecuada para desarrollo y despliegues sencillos.

### Seguridad

El sistema usa autenticacion mediante tokens JWT. Las rutas protegidas requieren un encabezado `Authorization: Bearer <token>`.

Ademas, los endpoints validan permisos mediante RBAC. Esto significa que no basta con estar autenticado; tambien se debe contar con permiso para el modulo y la accion solicitada.

La aplicacion tambien contempla autenticacion opcional con Microsoft Entra ID, configurable mediante variables de entorno.

## 5. Flujo operativo principal

Un flujo comun dentro de FICOTOX puede describirse asi:

1. Un usuario inicia sesion.
2. El sistema valida sus credenciales y emite un token JWT.
3. El frontend carga permisos y muestra los modulos disponibles.
4. El usuario registra o importa reactivos y consumibles.
5. Se registran muestras en recepcion.
6. Durante procesamiento o extraccion, se seleccionan insumos utilizados.
7. El backend descuenta esos insumos del inventario.
8. Se generan movimientos de salida.
9. El dashboard y la trazabilidad reflejan los cambios.
10. Si hay mantenimiento, se registra la actividad y se pueden adjuntar reportes PDF.
11. Periodicamente se generan respaldos de base de datos y codigo.

## 6. Herramientas y metodologias

### Herramientas utilizadas

| Herramienta | Uso dentro del proyecto |
| --- | --- |
| Python 3.11+ | Lenguaje principal del backend. |
| Flask | Framework web usado para construir la API y servir el frontend. |
| Flask-SQLAlchemy | Integracion con SQLAlchemy para manejar conexion a base de datos. |
| SQLAlchemy | Ejecucion de consultas SQL y manejo de interaccion con SQLite o MySQL/MariaDB. |
| SQLite | Base de datos local por defecto para desarrollo o uso sencillo. |
| MySQL/MariaDB | Motor opcional para ambientes con mayor necesidad de concurrencia o despliegue productivo. |
| PyJWT | Generacion y validacion de tokens JWT para sesiones de API. |
| Flask-CORS | Configuracion de CORS para permitir comunicacion segura con rutas `/api`. |
| python-dotenv | Carga de variables de entorno desde archivo `.env`. |
| Requests | Soporte para integraciones HTTP, especialmente en autenticacion Microsoft. |
| HTML | Estructura de la interfaz web. |
| CSS | Personalizacion visual, layout y responsividad. |
| JavaScript vanilla | Logica del frontend, consumo de API, renderizado y control de eventos. |
| Bootstrap 5 | Componentes visuales, grid responsivo, modales, botones y tablas. |
| Bootstrap Icons | Iconografia de navegacion y acciones. |
| SheetJS | Lectura de archivos Excel desde el navegador para importacion de reactivos y consumibles. |
| MSAL Browser | Soporte para inicio de sesion con Microsoft Entra ID. |
| OneDrive | Destino de sincronizacion para copias de seguridad. |
| rclone | Alternativa para copiar respaldos a un remoto de OneDrive en entornos de servidor. |
| mysqldump | Respaldo de base de datos cuando se usa MySQL o MariaDB. |
| Git | Control de versiones del codigo fuente. |

### Metodologias y practicas aplicadas

| Metodologia o practica | Aplicacion en el proyecto |
| --- | --- |
| Arquitectura modular | El backend se divide en blueprints por dominio: autenticacion, inventario, muestras, documentos, dashboard, trazabilidad y administracion. |
| Separacion de responsabilidades | El frontend gestiona presentacion e interaccion; el backend valida, persiste y expone datos; los scripts manejan respaldos. |
| API REST | La comunicacion entre frontend y backend se realiza mediante endpoints HTTP con respuestas JSON. |
| RBAC | Los permisos se controlan por roles, modulos y acciones. |
| Autenticacion basada en tokens | Se usa JWT para mantener sesiones de API sin depender de sesiones tradicionales del servidor. |
| Configuracion por entorno | Secretos, base de datos, CORS y autenticacion Microsoft se configuran mediante variables de entorno. |
| Migraciones ligeras | Al arrancar, el backend asegura tablas y columnas necesarias para reducir friccion en instalaciones locales. |
| Importacion validada por filas | En cargas Excel, el sistema procesa registros individualmente y reporta errores sin cancelar todo el archivo. |
| Trazabilidad operativa | Los descuentos de inventario generan movimientos que permiten reconstruir el uso de insumos. |
| Diseno responsivo | La interfaz usa Bootstrap y estilos propios para adaptarse a distintos tamanos de pantalla. |
| Respaldo periodico | Scripts automatizan copias de seguridad de base de datos y codigo hacia almacenamiento local y OneDrive. |
| Control de acceso por endpoint | Las rutas protegidas usan autenticacion y validacion de permisos antes de ejecutar operaciones. |
| Manejo de estados documentales | Los reportes pueden registrar estados como borrador, revision, aprobado o publicado. |
| Desarrollo incremental | La estructura permite agregar modulos o endpoints sin alterar toda la aplicacion. |

## 7. Beneficios del sistema

FICOTOX aporta beneficios importantes para la operacion del laboratorio:

- Centraliza informacion que normalmente podria estar distribuida en hojas de calculo o documentos independientes.
- Reduce errores de inventario al descontar insumos desde los procesos de muestras.
- Facilita auditorias internas mediante trazabilidad y movimientos historicos.
- Mejora el control de usuarios con roles y permisos.
- Permite importar datos desde Excel, lo cual facilita migrar informacion previa.
- Da visibilidad rapida mediante indicadores en dashboard.
- Conserva reportes PDF vinculados con mantenimientos.
- Incluye un mecanismo de respaldo para proteger informacion y codigo.

## 8. Resultados

Durante las actividades de desarrollo e implementacion del proyecto FICOTOX se obtuvieron los siguientes resultados:

### Aplicacion web funcional

Se obtuvo una aplicacion web operativa que permite acceder a diferentes modulos desde una interfaz centralizada. El sistema cuenta con una pantalla principal tipo dashboard y secciones para inventario, muestras, movimientos, mantenimiento, documentos, roles y usuarios.

Como resultado, el laboratorio puede consultar y capturar informacion desde un mismo entorno, evitando depender exclusivamente de archivos separados o registros manuales.

### Backend modular implementado

Se implemento un backend en Flask organizado por modulos funcionales. Cada modulo atiende una parte especifica del sistema, por ejemplo autenticacion, administracion, inventario, muestras, documentos, dashboard y trazabilidad.

Este resultado permite que el proyecto sea mas facil de mantener, ya que las funciones principales no estan mezcladas en un solo archivo. Tambien facilita agregar nuevas caracteristicas en el futuro.

### Inventario de reactivos y consumibles

Se logro implementar el registro, consulta, modificacion, eliminacion e importacion de reactivos y consumibles. En el caso de reactivos, el sistema maneja categorias especificas y formularios adaptados al tipo de material.

Tambien se obtuvo una funcionalidad de importacion desde Excel, util para cargar informacion existente sin capturar todos los registros manualmente.

### Gestion de muestras por etapas

Se obtuvo un flujo dividido en recepcion, procesamiento y extraccion de muestras. Esto permite registrar la evolucion de las muestras dentro del laboratorio y conservar informacion por etapa.

El resultado principal de este modulo es que las actividades de muestras pueden relacionarse con el uso de insumos, fortaleciendo la trazabilidad del proceso.

### Descuento de inventario y movimientos

Se implemento el descuento de reactivos y consumibles cuando son utilizados en procesamiento o extraccion de muestras. Cada descuento genera un movimiento en el historial.

Este resultado es importante porque conecta la operacion del laboratorio con el inventario disponible. Asi, cuando se usan materiales, el sistema puede reflejarlo automaticamente en existencias y movimientos.

### Dashboard con indicadores

Se obtuvo un dashboard con metricas generales, como total de reactivos, consumibles, equipos, muestras, entradas, salidas y mantenimientos. Tambien muestra movimientos recientes y datos relevantes para revisar rapidamente el estado del laboratorio.

Este resultado ayuda a tener una vista resumida de la informacion mas importante sin entrar modulo por modulo.

### Gestion de equipos y mantenimientos

Se implemento la administracion de equipos y mantenimientos, incluyendo estados como programado, en proceso, completado o vencido.

El resultado obtenido es un control mas claro sobre las actividades de mantenimiento, lo cual ayuda a conservar evidencia del estado operativo de los equipos.

### Documentos y reportes PDF

Se obtuvo una funcionalidad para registrar reportes de mantenimiento en formato PDF. Los reportes se vinculan con mantenimientos existentes y se almacenan con informacion como codigo, version, estado y fecha.

Esto permite conservar evidencia documental dentro del sistema y relacionarla con actividades de mantenimiento.

### Seguridad con usuarios, roles y permisos

Se implemento autenticacion mediante JWT y control de permisos basado en roles. El sistema permite administrar usuarios y definir accesos por modulo y accion.

Como resultado, la aplicacion puede restringir funciones sensibles y mostrar u ocultar secciones segun los permisos del usuario.

### Trazabilidad de operaciones

Se obtuvo un modulo de trazabilidad que permite consultar eventos recientes y movimientos relacionados con el uso de inventario.

Este resultado permite reconstruir parte del historial operativo del laboratorio, especialmente en relacion con muestras, reactivos, consumibles y movimientos.

### Respaldo de informacion y codigo

Se desarrollaron scripts para generar respaldos de la base de datos y del codigo fuente. Los respaldos pueden guardarse localmente y copiarse a OneDrive.

Tambien se incluyo una opcion para programar respaldos periodicos, por ejemplo de base de datos cada 15 dias y de codigo cada 3 meses.

### Documentacion del proyecto

Se genero documentacion tecnica y funcional del sistema, incluyendo descripcion del backend, frontend, respaldos y este reporte general del proyecto.

El resultado es que el proyecto cuenta con una base documental que facilita su explicacion, mantenimiento y futura mejora.

En general, el resultado final es una aplicacion funcional para apoyar la gestion de laboratorio, con modulos conectados entre si, control de acceso, trazabilidad, importacion de datos, manejo documental y mecanismos de respaldo.

## 9. Limitaciones y areas de mejora

Aunque la aplicacion es funcional, se identifican areas que podrian fortalecerse:

- El frontend esta concentrado principalmente en un archivo JavaScript grande; a futuro conviene separarlo por modulos.
- Las migraciones son ligeras; para produccion seria recomendable usar migraciones versionadas con Alembic o Flask-Migrate.
- SQLite es practico para entorno local, pero para produccion conviene MySQL/MariaDB u otro motor administrado.
- Seria recomendable agregar pruebas automatizadas para endpoints criticos como autenticacion, inventario, muestras y movimientos.
- Tambien seria util agregar auditoria detallada de acciones de usuario, especialmente para eliminaciones o cambios sensibles.

## 10. Conclusion

FICOTOX es una aplicacion web de gestion de laboratorio que integra inventario, muestras, movimientos, mantenimiento, documentos, usuarios y trazabilidad. Su diseno modular permite mantener cada area funcional separada y facilita el crecimiento del sistema.

El proyecto utiliza herramientas adecuadas para una aplicacion web administrativa: Flask para el backend, JavaScript y Bootstrap para el frontend, SQLAlchemy para datos, JWT para autenticacion, RBAC para permisos y scripts de respaldo para proteger la informacion.

En conjunto, la aplicacion mejora el control operativo del laboratorio y proporciona una base solida para continuar agregando funciones, reportes, validaciones y automatizaciones.
