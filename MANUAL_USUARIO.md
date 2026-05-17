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

1. Abra el sistema en el navegador.
2. En la pantalla inicial, seleccione **Ingresar con Microsoft** si la autenticacion Microsoft esta habilitada.
3. Si el acceso local esta habilitado, capture su correo institucional en el formulario de correo.
4. Al iniciar sesion correctamente, el sistema mostrara el **Dashboard**.

Si no puede ingresar, contacte al administrador del sistema para validar que su usuario este dado de alta, activo y con un rol asignado.

## 3. Navegacion general

El menu lateral permite acceder a las secciones disponibles segun los permisos del usuario:

- **Dashboard**
- **Reactivos**
- **Consumibles**
- **Equipos**
- **Muestras**
- **Movimientos**
- **Mantenimiento**
- **Documentos SGC**
- **Reportes Mantenimiento**
- **Roles**
- **Usuarios**

En dispositivos moviles, use el boton de menu para abrir o cerrar la navegacion lateral.

Para salir del sistema, use el boton **Cerrar sesion** ubicado en el encabezado del Dashboard.

## 4. Dashboard

El Dashboard muestra un resumen general del laboratorio:

- Total de reactivos.
- Total de consumibles.
- Mantenimientos proximos.
- Muestras registradas.
- Resumen de entradas y salidas de inventario.
- Estado de mantenimiento: realizados, pendientes y vencidos.
- Ultimos movimientos de inventario.
- Proximos y recientes mantenimientos.

Use esta pantalla para revisar rapidamente el estado operativo del laboratorio.

## 5. Reactivos

La seccion **Reactivos** permite consultar, registrar, editar, eliminar e importar reactivos, dependiendo de sus permisos.

### 5.1 Consultar reactivos

1. Ingrese a **Reactivos** desde el menu lateral.
2. Revise la tabla de inventario.
3. Use el campo de busqueda para localizar un reactivo por nombre, marca, proveedor, ubicacion u otros datos visibles.

La pantalla muestra indicadores de total de reactivos, reactivos con caducidad y tipos registrados.

### 5.2 Crear un reactivo

1. Presione **Nuevo Reactivo**.
2. Seleccione el tipo o categoria.
3. Capture los campos solicitados por el formulario.
4. Presione **Guardar Reactivo**.

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

En la tabla, use los botones de accion del registro correspondiente:

- **Editar** para modificar datos del reactivo.
- **Eliminar** para retirar el registro, si cuenta con permiso.

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
3. Presione **Nueva muestra**.
4. Capture los datos del formato de recepcion:
   - Folio.
   - Fecha y hora de recepcion.
   - Solicitante.
   - Tipo de muestra: unica o lote.
   - ID interno o listado de muestras del lote.
   - Datos de analisis.
   - Observaciones.
   - Firmas cuando aplique.
5. Presione **Guardar muestra**.

Validaciones principales:

- El folio es obligatorio.
- En muestra unica, el ID interno es obligatorio.
- En lote, debe capturarse al menos una muestra.

### 8.2 Procesamiento de muestras

1. Seleccione la pestana **Procesamiento**.
2. Presione **Nuevo Procesamiento**.
3. Seleccione el folio de recepcion.
4. Complete los campos de procesamiento.
5. Seleccione el tipo de organismo.
6. Capture o seleccione los insumos utilizados cuando aplique.
7. Presione **Guardar Procesamiento**.

Cuando se registran insumos, el sistema puede descontar inventario y generar movimientos.

### 8.3 Extraccion de muestras

1. Seleccione la pestana **Extraccion**.
2. Presione **Nueva Extraccion**.
3. Seleccione el folio de procesamiento.
4. Complete los pasos del formato de extraccion.
5. Seleccione reactivos, consumibles y equipos usados cuando aplique.
6. Registre volumenes, limpieza del extracto, resguardo, observaciones y personal responsable.
7. Presione **Extraer**.

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

La seccion **Documentos SGC** permite consultar documentos del sistema de gestion de calidad.

La seccion **Reportes Mantenimiento** permite consultar reportes relacionados con mantenimientos registrados.

El acceso a estas secciones depende de los permisos asignados al usuario.

## 12. Roles y permisos

La seccion **Roles** esta destinada a usuarios administradores.

### 12.1 Crear rol

1. Ingrese a **Roles**.
2. Presione **Crear rol**.
3. Capture nombre y descripcion.
4. Marque los permisos necesarios por modulo:
   - Leer.
   - Crear.
   - Editar.
   - Eliminar.
5. Presione **Guardar Rol**.

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

1. Ingrese a **Usuarios**.
2. Presione **Nuevo Usuario**.
3. Capture nombre, correo electronico, rol, departamento y estado.
4. Presione **Guardar Usuario**.

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

Verifique que su correo este registrado, que el usuario este activo y que tenga un rol asignado.

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
