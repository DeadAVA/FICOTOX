# Manual de Usuario - FICOTOX

## 1. Objetivo del sistema

FICOTOX es un sistema integrado para la gestion de laboratorio. Permite administrar inventario, muestras, movimientos, equipos, mantenimientos, documentos del SGC, usuarios, roles y permisos.

El sistema esta orientado al seguimiento de actividades de laboratorio bajo un flujo controlado:

1. Registro de inventario y equipos.
2. Recepcion de muestras.
3. Procesamiento de muestras.
4. Extraccion de muestras.
5. Registro automatico o manual de movimientos.
6. Consulta de reportes, documentos y trazabilidad.

## 2. Acceso al sistema

1. Abra el sistema en el navegador (`http://localhost:3000` en desarrollo o la direccion que le indique el laboratorio).
2. Capture su correo institucional y su contrasena y presione **Entrar**.
4. Al iniciar sesion correctamente, el sistema mostrara la pantalla de **Inicio**.

Si no puede ingresar, contacte al administrador del sistema para validar que su usuario este dado de alta, activo, con al menos un rol vigente y con contrasena definida. Si entra pero solo ve el mensaje "Sin permisos asignados", su cuenta no tiene roles vigentes: pida a la administracion que le asigne uno.

### 2.1 Seguridad de la sesion

- **Intentos fallidos**: despues de 5 intentos fallidos en 15 minutos la cuenta se bloquea 15 minutos (tambien cuentan las confirmaciones de contrasena fallidas). El mensaje es siempre "Correo o contraseña incorrectos...". La administracion puede desbloquearla antes.
- **Inactividad**: tras 30 minutos sin usar el sistema, la sesion se cierra. Un minuto antes aparece el aviso **"Tu sesión está por cerrarse"** con el boton **Seguir trabajando**. Si se cierra, vera **"Sesión cerrada por inactividad"**: escriba su contrasena y presione **Volver a entrar**; lo que estaba capturando sigue ahi. En todo caso la sesion dura como maximo 8 horas.
- **Confirmar identidad**: las acciones criticas (aprobar, autorizar, liberar, anular, restaurar, dar de baja, cancelar, cerrar una muestra, dar visto bueno y los cambios de usuarios) piden su contrasena en el mismo dialogo donde escribe el motivo o firma. Si una accion no la pidio, aparece el dialogo **"Confirma tu identidad"** sin salir del formulario. 
- **Cuenta fuera de vigencia**: si su cuenta aun no inicia o ya termino, vera "Tu acceso no está vigente; contacta al administrador". Si vence con la sesion abierta, el sistema lo regresa a la pantalla de acceso.
- **Mi cuenta** (menu de usuario, abajo a la izquierda): **Cambiar contraseña** (minimo 10 caracteres, distinta de su correo y de su nombre; cierra sus otras sesiones), **Cargo predeterminado** (si tiene varios roles) y **Cerrar sesión en todos los dispositivos**.
- Si la administracion restablece su contrasena, al entrar con la contrasena temporal debera elegir una nueva antes de continuar.

## 3. Navegacion general

La **barra lateral** (a la izquierda) tiene seis entradas, visibles segun los permisos del usuario:

- **Inicio**.
- **Muestras** ▸ Recepcion, Procesamiento, Extraccion, Analisis e Informes.
- **Inventario** ▸ Reactivos, Consumibles, Equipos, Mantenimiento y Movimientos.
- **Calidad** ▸ Biblioteca, Incidencias y NC, y Auditoria.
- **Administracion** ▸ Usuarios y Roles.

Las entradas con ▸ se despliegan: al hacer clic en el nombre se abre la seccion y su primera pantalla; la flecha de la derecha solo abre o cierra la lista. La seccion en la que esta siempre queda abierta.

En la cabecera de la barra hay un icono de **busqueda** y el boton para contraer la barra a solo iconos (el sistema lo recuerda); abajo, su avatar y su nombre con el menu **Mi cuenta** y **Cerrar sesion**.

**Apariencia**: en **Mi cuenta › Apariencia** elija **Claro**, **Oscuro** o **Automatico** (sigue la configuracion de su sistema; es la opcion por omision). Tambien puede alternar entre claro y oscuro desde el menu de la cuenta (icono de sol o luna). La preferencia lo sigue en cualquier computadora y no se registra en la bitacora. Lo que se imprime (etiquetas, informes, NC) siempre sale en claro, y las firmas se ven sobre fondo claro. En el visor de la Biblioteca, el boton de luna (**Lectura nocturna**) oscurece las paginas del PDF para leer de noche, sin cambiar el documento.

**Mi cuenta** muestra su nombre, correo y sus roles vigentes. En **Foto de perfil** elija **Figura** (una de las 18 ilustraciones del catalogo; si no elige, el sistema le asigna una a partir de su correo) o **Foto** (una imagen suya). Para la foto: **Subir foto** o arrastrela al recuadro (JPG, PNG o WEBP, hasta 5 MB; las fotos HEIC del iPhone se exportan antes como JPG), encuadrela en la ventana de recorte (arrastre, zoom con el deslizador, la rueda o pellizcando, con vista previa grande y pequeña) y pulse **Guardar**. Puede volver a **Figura** sin perder la foto, y **Quitar foto** la borra. Su foto o figura aparece en toda la plataforma (barra lateral, listas, ventanas, Inicio, campana y Auditoria). Subir o quitar la foto queda en la bitacora (sin la imagen); quien administra usuarios puede quitar la foto de otra persona con motivo, pero no subir una por ella. En dispositivos moviles la barra se abre con el boton de menu (tres lineas).

Atajos y ayudas:

- El icono de busqueda (o `Ctrl+K` / `Cmd+K` en cualquier pantalla) abre la **busqueda universal** en una ventana centrada; es la misma barra del Inicio y da los mismos resultados. Vea la seccion 4.
- **Ayuda**: al pie de la barra lateral hay un enlace **Ayuda** con el manual resumido dentro de la plataforma (como buscar, el flujo de una muestra, extracciones, analisis, informes, inventario, auditoria, como corregir un registro y atajos). Sus temas tambien aparecen en el buscador.
- Los formularios de catalogo (reactivos, consumibles, equipos, mantenimiento, usuarios, roles) se abren en un panel lateral sin salir de la tabla.
- Los formatos de muestra e informe se abren en pantalla completa con una **guia de secciones** a la izquierda (arriba en el celular) que indica cuales estan completas (verde), cuales tienen faltantes (ambar) y en cual se encuentra; haga clic en una seccion para ir a ella.
- Al capturar, el formato se muestra **paso a paso**: solo una seccion abierta a la vez y un boton **Continuar** al final de cada una. Si prefiere verlo completo, elija **Todo** en el control de la guia (en el celular, el boton **Mostrar todo**); la eleccion se recuerda. Al consultar un registro terminado se muestra completo.
- Las muestras de un lote y los resultados por muestra se capturan en tarjetas (una por muestra) para que nada se salga de la pantalla; las tablas largas se desplazan dentro de su seccion.
- **Quien hizo que** se elige de una lista del personal autorizado (quien puede capturar muestras, quien puede aprobar, quien puede elaborar informes); el campo viene prellenado con la persona que tiene la sesion. Para alguien sin cuenta (alumnos, personal externo) elija **Otra persona...** y escriba el nombre.
- **Autollenado.** El sistema completa lo que ya sabe: folios consecutivos, fecha y hora, la muestra y el ID desde el paso anterior, la bolsa y los reactivos del protocolo, el **equipo operativo unico** que corresponde a cada paso (si hay dos cronometros y solo uno esta vigente, pone ese), el **lote de la solucion preparada** como folio de preparacion, el **siguiente folio de bitacora** de cada equipo (el ultimo anotado + 1) y, en analisis, el metodo, la referencia del procedimiento y el instrumento segun el tipo. Todo se puede cambiar; solo se llenan los campos vacios.
- **No se puede guardar sin la informacion minima.** Cada formato tiene secciones obligatorias y opcionales (marcadas "opcional" en la guia: por ejemplo Insumos adicionales, Equipos utilizados, Controles de calidad, la Decision de aceptacion al registrar una recepcion). Si falta algo obligatorio, al pulsar Guardar el sistema avisa "Falta informacion en ..." y abre la primera seccion incompleta; la guia marca en ambar todas las que faltan. La barra "n de m" cuenta solo las obligatorias; una opcional se pone en verde cuando se llena.
- En cada formato la cabecera muestra solo el siguiente paso (por ejemplo "Marcar revisado", "Aprobar", "Liberar") y **Guardar**; anular, restaurar, emitir enmienda o ver el PDF estan en el menu **Mas acciones** (icono de tres puntos).
- En las listas, el boton **Filtros** junto a la busqueda abre un panel de interruptores agrupados: arriba **Vista** ("Mis muestras", "Mostrar anuladas", "Mostrar bajas"...) y despues un grupo por filtro de la lista (Estado, Aceptacion, Analisis, Tipo...). En cada grupo solo se enciende una opcion a la vez; apagarla vuelve a mostrar todo. El numero en el boton indica cuantos filtros hay activos, **Limpiar filtros** los apaga todos y cada filtro activo aparece como una ficha que se quita con un clic.
- Los avisos de una fila (solicitud pendiente de autorizacion, pendiente de visto bueno, requiere enmienda, retenido, vencida...) se muestran como un **icono pequeño** junto al estado; al pasar el cursor (o enfocarlo con el teclado) se lee el aviso completo. En la ficha del registro el aviso aparece completo. Las opciones en gris con "Proximamente" (PSP, pigmentos, sedimentos) todavia no estan disponibles.
- Cada fila tiene un boton **⋯ Acciones** que agrupa todo lo que se puede hacer con ese registro: abrir, editar, procesar/extraer/analizar, rellenar, dar de baja, anular o restaurar. Hacer clic en la fila abre el registro.

### 3.1 Listas y ventana de detalle (todas las pantallas)

Las listas de inventario, movimientos, mantenimiento, incidencias y NC, por autorizar, por supervisar, usuarios y roles se usan igual (las de Muestras e Informes conservan su tabla y su forma de uso):

- **Buscar y filtrar**: el buscador y un solo boton **Filtros**. Dentro estan todos los filtros (interruptores agrupados, como Estado o Tipo), **Ordenar por** al final y **Limpiar filtros**. El boton muestra cuantos filtros hay activos.
- **Lista**: columnas alineadas con encabezados discretos; cada dato siempre en su columna y "—" cuando no hay valor. Nada se corta: el texto largo pasa de linea. En pantallas angostas cada renglon se ve como tarjeta.
- **Clic en un renglon**: abre una **ventana** al centro con lo principal del registro: datos rapidos, pestañas o secciones, las personas con su figura y las acciones que le tocan segun su estado y sus permisos. ↑/↓ pasan al registro anterior o siguiente; Esc, la × o un clic fuera la cierran.
- **Abrir formato completo** o **Abrir ficha completa**: en NC, incidencias y registros por supervisar la ventana es una vista rapida; para capturar o editar todo, abra el formato o la ficha (no cambiaron).
- **Menu ⋯ del renglon**: solo las acciones que aplican (anular, reponer, asignar…); "Ver" y "Abrir" ya no estan porque el clic abre la ventana.
- Excepcion: en la **Biblioteca**, el clic en un documento abre el visor, como siempre.

## 4. Inicio

El Inicio es una pantalla limpia: la **fecha**, el **saludo** (cambia segun la hora) y, en el centro, el **buscador**. Todo respeta sus permisos y alcances (por ejemplo, el Tecnico Analista solo ve sus muestras asignadas).

- **Buscador**: en computadora se enfoca solo al abrir el Inicio (en telefono, toquelo). Es el mismo buscador de la ventana `Ctrl/⌘ K` de la barra lateral. Sin escribir, al hacer clic solo aparecen sus **recientes**: lo que busco y lo que abrio desde la busqueda (hasta 8, el mas reciente primero). Un clic o **Enter** lo repite; la **×** quita uno y **Borrar recientes** los quita todos. Si no hay recientes, no se despliega nada. Los recientes son suyos y lo siguen en cualquier computadora; si un registro ya no existe o ya no tiene permiso para verlo, desaparece de la lista.
- **Que se puede buscar** (al escribir, resultados al instante y agrupados; maximo 5 por grupo con **Ver todos en …**, que abre la lista con la busqueda aplicada): **Muestras** (recepciones, procesamientos, extracciones y analisis por folio, ID interno, solicitante, organismo, sitio de muestreo, tipo de analisis o estado), **Informes** (folio, cliente, recepcion, estado), **Inventario** (reactivos por nombre, marca, lote, CAS, catalogo o ubicacion; consumibles; equipos por nombre, clave de bitacora o ubicacion; mantenimientos; movimientos), **Calidad** (incidencias, no conformidades y acciones correctivas), **Biblioteca** (titulo, clave, etiquetas, descripcion y el texto dentro de los PDF), **Personas**, **Roles**, **Solicitudes** y supervision pendientes, **Pantallas** (escriba `auditoria`, `roles`, `reactivos`, `mi cuenta`, `por autorizar`…) y **Acciones**.
- **Que se puede hacer** escribiendo lo que quiere: `nueva recepcion`, `registrar procesamiento`, `nueva extraccion DSP`, `nuevo analisis`, `nuevo informe`, `nuevo reactivo`, `reponer metanol` (abre la reposicion de ese reactivo), `programar mantenimiento`, `reportar incidencia`, `subir documento`, `nuevo usuario`, `cambiar contrasena`, `modo oscuro` y `cerrar sesion` (pide confirmacion). Solo aparecen las acciones que su rol permite, y las acciones criticas piden motivo y contrasena como siempre.
- **Como busca**: sin importar mayusculas ni acentos (`analisis` = `análisis`); tolera errores pequenos de escritura; los folios en cualquier forma (`R 0000001`, `R1`, `r-1`, `0000001`, `1`; igual con P, E-A, E-D, A, IR, INC y NC); sinonimos del laboratorio (`muestra` → recepciones, `toxinas lipofilicas` → DSP, `acido domoico` → ASP); y varias palabras juntas (`metanol lote 9093`, `cofepris liberado`). Primero salen la coincidencia exacta de folio o clave, luego lo que usted debe atender, luego lo que uso antes y despues el resto.
- **Solo lo suyo**: la busqueda respeta sus permisos y alcances en el servidor (por ejemplo, el Tecnico Analista solo encuentra sus muestras asignadas; el Estudiante, solo los documentos visibles para el; quien no administra usuarios no encuentra acciones de administracion).
- Teclado: ↑ y ↓ recorren los resultados entre grupos, **Enter** abre y **Esc** cierra. Al abrir un registro se muestra su ventana de detalle (o su pantalla); un documento de la Biblioteca, su visor; una persona o un rol, su ventana en Usuarios o Roles.
- **Pendientes**: si tiene algo que atender, debajo del buscador aparecen hasta 4 etiquetas pequenas (por ejemplo "2 por autorizar"), las mas urgentes primero; cada una lleva a su lista filtrada. Si no hay pendientes, no se muestra nada. Todos sus avisos siguen en la **campana** y en cada lista.
- La ayuda sigue en la barra lateral (**Ayuda**).

## 5. Reactivos

La seccion **Reactivos** permite consultar, registrar, editar, eliminar e importar reactivos, dependiendo de sus permisos.

### 5.1 Consultar reactivos

1. En la barra lateral, grupo **Inventario**, elija **Reactivos** (o cambie de seccion con el control Reactivos · Consumibles · Equipos · Mantenimiento).
2. Use el campo de busqueda para localizar un reactivo por nombre, lote, CAS o catalogo, y los segmentos **Todos / Stock bajo / Por vencer** para filtrar; cada uno muestra su conteo.
3. Haga clic en una fila para abrir la **ficha del reactivo**: existencia, identificacion, resguardo, caducidad y, si aplica, el motivo de baja. Desde la ficha puede **Rellenar**, **Editar** o **Dar de baja**.

### 5.2 Crear un reactivo

1. Presione **Nuevo reactivo**.
2. Seleccione el tipo o categoria.
3. Capture los campos solicitados por el formulario.
4. En **Existencias** capture la **cantidad actual**, la **unidad**, la **capacidad o stock de referencia** (con cuanto se considera lleno, p. ej. 8 L si son dos garrafones de 4 L) y el **stock minimo** (al llegar a el aparece el aviso "stock bajo"; si no captura minimo, se avisa al 20 % de la capacidad). Los formatos de extraccion y analisis descuentan de la cantidad actual.
5. Presione **Crear reactivo** (o **Guardar cambios** al editar).

El **medidor de existencia** de la lista y de la ficha muestra la barra contra la capacidad, una marca en el minimo y el estado: **Vacio** (rojo), **Bajo** (ambar) o el porcentaje (verde). Es el mismo criterio que usa el aviso "Reactivos con stock bajo" del Inicio y el filtro **Stock bajo** de la lista.

Categorias soportadas:

- Acidos.
- Alcoholes y solventes organicos.
- Compuestos de Amonio.
- Compuestos de Sodio.
- Estandares preparados.
- Materiales de Referencia.
- Miscelaneos.
- Columnas cromatograficas.

### 5.3 Editar o eliminar reactivos

Puede actuar desde la **ficha** (clic en la fila) o con los iconos que aparecen al pasar el cursor sobre la fila:

- **Rellenar stock** para sumar existencia al reactivo.
- **Editar** para modificar sus datos.
- **Mas acciones** (tres puntos) > **Dar de baja**, si cuenta con permiso. El sistema pide un **motivo** (minimo 5 caracteres) y lo guarda en la bitacora de auditoria. Nada se borra: el reactivo deja de aparecer en el inventario y en los formatos, pero sus movimientos y los registros donde se uso se conservan.
- Con la casilla **Mostrar bajas** se ven los reactivos dados de baja (marcados con la etiqueta **Baja**); desde **Mas acciones** > **Reactivar** vuelven al inventario, tambien con motivo.

Lo mismo aplica a consumibles y equipos: no existe "eliminar", solo baja logica con motivo y reactivacion. Un mantenimiento tampoco se borra: se **cancela** con motivo.

### 5.4 Importar reactivos desde Excel

1. Presione **Importar Excel**.
2. Seleccione un archivo `.xlsx` o `.xls`.
3. Revise el resumen de hojas detectadas.
4. Presione **Importar Reactivos**.

El sistema valida las hojas del archivo, ignora hojas no compatibles y muestra errores por fila cuando existan.

## 6. Consumibles

La seccion **Consumibles** permite controlar materiales consumibles del laboratorio.

### 6.1 Consultar consumibles

1. Ingrese a **Consumibles**.
2. Revise las metricas de total, disponibles, bajo stock y agotados.
3. Use la busqueda para encontrar consumibles por nombre o marca.

La tabla muestra producto, marca, proveedor, catalogo/parte/CAS, fecha de ingreso, capacidad, contenedor, piezas y cantidad por pieza.

### 6.2 Crear un consumible

1. Presione **Nuevo Consumible**.
2. Capture producto, marca, proveedor, catalogo o parte, fecha de ingreso, capacidad, contenedor, **piezas en existencia**, **stock de referencia (maximo)** y cantidad por pieza. Si no captura el maximo, se toman las piezas iniciales; al rellenar, el maximo crece si hace falta.
3. Presione **Guardar**.

El medidor muestra las piezas contra el stock de referencia; con **5 piezas o menos** se marca **Bajo** (mismo criterio del aviso del Inicio) y con 0 **Vacio**.

### 6.3 Importar consumibles

1. Presione **Importar datos**.
2. Seleccione un archivo CSV, XLSX o XLS.
3. Revise la vista previa de filas validas e invalidas.
4. Presione **Dar de alta seleccionados**.

Columnas esperadas:

- `producto`
- `marca`
- `proveedor`
- `catalogo_parte_cas`
- `fecha_ingreso`
- `tamano_capacidad`
- `contenedor`
- `piezas`
- `cantidad_por_pieza`

## 7. Equipos

La seccion **Equipos** permite registrar y consultar equipo de laboratorio.

### 7.1 Crear un equipo

1. Ingrese a **Equipos**.
2. Presione **Nuevo Equipo**.
3. Capture nombre, marca, modelo, serie, ubicacion, responsable, fecha de calibracion y estado.
4. Presione **Guardar Equipo**.

### 7.2 Consultar y filtrar equipos

Use la busqueda y los segmentos **Todos / Operativos / En mantenimiento / Con alerta** (calibracion pendiente, fuera de servicio o calibracion vencida). Haga clic en una fila para abrir la ficha del equipo con su clave de bitacora, serie, ubicacion, responsable y proxima calibracion.

El estado de un equipo se mantiene solo: si tiene un mantenimiento o calibracion **pendiente** aparece **En mantenimiento** y debajo se lee cual es ("Calibracion programada · 15/09/2026", "Preventivo vencido · ..."); si esta operativo pero su fecha de proxima calibracion ya paso, se muestra **Calibracion vencida** en rojo. **Fuera de servicio** solo se pone a mano desde Editar.

## 8. Muestras

La seccion **Muestras** esta organizada en cuatro etapas:

1. **Recepcion** (formato FX-TCF-GMR)
2. **Procesamiento**
3. **Extraccion** (ASP o DSP)
4. **Analisis** (resultados, revision y aprobacion)

Despues del analisis, los resultados se comunican al cliente con un **Informe de resultados** (seccion **Informes**) y la muestra se cierra registrando la **disposicion final** de los remanentes.

Reglas que aplican a todas las etapas:

- **Nada se borra.** Un registro con error se **anula** con motivo (Mas acciones > Anular). Queda visible con la casilla **Mostrar anuladas**, se puede **restaurar** con motivo y todo queda en la bitacora de auditoria. Al anular un procesamiento, extraccion o analisis, el inventario que descontaron se repone automaticamente.
- No se puede anular un registro que tenga etapas posteriores vigentes (por ejemplo una recepcion con procesamientos): primero se anulan esas etapas. Tampoco se puede restaurar un registro cuya etapa de origen esta anulada.
- Un reactivo o consumible dado de baja no se puede **elegir** en un formato nuevo: hay que reactivarlo o usar otro. Los registros anteriores que ya lo usaban se siguen abriendo y guardando con normalidad.
- Los estados avanzan solos (ver 13.12): la recepcion pasa a **En procesamiento** al procesarla, a **Validada** al aprobarse todos sus analisis, a **Liberada** al liberar el informe y a **Cerrada** al registrar la disposicion final. Un registro anulado o cerrado se abre en **solo lectura**.
- Cada formato tiene al final una seccion **Historial**. Arriba aparecen, si las hay, las **Solicitudes de autorizacion** del registro (las pendientes destacadas: que se pidio, quien, motivo y cuando). Debajo, la **Bitacora · N eventos** aparece recogida: un clic la despliega y otro la recoge. La bitacora es una linea de tiempo en frases sencillas ("Daniela Cortes aprobo el analisis A 0000004", "Ana Ramirez anulo la recepcion R 0000011"), con el motivo entre comillas, los hechos clave (por ejemplo "Estado: Registrada -> Anulada") y el boton **Ver cambios** para ver cada dato con su valor anterior y el nuevo, en español y sin codigos.

### 8.1 Recepcion de muestras

1. Ingrese a **Muestras**.
2. Seleccione la pestana **Recepcion**.
3. Presione **Nueva recepcion**.
4. Capture los datos del formato de recepcion:
   - Folio, fecha, hora, medio de recepcion (entrega directa, paqueteria o recoleccion) y quien recibe.
   - Solicitante (obligatorio).
   - Tipo de muestra: unica o lote; ID interno o listado de muestras del lote; fecha de la muestra y especificaciones.
   - **Analisis solicitado**, con los catalogos del formato oficial: tipo de analisis (acido domoico ASP, toxinas lipofilicas DSP, toxinas paralizantes PSP, pigmentos, plancton...), metodo (cromatografia de liquidos, bioensayo en raton, fluorometria, microscopia) y tipo de muestra (organismo completo, organismo en partes, masa visceral, filtros, agua de mar).
   - **Inspeccion visual**: los 7 requisitos del formato (talla comercial, sin alteraciones, menos de 24 h desde la extraccion, contenedor transparente sin alteraciones, hielera con blue ice entre 4 y 10 °C, cantidad suficiente, sin fijador). Cada uno se marca **C** cumple, **NC** no cumple o **NA** no aplica, con observacion.
   - **Decision de aceptacion** (ISO/IEC 17025 7.4.3): **Aceptada**, **Aceptada con desviacion** o **Rechazada**, con fecha, responsable y temperatura de llegada. Si hay algun requisito NC la muestra no puede quedar simplemente "aceptada"; si se acepta con desviacion o se rechaza, hay que registrar la **comunicacion al cliente** (fecha, medio, persona contactada y su respuesta).
   - Firmas del solicitante y del custodio, y lugar de resguardo.
5. Presione **Registrar recepcion**. Al editar una recepcion existente, el boton dice **Guardar cambios**.

Validaciones principales:

- El folio es obligatorio.
- En muestra unica, el ID interno es obligatorio; en lote, al menos una muestra.
- Sin decision de aceptacion (o con la muestra rechazada) no se puede registrar un procesamiento.

Recepciones capturadas antes de esta version conservan sus valores antiguos (por ejemplo "PSP, ASP, DSP" o los requisitos anteriores) marcados como **valor anterior**; al editarlas se pueden pasar a los catalogos nuevos.

**Disposicion final.** Cuando el analisis termina, abra la recepcion y en la seccion **Disposicion final de remanentes** registre que se hizo con lo que sobro (RPBI, residuos comunes, conservado para investigacion, devuelto al cliente), la fecha, el responsable y su firma. Esto **cierra** la muestra (7.4.4). Tambien se registra en una muestra **rechazada** (por ejemplo, para dejar constancia de que se devolvio al cliente), aunque el resto del formato ya este en solo lectura.

### 8.2 Procesamiento de muestras

1. Seleccione la pestana **Procesamiento**.
2. Presione **Nuevo procesamiento**, o use la accion **Procesar** (flecha) en la fila de una recepcion para llegar con el folio ya vinculado.
3. Seleccione el folio de recepcion.
4. Complete los campos de procesamiento.
5. Seleccione el tipo de organismo.
6. Capture o seleccione los insumos utilizados cuando aplique.
7. Presione **Registrar procesamiento**.

Cuando se registran insumos, el sistema puede descontar inventario y generar movimientos.

### 8.3 Extraccion de muestras

Existen dos formatos de extraccion, uno por toxina, cada uno con su propia serie de folios:

| Formato | Clave | Folio | Toxina |
| --- | --- | --- | --- |
| **ASP** | FX-TCF-GME-A | E-A | Acido domoico |
| **DSP** | FX-TCF-GME-D | E-D | Toxinas lipofilicas (acido okadaico) |

1. Seleccione la pestana **Extraccion**. Con las pestanas **Todas / ASP / DSP** puede filtrar la lista por formato.
2. Presione **Nueva extraccion** y elija el formato (ASP o DSP), o use la accion **Extraer** (gota) en la fila de un procesamiento: el sistema pregunta el formato y llega con el folio de procesamiento ya vinculado.
3. Seleccione el folio de procesamiento. Se cargan las muestras del lote (mas el blanco) en la tabla de pesos; tambien puede agregar muestras a mano.
4. Marque los pasos realizados. En cada paso elija el equipo utilizado (licuadora, balanza, vortex, centrifuga...) y el reactivo o consumible que se descuenta.
   - Los reactivos y consumibles que se agregan a cada tubo (disolvente de extraccion, NaOH, HCl, filtros, viales) se descuentan **por tubo**: muestras y blanco, cada uno con su replica. El aviso bajo el campo indica cuanto se descontara (por ejemplo, `9 ml x 6 tubos`). Los reactivos de la limpieza del extracto en ASP se descuentan una vez por extraccion.
   - Si un equipo esta fuera de servicio, en mantenimiento o con calibracion vencida, aparece un aviso junto al campo y el sistema pide confirmacion antes de guardar. Tambien pide confirmacion si un insumo del protocolo no existe en inventario (se guarda sin descuento) o si el stock de un consumible no alcanza (queda en negativo).
   - Al editar una extraccion existente el sistema no rellena por si solo los insumos que se dejaron vacios; al crear una nueva, sugiere los del inventario.
5. **ASP**: registre pesos, filtrado final y, si aplica, la limpieza del extracto en cartucho SAX.
   **DSP**: registre pesos, matraz de aforacion por muestra, filtrado y, si aplica, la hidrolisis (pesos antes y despues del calentamiento a 76 °C).
6. En **Equipos utilizados** anote el folio de la bitacora de cada equipo. La clave (FX-TCB-...) se llena sola si el equipo la tiene registrada en el catalogo.
7. Registre resguardo, observaciones, insumos adicionales y personal responsable (en DSP no existe la firma de limpieza).
8. Presione **Registrar extraccion ASP** o **Registrar extraccion DSP**.

Antes de guardar, el sistema valida disponibilidad de stock para los reactivos seleccionados. Al buscar en la lista puede escribir el folio con su tipo, por ejemplo `E-D 12`.

### 8.4 Analisis y resultados

El registro de analisis (folio **A**) captura lo que se midio en el extracto y lo somete a una revision y una aprobacion independientes antes de poder informarse.

1. Seleccione la pestana **Analisis** y presione **Nuevo analisis**, o use la accion **Analizar** en la fila de una extraccion (llega con la extraccion vinculada y las muestras cargadas).
2. Elija el tipo de analisis (ASP, DSP, PSP, pigmentos, plancton u otro) y el metodo (HPLC UV-Vis, HPLC-MS/MS, HPLC-FLD, bioensayo en raton, microscopia, fluorometria...). Anote la clave y revision del procedimiento en **Referencia del metodo**.
3. Registre equipo (con su folio de bitacora), condiciones ambientales, y por cada muestra el **resultado**, unidad, limites de deteccion y cuantificacion, incertidumbre y **limite regulatorio**. El sistema sugiere la conformidad (cumple / no cumple) comparando contra el limite; los limites precargados (ASP 20 µg/g, DSP 160 µg/kg, PSP 80 µg/100 g) estan marcados **por confirmar** con la coordinacion tecnica y se pueden editar.
4. Registre los **controles de calidad** (blanco, material de referencia con lote y caducidad, duplicado) y los insumos adicionales que se descuentan del inventario.
5. Presione **Registrar analisis**.
6. **Evidencia instrumental** (Fase 10): abra de nuevo el analisis y, en la seccion **Evidencia instrumental** (antes de las firmas), arrastre o elija el archivo que respalda los resultados: cromatograma, reporte del equipo, hoja de calculo, curva de calibracion, certificado del material de referencia, foto u otro. Elija el **tipo de evidencia**, escriba una **descripcion** (al menos 5 caracteres) y presione **Adjuntar evidencia** (una barra muestra el avance).
   - Formatos admitidos: PDF, PNG, JPG, TIF, CSV, TXT, XLSX, XLS, ZIP y CDF, hasta 25 MB por archivo (lo fija el administrador). El sistema revisa que el contenido corresponda a la extension y rechaza HTML, SVG, programas y archivos vacios. El mismo archivo no se adjunta dos veces al mismo analisis.
   - Cada adjunto muestra quien lo subio y cuando, su tamano y su **huella SHA-256** (abreviada; completa al pasar el cursor). **Vista previa** abre PDF e imagenes PNG o JPG en una hoja lateral (los TIF se descargan); **Descargar** baja el archivo. Cada descarga queda en la bitacora y comprueba la huella: si el archivo cambio o falta, aparece un aviso rojo y una alerta de integridad en la bitacora (avise a la coordinacion).
   - **Anular…** (con motivo y su contrasena) retira un adjunto equivocado; el archivo se conserva y se puede ver con **Mostrar anulados**.
   - Se adjunta y anula solo mientras el analisis esta **Registrado** (antes de enviarlo a revision) y solo quien puede editarlo: asignado a la muestra (o la coordinacion) y con la autorizacion FX-THF-AP del analisis y su metodo. Si su cuenta es supervisada, adjuntar deja el analisis pendiente del visto bueno de su supervisor.
   - **Es obligatoria**: sin al menos una evidencia vigente, **Enviar a revision** aparece deshabilitado con la explicacion. Despues de enviarlo, la evidencia queda en solo lectura (siempre descargable para quien puede ver el analisis); si hay que corregirla, el revisor lo devuelve con observaciones. Los analisis aprobados antes de esta regla no la necesitan.
   - Una **enmienda** (v2, v3...) hereda la evidencia vigente de la version anterior (etiqueta "Heredado de v1"); anular un adjunto en la enmienda no afecta a la version anterior.

Revision y aprobacion (requieren los permisos **Ensayos: R** y **Ensayos: A**):

- **Marcar revisado**: quien tenga permiso de revisar ensayos revisa el registro y firma. El cargo que aparece junto a la firma es el del rol con el que actua (si tiene varios roles que lo permiten, el sistema le pregunta cual).
- **Aprobar**: lo aprueba una persona con permiso de aprobar ensayos que **no** lo elaboro (revisor y aprobador pueden ser la misma persona). Si usted lo capturo o lo edito, el boton aparece deshabilitado con la explicacion (ver 13.7).
- Un analisis revisado que se edita vuelve a **Registrado** (hay que indicar el motivo del cambio) y debe revisarse de nuevo. Un analisis aprobado es de solo lectura; si esta mal, se anula y se captura otro.
- Al aprobar, la extraccion pasa a **Analizada** y el procesamiento a **Completada**.

## 8.5 Informes de resultados

La seccion **Informes** emite el informe de resultados para el cliente (folio **IR**), con el contenido que exige ISO/IEC 17025 7.8.2 y un PDF generado por el sistema.

1. Presione **Nuevo informe** y elija la recepcion. Se cargan el cliente, los items ensayados y los **analisis aprobados** de esa recepcion; marque los que se incluyen.
2. Revise las declaraciones (alcance de los resultados, regla de decision, desviaciones del metodo, descargo cuando la muestra se acepto con desviacion, opiniones e interpretaciones) y presione **Crear borrador**. Con **Vista previa PDF** puede ver como quedara.
El ciclo del informe es: **Borrador → En revision → Autorizado → Liberado → Enviado** (ademas de Anulado y Sustituido).

3. **Marcar revisado** (Informes: R) y luego **Autorizar** (Informes: A; con firma obligatoria y su contrasena). No puede hacerlo quien elaboro el informe ni quien elaboro alguno de sus analisis (ver 13.7); revisor y autorizador si pueden ser la misma persona. El cargo que aparece en el informe es el del rol con el que actuo cada persona. Autorizar solo firma: todavia no se genera el PDF final.
4. **Liberar** (Informes: A y la autorizacion FX-THF-AP **Liberacion de informes**; con su contrasena). Puede hacerlo la misma persona que autorizo. Al liberar, los resultados quedan **congelados** en el informe, se genera el **PDF final** con su huella SHA-256 y la recepcion pasa a **Liberada**. Un informe liberado ya no se edita.
5. **Enviar por correo** (Informes: A), en el panel **Envios por correo** de la ficha (solo informes liberados o ya enviados):
   - **Envio manual** (siempre disponible): envie el PDF desde su correo institucional (el boton **Abrir en mi correo** prepara el asunto y el texto; el PDF se adjunta a mano) y registre en la plataforma el destinatario, su correo, la fecha y hora del envio y la **evidencia** del correo enviado (PDF, imagen o archivo .eml). La evidencia se guarda con su huella SHA-256.
   - **Enviar desde la plataforma**: solo aparece si el administrador configuro el servidor de correo; envia el PDF adjunto y guarda como evidencia el identificador del mensaje y la respuesta del servidor.
   - El primer envio pasa el informe a **Enviado**. Puede registrar mas envios (reenvios u otros destinatarios) y, despues, en cada envio, la **confirmacion de recepcion** (fecha y nota).
   - Los correos y las evidencias solo los ve quien puede ver informes; en la bitacora el correo del destinatario aparece parcialmente oculto (por ejemplo, h***@cofepris.gob.mx). El envio no modifica el informe ni sus resultados.
   - En los datos del cliente del informe hay un **correo de contacto**, prellenado desde la recepcion si existe.
6. Si hay que corregir un informe ya autorizado, liberado o enviado, use **Enmienda**: se crea la version siguiente (v2, v3...) en borrador que sustituye a la anterior y la indica en el PDF. Al liberar la enmienda, el informe original pasa a **Sustituido** y su PDF se regenera con la leyenda "sin validez" (se conserva para el expediente). **Anular** marca el PDF como sin validez.
7. **Requiere enmienda**: si se aprueba la enmienda de un analisis incluido en un informe autorizado, liberado o enviado, ese informe queda marcado **Requiere enmienda** (aviso en su ficha, en la lista y en el Inicio). No se puede liberar ni enviar hasta crear y liberar su enmienda; la enmienda del informe toma automaticamente la version aprobada del analisis.
8. **Integridad del PDF**: al descargar el PDF final se comprueba su huella SHA-256. Si no coincide con la guardada al liberar, la ficha muestra un aviso y queda una alerta en la bitacora; avise a la coordinacion.

## 9. Movimientos

La seccion **Movimientos** muestra el historial de entradas y salidas de inventario.

La pantalla separa:

- Descuentos de reactivos.
- Descuentos de consumibles.
- Todos los movimientos.

Tambien muestra conteos de movimientos totales, del dia, de la semana, del mes, reactivos y consumibles.

Use esta seccion para revisar que los descuentos de inventario se hayan registrado correctamente despues de procesamiento o extraccion.

## 10. Mantenimiento

La seccion **Mantenimiento** permite programar y controlar mantenimientos de equipos.

### 10.1 Programar mantenimiento

1. Ingrese a **Mantenimiento**.
2. Presione **Programar Mantenimiento**.
3. Seleccione o capture el equipo.
4. Capture tipo de mantenimiento, fecha programada, fecha realizada si aplica, tecnico, responsable, estado y observaciones.
5. Presione **Guardar Mantenimiento**.

### 10.2 Seguimiento y estado del equipo

- La pestana muestra por omision solo lo **pendiente** (programado, en proceso o vencido). Con el menu **Filtros** puede ver **Proximos 30 dias**, **Vencidos**, **Completados** (historial) o **Todos**.
- El **estado del equipo sigue a sus mantenimientos**: mientras tenga uno pendiente aparece en **Equipos** como "En mantenimiento" (o "Calibracion pendiente" si es una calibracion). Al marcar el mantenimiento **Completado** (con su fecha realizada) desaparece de la pestana y el equipo vuelve a **Operativo**; si fue una calibracion, puede anotar ahi mismo la **proxima calibracion** y se actualiza en la ficha del equipo. Cancelar un mantenimiento tambien libera al equipo. Un equipo marcado a mano como "Fuera de servicio" no cambia solo.
- Los avisos del **Inicio** ("Mantenimientos vencidos", "en los proximos 30 dias", "Equipos con alerta de calibracion", "Reactivos con stock bajo", "Consumibles con 5 piezas o menos") usan exactamente las mismas reglas que los filtros de cada lista, asi que al abrirlos ve los mismos registros que cuenta el aviso. "Stock bajo" en reactivos significa: vacio, por debajo del **stock minimo** si se capturo, o 20 % o menos del maximo si no hay minimo.

## 11. Biblioteca de documentos (Calidad › Biblioteca)

**Decision confirmada por el laboratorio**: Calidad › Documentos funciona como **biblioteca de consulta** y reemplaza el flujo de control documental (revision, aprobacion, lista maestra, distribucion y acuse de lectura). Los documentos que habia (con su archivo) se copiaron a la Biblioteca. Los reportes de mantenimiento en PDF no forman parte de la Biblioteca: se consultan en Inventario › Mantenimiento, sección «Reportes de mantenimiento (PDF)».

- **Buscar**: escriba en **Buscar** por titulo, clave, etiqueta o texto del PDF (tambien busca dentro de los PDF). Filtre por **Categoria** y **Tipo de archivo**, ordene (**Recientes** o **Por categoria**) y cambie entre **lista** y **cuadricula**. El buscador general (`Ctrl+K`) tambien encuentra los documentos de la Biblioteca.
- **Subir documento** (Documentos: C): elija uno o varios archivos (PDF, Word `.docx`, Excel, CSV, PowerPoint, imagenes, texto, Markdown o ZIP; el tamaño maximo lo fija el laboratorio, 50 MB por omision) y capture **Titulo**, **Clave** (opcional, p. ej. `FX-TCI-CE1`), **Categoria**, **Etiquetas** (separadas por coma), **Fecha del documento**, **Descripcion** y **Visibilidad**: *Todos los que ven la biblioteca* o solo ciertos **roles**. El archivo se valida por su contenido y se guarda con su huella SHA-256.
- **Leer en el visor**: **Abrir** (o clic en el documento) lo muestra dentro de la plataforma, sin descargarlo: PDF con miniaturas, indice, busqueda en el texto (`Ctrl+F`), zoom y "pagina N de M" (recuerda la ultima pagina que leyo); Word, hojas de calculo, imagenes (con zoom), texto y Markdown. Los formatos que el navegador no puede mostrar (PowerPoint, ZIP, TIFF) presentan su ficha con **Descargar**. **Informacion y versiones** abre el panel con los datos del documento, sus versiones y su huella; hay **Pantalla completa** e **Imprimir**. Leer no queda en la bitacora; **Descargar** si.
- **Versiones**: **Subir nueva version** reemplaza el archivo vigente, con una **nota de la version** (que cambio, opcional); la anterior **se conserva** y se puede abrir desde el panel de versiones. **Editar datos** cambia titulo, clave, categoria, etiquetas y visibilidad sin tocar el archivo (Documentos: E en los documentos que usted subio; Documentos: G en cualquiera).
- **Archivar** (Documentos: AN o G): con motivo y su contraseña; el documento deja de aparecer, pero **no se borra**. Con **Mostrar archivados** se ven y se pueden **Restaurar** (tambien con motivo).
- **Categorias** (Documentos: G): crear, renombrar o desactivar las categorias de la Biblioteca.
- **Integridad**: al abrir o descargar se comprueba la huella del archivo; si falta o fue alterado, se avisa, queda una alerta en la bitacora y una incidencia automatica.
- El Estudiante (alcance "autorizados") solo ve los documentos visibles para todos o para su rol.

## 11.1 Bitacora de auditoria

En la barra lateral, grupo **Calidad**, **Auditoria** (permiso Calidad: V) muestra quien hizo que, cuando y por que en toda la plataforma, en lenguaje sencillo.

- **Lista**: agrupada por dia (Hoy, Ayer, 24 de septiembre…). Cada renglon es una frase ("Mariana imprimio la etiqueta de la recepcion R 0000001") y debajo la hora y el area ("20:24 · Recepcion de muestras"). Un icono de comentario indica que la actividad tiene motivo. Si la misma persona repite la misma accion sobre el mismo registro en pocos minutos (por ejemplo, imprimir etiquetas), se muestra un solo renglon "· 4 veces"; en la bitacora siguen siendo entradas separadas.
- **Buscar y filtrar**: el buscador ("Buscar por folio, persona o motivo") y el boton **Filtros**, que indica cuantos hay activos: **Periodo** (Hoy, Ultimos 7 dias, Ultimos 30 dias —por omision—, Todo o Personalizado con fechas desde/hasta), **Personas**, **Tipo de actividad** (creaciones, cambios, firmas y aprobaciones, anulaciones y rechazos, solicitudes, impresiones y descargas, sistema), **Area** (Muestras, Informes, Inventario, Equipos, Calidad, Biblioteca, Usuarios y accesos) y **Vista › Mostrar inicios de sesion**. **Limpiar filtros** los quita todos.
- **Detalle**: al pulsar una actividad se abre una ventana al centro (el resto de la pantalla se difumina) con la frase, quien la hizo y con que cargo, cuando ("3 de octubre de 2026 a las 16:57 · hace 2 horas"), **Que paso** explicado en palabras, **Que cambio** (una frase por dato: "El estado cambio de Aceptada a Cerrada"; en los registros nuevos, sus datos principales), el **Motivo** si lo hubo y el boton **Ver el registro**. Las flechas ↑/↓ pasan a la actividad anterior o siguiente; Esc, la × o un clic fuera la cierran.
- **Integridad**: la plataforma revisa sola, en segundo plano, que nadie haya alterado el registro de actividad. Si todo esta bien no muestra nada; si detecta un posible cambio no autorizado, aparece un aviso rojo arriba de Auditoria ("Avisa a la Coordinacion de Mejora Continua"), en el Inicio y en la campana de quien tiene Calidad, y se crea una incidencia automatica. `npm run verificar-instalacion` y las actas de las pruebas de restauracion siguen mostrando el estado de integridad.
- **La bitacora no se exporta** (decision confirmada por el laboratorio): se consulta solo dentro de la plataforma. No se puede editar ni borrar. Cada formato muestra su propio **Historial** (con la misma lista y el mismo detalle) a quien puede leer ese modulo.

## 12. Roles y permisos

Cada persona puede tener **uno o varios roles**, cada uno con fecha de inicio y, si se quiere, fecha de fin. Lo que una persona puede hacer es la suma de sus roles vigentes. El detalle de los 10 roles del laboratorio, sus permisos y las combinaciones prohibidas esta en `docs/CATALOGO_PERMISOS.md`.

Cada permiso dice **que** se puede hacer en cada area —**Ver, Crear, Editar** (solo mientras el registro no pasa a revision o aprobacion), **Revisar, Aprobar** (tambien validar, autorizar o liberar), **Anular** (con justificacion) y **Administrar** (todo lo anterior)— y **hasta donde**: por ejemplo "solo recepciones", "solo su propia cuenta", "solo el estado de la muestra", "solo lo asignado" o "solo mantenimientos". La pantalla lo muestra siempre en palabras, nunca con letras ni claves.

Las areas son: Muestras (recepcion, custodia y disposicion), Ensayos (procesamiento, extraccion y analisis), Informes, Equipos (y mantenimientos), Inventario (reactivos, consumibles y movimientos), Calidad (registro de actividad, incidencias y no conformidades), Biblioteca, Usuarios y Compras. El Inicio lo ve toda persona activa, pero cada panel y aviso aparece solo si puede ver esa area.

### 12.1 Ver y editar un rol

En la barra lateral, grupo **Administracion**, elija **Roles**. Cada renglon muestra el icono del rol, su nombre completo, su proposito en una linea, las figuras de las personas que lo tienen (hasta 4 y "+N") con el total, y las etiquetas **Del sistema** e **Inactivo**. Se busca por nombre y se filtra con **Filtros** (Estado, Tipo y Uso).

- **Ver un rol**: pulse el rol. Se abre una ventana al centro con su icono, nombre, estado y proposito, y estas secciones: **Responsabilidades del puesto**, **Lo que no puede hacer**, **Que puede hacer en la plataforma** (por area, en frases generadas de sus permisos reales: "Puede ver y registrar recepciones y muestras"), **Reglas importantes** (las que aplican: autorizacion FX-THF-AP, no aprobar lo propio, cuenta temporal con supervisor, combinaciones prohibidas) y **Personas con este rol** (al pulsar una se abre su ventana en Usuarios). Los roles personalizados muestran un proposito generico y responsabilidades sacadas de sus permisos. ↑/↓ pasan al rol anterior o siguiente.
- **Editar permisos** (Usuarios: G): en la ventana o en el menu **⋯**. La ventana se amplia con la tabla de areas y las columnas **Ver, Crear, Editar, Revisar, Aprobar, Anular y Administrar**; en cada casilla marcada se elige **hasta donde**. Al guardar se pide el **motivo** y su contrasena.
- **Editar nombre y descripcion**, **Activar / Desactivar** (con motivo) y **Nuevo rol**: en el menu **⋯** y en la barra. Un rol nuevo nace sin permisos; despues se definen con Editar permisos.
- Si el rol es suyo, solo puede **ver** sus permisos: los cambia otra persona que administre usuarios.

Si el cambio dejaria a alguien con una **combinacion de roles prohibida** (por ejemplo, administracion tecnica del sistema junto con captura o aprobacion de ensayos), el sistema no lo guarda y dice a quien afectaria. Tampoco permite dejar el sistema sin ninguna persona activa que pueda administrar usuarios y roles.

## 13. Usuarios

La seccion **Usuarios** muestra a las personas que entran a la plataforma. Quien solo tiene permiso sobre su propia cuenta ve unicamente la suya.

- **Lista**: cada renglon muestra la **figura de perfil** de la persona (la misma de Mi cuenta: la que eligio o, si no eligio, la que le toca siempre), su nombre en negritas y su correo; sus roles vigentes con el nombre completo; el estado (**Activo, De baja, Bloqueado, Temporal** —con "Hasta 31/03/2027 · supervisa Ricardo"— o **Acceso vencido**); el ultimo acceso ("hace 2 h"; la fecha exacta al pasar el cursor); cuantas **autorizaciones FX-THF-AP** vigentes tiene y un indicador si hay una solicitud pendiente sobre la cuenta. En pantallas angostas cada renglon es una tarjeta.
- **Buscar y filtrar**: por nombre o correo, y todo lo demas dentro de **Filtros**: Estado (Activos, De baja, Bloqueados), Tipo de cuenta, Rol, Vigencia (vence en los proximos 7 dias, acceso vencido), Otros (con solicitudes pendientes, sin roles vigentes, sin autorizaciones FX-THF-AP) y **Ordenar por** (Nombre A–Z, Ultimo acceso, Fecha de alta). **Limpiar filtros** los quita todos. Los avisos del Inicio y de la campana sobre accesos que vencen abren Usuarios con el filtro ya activado.
- **Ventana de la persona**: al pulsar a alguien se abre una ventana al centro con su figura animada, nombre, correo, estado, roles y cargo; una franja con **Ultimo acceso, Cuenta desde, Roles vigentes y Autorizaciones vigentes**; y tres pestañas: **General** (tipo de cuenta y vigencia con una barra del tiempo restante, tarjeta del supervisor —al pulsarla se abre su ventana—, bloqueo con **Desbloquear** y solicitudes pendientes con **Aprobar** o **Rechazar** para quien pueda), **Roles** (cada rol como tarjeta con su icono, que hace, desde y hasta con su barra y quien lo asigno; **Asignar rol** y **Revocar**; los terminados o revocados en **Historial de roles**) y **Autorizaciones** (agrupadas en Actividades, Metodos y Equipos, con "vigente hasta … · quedan N dias" y un aviso si vencen en menos de 30 dias; **Agregar** y **Revocar**; las revocadas o vencidas plegadas). ↑/↓ pasan a la persona anterior o siguiente; Esc, la × o un clic fuera la cierran.
- **Menu ⋯ del renglon**: **Editar datos**, **Restablecer contraseña**, **Desbloquear** (si esta bloqueada) y **Dar de baja** o **Reactivar**.
- La revision periodica de accesos se hace aqui (la pantalla Revision de accesos se retiro). Los cambios de un periodo se consultan en **Calidad › Auditoria**. No hay exportacion.

### 13.1 Crear usuario

1. En la barra lateral, grupo **Administracion**, elija **Usuarios**.
2. Presione **Nuevo usuario**.
3. Capture nombre, correo electronico (de un dominio permitido), **rol inicial** (queda pendiente hasta que lo aprueba la Responsable General), departamento, contrasena inicial (minimo 10 caracteres) y estado.
4. En **Vigencia de la cuenta** elija **Permanente** o **Temporal**. Una cuenta temporal (estancias, estudiantes) requiere **fecha de fin** y **supervisor**: una persona activa, con cuenta permanente y con permiso de revisar o aprobar ensayos o muestras. El rol de estudiante / personal en formacion solo se asigna a cuentas temporales.
5. Escriba su contrasena para confirmar y presione **Crear usuario**.

Cambiar la vigencia, el tipo de cuenta o el supervisor pide un **motivo** y su contrasena, y queda en la bitacora. Ningun rol puede quedar vigente mas alla de la vigencia de la cuenta; si acorta la cuenta, sus roles se acortan con ella.

Para una contrasena olvidada use **Restablecer contraseña…** en el menu de la fila: el sistema genera una contrasena temporal que se muestra **una sola vez** (copiela y entreguela por un medio seguro); la persona debera cambiarla al entrar. Una cuenta bloqueada muestra **"Bloqueada hasta HH:MM"** y se libera con **Desbloquear…** (con motivo).

### 13.2 Asignar y revocar roles

1. Abra la ventana de la persona, pestaña **Roles**: sus roles aparecen con su **vigencia** (desde / hasta), su estado y quien lo asigno; los terminados o revocados se ven con **Ver roles anteriores**.
2. **Asignar rol**: elija el rol, la fecha de inicio, opcionalmente la fecha de fin, y escriba el **motivo** (minimo 5 caracteres).
3. **Revocar**: en el rol vigente, presione **Revocar** e indique el motivo. El rol deja de contar de inmediato, sin que la persona tenga que volver a iniciar sesion.

Reglas:

- Nadie puede asignarse ni revocarse roles a si mismo.
- Algunas combinaciones de roles estan prohibidas (independencia del auditor, estudiantes sin otros roles, administracion sin captura tecnica); el sistema explica que regla se violaria.
- Cuando un rol llega a su fecha de fin deja de contar solo y queda registrado en la bitacora como "Venció rol". No se puede asignar un rol con una fecha de fin que ya paso.
- Nada se borra: las asignaciones revocadas o vencidas se conservan en la ficha y en la bitacora.

### 13.3 Activar o desactivar usuario

Use **Dar de baja** o **Reactivar** en el menu **⋯** de la persona (con motivo y su contrasena; la reactivacion la aprueba otra persona autorizada). Un usuario dado de baja no puede iniciar sesion ni usar una sesion abierta. Los usuarios nunca se borran, porque la bitacora y los registros que firmaron los referencian.

### 13.4 Con que cargo firmo

Cuando firma, revisa, aprueba, autoriza, libera, envia o anula, el sistema guarda el **cargo** con el que actuo (el nombre de su rol). Si solo uno de sus roles permite esa accion se usa ese. Si varios lo permiten, se usa su **cargo predeterminado** (Mi cuenta › Cargo predeterminado) cuando ese cargo permite la accion; si no lo tiene o no la permite, el sistema le pregunta **"¿Con qué cargo actúas?"**. El cargo aparece junto a su firma en el registro y en el PDF del informe.

### 13.5 Revision de accesos

Se hace en **Administracion › Usuarios** (13): filtros de vigencia, bloqueos y solicitudes, cuentas temporales con su supervisor y la ventana de cada persona. Los cambios de un periodo se consultan en **Calidad › Auditoria**. La antigua pantalla y su exportacion se retiraron.

### 13.6 Supervision (cuentas temporales y alcance "supervisado")

Lo que captura una persona supervisada (cuenta temporal con supervisor, o un permiso con alcance "supervisado") queda **"Pendiente de visto bueno"**: no puede usarse como origen de la etapa siguiente, cerrarse, revisarse, aprobarse ni autorizarse hasta que su supervisor lo apruebe. El supervisor lo ve en el Inicio (aviso **Por supervisar**) y en **Muestras › Por supervisar**, donde puede **Dar visto bueno** (con su contrasena) o **Regresar** con observaciones. Lo regresado aparece a quien lo capturo en **Regresados a ti**; al corregirlo vuelve a quedar pendiente.

### 13.7 Separacion de funciones

El sistema no deja que una persona valide su propio trabajo (ISO/IEC 17025):

- Quien elaboro un analisis (lo capturo o lo edito) no lo revisa ni lo aprueba.
- Quien elaboro un informe, o cualquiera de los analisis que incluye, no lo revisa ni lo autoriza.
- En procesamiento y extraccion, quien firma como supervisor no puede ser quien proceso, extrajo o hizo la limpieza.
- El supervisor no da visto bueno a lo que el mismo capturo.

Tener varios roles o cambiar de cargo no cambia la regla. Cuando no puede hacer una accion por esta razon, el boton aparece deshabilitado con la explicacion. Si de verdad no hay otra persona disponible, use **Solicitar excepción…**: escriba el motivo y su contrasena; la excepcion la aprueba la Responsable General o Mejora Continua, y queda registrada en la ficha, en la bitacora y, en un informe, en el PDF ("Revisión autorizada por excepción, solicitud #N"). Mientras espera, el registro no se bloquea: si otra persona lo revisa o aprueba antes, puede cancelar su solicitud en **Por autorizar**.

### 13.8 Solicitudes de autorizacion (segundo usuario) y bandeja "Por autorizar"

Algunas acciones criticas no se ejecutan al pedirlas: quedan como **solicitud** hasta que las aprueba una segunda persona autorizada:

| Accion | La aprueba |
| --- | --- |
| Anular o restaurar una recepcion, procesamiento, extraccion o analisis que ya no esta en borrador | Quien tiene "anular" en ese modulo |
| Anular un informe autorizado, liberado o enviado | Quien tiene "anular" en informes |
| Excepcion de separacion de funciones | Responsable General / Mejora Continua |
| Asignar un rol (tambien el rol inicial de una cuenta nueva) | Responsable General |
| Reactivar una cuenta dada de baja | Responsable General |
| Ampliar la vigencia de una cuenta temporal | Responsable General |

Mientras la solicitud esta pendiente, el registro muestra "... solicitada · pendiente de autorización" y no se puede editar ni usar para la etapa siguiente. Quien la pidio puede **Cancelar solicitud**. Quien puede aprobarla la ve en el Inicio (aviso **Por autorizar**) y en **Muestras › Por autorizar**, donde puede **Aprobar** (con motivo y su contrasena; la accion se ejecuta en ese momento) o **Rechazar** (con motivo). Nadie aprueba su propia solicitud. Las solicitudes vencen a los 7 dias sin respuesta. La pestaña **Solicitudes** del historial de cada registro muestra todas las que tuvo. Revocar un rol, dar de baja una cuenta, bloquearla o acortar su vigencia siguen siendo inmediatos.

### 13.9 Fechas

Todas las fechas se muestran como dd/mm/aaaa y las horas en la hora de Ensenada, sin importar el idioma o la zona del navegador. En los campos de fecha escriba los numeros (las barras se ponen solas) o use el calendario (flechas, Inicio/Fin, RePag/AvPag, Enter, Escape).

### 13.10 Autorizaciones del personal (FX-THF-AP)

Ademas de su rol, cada persona solo puede operar las actividades, metodos y equipos para los que esta autorizada en el formato FX-THF-AP, con su vigencia. El rol dice que pantallas y acciones tiene; la autorizacion dice sobre que metodos y equipos puede trabajar.

- **Que se autoriza**: actividades (recepcion de muestras, procesamiento, extraccion, analisis, revision de resultados, aprobacion de resultados, revision de informes, autorizacion de informes), metodos (ASP, DSP, PSP, pigmentos, plancton, otro) y equipos activos del inventario.
- **Que pide cada formato**: recepcion pide la actividad de recepcion; procesamiento, la de procesamiento; extraccion, la de extraccion mas el metodo del tipo (E-A es ASP, E-D es DSP) y cada equipo del inventario que se use; analisis, la de analisis mas el metodo del tipo de analisis y el equipo usado; revisar o aprobar un analisis, la actividad correspondiente mas el metodo; revisar o autorizar un informe, la actividad correspondiente. Los equipos o insumos que no estan en el inventario no se validan.
- **Quien las registra**: la Coordinacion del Area Tecnica, Mejora Continua o la Responsable General, desde **Administracion › Usuarios**, ventana de la persona, pestaña **Autorizaciones**. **Agregar** pide tipo, actividad/metodo/equipo, vigencia (desde y, si aplica, hasta), el folio del formato en papel y el motivo; **Revocar** pide el motivo. Ambas piden su contrasena y quedan en la bitacora. Nadie puede otorgarse ni revocarse autorizaciones a si mismo. Nada se borra: una autorizacion revocada o vencida sigue en la lista con su estado.
- **Si le falta una**: al abrir el formato aparece un aviso con lo que le falta, y al guardar el sistema lo impide con un mensaje como "No tienes autorización vigente para extracción DSP" o "... para el equipo CE1". Pida a su coordinacion que la registre.
- **Mis autorizaciones**: en **Mi cuenta** puede consultar (solo lectura) sus autorizaciones, su vigencia, folio y estado.
- **Vencimientos**: el Inicio avisa de las autorizaciones que vencen en los proximos 30 dias, a la persona y a quien las administra. Al vencer, la autorizacion deja de valer sola y queda anotado en la bitacora. Si usted no administra autorizaciones, el aviso lo lleva a **Mi cuenta › Mis autorizaciones**.
- **Autorizar a… al dar de alta un equipo**: quien puede otorgar autorizaciones (Coord. Area Tecnica, Mejora Continua, Responsable General) ve en el alta del equipo la seccion **Autorizar a…**: elija a las personas y, en el mismo paso, quedan autorizadas para usar ese equipo (con folio FX-THF-AP opcional). Pide su contrasena y queda en la bitacora; usted no puede autorizarse a si mismo.

### 13.11 Asignacion de muestras

- **Quien asigna**: la Coordinacion del Area Tecnica (permiso de aprobar en muestras). Desde la recepcion (boton **Asignar**) o desde el menu de su fila en la lista, elige una o varias personas de las cuentas activas. Solo se asignan recepciones aceptadas (o aceptadas con desviacion). Reasignar es revocar una asignacion (con motivo) y asignar a otra persona; nada se borra y todo queda en la bitacora.
- **Aviso de autorizaciones**: si la persona no tiene las autorizaciones FX-THF-AP de los analisis solicitados (procesamiento, analisis y el metodo), el sistema lo avisa al asignar. Es un aviso, no impide la asignacion; pida que se las registren antes de que trabaje la muestra.
- **Sin asignacion**: para crear o editar el procesamiento, la extraccion o el analisis de una muestra hay que estar asignado a su recepcion. Si no, el sistema responde "No estás asignado a la muestra R ...". La coordinacion (aprobar en muestras o en ensayos) no necesita asignacion.
- **Alcance "asignado"**: quien tiene este alcance en muestras (p. ej. Tecnico Analista, estudiante) solo ve y edita las recepciones asignadas a el o registradas por el.
- **Mis muestras**: en las listas de recepcion, procesamiento, extraccion y analisis, el filtro **Mis muestras** muestra solo las muestras asignadas a usted. En el Inicio, "En curso" le muestra a cada analista solo sus muestras.

### 13.12 Estados de la recepcion

La recepcion avanza solo hacia adelante, en este orden:

1. **Registrada** — se capturo la recepcion.
2. **Aceptada**, **Aceptada con desviacion** o **Rechazada** — decision de aceptacion.
3. **En procesamiento** — se guardo el procesamiento.
4. **En extraccion** — se guardo una extraccion.
5. **En analisis** — se guardo un analisis.
6. **En revision tecnica** — un analisis se envio a revision (o se reviso).
7. **Validada** — todos los analisis vigentes de la recepcion estan aprobados.
8. **Informe elaborado** — se creo el informe.
9. **Liberada** — se autorizo el informe (por ahora autorizar equivale a liberar; se separan en la siguiente fase).
10. **Cerrada** — se registro la disposicion final.

Los botones y acciones de cada fila dependen del estado y de su permiso. Una recepcion liberada, cerrada, rechazada o anulada ya no se edita.

### 13.13 Enviar a revision, devolver y enmiendas de analisis

- **Enviar a revision**: cuando el analista termina, usa **Enviar a revision**. Desde ese momento ya no puede editarlo. El revisor solo puede revisar un analisis que el analista ya envio a revision.
- **Devolver con observaciones**: el revisor puede devolver un analisis enviado a revision, con observaciones, para que el analista lo corrija antes de aprobarlo. Al devolverlo vuelve a quedar editable.
- **Enmienda**: un analisis aprobado no se edita. Para corregirlo se usa **Enmendar**, con motivo obligatorio: se crea una nueva version (mismo folio, "v2", "v3"...) que sigue el flujo normal (enviar a revision, revisar, aprobar). Al aprobarse la enmienda, la version original queda **Sustituida** y se conserva. La enmienda no vuelve a descontar inventario.

### 13.14 Decisiones que autoriza la Coordinacion Tecnica

Estas acciones sobre una recepcion las autoriza alguien con permiso de aprobar en muestras (Coord. Area Tecnica), distinto de quien las pide. Si quien las hace ya tiene ese permiso, se aplican directo (con su contrasena).

- **Rechazo o aceptacion con desviacion**: si usted registra esa decision sin tener el permiso, la recepcion se guarda y la decision queda **pendiente de autorizacion** en **Por autorizar**; al aprobarla la coordinacion, se aplica.
- **Cambio de folio**: el folio ya no se edita despues de crear la recepcion. Use **Cambiar folio**, con el folio nuevo y el motivo.
- **Reapertura**: una recepcion cerrada o rechazada se reabre con **Reabrir** y motivo. Vuelve al estado previo (una rechazada vuelve a Registrada, sin decision, para decidir de nuevo; una cerrada vuelve al estado en que se cerro).

### 13.15 Firmas con contrasena del firmante

En recepcion, procesamiento, extraccion y analisis, las personas que firman (recibio, proceso, superviso, extrajo, realizo la limpieza, analista) se eligen de las cuentas activas; se guarda su cuenta, su nombre y su cargo. Si quien firma no es usted, esa persona debe escribir su propia contrasena en ese momento para confirmar su firma. Quien firma un trabajo tecnico (proceso, extrajo, limpio, analista) debe tener la autorizacion FX-THF-AP de esa actividad y metodo. Quien supervisa no puede ser la misma cuenta que proceso, extrajo o limpio.

### 13.16 Etiquetas imprimibles

En la recepcion (o en el menu de su fila) use **Imprimir etiqueta**. Elija el **tamaño** (Pequeña 50 × 25 mm; Mediana 66.7 × 25.4 mm, tipo Avery 5160; Grande 101.6 × 50.8 mm, tipo Avery 5163; Media hoja), las **copias por muestra** (2 para etiqueta interna y externa) y, si la hoja de etiquetas ya se uso, **Empezar en la posicion**. Todo se imprime en hoja carta, en la menor cantidad de hojas; la vista previa es igual a lo impreso. La pequeña lleva folio R, ID interno y fecha de recepcion; las demas, ademas organismo, muestreo y resguardo. El sistema recuerda el ultimo tamaño elegido. Al imprimir queda en la bitacora "imprimió etiquetas".

### 13.17 Documentos del SGC (retirado)

Esta seccion describia el flujo de control documental (propuestas, revision de calidad y tecnica, aprobacion, publicacion con distribucion y "Lei y comprendi", obsolescencia por solicitud y lista maestra). **Por decision confirmada del laboratorio se retiro**: Calidad › Documentos es ahora la **Biblioteca** (seccion 11). Los registros anteriores se conservan y siguen en la bitacora; una solicitud pendiente de "declarar obsoleto" aparece como **Accion retirada** y ya no se puede aprobar (quien la pidio puede cancelarla).

### 13.18 ¿Que puede hacer cada rol?

Resumen del estado final (Fases 9 y 10). El detalle por modulo, accion y alcance esta en `docs/CATALOGO_PERMISOS.md`; ademas del rol, capturar y firmar trabajo tecnico exige la autorizacion FX-THF-AP vigente (13.10).

| Rol | Tareas principales |
| --- | --- |
| Administrador técnico del sistema | Administra cuentas y roles (alta, baja, vigencias, bloqueos); no aprueba cambios de acceso ni otorga autorizaciones FX-THF-AP; consulta la bitacora y el estado de las muestras; crea los respaldos y ejecuta las pruebas de restauracion por linea de comandos (13.20). |
| Responsable General | Aprueba asignaciones de rol, reactivaciones y ampliaciones de vigencia; revisa y autoriza informes y los libera; archiva y restaura documentos de la Biblioteca; anula con justificacion y aprueba solicitudes; otorga autorizaciones FX-THF-AP. |
| Coordinador/a de Mejora Continua | Gestiona el SGC: administra la Biblioteca (sube, edita y archiva cualquier documento, categorias); excepciones de segregacion; bitacora completa; otorga autorizaciones FX-THF-AP. |
| Coordinador/a del Área Técnica | Asigna muestras; recibe, procesa, extrae, analiza, revisa y aprueba resultados; revisa, autoriza y libera informes; decide rechazos, desviaciones, cambios de folio y reaperturas; administra equipos e inventario; otorga autorizaciones FX-THF-AP. |
| Coordinador/a de Investigación y Desarrollo | Captura y revisa ensayos e informes de sus proyectos; sube documentos a la Biblioteca; equipos e inventario. |
| Técnico Analista | Trabaja las muestras asignadas: procesa, extrae, analiza, adjunta la evidencia instrumental y envia a revision; crea informes en borrador; registra uso de equipos y movimientos de inventario. |
| Técnico Auxiliar | Registra recepciones y procesamientos; uso de equipos y movimientos de inventario. |
| Administrador/a Auxiliar | Mantenimientos de equipos, inventario y compras; ve el estado de las muestras. |
| Auditor Interno | Consulta todo (solo lectura), incluida la bitacora. |
| Estudiante / personal en formación | Trabaja las muestras asignadas con supervision (todo queda pendiente del visto bueno de su supervisor); en la Biblioteca solo ve los documentos visibles para todos o para su rol. |

### 13.19 Notificaciones

- **Campana** (barra lateral): un aviso por cada cosa que te toca, de la misma fuente que **Para ti** del Inicio: solicitudes **Por autorizar** (nunca las que tu pediste), registros **Por supervisar**, muestras asignadas a ti en los ultimos 7 dias, analisis e informes que puedes revisar, aprobar, autorizar, liberar o enviar (no los que tu elaboraste), informes que requieren enmienda, inventario (stock bajo y caducidades) y equipos (calibraciones y mantenimientos) si los administras, cuentas, roles y autorizaciones por vencer, y los avisos de **calidad** (13.21). Cada aviso tiene icono de color (rojo urgente, ambar pronto, azul informativo), frase corta, el registro y "hace X", agrupados en Hoy, Ayer y Anteriores.
- **Leidas**: al pulsar un aviso se marca como leido, te lleva a su registro (o abre su ventana) y desaparece de la campana; el contador rojo cuenta solo las no leidas. Al pasar el cursor, el boton de palomita lo marca sin abrirlo, y **Marcar todas como leídas** las marca todas. **Ver anteriores** muestra las leidas de los ultimos 7 dias. Lo leido se guarda en tu cuenta (te sigue en cualquier computadora) y no queda en la bitacora.
- **Leido no es resuelto**: la solicitud sigue pendiente y el stock sigue bajo. Esos pendientes siguen en **Para ti** del Inicio y en sus bandejas hasta que se resuelven; entonces el aviso desaparece solo, aunque no lo hayas leido. Si la situacion vuelve a ocurrir (otra solicitud, el stock se repone y vuelve a bajar, una autorizacion entra a su ultima semana), aparece un aviso nuevo.
- Si la revision automatica detecta un posible cambio no autorizado en el registro de actividad, quien tiene Calidad lo ve en la campana y en el Inicio.
- **La bitacora no se exporta** (ni completa ni el historial de un registro): se consulta solo dentro de la plataforma, en **Calidad › Auditoria** y en el **Historial** de cada formato.

### 13.20 Respaldos

La pantalla **Respaldos** se retiro de la interfaz (junto con "Crear respaldo ahora", la descarga de actas y los avisos de respaldo del Inicio y la campana). Los respaldos y las pruebas de restauracion los hace el **Administrador tecnico del sistema** por linea de comandos, sin cambios: `npm run respaldar` (y la tarea programada diaria), `npm run restaurar` (modo prueba por omision, con su **acta** en `backups/pruebas-restauracion/`) y `npm run verificar-instalacion` para revisar el estado. El procedimiento completo esta en `docs/RESPALDO_Y_RECUPERACION.md`. Si una prueba de restauracion detecta un respaldo alterado, se crea una incidencia automatica (se revisa al abrir Auditoria).

### 13.21 Incidencias y no conformidades (Calidad › Incidencias y NC)

Para registrar cualquier problema del trabajo (ISO/IEC 17025 7.10 y 8.7): una **incidencia** es el aviso de que algo paso; Calidad la evalua y, si hay un incumplimiento, la escala a una **no conformidad (NC)**, que se analiza, se corrige con **acciones correctivas** y se cierra cuando se verifica que fueron eficaces. Nada se borra: todo queda en la bitacora.

**Reportar una incidencia** (cualquier persona con Calidad: C, incluidos Tecnico Analista, Tecnico Auxiliar, Administrador/a Auxiliar y Estudiante):

- Boton **Reportar incidencia** en la barra lateral, en el buscador (⌘K: "reportar incidencia") o en el menu **⋯** de una recepcion, procesamiento, extraccion, analisis, informe, equipo, reactivo o consumible (asi queda ligada a ese registro).
- Se llena en menos de un minuto: **tipo** (desviacion del metodo, falla de equipo, condicion ambiental, muestra o custodia, insumo, seguridad, sistema, queja del cliente u otro), **cuando ocurrio**, **que paso** (al menos 20 caracteres), **accion inmediata** (opcional), **¿afecta resultados?** (si, no o no se sabe) y **fotos o archivos** (hasta 6; mismas reglas de la evidencia: PDF, imagen, CSV, Excel…, con su huella SHA-256).
- **No requiere visto bueno** aunque tu cuenta sea supervisada o temporal: reportar un problema nunca se frena. Queda "Reportada" a tu nombre con fecha, hora y cargo.
- Algunas incidencias las crea el sistema (sin duplicarlas si el evento se repite): recepcion **aceptada con desviacion** o **rechazada**, uso de un **equipo con calibracion vencida o no apto**, y **alertas de integridad** (PDF, evidencia o respaldo alterados; estas las reporta "Sistema").

**Que ves** (una sola lista con incidencias y no conformidades juntas, de la mas reciente a la mas antigua):

- Con Calidad: V total (Coordinacion Tecnica, Mejora Continua, Responsable General, Auditor, I+D) ves todo. Los roles operativos ven **solo las incidencias que reportaron** y las NC o acciones **a su cargo**; no ven la bitacora completa ni incidencias de otros. El **Administrador tecnico no ve incidencias ni NC**.
- Cada renglon muestra el **registro** (folio INC o NC y su tipo), **que paso** (hasta 2 lineas; el texto completo sale al pasar el cursor), el **estado** (en las NC, su etapa) con avisos de acciones vencidas, suspension activa, informe retenido o incidencia automatica, la **persona** (quien reporto o el responsable de la NC) y la **fecha**. Al pulsarlo se abre su ventana, con **Abrir ficha completa**.
- Hay busqueda y el boton **Filtros**, con interruptores por: **Tipo de registro** (sin ninguno se ven ambos), **Estado de la incidencia**, **Etapa de la no conformidad**, **Tipo de incidencia**, **Clasificacion de la NC**, **Mis registros** (reportados por mi, donde soy responsable), **Situacion** (con acciones vencidas, con suspension activa, con informe retenido, creadas automaticamente), **Periodo** (hoy, ultimos 7 o 30 dias, todo o un rango), **Mostrar anuladas** y **Ordenar por** (mas recientes, mas antiguos o folio). Los filtros que solo aplican a un tipo no ocultan el otro, salvo que lo elijas en **Tipo de registro**. Las acciones correctivas se consultan y gestionan dentro de cada NC; para encontrar las atrasadas usa **Con acciones vencidas**. Ya no hay tablero de indicadores en esta pantalla.
- En la ficha de cada registro relacionado (recepcion, analisis, informe, equipo…) hay una seccion **Incidencias** con las que lo mencionan y el boton para reportar una.

**Evaluar la incidencia** (Calidad: R; nunca quien la reporto, regla 7): en su ficha, **Evaluar** → **Cerrar sin NC** (evento aislado) o **Escalar a no conformidad** (nueva, o agregarla a una NC abierta: una NC puede agrupar varias incidencias), con justificacion. Una incidencia ya evaluada no se vuelve a evaluar.

**La no conformidad** es un formato de pagina con indicador de etapa (Abierta → En analisis → Acciones en curso → En verificacion → Cerrada) y nueve secciones:

1. **Origen**: incidencias, clasificacion (menor, mayor, critica; por validar) y **responsable** (solo lo nombra Mejora Continua, Calidad: G; cambiarlo pide motivo).
2. **Descripcion y requisito incumplido** (clausula ISO, procedimiento o formato).
3. **Evaluacion de impacto**: ¿afecta resultados emitidos?, ¿se detiene el trabajo?, ¿se notifica al cliente?; **informes afectados** y su **retencion**; **suspension** de un metodo o equipo; **comunicaciones con el cliente**.
4. **Analisis de causa**: 5 porques, Ishikawa u otro; causa raiz; ¿requiere accion correctiva? (si es "no", con justificacion: se evalua si puede repetirse).
5. **Acciones correctivas**: responsable, fecha compromiso, estado y evidencia. La marca como implementada su responsable (con evidencia). Una accion con fecha pasada aparece **vencida** (no se bloquea). Si su responsable ya no tiene cuenta vigente, se avisa y se **reasigna con motivo**.
6. **Verificacion de eficacia** (Calidad: R; nunca el responsable de una accion, regla 8): **eficaz**, o **no eficaz**, que **reabre** la NC a analisis sin borrar nada y cuenta la reapertura (para continuar hay que revisar la causa y agregar al menos una accion nueva).
7. **Efectos en el SGC**: actualizar riesgos (bandera y nota) y **Requiere cambio documental** (bandera; el documento se actualiza subiendo una version nueva en la **Biblioteca**). Ya no se crean propuestas documentales; si la NC tenia una del flujo anterior, se muestra en solo lectura (titulo y estado).
8. **Cierre** (Calidad: A con tu contraseña; nunca el responsable de la NC, regla 9): exige evaluacion de impacto completa, acciones implementadas o canceladas y la ultima verificacion eficaz (o la justificacion si no requiere acciones), ninguna suspension ni retencion activa y la comunicacion al cliente si se decidio notificarlo. Genera el PDF **"Registro de no conformidad"** con firmas, cargos y huella SHA-256.
9. **Historial**.

Editan la NC Mejora Continua (Calidad: G) y su responsable. Anular una incidencia o una NC es una accion critica: pide motivo y la autoriza un segundo usuario (una incidencia escalada solo se anula si su NC esta anulada).

**Suspensiones y retenciones** (7.10.1):

- **Metodo suspendido** (p. ej. DSP): no se pueden crear ni editar extracciones ni analisis de ese metodo ("Método DSP suspendido por NC 0000001"); los aprobados no se tocan. El formato lo avisa al abrirlo.
- **Equipo suspendido**: queda **fuera de servicio** y no se puede usar en los formatos ni ponerse operativo desde el inventario; al reanudar vuelve a su estado anterior. Si otra NC abierta tambien lo suspende, sigue suspendido hasta que se reanuden todas.
- **Informe retenido**: no se libera ni se envia ("retenido por NC …"); si ya se envio queda marcado como retenido (no se reenvia). Si hay que corregir resultados se usa la **enmienda** del analisis y del informe.
- Suspender y retener: Calidad: R. **Reanudar** y **liberar la retencion**: Calidad: A con tu contraseña; nunca quien suspendio (regla 10). Si no hay otra persona disponible se puede pedir una **excepcion de separacion de funciones**.

**Avisos** (Inicio y campana): incidencias por evaluar, mis acciones correctivas (proximas y vencidas), verificaciones pendientes, informes retenidos, metodos y equipos suspendidos, y acciones por reasignar.

### 13.22 Al guardar un formato con datos faltantes

Nada se registra hasta pulsar **Registrar** o **Guardar** (tampoco al elegir a otra persona como firmante: su contraseña se verifica al guardar). Si falta algo, el formato no se guarda: los campos con problema se marcan en rojo con un mensaje corto, la pantalla lleva al primero y aparece un aviso con la lista («Recepción: Indica el solicitante», «Inspección visual: Marca C, NC o NA en el requisito 5»…); cada renglón lleva a su campo. **Entendido** cierra el aviso. El rojo desaparece en cuanto se corrige. Si el servidor rechaza el guardado por permisos, autorización FX-THF-AP, estado del registro o una solicitud pendiente, el aviso dice qué pasó y qué hacer. Una opción no permitida por una regla (por ejemplo «Aceptada» con un requisito en NC) se ve con candado y, al pulsarla, explica por qué.

### 13.23 Solicitudes pendientes

Un registro con una solicitud pendiente muestra arriba un aviso con qué se pidió, quién, cuándo y el motivo. Quien puede autorizarla ve **Aprobar** y **Rechazar** ahí mismo; quien la pidió ve **Cancelar solicitud**. En las listas, el icono de reloj junto al estado abre el mismo panel, y arriba de la lista aparece «N solicitudes esperan tu autorización · Ver» si tienes alguna por resolver. El menú lateral muestra cuántas hay en **Por autorizar** y **Por supervisar**.

## 14. Buenas practicas de uso

- Capture folios y codigos internos de forma consistente.
- Revise el stock antes de registrar procesamiento o extraccion.
- Use observaciones para documentar desviaciones, incidencias o condiciones especiales.
- Verifique que los movimientos se generen despues de descuentos de inventario.
- Mantenga actualizados responsables, ubicaciones y fechas de mantenimiento.
- No comparta su sesion con otros usuarios.
- Cierre sesion al terminar de usar el sistema.

## 15. Problemas frecuentes

### No puedo iniciar sesion

Verifique que su correo este registrado, que la contrasena sea correcta, que el usuario este activo, dentro de su vigencia y que tenga un rol asignado. El mensaje "Correo o contraseña incorrectos" aparece en todos los casos, tambien si la cuenta se bloqueo por intentos fallidos (espere 15 minutos o pida el desbloqueo).

### No veo una seccion en la barra lateral

Ninguno de sus roles vigentes tiene permiso de ver (V) ese modulo. Solicite revision al administrador. Si un rol le fue revocado o vencio, la barra se actualiza sola en menos de un minuto.

### No puedo crear, editar, anular o dar de baja

Aunque pueda ver una seccion, sus roles pueden no tener las acciones C (crear), E (editar borrador) o AN (anular o dar de baja con motivo), o tenerlas con un alcance limitado (por ejemplo, "solo recepcion" o "solo mantenimientos"). Revisar y aprobar son las acciones R y A de cada modulo. Un analisis revisado o un informe en revision ya no se editan: se anulan o se enmiendan.

### El sistema no me deja aprobar o autorizar

Revise que alguno de sus roles tenga R (revisar) o A (aprobar/autorizar) en Ensayos o Informes, y que usted no haya elaborado el registro (ni un analisis incluido en el informe): la separacion de funciones lo impide (ver 13.7). Un informe solo se autoriza cuando todos sus analisis estan aprobados. Ademas necesita la autorizacion FX-THF-AP vigente de esa actividad (y del metodo, en analisis); ver 13.10.

### "No tienes autorización vigente para ..."

Le falta la autorizacion FX-THF-AP de la actividad, el metodo o el equipo que indica el mensaje, o ya vencio o fue revocada. Consulte **Mi cuenta › Mis autorizaciones** y pida a la Coordinacion del Area Tecnica, a Mejora Continua o a la Responsable General que la registre (ver 13.10).

### "No estás asignado a la muestra ..."

Para trabajar el procesamiento, la extraccion o el analisis de una muestra debe estar asignado a su recepcion. Pida a la Coordinacion del Area Tecnica que se la asigne (13.11).

### El registro aparece en solo lectura

Esta anulado, cerrado, aprobado o autorizado. Para corregirlo: restaure la anulacion (con motivo), emita una enmienda del informe o capture un registro nuevo y anule el incorrecto.

### El sistema no permite guardar una muestra

Revise los campos obligatorios. En recepcion, el folio es obligatorio; en muestra unica tambien se requiere ID interno; en lote debe existir al menos una muestra seleccionada.

### No se puede guardar una extraccion

Revise que exista folio, que el procesamiento seleccionado tenga muestras disponibles para extraccion y que haya stock suficiente de los reactivos seleccionados. Recuerde que la cantidad se multiplica por el numero de tubos (muestras, replicas y blanco). Si el mensaje dice que el folio ya existe, el numero ya esta usado en ese formato (ASP y DSP tienen series separadas).

### El sistema pide confirmacion por un equipo

El equipo elegido esta fuera de servicio, en mantenimiento o con la calibracion vencida segun el catalogo de **Inventario > Equipos**. Puede guardar de todos modos (queda registrado) o corregir el equipo. Si el dato del catalogo esta desactualizado, actualicelo en Equipos.

### La importacion Excel muestra errores

Revise que el archivo tenga hojas y columnas compatibles. El sistema puede importar filas validas aunque existan errores en otras filas.

### "No se puede enviar: el informe requiere enmienda"

Un analisis incluido en el informe se enmendo despues. Cree la enmienda del informe (**Enmienda**), revisela, autoricela y liberela; despues envie la nueva version.

### "Solo se envian informes liberados"

Autorizar ya no genera el PDF final: falta **Liberar** el informe (Informes: A y la autorizacion FX-THF-AP de liberacion de informes).

### "Método … suspendido por NC …" o equipo suspendido

Calidad detuvo ese metodo o equipo por una no conformidad (13.21). No se puede guardar un registro que lo use hasta que quien tiene Calidad: A lo reanude; consulta la NC indicada en el aviso.

### "El informe … está retenido por NC …"

Una no conformidad puso en duda sus resultados: no se libera ni se envia hasta que Calidad libere la retencion (13.21).

## 16. Soporte

Para soporte, contacte al administrador del sistema FICOTOX e indique:

- Usuario o correo con el que intenta ingresar.
- Modulo donde ocurre el problema.
- Accion realizada.
- Mensaje mostrado por el sistema.
- Archivo usado, si el problema ocurre durante una importacion.
