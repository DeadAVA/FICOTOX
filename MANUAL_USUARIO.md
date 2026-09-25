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
- **Confirmar identidad**: las acciones criticas (aprobar, autorizar, entregar, anular, restaurar, dar de baja, cancelar, cerrar una muestra, dar visto bueno y los cambios de usuarios) piden su contrasena en el mismo dialogo donde escribe el motivo o firma. Si una accion no la pidio, aparece el dialogo **"Confirma tu identidad"** sin salir del formulario. 
- **Cuenta fuera de vigencia**: si su cuenta aun no inicia o ya termino, vera "Tu acceso no está vigente; contacta al administrador". Si vence con la sesion abierta, el sistema lo regresa a la pantalla de acceso.
- **Mi cuenta** (menu de usuario, abajo a la izquierda): **Cambiar contraseña** (minimo 10 caracteres, distinta de su correo y de su nombre; cierra sus otras sesiones), **Cargo predeterminado** (si tiene varios roles) y **Cerrar sesión en todos los dispositivos**.
- Si la administracion restablece su contrasena, al entrar con la contrasena temporal debera elegir una nueva antes de continuar.

## 3. Navegacion general

La **barra lateral** (a la izquierda) tiene seis entradas, visibles segun los permisos del usuario:

- **Inicio**.
- **Muestras** ▸ Recepcion, Procesamiento, Extraccion y Analisis.
- **Informes**.
- **Inventario** ▸ Reactivos, Consumibles, Equipos, Mantenimiento y Movimientos.
- **Calidad** ▸ Auditoria. (El modulo **Documentos** del SGC esta apagado por ahora: no aparece en el menu ni en los avisos; se reactiva desde la configuracion tecnica sin perder datos.)
- **Administracion** ▸ Usuarios y Roles.

Las entradas con ▸ se despliegan: al hacer clic en el nombre se abre la seccion y su primera pantalla; la flecha de la derecha solo abre o cierra la lista. La seccion en la que esta siempre queda abierta.

En la cabecera de la barra hay un icono de **busqueda** y el boton para contraer la barra a solo iconos (el sistema lo recuerda); abajo, su avatar y su nombre con el menu **Mi cuenta** y **Cerrar sesion**.

**Mi cuenta** muestra su nombre, correo y sus roles vigentes, y permite elegir su **avatar** entre las 18 ilustraciones del catalogo (criaturas y objetos del laboratorio). Si no elige uno, el sistema le asigna uno a partir de su correo. El cambio queda registrado en la bitacora. En dispositivos moviles la barra se abre con el boton de menu (tres lineas).

Atajos y ayudas:

- El icono de busqueda (o `Ctrl+K` / `Cmd+K` en cualquier pantalla) abre la busqueda: escriba un folio (`R 12`, `E-D 3`, `IR 5`), el nombre de un reactivo, consumible, equipo, mantenimiento o documento, lo que quiere hacer (`nueva recepcion`, `programar mantenimiento`), una vista por estado (`stock bajo`, `por revisar`, `calibracion`, `mantenimientos vencidos`) o un tema de la ayuda (`como anular`), y presione Enter para ir directamente. Sin escribir nada ofrece lo ultimo que abrio, lo que puede crear y a donde ir. Las fichas **Todo / Muestras / Informes / Inventario / Acciones** (o la tecla `Tab`) acotan los resultados.
- **Ayuda**: al pie de la barra lateral hay un enlace **Ayuda** con el manual resumido dentro de la plataforma (como buscar, el flujo de una muestra, extracciones, analisis, informes, inventario, auditoria, como corregir un registro y atajos). Sus temas tambien aparecen en el buscador.
- Los formularios de catalogo (reactivos, consumibles, equipos, mantenimiento, usuarios, roles) se abren en un panel lateral sin salir de la tabla.
- Los formatos de muestra e informe se abren en pantalla completa con una **guia de secciones** a la izquierda (arriba en el celular) que indica cuales estan completas (verde), cuales tienen faltantes (ambar) y en cual se encuentra; haga clic en una seccion para ir a ella.
- Al capturar, el formato se muestra **paso a paso**: solo una seccion abierta a la vez y un boton **Continuar** al final de cada una. Si prefiere verlo completo, elija **Todo** en el control de la guia (en el celular, el boton **Mostrar todo**); la eleccion se recuerda. Al consultar un registro terminado se muestra completo.
- Las muestras de un lote y los resultados por muestra se capturan en tarjetas (una por muestra) para que nada se salga de la pantalla; las tablas largas se desplazan dentro de su seccion.
- **Quien hizo que** se elige de una lista del personal autorizado (quien puede capturar muestras, quien puede aprobar, quien puede elaborar informes); el campo viene prellenado con la persona que tiene la sesion. Para alguien sin cuenta (alumnos, personal externo) elija **Otra persona...** y escriba el nombre.
- **Autollenado.** El sistema completa lo que ya sabe: folios consecutivos, fecha y hora, la muestra y el ID desde el paso anterior, la bolsa y los reactivos del protocolo, el **equipo operativo unico** que corresponde a cada paso (si hay dos cronometros y solo uno esta vigente, pone ese), el **lote de la solucion preparada** como folio de preparacion, el **siguiente folio de bitacora** de cada equipo (el ultimo anotado + 1) y, en analisis, el metodo, la referencia del procedimiento y el instrumento segun el tipo. Todo se puede cambiar; solo se llenan los campos vacios.
- **No se puede guardar sin la informacion minima.** Cada formato tiene secciones obligatorias y opcionales (marcadas "opcional" en la guia: por ejemplo Insumos adicionales, Equipos utilizados, Controles de calidad, la Decision de aceptacion al registrar una recepcion). Si falta algo obligatorio, al pulsar Guardar el sistema avisa "Falta informacion en ..." y abre la primera seccion incompleta; la guia marca en ambar todas las que faltan. La barra "n de m" cuenta solo las obligatorias; una opcional se pone en verde cuando se llena.
- En cada formato la cabecera muestra solo el siguiente paso (por ejemplo "Marcar revisado", "Aprobar", "Registrar entrega") y **Guardar**; anular, restaurar, emitir enmienda o ver el PDF estan en el menu **Mas acciones** (icono de tres puntos).
- En las listas, el boton **Filtros** junto a la busqueda abre un panel con las opciones de esa lista (etapa, formato, existencia, estado...) y los conmutadores "Mostrar anuladas" o "Mostrar bajas"; el numero en el boton indica cuantos filtros hay activos y cada filtro activo aparece como una ficha que se quita con un clic. Las opciones en gris con "Proximamente" (PSP, pigmentos, sedimentos) todavia no estan disponibles.
- Cada fila tiene un boton **⋯ Acciones** que agrupa todo lo que se puede hacer con ese registro: abrir, editar, procesar/extraer/analizar, rellenar, dar de baja, anular o restaurar. Hacer clic en la fila abre el registro.

## 4. Inicio

La pantalla de Inicio muestra solo lo importante:

- El **buscador** al centro: escriba y elija el resultado; lo lleva al registro, a la seccion, a una lista filtrada o abre un formato nuevo. Debajo hay tres ejemplos ("R 0000001", "metanol", "nueva recepcion"): al hacer clic se escriben en el buscador para probar.
- **En curso**: una tarjeta por cada muestra que aun no termina su flujo, con su folio, solicitante, tipo (ASP/DSP), numero de muestras, dias desde la recepcion y la **linea de etapas** (Recepcion → Procesamiento → Extraccion → Analisis → Informe) con la etapa actual marcada. A la derecha, el **siguiente paso** como boton (por ejemplo "Registrar extraccion", "Aprobar analisis", "Registrar entrega", "Registrar disposicion final"): abre el formato con el folio ya vinculado. Al pasar el cursor por la tarjeta (en el celular, "Detalle") se ve el detalle de cada etapa con su folio y estado; cada punto de la linea tiene su ayuda emergente y enlace. El titulo indica cuantas hay y cuantas esperan firma; lo que espera firma va primero.
- **Avisos**: solo lo que conviene atender (mantenimientos vencidos, equipos con alerta de calibracion, reactivos y consumibles con stock bajo, analisis e informes esperando firma, informes autorizados sin entregar, mantenimientos en los proximos 30 dias). Al pasar el cursor por un aviso se ve **cuales** son (los primeros seis, con enlace directo); al hacer clic se abre la lista ya filtrada con la misma cuenta. El titulo indica el total y cuantos son urgentes. Si no hay nada, dice "Todo en orden".
- Una linea al pie de los avisos lleva a la **ayuda** ("Como se usa").

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
- Los estados avanzan solos: la recepcion pasa a **En proceso** al procesarla, a **Analizada** al aprobar el analisis, a **Informada** al autorizar el informe y a **Cerrada** al registrar la disposicion final. Un registro anulado o cerrado se abre en **solo lectura**.
- Cada formato tiene al final una seccion **Historial**: una linea de tiempo en frases sencillas ("Daniela Cortes aprobo el analisis A 0000004", "Ana Ramirez anulo la recepcion R 0000011"), con el motivo entre comillas, los hechos clave (por ejemplo "Estado: Registrada -> Anulada") y el boton **Ver cambios** para ver cada dato con su valor anterior y el nuevo, en español y sin codigos.

### 8.1 Recepcion de muestras

1. Ingrese a **Muestras**.
2. Seleccione la pestana **Recepcion**.
3. Presione **Nueva recepcion**.
4. Capture los datos del formato de recepcion:
   - Folio, fecha, hora, medio de recepcion (entrega directa, paqueteria o recoleccion) y quien recibe.
   - Solicitante.
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

Revision y aprobacion (requieren los permisos **Ensayos: R** y **Ensayos: A**):

- **Marcar revisado**: quien tenga permiso de revisar ensayos revisa el registro y firma. El cargo que aparece junto a la firma es el del rol con el que actua (si tiene varios roles que lo permiten, el sistema le pregunta cual).
- **Aprobar**: lo aprueba una persona con permiso de aprobar ensayos que **no** lo elaboro (revisor y aprobador pueden ser la misma persona). Si usted lo capturo o lo edito, el boton aparece deshabilitado con la explicacion (ver 13.7).
- Un analisis revisado que se edita vuelve a **Registrado** (hay que indicar el motivo del cambio) y debe revisarse de nuevo. Un analisis aprobado es de solo lectura; si esta mal, se anula y se captura otro.
- Al aprobar, la extraccion pasa a **Analizada** y el procesamiento a **Completada**.

## 8.5 Informes de resultados

La seccion **Informes** emite el informe de resultados para el cliente (folio **IR**), con el contenido que exige ISO/IEC 17025 7.8.2 y un PDF generado por el sistema.

1. Presione **Nuevo informe** y elija la recepcion. Se cargan el cliente, los items ensayados y los **analisis aprobados** de esa recepcion; marque los que se incluyen.
2. Revise las declaraciones (alcance de los resultados, regla de decision, desviaciones del metodo, descargo cuando la muestra se acepto con desviacion, opiniones e interpretaciones) y presione **Crear borrador**. Con **Vista previa PDF** puede ver como quedara.
3. **Marcar revisado** (Informes: R) y luego **Autorizar** (Informes: A; con firma obligatoria). No puede hacerlo quien elaboro el informe ni quien elaboro alguno de sus analisis (ver 13.7); revisor y autorizador si pueden ser la misma persona. El cargo que aparece en el informe es el del rol con el que actuo cada persona. Al autorizar, los resultados quedan **congelados** en el informe, se genera el PDF definitivo con su huella SHA-256 y la recepcion pasa a **Informada**.
4. **Registrar entrega**: fecha, medio (correo, impreso, entrega en mano...) y a quien se entrego.
5. Si hay que corregir un informe ya autorizado o entregado, use **Enmienda**: se crea la version siguiente (v2, v3...) en borrador que sustituye a la anterior y la indica en el PDF. Al autorizar la enmienda, el informe original pasa a **Sustituido** y su PDF se regenera con la leyenda "sin validez" (se conserva para el expediente). **Anular** marca el PDF como sin validez.

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

## 11. Documentos SGC y reportes

La seccion **Documentos** es el control de documentos del sistema de gestion de calidad (ISO/IEC 17025 8.3) y tambien lista los reportes de mantenimiento en PDF (pestana **Reportes de mantenimiento**, boton **Abrir PDF**).

- **Lista maestra**: solo las revisiones **vigentes**, con clave, titulo, tipo, area, revision, fecha de vigencia, proxima revision (por defecto 3 anos) y quien aprobo. Los documentos con revision periodica vencida se marcan.
- **Todas las revisiones**: borradores, en revision, vigentes, obsoletos y cancelados.

Ciclo de un documento:

1. **Nuevo documento**: clave con el formato del laboratorio (`FX-<area><tipo>-<siglas>`, por ejemplo `FX-GCP-CD`); el tipo (manual, procedimiento, instructivo, formato, registro, lista, bitacora, externo) y el area (gestion de calidad, tecnica, direccion...) se derivan de la clave. Adjunte el archivo (PDF, Word, Excel...). Queda en **Borrador**.
2. **Enviar a revision** (requiere archivo, salvo documentos externos).
3. **Aprobar** (Documentos: A; solo documentos en revision y con archivo): pide cargo de quien aprueba y fecha de vigencia. La revision queda **Vigente** y la anterior pasa a **Obsoleta** automaticamente (se conserva identificada, no se borra).
4. **Nueva revision**: crea el borrador de la revision siguiente indicando que cambio; **Declarar obsoleto** retira un documento vigente con motivo; **Cancelar borrador** descarta un borrador con motivo.

Cada documento tiene **Ver detalle e historial** con sus revisiones, la huella SHA-256 del archivo y la bitacora.

## 11.1 Bitacora de auditoria

En la barra lateral, grupo **Calidad**, **Auditoria** (permiso Calidad: V) muestra quien hizo que, cuando y por que en todo el sistema: altas, ediciones (con el valor anterior y el nuevo), anulaciones, bajas, revisiones, aprobaciones, autorizaciones, entregas, inicios de sesion e intentos fallidos. Se presenta como la lista de Movimientos: una tabla con fecha y hora, usuario, accion (etiqueta de color), **que paso** en una frase ("Dio de baja el reactivo CH-3B" con el motivo y los hechos clave debajo), el registro afectado con enlace **Abrir**, y a la derecha "n cambios": al hacer clic en la fila se despliega el detalle de cada dato con su valor anterior y el nuevo. Arriba a la derecha van los contadores (total, 30 dias, anulaciones, accesos fallidos). Se filtra por entidad, accion, usuario, fecha y texto. La bitacora no se puede editar ni borrar; **Verificar integridad** comprueba la cadena de hashes, que no falten entradas al final y que la proteccion de la tabla siga activa, y avisa si algo fue alterado. Cada formato muestra su propio **Historial** a quien puede leer ese modulo.

## 12. Roles y permisos

Cada persona puede tener **uno o varios roles**, cada uno con fecha de inicio y, si se quiere, fecha de fin. Lo que una persona puede hacer es la suma de sus roles vigentes. El detalle de los 10 roles del laboratorio, sus permisos y las combinaciones prohibidas esta en `docs/CATALOGO_PERMISOS.md`.

Cada permiso dice **que** se puede hacer en cada modulo:

| Letra | Significa |
| --- | --- |
| V | Ver |
| C | Crear o capturar |
| E | Editar un borrador (solo mientras el registro no pasa a revision o aprobacion) |
| R | Revisar |
| A | Aprobar, validar, autorizar o liberar |
| AN | Anular con justificacion |
| G | Administrar (todo lo anterior) |

y **hasta donde** (alcance): por ejemplo "solo recepcion", "solo su propia cuenta", "solo el estado de la muestra" o "solo mantenimientos". Algunos alcances se guardan ya pero se aplicaran en fases posteriores; la pantalla los marca con "se aplica en Fase X".

Los modulos son: Usuarios y roles, Documentos, Muestras (recepcion, custodia y disposicion), Ensayos (procesamiento, extraccion y analisis), Informes, Equipos (y mantenimientos), Inventario (reactivos, consumibles y movimientos), Calidad (bitacora de auditoria) y Compras. El Inicio lo ve toda persona activa, pero cada panel y aviso aparece solo si puede ver ese modulo.

### 12.1 Ver y editar un rol

Requiere el permiso de administrar usuarios (Usuarios: G).

1. En la barra lateral, grupo **Administracion**, elija **Roles**.
2. Presione **Nuevo rol** o elija **Editar** en el menu **⋯** de un rol.
3. En la **matriz** marque, por modulo, las acciones (V C E R A AN G) y elija el alcance de cada una.
4. Guarde e indique el **motivo** del cambio (queda en la bitacora).

Si el cambio dejaria a alguien con una **combinacion de roles prohibida** (por ejemplo, administracion tecnica del sistema junto con captura o aprobacion de ensayos), el sistema no lo guarda y muestra a quien afectaria. Tampoco permite dejar el sistema sin ninguna persona activa que pueda administrar usuarios y roles. El rol "Administrador técnico del sistema" no se puede eliminar; un rol que ya se asigno a alguien tampoco (se puede desactivar).

## 13. Usuarios

La seccion **Usuarios** permite administrar cuentas de acceso y sus roles. Quien solo tiene permiso sobre su propia cuenta ve unicamente la suya.

### 13.1 Crear usuario

1. En la barra lateral, grupo **Administracion**, elija **Usuarios**.
2. Presione **Nuevo usuario**.
3. Capture nombre, correo electronico (de un dominio permitido), **rol inicial** (queda pendiente hasta que lo aprueba la Responsable General), departamento, contrasena inicial (minimo 10 caracteres) y estado.
4. En **Vigencia de la cuenta** elija **Permanente** o **Temporal**. Una cuenta temporal (estancias, estudiantes) requiere **fecha de fin** y **supervisor**: una persona activa, con cuenta permanente y con permiso de revisar o aprobar ensayos o muestras. El rol de estudiante / personal en formacion solo se asigna a cuentas temporales.
5. Escriba su contrasena para confirmar y presione **Crear usuario**.

Cambiar la vigencia, el tipo de cuenta o el supervisor pide un **motivo** y su contrasena, y queda en la bitacora. Ningun rol puede quedar vigente mas alla de la vigencia de la cuenta; si acorta la cuenta, sus roles se acortan con ella.

Para una contrasena olvidada use **Restablecer contraseña…** en el menu de la fila: el sistema genera una contrasena temporal que se muestra **una sola vez** (copiela y entreguela por un medio seguro); la persona debera cambiarla al entrar. Una cuenta bloqueada muestra **"Bloqueada hasta HH:MM"** y se libera con **Desbloquear…** (con motivo).

### 13.2 Asignar y revocar roles

1. Abra la ficha del usuario: sus roles aparecen como lista con su **vigencia** (desde / hasta) y su estado (vigente, por comenzar, vencido o revocado).
2. **Asignar rol**: elija el rol, la fecha de inicio, opcionalmente la fecha de fin, y escriba el **motivo** (minimo 5 caracteres).
3. **Revocar**: en el rol vigente, presione **Revocar** e indique el motivo. El rol deja de contar de inmediato, sin que la persona tenga que volver a iniciar sesion.

Reglas:

- Nadie puede asignarse ni revocarse roles a si mismo.
- Algunas combinaciones de roles estan prohibidas (independencia del auditor, estudiantes sin otros roles, administracion sin captura tecnica); el sistema explica que regla se violaria.
- Cuando un rol llega a su fecha de fin deja de contar solo y queda registrado en la bitacora como "Venció rol". No se puede asignar un rol con una fecha de fin que ya paso.
- Nada se borra: las asignaciones revocadas o vencidas se conservan en la ficha y en la bitacora.

### 13.3 Activar o desactivar usuario

Edite el usuario y cambie su estado a activo o inactivo. Un usuario inactivo no puede iniciar sesion ni usar una sesion abierta. La accion **Dar de baja** de la lista tambien desactiva la cuenta pidiendo un motivo; los usuarios nunca se borran, porque la bitacora y los registros que firmaron los referencian.

### 13.4 Con que cargo firmo

Cuando firma, revisa, aprueba, autoriza, entrega o anula, el sistema guarda el **cargo** con el que actuo (el nombre de su rol). Si solo uno de sus roles permite esa accion se usa ese. Si varios lo permiten, se usa su **cargo predeterminado** (Mi cuenta › Cargo predeterminado) cuando ese cargo permite la accion; si no lo tiene o no la permite, el sistema le pregunta **"¿Con qué cargo actúas?"**. El cargo aparece junto a su firma en el registro y en el PDF del informe.

### 13.5 Revision de accesos

En **Administracion › Revisión de accesos** se consultan, para la revision periodica: las cuentas y sus roles vigentes, las cuentas temporales con su supervisor, los vencimientos proximos (7, 30 o 90 dias), las cuentas bloqueadas y los cambios de un periodo (bloqueos, desbloqueos, roles asignados, revocados o vencidos, cambios de vigencia, contrasenas restablecidas y bajas). Los botones **Exportar CSV de cuentas** y **Exportar CSV de eventos** descargan cada seccion. Quien solo ve su propia cuenta ve solo la suya. En el **Inicio**, la administracion y los supervisores ven el aviso de accesos que vencen en 7 dias.

### 13.6 Supervision (cuentas temporales y alcance "supervisado")

Lo que captura una persona supervisada (cuenta temporal con supervisor, o un permiso con alcance "supervisado") queda **"Pendiente de visto bueno"**: no puede usarse como origen de la etapa siguiente, cerrarse, revisarse, aprobarse ni autorizarse hasta que su supervisor lo apruebe. El supervisor lo ve en el Inicio (aviso **Por supervisar**) y en **Muestras › Por supervisar**, donde puede **Dar visto bueno** (con su contrasena) o **Regresar** con observaciones. Lo regresado aparece a quien lo capturo en **Regresados a ti**; al corregirlo vuelve a quedar pendiente.

### 13.7 Separacion de funciones

El sistema no deja que una persona valide su propio trabajo (ISO/IEC 17025):

- Quien elaboro un analisis (lo capturo o lo edito) no lo revisa ni lo aprueba.
- Quien elaboro un informe, o cualquiera de los analisis que incluye, no lo revisa ni lo autoriza.
- En procesamiento y extraccion, quien firma como supervisor no puede ser quien proceso, extrajo o hizo la limpieza.
- El supervisor no da visto bueno a lo que el mismo capturo.
- En documentos, quien elaboro no revisa ni aprueba, y quien reviso no aprueba.

Tener varios roles o cambiar de cargo no cambia la regla. Cuando no puede hacer una accion por esta razon, el boton aparece deshabilitado con la explicacion. Si de verdad no hay otra persona disponible, use **Solicitar excepción…**: escriba el motivo y su contrasena; la excepcion la aprueba la Responsable General o Mejora Continua, y queda registrada en la ficha, en la bitacora y, en un informe, en el PDF ("Revisión autorizada por excepción, solicitud #N"). Mientras espera, el registro no se bloquea: si otra persona lo revisa o aprueba antes, puede cancelar su solicitud en **Por autorizar**.

### 13.8 Solicitudes de autorizacion (segundo usuario) y bandeja "Por autorizar"

Algunas acciones criticas no se ejecutan al pedirlas: quedan como **solicitud** hasta que las aprueba una segunda persona autorizada:

| Accion | La aprueba |
| --- | --- |
| Anular o restaurar una recepcion, procesamiento, extraccion o analisis que ya no esta en borrador | Quien tiene "anular" en ese modulo |
| Anular un informe autorizado o entregado | Quien tiene "anular" en informes |
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
- **Quien las registra**: la Coordinacion del Area Tecnica, Mejora Continua o la Responsable General, desde **Administracion › Usuarios**, ficha de la persona, pestaña **Autorizaciones (FX-THF-AP)**. **Agregar** pide tipo, actividad/metodo/equipo, vigencia (desde y, si aplica, hasta), el folio del formato en papel y el motivo; **Revocar** pide el motivo. Ambas piden su contrasena y quedan en la bitacora. Nadie puede otorgarse ni revocarse autorizaciones a si mismo. Nada se borra: una autorizacion revocada o vencida sigue en la lista con su estado.
- **Si le falta una**: al abrir el formato aparece un aviso con lo que le falta, y al guardar el sistema lo impide con un mensaje como "No tienes autorización vigente para extracción DSP" o "... para el equipo CE1". Pida a su coordinacion que la registre.
- **Mis autorizaciones**: en **Mi cuenta** puede consultar (solo lectura) sus autorizaciones, su vigencia, folio y estado.
- **Vencimientos**: el Inicio avisa de las autorizaciones que vencen en los proximos 30 dias, a la persona y a quien las administra. Al vencer, la autorizacion deja de valer sola y queda anotado en la bitacora.

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

## 16. Soporte

Para soporte, contacte al administrador del sistema FICOTOX e indique:

- Usuario o correo con el que intenta ingresar.
- Modulo donde ocurre el problema.
- Accion realizada.
- Mensaje mostrado por el sistema.
- Archivo usado, si el problema ocurre durante una importacion.
