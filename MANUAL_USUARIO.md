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
3. Si la autenticacion Microsoft esta habilitada, tambien vera el boton **Continuar con Microsoft**.
4. Al iniciar sesion correctamente, el sistema mostrara la pantalla de **Inicio**.

Si no puede ingresar, contacte al administrador del sistema para validar que su usuario este dado de alta, activo, con un rol asignado y con contrasena definida.

## 3. Navegacion general

La barra superior contiene las cinco secciones principales, visibles segun los permisos del usuario:

- **Inicio**: estado general del laboratorio.
- **Muestras**: recepcion, procesamiento y extraccion (en pestanas).
- **Inventario**: reactivos, consumibles, equipos y mantenimiento (en pestanas).
- **Movimientos**: entradas y salidas de inventario.
- **Documentos**: documentos SGC y reportes de mantenimiento.

Las secciones de **Usuarios** y **Roles** se abren desde el menu de usuario (su nombre, en la esquina superior derecha), junto con **Cerrar sesion**.

Atajos y ayudas:

- **Buscar o ir a** (o la combinacion `Ctrl+K` / `Cmd+K`) abre la paleta de comandos: escriba el nombre de una seccion, de un reactivo, de un consumible o un folio de muestra y presione Enter para ir directamente.
- Los formularios de catalogo (reactivos, consumibles, equipos, mantenimiento, usuarios, roles) se abren en un panel lateral sin salir de la tabla.
- Los formatos de muestra (recepcion, procesamiento y extraccion) se abren en pantalla completa con un indice de secciones a la izquierda.
- En dispositivos moviles, use el boton de menu (tres lineas) para abrir la navegacion.

## 4. Inicio

La pantalla de Inicio muestra un resumen del laboratorio:

- Accesos rapidos para nueva recepcion, nuevo reactivo, nuevo consumible y programar mantenimiento.
- Totales de reactivos, consumibles, muestras y mantenimientos proximos.
- Muestras en curso (puede hacer clic en una fila para abrirla).
- Mantenimientos proximos y recientes.
- Ultimos movimientos de inventario.

## 5. Reactivos

La seccion **Reactivos** permite consultar, registrar, editar, eliminar e importar reactivos, dependiendo de sus permisos.

### 5.1 Consultar reactivos

1. Ingrese a **Inventario** y seleccione la pestana **Reactivos**.
2. Revise la tabla de inventario.
3. Use el campo de busqueda para localizar un reactivo por nombre, marca, proveedor, ubicacion u otros datos visibles.

La pantalla muestra indicadores de total de reactivos, reactivos con caducidad y tipos registrados.

### 5.2 Crear un reactivo

1. Presione **Nuevo reactivo**.
2. Seleccione el tipo o categoria.
3. Capture los campos solicitados por el formulario.
4. Presione **Crear reactivo** (o **Guardar cambios** al editar).

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

Al pasar el cursor sobre una fila aparecen sus acciones:

- **Rellenar stock** para sumar existencia al reactivo.
- **Editar** para modificar sus datos.
- **Mas acciones** (tres puntos) > **Eliminar reactivo**, si cuenta con permiso. El sistema pide confirmacion antes de borrar.

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
2. Capture producto, marca, proveedor, catalogo o parte, fecha de ingreso, capacidad, contenedor, piezas y cantidad por pieza.
3. Presione **Guardar**.

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

Use la busqueda y los filtros de estado para localizar equipos operativos, en mantenimiento o con alertas.

## 8. Muestras

La seccion **Muestras** esta organizada en tres etapas:

1. **Recepcion**
2. **Procesamiento**
3. **Extraccion**

Este flujo permite registrar la muestra desde su ingreso hasta su extraccion final.

### 8.1 Recepcion de muestras

1. Ingrese a **Muestras**.
2. Seleccione la pestana **Recepcion**.
3. Presione **Nueva recepcion**.
4. Capture los datos del formato de recepcion:
   - Folio.
   - Fecha y hora de recepcion.
   - Solicitante.
   - Tipo de muestra: unica o lote.
   - ID interno o listado de muestras del lote.
   - Datos de analisis.
   - Observaciones.
   - Firmas cuando aplique.
5. Presione **Registrar recepcion**. Al editar una recepcion existente, el boton dice **Guardar cambios**.

Validaciones principales:

- El folio es obligatorio.
- En muestra unica, el ID interno es obligatorio.
- En lote, debe capturarse al menos una muestra.

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

1. Seleccione la pestana **Extraccion**.
2. Presione **Nueva extraccion**, o use la accion **Extraer** (gota) en la fila de un procesamiento para llegar con el folio ya vinculado.
3. Seleccione el folio de procesamiento.
4. Complete los pasos del formato de extraccion.
5. Seleccione reactivos, consumibles y equipos usados cuando aplique.
6. Registre volumenes, limpieza del extracto, resguardo, observaciones y personal responsable.
7. Presione **Registrar extraccion**.

Antes de guardar, el sistema valida disponibilidad de stock para los reactivos seleccionados.

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

### 10.2 Seguimiento

Use los filtros para revisar mantenimientos pendientes, completados o vencidos.

## 11. Documentos SGC y reportes

La seccion **Documentos** permite consultar los documentos del sistema de gestion de calidad y los reportes de mantenimiento en PDF. Use **Abrir PDF** para descargar o ver un reporte.

El acceso a estas secciones depende de los permisos asignados al usuario.

## 12. Roles y permisos

La seccion **Roles** esta destinada a usuarios administradores.

### 12.1 Crear rol

1. Abra el menu de usuario (su nombre, arriba a la derecha) y elija **Roles**.
2. Presione **Nuevo rol**.
3. Capture nombre y descripcion.
4. Marque los permisos necesarios por modulo:
   - Leer.
   - Crear.
   - Editar.
   - Eliminar.
5. Presione **Crear rol** (o **Guardar cambios** al editar).

Los modulos con permisos configurables son:

- Dashboard.
- Reactivos.
- Consumibles.
- Equipos.
- Muestras.
- Movimientos.
- Mantenimiento.
- Documentos SGC.
- Roles.
- Usuarios.

## 13. Usuarios

La seccion **Usuarios** permite administrar cuentas de acceso.

### 13.1 Crear usuario

1. Abra el menu de usuario (su nombre, arriba a la derecha) y elija **Usuarios**.
2. Presione **Nuevo usuario**.
3. Capture nombre, correo electronico, rol, departamento, contrasena inicial (minimo 8 caracteres) y estado.
4. Presione **Crear usuario**.

Para cambiar la contrasena de un usuario existente, editelo y capture una nueva contrasena; si deja el campo vacio se conserva la actual.

### 13.2 Activar o desactivar usuario

Edite el usuario y cambie su estado a activo o inactivo. Un usuario inactivo no deberia poder operar normalmente el sistema.

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

Verifique que su correo este registrado, que la contrasena sea correcta, que el usuario este activo y que tenga un rol asignado. El mensaje "Correo o contrasena incorrectos" aparece en ambos casos.

### No veo una seccion del menu

Su rol probablemente no tiene permiso de lectura para esa seccion. Solicite revision al administrador.

### No puedo crear, editar o eliminar

Aunque pueda ver una seccion, su rol puede no tener permisos de crear, editar o eliminar.

### El sistema no permite guardar una muestra

Revise los campos obligatorios. En recepcion, el folio es obligatorio; en muestra unica tambien se requiere ID interno; en lote debe existir al menos una muestra seleccionada.

### No se puede guardar una extraccion

Revise que exista folio, que el procesamiento seleccionado tenga muestras disponibles para extraccion y que haya stock suficiente de los reactivos seleccionados.

### La importacion Excel muestra errores

Revise que el archivo tenga hojas y columnas compatibles. El sistema puede importar filas validas aunque existan errores en otras filas.

## 16. Soporte

Para soporte, contacte al administrador del sistema FICOTOX e indique:

- Usuario o correo con el que intenta ingresar.
- Modulo donde ocurre el problema.
- Accion realizada.
- Mensaje mostrado por el sistema.
- Archivo usado, si el problema ocurre durante una importacion.
