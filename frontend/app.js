const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const emailLoginForm = document.getElementById("emailLoginForm");
const emailInput = document.getElementById("emailInput");
const logoutBtn = document.getElementById("logoutBtn");
const activeUserEmail = document.getElementById("activeUserEmail");
const welcomeUserName = document.getElementById("welcomeUserName");
const welcomeUserRole = document.getElementById("welcomeUserRole");

const metricReactivos = document.getElementById("metricReactivos");
const metricConsumibles = document.getElementById("metricConsumibles");
const metricMantenimientoProximo = document.getElementById("metricMantenimientoProximo");
const metricMuestras = document.getElementById("metricMuestras");
const metricReactivosMeta = document.getElementById("metricReactivosMeta");
const metricConsumiblesMeta = document.getElementById("metricConsumiblesMeta");
const metricMantenimientoMeta = document.getElementById("metricMantenimientoMeta");

const entryReactivos = document.getElementById("entryReactivos");
const entryConsumibles = document.getElementById("entryConsumibles");
const outReactivos = document.getElementById("outReactivos");
const outConsumibles = document.getElementById("outConsumibles");
const maintenanceDone = document.getElementById("maintenanceDone");
const maintenancePending = document.getElementById("maintenancePending");
const maintenanceOverdue = document.getElementById("maintenanceOverdue");
const recentMovementsBody = document.getElementById("recentMovementsBody");
const maintenanceList = document.getElementById("maintenanceList");
const dashboardSyncStatus = document.getElementById("dashboardSyncStatus");
const navItems = document.querySelectorAll(".sidebar-nav .nav-item[data-page]");
const contentPages = document.querySelectorAll(".content-page");

const reactivosTableBody = document.getElementById("reactivosTableBody");
const reactivosSearchInput = document.getElementById("reactivosSearchInput");
const openCreateReactivoModalBtn = document.getElementById("openCreateReactivoModalBtn");
const reactivosFeedback = document.getElementById("reactivosFeedback");
const reactivosTotalCount = document.getElementById("reactivosTotalCount");
const reactivosExpiryCount = document.getElementById("reactivosExpiryCount");
const reactivosTypesCount = document.getElementById("reactivosTypesCount");
const reactivoModalEl = document.getElementById("reactivoModal");
const reactivoModal = reactivoModalEl && window.bootstrap ? new window.bootstrap.Modal(reactivoModalEl) : null;
const reactivoForm = document.getElementById("reactivoForm");
const reactivoFormTitle = document.getElementById("reactivoFormTitle");
const reactivoIdInput = document.getElementById("reactivoIdInput");
const reactivoTipoInput = document.getElementById("reactivoTipoInput");
const reactivoTypeHint = document.getElementById("reactivoTypeHint");
const reactivoDynamicFields = document.getElementById("reactivoDynamicFields");
const reactivoSaveBtn = document.getElementById("reactivoSaveBtn");
const consumiblesTableBody = document.getElementById("consumablesTableBody");
const equiposTableBody = document.getElementById("equiposTableBody");
const equiposSearchInput = document.getElementById("equiposSearchInput");
const equiposEstadoFilter = document.getElementById("equiposEstadoFilter");
const equiposTotalCount = document.getElementById("equiposTotalCount");
const equiposOperativosCount = document.getElementById("equiposOperativosCount");
const equiposMantenimientoCount = document.getElementById("equiposMantenimientoCount");
const equiposAlertasCount = document.getElementById("equiposAlertasCount");
const equiposFeedback = document.getElementById("equiposFeedback");
const openCreateEquipoBtn = document.getElementById("openCreateEquipoBtn");
const equipoModalEl = document.getElementById("equipoModal");
const equipoModal = equipoModalEl && window.bootstrap ? new window.bootstrap.Modal(equipoModalEl) : null;
const equipoForm = document.getElementById("equipoForm");
const equipoFormTitle = document.getElementById("equipoFormTitle");
const equipoIdInput = document.getElementById("equipoIdInput");
const equipoNombreInput = document.getElementById("equipoNombreInput");
const equipoMarcaInput = document.getElementById("equipoMarcaInput");
const equipoModeloInput = document.getElementById("equipoModeloInput");
const equipoSerieInput = document.getElementById("equipoSerieInput");
const equipoUbicacionInput = document.getElementById("equipoUbicacionInput");
const equipoResponsableInput = document.getElementById("equipoResponsableInput");
const equipoCalibracionInput = document.getElementById("equipoCalibracionInput");
const equipoEstadoInput = document.getElementById("equipoEstadoInput");
const equipoSaveBtn = document.getElementById("equipoSaveBtn");
const muestrasTableBody = document.getElementById("muestrasTableBody");
const movimientosTableBody = document.getElementById("movimientosTableBody");
const mantenimientosTableBody = document.getElementById("mantenimientosTableBody");
const mantenimientoSearchInput = document.getElementById("mantenimientoSearchInput");
const mantenimientoTipoFilter = document.getElementById("mantenimientoTipoFilter");
const mantenimientoEstadoFilter = document.getElementById("mantenimientoEstadoFilter");
const mantenimientoTotalCount = document.getElementById("mantenimientoTotalCount");
const mantenimientoPendientesCount = document.getElementById("mantenimientoPendientesCount");
const mantenimientoCompletadosCount = document.getElementById("mantenimientoCompletadosCount");
const mantenimientoVencidosCount = document.getElementById("mantenimientoVencidosCount");
const mantenimientoFeedback = document.getElementById("mantenimientoFeedback");
const openCreateMantenimientoBtn = document.getElementById("openCreateMantenimientoBtn");
const mantenimientoModalEl = document.getElementById("mantenimientoModal");
const mantenimientoModal = mantenimientoModalEl && window.bootstrap ? new window.bootstrap.Modal(mantenimientoModalEl) : null;
const mantenimientoForm = document.getElementById("mantenimientoForm");
const mantenimientoFormTitle = document.getElementById("mantenimientoFormTitle");
const mantenimientoIdInput = document.getElementById("mantenimientoIdInput");
const mantenimientoEquipoInput = document.getElementById("mantenimientoEquipoInput");
const mantenimientoTipoInput = document.getElementById("mantenimientoTipoInput");
const mantenimientoFechaProgramadaInput = document.getElementById("mantenimientoFechaProgramadaInput");
const mantenimientoFechaRealizadoInput = document.getElementById("mantenimientoFechaRealizadoInput");
const mantenimientoTecnicoInput = document.getElementById("mantenimientoTecnicoInput");
const mantenimientoResponsableInput = document.getElementById("mantenimientoResponsableInput");
const mantenimientoEstadoInput = document.getElementById("mantenimientoEstadoInput");
const mantenimientoObservacionesInput = document.getElementById("mantenimientoObservacionesInput");
const mantenimientoSaveBtn = document.getElementById("mantenimientoSaveBtn");
const documentosTableBody = document.getElementById("documentosTableBody");
const rolesTableBody = document.getElementById("rolesTableBody");
const usuariosTableBody = document.getElementById("usuariosTableBody");
const usuariosSearchInput = document.getElementById("usuariosSearchInput");
const usuariosRoleFilter = document.getElementById("usuariosRoleFilter");
const usuariosTotalCount = document.getElementById("usuariosTotalCount");
const usuariosActiveCount = document.getElementById("usuariosActiveCount");
const usuariosInactiveCount = document.getElementById("usuariosInactiveCount");
const usuariosAdminCount = document.getElementById("usuariosAdminCount");
const openCreateUserBtn = document.getElementById("openCreateUserBtn");
const usuariosFeedback = document.getElementById("usuariosFeedback");
const userModalEl = document.getElementById("userModal");
const userModal = userModalEl && window.bootstrap ? new window.bootstrap.Modal(userModalEl) : null;
const userForm = document.getElementById("userForm");
const userFormTitle = document.getElementById("userFormTitle");
const userIdInput = document.getElementById("userIdInput");
const userNameInput = document.getElementById("userNameInput");
const userEmailInput = document.getElementById("userEmailInput");
const userRoleInput = document.getElementById("userRoleInput");
const userDepartmentInput = document.getElementById("userDepartmentInput");
const userActiveInput = document.getElementById("userActiveInput");
const userSaveBtn = document.getElementById("userSaveBtn");
const rolesSearchInput = document.getElementById("rolesSearchInput");
const samplesSearchInput = document.getElementById("samplesSearchInput");
const rolesTotalCount = document.getElementById("rolesTotalCount");
const rolesActiveCount = document.getElementById("rolesActiveCount");
const rolesSystemCount = document.getElementById("rolesSystemCount");
const rolesUsersCount = document.getElementById("rolesUsersCount");
const roleForm = document.getElementById("roleForm");
const roleIdInput = document.getElementById("roleIdInput");
const roleNameInput = document.getElementById("roleNameInput");
const roleDescriptionInput = document.getElementById("roleDescriptionInput");
const roleActiveInput = document.getElementById("roleActiveInput");
const rolePermissionsBody = document.getElementById("rolePermissionsBody");
const roleFormTitle = document.getElementById("roleFormTitle");
const roleSaveBtn = document.getElementById("roleSaveBtn");
const roleCancelBtn = document.getElementById("roleCancelBtn");
const openCreateRoleModalBtn = document.getElementById("openCreateRoleModalBtn");
const rolesFeedback = document.getElementById("rolesFeedback");
const roleModalEl = document.getElementById("roleModal");
const roleModal = roleModalEl && window.bootstrap ? new window.bootstrap.Modal(roleModalEl) : null;
const consumablesSearchInput = document.getElementById("consumablesSearchInput");
const openCreateConsumableModalBtn = document.getElementById("openCreateConsumableModalBtn");
const openImportConsumablesModalBtn = document.getElementById("openImportConsumablesModalBtn");
const consumablesFeedback = document.getElementById("consumablesFeedback");
const consumablesTotalCount = document.getElementById("consumablesTotalCount");
const consumablesAvailableCount = document.getElementById("consumablesAvailableCount");
const consumablesLowStockCount = document.getElementById("consumablesLowStockCount");
const consumablesOutOfStockCount = document.getElementById("consumablesOutOfStockCount");

const consumableModalEl = document.getElementById("consumableModal");
const consumableModal = consumableModalEl && window.bootstrap ? new window.bootstrap.Modal(consumableModalEl) : null;
const consumableForm = document.getElementById("consumableForm");
const consumableFormTitle = document.getElementById("consumableFormTitle");
const consumableIdInput = document.getElementById("consumableIdInput");
const consumableProductoInput = document.getElementById("consumableProductoInput");
const consumableMarcaInput = document.getElementById("consumableMarcaInput");
const consumableProveedorInput = document.getElementById("consumableProveedorInput");
const consumableCatalogoInput = document.getElementById("consumableCatalogoInput");
const consumableFechaIngresoInput = document.getElementById("consumableFechaIngresoInput");
const consumableTamanoInput = document.getElementById("consumableTamanoInput");
const consumableContenedorInput = document.getElementById("consumableContenedorInput");
const consumablePiezasInput = document.getElementById("consumablePiezasInput");
const consumableCantidadPiezaInput = document.getElementById("consumableCantidadPiezaInput");
const consumableSaveBtn = document.getElementById("consumableSaveBtn");

const importConsumablesModalEl = document.getElementById("importConsumablesModal");
const importConsumablesModal = importConsumablesModalEl && window.bootstrap ? new window.bootstrap.Modal(importConsumablesModalEl) : null;
const importConsumablesForm = document.getElementById("importConsumablesForm");
const importConsumablesFileInput = document.getElementById("importConsumablesFileInput");
const importConsumablesBtn = document.getElementById("importConsumablesBtn");
const importDetectedFields = document.getElementById("importDetectedFields");
const importValidRowsCount = document.getElementById("importValidRowsCount");
const importInvalidRowsCount = document.getElementById("importInvalidRowsCount");
const importConsumablesPreviewBody = document.getElementById("importConsumablesPreviewBody");
const mobileUserBtn = document.getElementById("mobileUserBtn");

const openCreateSampleModalBtn = document.getElementById("openCreateSampleModalBtn");
const samplesSectionButtons = document.querySelectorAll("[data-samples-section-btn]");
const samplesSectionRecepcion = document.getElementById("samplesSectionRecepcion");
const samplesSectionProcesamiento = document.getElementById("samplesSectionProcesamiento");
const samplesSectionExtraccion = document.getElementById("samplesSectionExtraccion");
const samplesFeedback = document.getElementById("samplesFeedback");
const sampleModalEl = document.getElementById("sampleModal");
const sampleModal = sampleModalEl && window.bootstrap ? new window.bootstrap.Modal(sampleModalEl) : null;
const sampleForm = document.getElementById("sampleForm");
const sampleFormTitle = document.getElementById("sampleFormTitle");
const sampleIdInput = document.getElementById("sampleIdInput");
const sampleClaveRevisionInput = document.getElementById("sampleClaveRevisionInput");
const sampleFechaEmisionInput = document.getElementById("sampleFechaEmisionInput");
const sampleTipoRegistroInput = document.getElementById("sampleTipoRegistroInput");
const sampleFolioInput = document.getElementById("sampleFolioInput");
const sampleFechaRecepcionInput = document.getElementById("sampleFechaRecepcionInput");
const sampleHoraRecepcionInput = document.getElementById("sampleHoraRecepcionInput");
const sampleSolicitanteInput = document.getElementById("sampleSolicitanteInput");
const sampleMuestraUnicaInput = document.getElementById("sampleMuestraUnicaInput");
const sampleFechaMuestraInput = document.getElementById("sampleFechaMuestraInput");
const sampleFechaMuestraFieldWrap = document.getElementById("sampleFechaMuestraFieldWrap");
const sampleIdInternoInput = document.getElementById("sampleIdInternoInput");
const sampleIdInternoFieldWrap = document.getElementById("sampleIdInternoFieldWrap");
const sampleEstadoInput = document.getElementById("sampleEstadoInput");
const sampleEspecificacionesInput = document.getElementById("sampleEspecificacionesInput");
const sampleEspecificacionesFieldWrap = document.getElementById("sampleEspecificacionesFieldWrap");
const sampleLoteSectionWrap = document.getElementById("sampleLoteSectionWrap");
const sampleLoteCountInput = document.getElementById("sampleLoteCountInput");
const sampleLoteTableBody = document.getElementById("sampleLoteTableBody");
const addSampleLoteRowBtn = document.getElementById("addSampleLoteRowBtn");
const sampleAnalisisObservacionesInput = document.getElementById("sampleAnalisisObservacionesInput");
const analisisMetodoOtroWrap = document.getElementById("analisisMetodoOtroWrap");
const analisisMetodoOtroInput = document.getElementById("analisisMetodoOtroInput");
const analisisMuestraOtroWrap = document.getElementById("analisisMuestraOtroWrap");
const analisisMuestraOtroInput = document.getElementById("analisisMuestraOtroInput");
const sampleInspeccionTableBody = document.getElementById("sampleInspeccionTableBody");
const sampleInspeccionGeneralInput = document.getElementById("sampleInspeccionGeneralInput");
const sampleSolicitanteNombreInput = document.getElementById("sampleSolicitanteNombreInput");
const sampleSolicitanteFirmaInput = document.getElementById("sampleSolicitanteFirmaInput");
const sampleCustodioNombreInput = document.getElementById("sampleCustodioNombreInput");
const sampleCustodioLugarInput = document.getElementById("sampleCustodioLugarInput");
const sampleCustodioOtroInput = document.getElementById("sampleCustodioOtroInput");
const sampleSaveBtn = document.getElementById("sampleSaveBtn");
const processingSearchInput = document.getElementById("processingSearchInput");
const openCreateProcessingModalBtn = document.getElementById("openCreateProcessingModalBtn");
const processingTableBody = document.getElementById("processingTableBody");
const processingFeedback = document.getElementById("processingFeedback");
const extractionSearchInput = document.getElementById("extractionSearchInput");
const openCreateExtractionModalBtn = document.getElementById("openCreateExtractionModalBtn");
const extractionTableBody = document.getElementById("extractionTableBody");
const extractionFeedback = document.getElementById("extractionFeedback");

const processingModalEl = document.getElementById("processingModal");
const processingModal = processingModalEl && window.bootstrap ? new window.bootstrap.Modal(processingModalEl) : null;
const processingForm = document.getElementById("processingForm");
const processingFormTitle = document.getElementById("processingFormTitle");
const processingIdInput = document.getElementById("processingIdInput");
const processingClaveRevisionInput = document.getElementById("processingClaveRevisionInput");
const processingFechaEmisionInput = document.getElementById("processingFechaEmisionInput");
const processingTipoRegistroInput = document.getElementById("processingTipoRegistroInput");
const processingFolioInput = document.getElementById("processingFolioInput");
const processingFechaInput = document.getElementById("processingFechaInput");
const processingHoraInput = document.getElementById("processingHoraInput");
const processingEstadoInput = document.getElementById("processingEstadoInput");
const processingReceptionSelect = document.getElementById("processingReceptionSelect");
const processingIdInternoInput = document.getElementById("processingIdInternoInput");
const processingLoteSelectionWrap = document.getElementById("processingLoteSelectionWrap");
const processingLoteSelectionBody = document.getElementById("processingLoteSelectionBody");
const processingMuestraTipoInput = document.getElementById("processingMuestraTipoInput");
const processingOtroInput = document.getElementById("processingOtroInput");
const processingObservacionesInput = document.getElementById("processingObservacionesInput");
const processingQuienProcesoInput = document.getElementById("processingQuienProcesoInput");
const processingQuienSupervisoInput = document.getElementById("processingQuienSupervisoInput");
const processingSaveBtn = document.getElementById("processingSaveBtn");
const processingBivalvosWrap = document.getElementById("processingBivalvosWrap");
const processingSardinasWrap = document.getElementById("processingSardinasWrap");
const processingOtroWrap = document.getElementById("processingOtroWrap");

const procBiv7 = document.getElementById("procBiv7");
const procBiv8 = document.getElementById("procBiv8");
const procSar3 = document.getElementById("procSar3");
const procSar4 = document.getElementById("procSar4");

const procBiv7Extra = document.getElementById("procBiv7Extra");
const procBiv8Extra = document.getElementById("procBiv8Extra");
const procSar3Extra = document.getElementById("procSar3Extra");
const procSar4Extra = document.getElementById("procSar4Extra");

const procBiv7Equipo = document.getElementById("procBiv7Equipo");
const procBiv8Equipo = document.getElementById("procBiv8Equipo");
const procSar3Equipo = document.getElementById("procSar3Equipo");
const procSar4Equipo = document.getElementById("procSar4Equipo");

const procBiv7Peso = document.getElementById("procBiv7Peso");
const procBiv8Peso = document.getElementById("procBiv8Peso");
const procSar3Peso = document.getElementById("procSar3Peso");
const procSar4Peso = document.getElementById("procSar4Peso");

const procRes1 = document.getElementById("procRes1");
const procRes2 = document.getElementById("procRes2");
const procRes3 = document.getElementById("procRes3");
const procRes4 = document.getElementById("procRes4");
const procRes5 = document.getElementById("procRes5");

const extractionModalEl = document.getElementById("extractionModal");
const extractionModal = extractionModalEl && window.bootstrap ? new window.bootstrap.Modal(extractionModalEl) : null;
const extractionForm = document.getElementById("extractionForm");
const extractionFormTitle = document.getElementById("extractionFormTitle");
const extractionIdInput = document.getElementById("extractionIdInput");
const extractionClaveRevisionInput = document.getElementById("extractionClaveRevisionInput");
const extractionFechaEmisionInput = document.getElementById("extractionFechaEmisionInput");
const extractionTipoRegistroInput = document.getElementById("extractionTipoRegistroInput");
const extractionFolioInput = document.getElementById("extractionFolioInput");
const extractionFechaInput = document.getElementById("extractionFechaInput");
const extractionHoraInput = document.getElementById("extractionHoraInput");
const extractionEstadoInput = document.getElementById("extractionEstadoInput");
const extractionProcessingSelect = document.getElementById("extractionProcessingSelect");
const extractionIdInternoInput = document.getElementById("extractionIdInternoInput");
const extractionMuestraTipoInput = document.getElementById("extractionMuestraTipoInput");
const extractionProcessingSummary = document.getElementById("extractionProcessingSummary");
const extractionSampleTableBody = document.getElementById("extractionSampleTableBody");
const extractionObservacionesInput = document.getElementById("extractionObservacionesInput");
const extractionQuienExtrajoInput = document.getElementById("extractionQuienExtrajoInput");
const extractionQuienSupervisoInput = document.getElementById("extractionQuienSupervisoInput");
const extractionSaveBtn = document.getElementById("extractionSaveBtn");

const extrMolienda1 = document.getElementById("extrMolienda1");
const extrMolienda2 = document.getElementById("extrMolienda2");
const extrStep1 = document.getElementById("extrStep1");
const extrStep2 = document.getElementById("extrStep2");
const extrStep3 = document.getElementById("extrStep3");
const extrStep4 = document.getElementById("extrStep4");
const extrStep5 = document.getElementById("extrStep5");
const extrStep6 = document.getElementById("extrStep6");
const extrStep7 = document.getElementById("extrStep7");
const extrStep8 = document.getElementById("extrStep8");
const extrStep9 = document.getElementById("extrStep9");
const extrStep10 = document.getElementById("extrStep10");
const extrLicuadoraEquipoInput = document.getElementById("extrLicuadoraEquipoInput");
const extrBA1Input = document.getElementById("extrBA1Input");
const extrSub1PesoInput = document.getElementById("extrSub1PesoInput");
const extrSub2PesoInput = document.getElementById("extrSub2PesoInput");
const extrSub3PesoInput = document.getElementById("extrSub3PesoInput");
const extrPesoTotalInput = document.getElementById("extrPesoTotalInput");
const extrProbetaInput = document.getElementById("extrProbetaInput");
const extrReactivoInput = document.getElementById("extrReactivoInput");
const extrHomogeneizadorInput = document.getElementById("extrHomogeneizadorInput");
const extrCronometroInput = document.getElementById("extrCronometroInput");
const extrLimpiezaSi = document.getElementById("extrLimpiezaSi");
const extrLimpiezaNo = document.getElementById("extrLimpiezaNo");

const API_BASE_URL = "http://127.0.0.1:5000/api";
const SESSION_TOKEN_KEY = "ficotox_access_token";
const SESSION_USER_KEY = "ficotox_user";
const SESSION_PERMISSIONS_KEY = "ficotox_permissions";
let activePage = "dashboard";
const loadedPages = new Set();
let permissionsCatalog = [];
let currentPermissions = {};
let rolesCache = [];
let reactivosCache = [];
let usuariosCache = [];
let equiposCache = [];
let mantenimientosCache = [];
let consumablesCache = [];
let samplesCache = [];
let processingCache = [];
let extractionCache = [];
let processingEquipmentCache = [];
let processingReceptionDetailCache = new Map();
let extractionProcessingDetailCache = new Map();
let activeSamplesSection = "recepcion";
let importPreviewRows = [];
let importDetectedColumns = [];

const IMPORT_COLUMNS = [
  "producto",
  "marca",
  "proveedor",
  "catalogo_parte_cas",
  "fecha_ingreso",
  "tamano_capacidad",
  "contenedor",
  "piezas",
  "cantidad_por_pieza",
];

const INSPECCION_REQUIREMENTS = [
  "Se presentan en talla comercial",
  "Sin alteraciones visibles (descomposicion, visceras alteradas, cuerpos discordes)",
  "No han transcurrido mas de 24 horas desde su captura",
  "Muestras transportadas en Styracones como contenedor primario",
  "Contenedor primario transportado en hielera con hielo suficiente",
  "Cantidad y volumen suficientes para analisis",
  "Sin algun tipo de flujo (en caso previo especificar)",
];

const REACTIVO_TYPES = [
  {
    value: "acidos",
    label: "Acidos",
    hint: "Inventario de acidos con control de caducidad, apertura, contenedor y capacidad en litros.",
    fields: ["producto", "marca", "proveedor", "catalogo_parte_cas_lote", "caducidad", "fecha_apertura", "fecha_ingreso", "contenedor", "capacidad_litros", "piezas"],
  },
  {
    value: "alcoholes_solventes",
    label: "Alcoholes y solventes organicos",
    hint: "Incluye localizacion fisica para solventes y alcoholes de uso frecuente.",
    fields: ["producto", "marca", "proveedor", "catalogo_parte_cas_lote", "localizacion", "caducidad", "fecha_apertura", "fecha_ingreso", "contenedor", "capacidad_litros", "piezas"],
  },
  {
    value: "columnas_cromatograficas",
    label: "Columnas cromatograficas",
    hint: "Registro tecnico de columnas por lote, parte, serie, metodo y condicion de uso.",
    fields: ["producto", "marca", "proveedor", "localizacion", "lote", "parte", "serie", "descripcion", "fecha_ingreso", "fecha_apertura", "nuevo_usado", "metodo", "observaciones"],
  },
  {
    value: "compuestos_amonio",
    label: "Compuestos de Amonio",
    hint: "Control de sales y compuestos de amonio con contenedor, piezas y capacidad.",
    fields: ["producto", "marca", "proveedor", "catalogo_parte_cas_lote", "caducidad", "fecha_apertura", "fecha_ingreso", "contenedor", "capacidad_litros", "piezas"],
  },
  {
    value: "compuestos_sodio",
    label: "Compuestos de Sodio",
    hint: "Registro de compuestos solidos con capacidad en kilos.",
    fields: ["producto", "marca", "proveedor", "catalogo_parte_cas_lote", "caducidad", "fecha_apertura", "fecha_ingreso", "contenedor", "capacidad_kilos", "piezas"],
  },
  {
    value: "estandares_preparados",
    label: "Estandares preparados",
    hint: "Formato corto para preparaciones internas y notas de preparacion.",
    fields: ["item_name", "localizacion", "sub_localizacion", "fecha_preparacion", "informacion_extra"],
  },
  {
    value: "materiales_referencia",
    label: "Materiales de Referencia",
    hint: "Control de CRM por lote, proveedor, metodo, estado, volumen y URL.",
    fields: ["nombre_crm", "lot_number", "proveedor", "localizacion", "url", "metodo", "caducidad", "fecha_apertura", "estado_reactivo", "volumen"],
  },
  {
    value: "miscelaneos",
    label: "Miscelaneos",
    hint: "Registro flexible para sustancias, presentaciones y materiales no clasificados.",
    fields: ["item_name", "vendor", "catalogo", "localizacion", "sub_localizacion", "amount_in_stock", "expiration_date", "lot_number", "cas_number", "bottle_tag_color", "date_opened", "fecha_ingreso", "formula", "id_interno", "physical_state", "presentacion", "tipo_sustancia"],
  },
];

const REACTIVO_FIELD_META = {
  producto: { label: "Producto", required: true },
  marca: { label: "Marca" },
  proveedor: { label: "Proveedor" },
  catalogo_parte_cas_lote: { label: "# catalogo / # parte / CAS / lote" },
  localizacion: { label: "Localizacion" },
  sub_localizacion: { label: "Sub-localizacion" },
  caducidad: { label: "Caducidad", type: "date" },
  fecha_apertura: { label: "Fecha de apertura", type: "date" },
  fecha_ingreso: { label: "Fecha de ingreso", type: "date" },
  contenedor: { label: "Contenedor" },
  capacidad_litros: { label: "Capacidad (litros)", type: "number", step: "0.0001" },
  capacidad_kilos: { label: "Capacidad (kilos)", type: "number", step: "0.0001" },
  piezas: { label: "Piezas", type: "number", step: "1" },
  lote: { label: "Lote" },
  parte: { label: "Parte" },
  serie: { label: "Serie" },
  descripcion: { label: "Descripcion", textarea: true, wide: true },
  nuevo_usado: { label: "Nuevo o usado", options: ["Nuevo", "Usado"] },
  metodo: { label: "Metodo" },
  observaciones: { label: "Observaciones", textarea: true, wide: true },
  item_name: { label: "Item Name", required: true },
  fecha_preparacion: { label: "Fecha de preparacion", type: "date", target: "fecha_ingreso" },
  informacion_extra: { label: "Informacion extra", textarea: true, wide: true },
  nombre_crm: { label: "Nombre del CRM", required: true },
  lot_number: { label: "Lot Number" },
  url: { label: "URL", type: "url", wide: true },
  estado_reactivo: { label: "Estado", options: ["Nuevo", "Abierto"] },
  volumen: { label: "Volumen" },
  vendor: { label: "Vendor" },
  catalogo: { label: "Catalog #" },
  amount_in_stock: { label: "Amount in Stock", type: "number", step: "0.0001" },
  expiration_date: { label: "Expiration Date", type: "date" },
  cas_number: { label: "CAS Number" },
  bottle_tag_color: { label: "Bottle Tag Color" },
  date_opened: { label: "Date Opened", type: "date" },
  formula: { label: "Formula" },
  id_interno: { label: "ID interno" },
  physical_state: { label: "Physical State", options: ["Solido", "Liquido", "Gas", "Mixto"] },
  presentacion: { label: "Presentacion" },
  tipo_sustancia: { label: "Tipo de sustancia" },
};

const PAGE_MODULE_MAP = {
  dashboard: "dashboard",
  reactivos: "reactivos",
  consumibles: "consumibles",
  equipos: "equipos",
  muestras: "muestras",
  movimientos: "movimientos",
  mantenimiento: "mantenimiento",
  documentos: "documentos",
  reportes: "documentos",
  roles: "roles",
  usuarios: "usuarios",
};

const fmt = (value) => {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric.toLocaleString("es-MX") : "0";
};

const fmtDate = (value) => {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }
  return date.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const toDateOnly = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const showDashboard = (user) => {
  activeUserEmail.textContent = user.email || "usuario@ficotox.com";
  welcomeUserName.textContent = `Bienvenido, ${user.nombre || "Usuario"}`;
  welcomeUserRole.textContent = user.rol || "Analista";
  loginView.classList.remove("active-view");
  dashboardView.classList.add("active-view");
};

const showLogin = () => {
  dashboardView.classList.remove("active-view");
  loginView.classList.add("active-view");
  emailLoginForm.reset();
  emailInput.classList.remove("is-invalid");
};

const getStoredToken = () => {
  const saved = localStorage.getItem(SESSION_TOKEN_KEY);
  return saved && saved.trim() ? saved.trim() : null;
};

const getStoredUser = () => {
  const raw = localStorage.getItem(SESSION_USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
};

const formatActiveUserSignature = () => {
  const user = getStoredUser() || {};
  const name = (user.nombre || "").trim();
  const role = (user.rol || "").trim();
  const email = (user.email || "").trim();
  return [name || email || "Usuario activo", role, email && name ? email : ""].filter(Boolean).join(" - ");
};

const setSession = (token, user) => {
  localStorage.setItem(SESSION_TOKEN_KEY, token);
  localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
};

const setPermissions = (permissions) => {
  currentPermissions = permissions || {};
  localStorage.setItem(SESSION_PERMISSIONS_KEY, JSON.stringify(currentPermissions));
};

const getStoredPermissions = () => {
  const raw = localStorage.getItem(SESSION_PERMISSIONS_KEY);
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return {};
  }
};

const clearSession = () => {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(SESSION_USER_KEY);
  localStorage.removeItem(SESSION_PERMISSIONS_KEY);
  currentPermissions = {};
};

const canAccessPage = (page, action = "read") => {
  const moduleKey = PAGE_MODULE_MAP[page];
  if (!moduleKey) {
    return false;
  }
  return !!(currentPermissions[moduleKey] && currentPermissions[moduleKey][action]);
};

const canModuleAction = (moduleKey, action) => {
  return !!(currentPermissions[moduleKey] && currentPermissions[moduleKey][action]);
};

const applyNavigationPermissions = () => {
  navItems.forEach((item) => {
    const page = item.dataset.page;
    const canRead = canAccessPage(page, "read");
    item.classList.toggle("d-none", !canRead);
  });

  if (openCreateRoleModalBtn) {
    openCreateRoleModalBtn.classList.toggle("d-none", !canModuleAction("roles", "create"));
  }

  if (openCreateReactivoModalBtn) {
    openCreateReactivoModalBtn.classList.toggle("d-none", !canModuleAction("reactivos", "create"));
  }

  if (openCreateEquipoBtn) {
    openCreateEquipoBtn.classList.toggle("d-none", !canModuleAction("equipos", "create"));
  }

  if (openCreateMantenimientoBtn) {
    openCreateMantenimientoBtn.classList.toggle("d-none", !canModuleAction("mantenimiento", "create"));
  }

  if (openCreateUserBtn) {
    openCreateUserBtn.classList.toggle("d-none", !canModuleAction("usuarios", "create"));
  }

  if (openCreateConsumableModalBtn) {
    openCreateConsumableModalBtn.classList.toggle("d-none", !canModuleAction("consumibles", "create"));
  }

  if (openImportConsumablesModalBtn) {
    openImportConsumablesModalBtn.classList.toggle("d-none", !canModuleAction("consumibles", "create"));
  }

  if (openCreateSampleModalBtn) {
    openCreateSampleModalBtn.classList.toggle("d-none", !canModuleAction("muestras", "create"));
  }

  if (openCreateProcessingModalBtn) {
    openCreateProcessingModalBtn.classList.toggle("d-none", !canModuleAction("muestras", "create"));
  }

  if (openCreateExtractionModalBtn) {
    openCreateExtractionModalBtn.classList.toggle("d-none", !canModuleAction("muestras", "create"));
  }

  // Re-render tarjetas de módulos con los permisos actualizados
  renderModuleCards();
};

const getFirstAllowedPage = () => {
  const preferredOrder = [
    "dashboard",
    "reactivos",
    "consumibles",
    "equipos",
    "muestras",
    "movimientos",
    "mantenimiento",
    "documentos",
    "roles",
    "usuarios",
  ];

  for (const page of preferredOrder) {
    if (canAccessPage(page, "read")) {
      return page;
    }
  }
  return null;
};

const postJson = async (url, body) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "No se pudo completar la solicitud");
  }
  return data;
};

const getJsonAuth = async (url, token) => {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "No autorizado");
  }
  return data;
};

const sendJsonAuth = async (method, url, token, body) => {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "No se pudo completar la solicitud");
  }
  return data;
};

const sendFormAuth = async (url, token, formData) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "No se pudo completar la carga");
  }
  return data;
};

const safelyHideModal = (modalInstance, fallbackFocusEl) => {
  if (!modalInstance) {
    return;
  }

  const activeEl = document.activeElement;
  if (activeEl && typeof activeEl.blur === "function") {
    activeEl.blur();
  }

  modalInstance.hide();

  if (fallbackFocusEl && typeof fallbackFocusEl.focus === "function") {
    setTimeout(() => fallbackFocusEl.focus(), 0);
  }
};

const renderRows = (tbody, rows, rowMapper, emptyCols) => {
  if (!tbody) {
    return;
  }

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${emptyCols}" class="text-secondary">Sin registros.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(rowMapper).join("");
};

const showRolesFeedback = (message, isError = false) => {
  if (!rolesFeedback) {
    return;
  }
  rolesFeedback.textContent = message || "";
  rolesFeedback.classList.toggle("text-danger", isError);
  rolesFeedback.classList.toggle("text-success", !isError && !!message);
  rolesFeedback.classList.toggle("text-secondary", !message);
};

const resetRoleForm = () => {
  if (!roleForm) {
    return;
  }
  roleForm.reset();
  roleIdInput.value = "";
  roleActiveInput.checked = true;
  roleFormTitle.textContent = "Crear Rol";
  showRolesFeedback("");
  renderPermissionsMatrix(permissionsCatalog);
};

const renderPermissionsMatrix = (items) => {
  if (!rolePermissionsBody) {
    return;
  }

  if (!items || items.length === 0) {
    rolePermissionsBody.innerHTML = '<tr><td colspan="5" class="text-secondary">Sin permisos configurados.</td></tr>';
    return;
  }

  rolePermissionsBody.innerHTML = items
    .map(
      (perm) => `
      <tr data-permission-row="${perm.permiso_id || perm.id}">
        <td>
          <div class="fw-semibold">${perm.nombre}</div>
          <small class="text-secondary">${perm.descripcion || ""}</small>
        </td>
        <td><input type="checkbox" data-flag="can_read" ${perm.can_read ? "checked" : ""} /></td>
        <td><input type="checkbox" data-flag="can_create" ${perm.can_create ? "checked" : ""} /></td>
        <td><input type="checkbox" data-flag="can_update" ${perm.can_update ? "checked" : ""} /></td>
        <td><input type="checkbox" data-flag="can_delete" ${perm.can_delete ? "checked" : ""} /></td>
      </tr>
    `
    )
    .join("");
};

const collectRolePermissions = () => {
  if (!rolePermissionsBody) {
    return [];
  }

  const rows = rolePermissionsBody.querySelectorAll("tr[data-permission-row]");
  return Array.from(rows).map((row) => {
    const permisoId = Number(row.dataset.permissionRow);
    return {
      permiso_id: permisoId,
      can_read: row.querySelector('input[data-flag="can_read"]').checked,
      can_create: row.querySelector('input[data-flag="can_create"]').checked,
      can_update: row.querySelector('input[data-flag="can_update"]').checked,
      can_delete: row.querySelector('input[data-flag="can_delete"]').checked,
    };
  });
};

const updateRoleStats = (roles) => {
  if (!rolesTotalCount || !rolesActiveCount || !rolesSystemCount || !rolesUsersCount) {
    return;
  }

  const total = roles.length;
  const active = roles.filter((r) => !!r.activo).length;
  const system = roles.filter((r) => !!r.es_sistemico).length;
  const users = roles.reduce((acc, r) => acc + Number(r.total_usuarios || 0), 0);

  rolesTotalCount.textContent = fmt(total);
  rolesActiveCount.textContent = fmt(active);
  rolesSystemCount.textContent = fmt(system);
  rolesUsersCount.textContent = fmt(users);
};

const renderRolesTable = (roles) => {
  if (!rolesTableBody) {
    return;
  }

  if (!roles || roles.length === 0) {
    rolesTableBody.innerHTML = '<tr><td colspan="6" class="text-secondary">Sin roles.</td></tr>';
    return;
  }

  rolesTableBody.innerHTML = roles
    .map(
      (role) => `
      <tr>
        <td>
          <div class="fw-semibold d-flex align-items-center gap-1">${role.nombre || "-"} ${role.es_sistemico ? '<i class="bi bi-lock-fill text-secondary small"></i>' : ""}</div>
        </td>
        <td>${role.descripcion || "-"}</td>
        <td><span class="role-users-pill">${fmt(role.total_usuarios)}</span></td>
        <td>
          <span class="role-status-pill ${role.activo ? "active" : "inactive"}">
            <i class="bi ${role.activo ? "bi-check-circle" : "bi-x-circle"}"></i>
            ${role.activo ? "Activo" : "Inactivo"}
          </span>
        </td>
        <td>
          <span class="role-type-pill ${role.es_sistemico ? "system" : "custom"}">
            ${role.es_sistemico ? "Sistemico" : "Personalizado"}
          </span>
        </td>
        <td>
          <div class="d-flex gap-1">
            <button class="role-action-btn" data-role-action="edit" data-role-id="${role.id}" ${canModuleAction("roles", "update") ? "" : "disabled"}>Editar</button>
            <button class="role-action-btn" data-role-action="delete" data-role-id="${role.id}" ${canModuleAction("roles", "delete") ? "" : "disabled"}>Eliminar</button>
          </div>
        </td>
      </tr>
    `
    )
    .join("");
};

const filterAndRenderRoles = () => {
  const term = ((rolesSearchInput && rolesSearchInput.value) || "").trim().toLowerCase();
  if (!term) {
    renderRolesTable(rolesCache);
    return;
  }

  const filtered = rolesCache.filter((role) => {
    const name = String(role.nombre || "").toLowerCase();
    const desc = String(role.descripcion || "").toLowerCase();
    return name.includes(term) || desc.includes(term);
  });

  renderRolesTable(filtered);
};

const loadRolesCrudData = async (force = false) => {
  const token = getStoredToken();
  if (!token) {
    return;
  }

  try {
    const [roles, permissions] = await Promise.all([
      getJsonAuth(`${API_BASE_URL}/admin/roles`, token),
      getJsonAuth(`${API_BASE_URL}/admin/permissions`, token),
    ]);

    permissionsCatalog = (permissions.items || []).map((p) => ({
      ...p,
      permiso_id: p.id,
      can_read: false,
      can_create: false,
      can_update: false,
      can_delete: false,
    }));

    rolesCache = roles.items || [];
    updateRoleStats(rolesCache);
    filterAndRenderRoles();

    if (force || !roleIdInput.value) {
      resetRoleForm();
    }
  } catch (error) {
    showRolesFeedback(error.message || "No se pudieron cargar roles", true);
  }
};

const editRole = async (roleId) => {
  const token = getStoredToken();
  if (!token) {
    return;
  }

  try {
    const data = await getJsonAuth(`${API_BASE_URL}/admin/roles/${roleId}`, token);
    const role = data.role || {};
    roleIdInput.value = role.id || "";
    roleNameInput.value = role.nombre || "";
    roleDescriptionInput.value = role.descripcion || "";
    roleActiveInput.checked = !!role.activo;
    roleFormTitle.textContent = `Editar Rol #${role.id}`;
    renderPermissionsMatrix(data.permissions || permissionsCatalog);
    showRolesFeedback("");
    if (roleModal) {
      roleModal.show();
    }
  } catch (error) {
    showRolesFeedback(error.message || "No se pudo cargar el rol", true);
  }
};

const deleteRole = async (roleId) => {
  const token = getStoredToken();
  if (!token) {
    return;
  }

  if (!window.confirm("¿Eliminar este rol?")) {
    return;
  }

  try {
    await sendJsonAuth("DELETE", `${API_BASE_URL}/admin/roles/${roleId}`, token);
    showRolesFeedback("Rol eliminado");
    await loadRolesCrudData(true);
  } catch (error) {
    showRolesFeedback(error.message || "No se pudo eliminar el rol", true);
  }
};

const showConsumablesFeedback = (message, isError = false) => {
  if (!consumablesFeedback) {
    return;
  }
  consumablesFeedback.textContent = message || "";
  consumablesFeedback.classList.toggle("text-danger", isError);
  consumablesFeedback.classList.toggle("text-success", !isError && !!message);
  consumablesFeedback.classList.toggle("text-secondary", !message);
};

const parseIntOrNull = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = Number.parseInt(value, 10);
  return Number.isFinite(num) ? num : null;
};

const normalizeImportCell = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
};

const normalizeImportKey = (key) => {
  const base = String(key || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\uFFFD]/g, "")
    .replace(/[\s#./-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (base === "cantidad_por_pieza_" || base === "cantidad_por_pieza") {
    return "cantidad_por_pieza";
  }

  if (base.includes("catalogo") && base.includes("parte") && base.includes("cas")) {
    return "catalogo_parte_cas";
  }

  if ((base.includes("tamano") || base.includes("tama") || base.includes("capacidad")) && base.includes("capacidad")) {
    return "tamano_capacidad";
  }

  return base;
};

const detectCsvDelimiter = (text) => {
  const sample = String(text || "").split(/\r?\n/).slice(0, 5).join("\n");
  const semicolons = (sample.match(/;/g) || []).length;
  const commas = (sample.match(/,/g) || []).length;
  if (semicolons > commas) {
    return ";";
  }
  return ",";
};

const parseCsvText = (text, delimiter) => {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    if (ch !== "\r") {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
};

const mapCsvToPreviewRows = (csvRows) => {
  if (!csvRows || csvRows.length === 0) {
    return { detected: [], rows: [] };
  }

  const rawHeaders = csvRows[0].map((h) => String(h || "").trim());
  const normalizedHeaders = rawHeaders.map(normalizeImportKey);

  const detected = normalizedHeaders.filter((h) => IMPORT_COLUMNS.includes(h));
  const rows = csvRows.slice(1).map((cells, index) => {
    const rawRow = {};
    normalizedHeaders.forEach((header, idx) => {
      rawRow[header] = normalizeImportCell(cells[idx]);
    });

    const row = {
      _rowIndex: index + 2,
      producto: normalizeImportCell(rawRow.producto),
      marca: normalizeImportCell(rawRow.marca),
      proveedor: normalizeImportCell(rawRow.proveedor),
      catalogo_parte_cas: normalizeImportCell(rawRow.catalogo_parte_cas),
      fecha_ingreso: normalizeImportCell(rawRow.fecha_ingreso),
      tamano_capacidad: normalizeImportCell(rawRow.tamano_capacidad),
      contenedor: normalizeImportCell(rawRow.contenedor),
      piezas: parseIntOrNull(rawRow.piezas),
      cantidad_por_pieza: parseIntOrNull(rawRow.cantidad_por_pieza),
    };

    row._valid = !!row.producto;
    return row;
  }).filter((row) => {
    // Quita filas completamente vacias y deja visibles las invalidas para que se puedan depurar.
    const hasAnyValue = IMPORT_COLUMNS.some((col) => row[col] !== null && row[col] !== "");
    return hasAnyValue;
  });

  return { detected, rows };
};

const renderImportDetectedFields = () => {
  if (!importDetectedFields) {
    return;
  }

  if (!importDetectedColumns.length) {
    importDetectedFields.innerHTML = '<span class="badge text-bg-secondary">Sin campos detectados</span>';
    return;
  }

  importDetectedFields.innerHTML = importDetectedColumns
    .map((field) => `<span class="badge text-bg-light border">${field}</span>`)
    .join("");
};

const renderImportPreview = () => {
  if (!importConsumablesPreviewBody) {
    return;
  }

  if (!importPreviewRows.length) {
    importConsumablesPreviewBody.innerHTML = '<tr><td colspan="11" class="text-secondary">Selecciona un CSV para previsualizar.</td></tr>';
    if (importValidRowsCount) {
      importValidRowsCount.textContent = "0";
    }
    if (importInvalidRowsCount) {
      importInvalidRowsCount.textContent = "0";
    }
    renderImportDetectedFields();
    return;
  }

  const valid = importPreviewRows.filter((r) => r._valid).length;
  const invalid = importPreviewRows.length - valid;
  if (importValidRowsCount) {
    importValidRowsCount.textContent = String(valid);
  }
  if (importInvalidRowsCount) {
    importInvalidRowsCount.textContent = String(invalid);
  }

  importConsumablesPreviewBody.innerHTML = importPreviewRows
    .map(
      (row, idx) => `
      <tr>
        <td>${row.producto || "-"}</td>
        <td>${row.marca || "-"}</td>
        <td>${row.proveedor || "-"}</td>
        <td>${row.catalogo_parte_cas || "-"}</td>
        <td>${row.fecha_ingreso || "-"}</td>
        <td>${row.tamano_capacidad || "-"}</td>
        <td>${row.contenedor || "-"}</td>
        <td>${row.piezas ?? "-"}</td>
        <td>${row.cantidad_por_pieza ?? "-"}</td>
        <td><span class="badge ${row._valid ? "text-bg-success" : "text-bg-warning"}">${row._valid ? "Lista" : "Invalida"}</span></td>
        <td><button type="button" class="role-action-btn" data-import-remove-row="${idx}">Quitar</button></td>
      </tr>
    `
    )
    .join("");

  renderImportDetectedFields();
};

const resetConsumableForm = () => {
  if (!consumableForm) {
    return;
  }
  consumableForm.reset();
  consumableIdInput.value = "";
  consumableFormTitle.textContent = "Nuevo Consumible";
};

const fillConsumableForm = (item) => {
  consumableIdInput.value = item.id || "";
  consumableProductoInput.value = item.producto || "";
  consumableMarcaInput.value = item.marca || "";
  consumableProveedorInput.value = item.proveedor || "";
  consumableCatalogoInput.value = item.catalogo_parte_cas || "";
  consumableFechaIngresoInput.value = item.fecha_ingreso ? String(item.fecha_ingreso).slice(0, 10) : "";
  consumableTamanoInput.value = item.tamano_capacidad || "";
  consumableContenedorInput.value = item.contenedor || "";
  consumablePiezasInput.value = item.piezas ?? "";
  consumableCantidadPiezaInput.value = item.cantidad_por_pieza ?? "";
  consumableFormTitle.textContent = `Editar Consumible #${item.id}`;
};

const buildConsumablePayload = () => {
  return {
    producto: (consumableProductoInput.value || "").trim(),
    marca: (consumableMarcaInput.value || "").trim() || null,
    proveedor: (consumableProveedorInput.value || "").trim() || null,
    catalogo_parte_cas: (consumableCatalogoInput.value || "").trim() || null,
    fecha_ingreso: consumableFechaIngresoInput.value || null,
    tamano_capacidad: (consumableTamanoInput.value || "").trim() || null,
    contenedor: (consumableContenedorInput.value || "").trim() || null,
    piezas: parseIntOrNull(consumablePiezasInput.value),
    cantidad_por_pieza: parseIntOrNull(consumableCantidadPiezaInput.value),
  };
};

const mapConsumableRow = (r) => {
  const canUpdate = canModuleAction("consumibles", "update");
  const canDelete = canModuleAction("consumibles", "delete");

  return `
    <tr>
      <td>${r.producto || "-"}</td>
      <td>${r.marca || "-"}</td>
      <td>${r.proveedor || "-"}</td>
      <td>${r.catalogo_parte_cas || "-"}</td>
      <td>${fmtDate(r.fecha_ingreso)}</td>
      <td>${r.tamano_capacidad || "-"}</td>
      <td>${r.contenedor || "-"}</td>
      <td>${fmt(r.piezas)}</td>
      <td>${fmt(r.cantidad_por_pieza)}</td>
      <td>
        <div class="d-flex gap-1">
          <button class="role-action-btn" data-consumable-action="edit" data-consumable-id="${r.id}" ${canUpdate ? "" : "disabled"}>Editar</button>
          <button class="role-action-btn" data-consumable-action="delete" data-consumable-id="${r.id}" ${canDelete ? "" : "disabled"}>Eliminar</button>
        </div>
      </td>
    </tr>
  `;
};

const showSamplesFeedback = (message, isError = false) => {
  if (!samplesFeedback) {
    return;
  }
  samplesFeedback.textContent = message || "";
  samplesFeedback.classList.toggle("text-danger", isError);
  samplesFeedback.classList.toggle("text-success", !isError && !!message);
  samplesFeedback.classList.toggle("text-secondary", !message);
};

const isoDate = (value) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
};

const formatSampleFolio = (item) => {
  const type = (item.tipo_registro || "R").toUpperCase();
  const num = Number(item.folio_num || 0);
  return `${type} ${String(num).padStart(7, "0")}`;
};

const buildSampleLoteRow = (item = {}) => {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td class="text-center"><input type="checkbox" class="form-check-input sample-lote-selected" ${item.trabajar === false ? "" : "checked"} /></td>
    <td><input class="form-control form-control-sm sample-lote-id-interno" value="${item.id_interno || ""}" /></td>
    <td><input class="form-control form-control-sm sample-lote-organismo" value="${item.nombre_organismo || ""}" /></td>
    <td><input class="form-control form-control-sm sample-lote-cantidad" value="${item.cantidad_volumen || ""}" /></td>
    <td><input class="form-control form-control-sm sample-lote-sitio" value="${item.sitio_muestreo || ""}" /></td>
    <td><input type="date" class="form-control form-control-sm sample-lote-fecha" value="${isoDate(item.fecha_muestra)}" /></td>
    <td><input class="form-control form-control-sm sample-lote-info" value="${item.informacion_adicional || ""}" /></td>
    <td><button type="button" class="role-action-btn sample-remove-lote-row">Quitar</button></td>
  `;
  return row;
};

const ensureSampleLoteRows = (items = []) => {
  if (!sampleLoteTableBody) {
    return;
  }
  sampleLoteTableBody.innerHTML = "";
  if (!items.length) {
    sampleLoteTableBody.appendChild(buildSampleLoteRow());
    if (sampleLoteCountInput) {
      sampleLoteCountInput.value = "1";
    }
    return;
  }
  items.forEach((item) => sampleLoteTableBody.appendChild(buildSampleLoteRow(item)));
  if (sampleLoteCountInput) {
    sampleLoteCountInput.value = String(items.length);
  }
};

const syncSampleLoteRowsCount = (targetCount) => {
  if (!sampleLoteTableBody) {
    return;
  }
  const nextCount = Math.max(1, Number.parseInt(targetCount, 10) || 1);
  const currentCount = sampleLoteTableBody.querySelectorAll("tr").length;

  if (nextCount > currentCount) {
    for (let i = currentCount; i < nextCount; i += 1) {
      sampleLoteTableBody.appendChild(buildSampleLoteRow());
    }
  }

  if (nextCount < currentCount) {
    for (let i = currentCount; i > nextCount; i -= 1) {
      sampleLoteTableBody.querySelector("tr:last-child")?.remove();
    }
  }

  if (sampleLoteCountInput) {
    sampleLoteCountInput.value = String(nextCount);
  }
};

const collectSampleLoteRows = (selectedOnly = false) => {
  if (!sampleLoteTableBody) {
    return [];
  }

  const rows = sampleLoteTableBody.querySelectorAll("tr");
  return Array.from(rows)
    .filter((row) => {
      if (!selectedOnly) {
        return true;
      }
      return !!row.querySelector(".sample-lote-selected:checked");
    })
    .map((row) => ({
      trabajar: !!row.querySelector(".sample-lote-selected:checked"),
      id_interno: (row.querySelector(".sample-lote-id-interno")?.value || "").trim() || null,
      nombre_organismo: (row.querySelector(".sample-lote-organismo")?.value || "").trim() || null,
      cantidad_volumen: (row.querySelector(".sample-lote-cantidad")?.value || "").trim() || null,
      sitio_muestreo: (row.querySelector(".sample-lote-sitio")?.value || "").trim() || null,
      fecha_muestra: row.querySelector(".sample-lote-fecha")?.value || null,
      informacion_adicional: (row.querySelector(".sample-lote-info")?.value || "").trim() || null,
    }))
    .filter((row) =>
      [
        row.id_interno,
        row.nombre_organismo,
        row.cantidad_volumen,
        row.sitio_muestreo,
        row.fecha_muestra,
        row.informacion_adicional,
      ].some((value) => value)
    );
};

const toggleSampleModeUI = () => {
  const isUnique = !!sampleMuestraUnicaInput?.checked;
  if (sampleFechaMuestraFieldWrap) {
    sampleFechaMuestraFieldWrap.classList.toggle("d-none", !isUnique);
  }
  if (sampleFechaMuestraInput) {
    sampleFechaMuestraInput.disabled = !isUnique;
    if (!isUnique) {
      sampleFechaMuestraInput.value = "";
    }
  }
  if (sampleIdInternoFieldWrap) {
    sampleIdInternoFieldWrap.classList.toggle("d-none", !isUnique);
  }
  if (sampleIdInternoInput) {
    sampleIdInternoInput.disabled = !isUnique;
    if (!isUnique) {
      sampleIdInternoInput.value = "";
    }
  }
  if (sampleEspecificacionesFieldWrap) {
    sampleEspecificacionesFieldWrap.classList.toggle("d-none", !isUnique);
  }
  if (sampleEspecificacionesInput) {
    sampleEspecificacionesInput.disabled = !isUnique;
    if (!isUnique) {
      sampleEspecificacionesInput.value = "";
    }
  }
  if (sampleLoteSectionWrap) {
    sampleLoteSectionWrap.classList.toggle("d-none", isUnique);
  }
  if (!isUnique) {
    syncSampleLoteRowsCount(sampleLoteCountInput?.value || 1);
  }
  if (addSampleLoteRowBtn) {
    addSampleLoteRowBtn.disabled = isUnique;
  }
  if (sampleLoteCountInput) {
    sampleLoteCountInput.disabled = isUnique;
  }
};

const toggleSampleAnalysisOtherFields = () => {
  const methodOtherChecked = !!document.getElementById("analisisMetodo5")?.checked;
  const sampleOtherChecked = !!document.getElementById("analisisMuestra5")?.checked;

  if (analisisMetodoOtroWrap) {
    analisisMetodoOtroWrap.classList.toggle("d-none", !methodOtherChecked);
  }
  if (analisisMetodoOtroInput) {
    analisisMetodoOtroInput.disabled = !methodOtherChecked;
    if (!methodOtherChecked) {
      analisisMetodoOtroInput.value = "";
    }
  }
  if (analisisMuestraOtroWrap) {
    analisisMuestraOtroWrap.classList.toggle("d-none", !sampleOtherChecked);
  }
  if (analisisMuestraOtroInput) {
    analisisMuestraOtroInput.disabled = !sampleOtherChecked;
    if (!sampleOtherChecked) {
      analisisMuestraOtroInput.value = "";
    }
  }
};

const renderInspeccionRows = (existing = []) => {
  if (!sampleInspeccionTableBody) {
    return;
  }

  const map = new Map((existing || []).map((item) => [item.requisito, item]));
  sampleInspeccionTableBody.innerHTML = INSPECCION_REQUIREMENTS
    .map((req) => {
      const current = map.get(req) || {};
      const status = current.estado || "";
      return `
      <tr>
        <td>${req}</td>
        <td><label class="sample-radio-cell" title="Cumple"><input type="radio" name="insp-${btoa(unescape(encodeURIComponent(req))).slice(0, 12)}" class="sample-insp-status" data-req="${req}" value="C" ${status === "C" ? "checked" : ""} /></label></td>
        <td><label class="sample-radio-cell" title="No cumple"><input type="radio" name="insp-${btoa(unescape(encodeURIComponent(req))).slice(0, 12)}" class="sample-insp-status" data-req="${req}" value="NC" ${status === "NC" ? "checked" : ""} /></label></td>
        <td><label class="sample-radio-cell" title="No aplica"><input type="radio" name="insp-${btoa(unescape(encodeURIComponent(req))).slice(0, 12)}" class="sample-insp-status" data-req="${req}" value="NA" ${status === "NA" ? "checked" : ""} /></label></td>
        <td><input class="form-control form-control-sm sample-insp-obs" data-req="${req}" value="${current.observacion || ""}" /></td>
      </tr>`;
    })
    .join("");
};

const collectInspeccionRows = () => {
  if (!sampleInspeccionTableBody) {
    return [];
  }

  return INSPECCION_REQUIREMENTS.map((req) => {
    const selected = sampleInspeccionTableBody.querySelector(`.sample-insp-status[data-req="${req}"]:checked`);
    const obs = sampleInspeccionTableBody.querySelector(`.sample-insp-obs[data-req="${req}"]`);
    return {
      requisito: req,
      estado: selected ? selected.value : "",
      observacion: (obs?.value || "").trim() || null,
    };
  });
};

const resetSampleForm = async (withNextFolio = true) => {
  if (!sampleForm) {
    return;
  }

  sampleForm.reset();
  sampleIdInput.value = "";
  sampleFormTitle.textContent = "Formato de Recepcion de Muestras";
  sampleClaveRevisionInput.value = "FX-TCF-GMR";
  sampleTipoRegistroInput.value = "R";
  sampleFechaEmisionInput.value = isoDate(new Date());
  sampleFechaRecepcionInput.value = isoDate(new Date());
  sampleEstadoInput.value = "registrada";
  sampleMuestraUnicaInput.checked = true;
  if (sampleCustodioNombreInput) {
    sampleCustodioNombreInput.value = formatActiveUserSignature();
  }
  ensureSampleLoteRows();
  if (sampleLoteCountInput) {
    sampleLoteCountInput.value = "1";
  }
  toggleSampleModeUI();
  toggleSampleAnalysisOtherFields();
  renderInspeccionRows();

  if (!withNextFolio) {
    return;
  }

  const token = getStoredToken();
  if (!token) {
    return;
  }

  try {
    const data = await getJsonAuth(`${API_BASE_URL}/samples/reception/next-folio`, token);
    sampleFolioInput.value = data.next_folio || "";
  } catch (_error) {
    sampleFolioInput.value = "";
  }
};

const buildSamplePayload = () => {
  const isUnique = !!sampleMuestraUnicaInput.checked;
  return {
    folio_num: parseIntOrNull(sampleFolioInput.value),
    tipo_registro: (sampleTipoRegistroInput.value || "R").trim() || "R",
    clave_revision: (sampleClaveRevisionInput.value || "FX-TCF-GMR").trim() || "FX-TCF-GMR",
    fecha_emision: sampleFechaEmisionInput.value || null,
    fecha_recepcion: sampleFechaRecepcionInput.value || null,
    hora_recepcion: sampleHoraRecepcionInput.value || null,
    solicitante: (sampleSolicitanteInput.value || "").trim() || null,
    muestra_unica: isUnique,
    fecha_muestra: sampleFechaMuestraInput.value || null,
    id_interno: isUnique ? (sampleIdInternoInput.value || "").trim() || null : null,
    especificaciones: (sampleEspecificacionesInput.value || "").trim() || null,
    estado: sampleEstadoInput.value || "registrada",
    lote_muestras: isUnique ? [] : collectSampleLoteRows(false),
    analisis: {
      tipos: Array.from(document.querySelectorAll(".sample-analisis-tipo:checked")).map((el) => el.value),
      metodos: Array.from(document.querySelectorAll(".sample-analisis-metodo:checked")).map((el) => el.value),
      metodo_otro: document.getElementById("analisisMetodo5")?.checked ? (analisisMetodoOtroInput?.value || "").trim() || null : null,
      tipos_muestra: Array.from(document.querySelectorAll(".sample-analisis-muestra:checked")).map((el) => el.value),
      tipo_muestra_otro: document.getElementById("analisisMuestra5")?.checked ? (analisisMuestraOtroInput?.value || "").trim() || null : null,
      observaciones: (sampleAnalisisObservacionesInput.value || "").trim() || null,
    },
    inspeccion: {
      checklist: collectInspeccionRows(),
      observaciones_generales: (sampleInspeccionGeneralInput.value || "").trim() || null,
    },
    datos_solicitante: {
      nombre_entrega: (sampleSolicitanteNombreInput.value || "").trim() || null,
      firma_conformidad: (sampleSolicitanteFirmaInput.value || "").trim() || null,
    },
    datos_custodio: {
      nombre_cargo_firma: (sampleCustodioNombreInput.value || "").trim() || null,
      lugar_resguardo: sampleCustodioLugarInput.value || null,
      lugar_otro: (sampleCustodioOtroInput.value || "").trim() || null,
    },
  };
};

const fillSampleForm = (item) => {
  sampleIdInput.value = item.id || "";
  sampleFormTitle.textContent = `Editar Recepcion ${formatSampleFolio(item)}`;
  sampleClaveRevisionInput.value = item.clave_revision || "FX-TCF-GMR";
  sampleFechaEmisionInput.value = isoDate(item.fecha_emision);
  sampleTipoRegistroInput.value = item.tipo_registro || "R";
  sampleFolioInput.value = item.folio_num || "";
  sampleFechaRecepcionInput.value = isoDate(item.fecha_recepcion);
  sampleHoraRecepcionInput.value = item.hora_recepcion || "";
  sampleSolicitanteInput.value = item.solicitante || "";
  sampleMuestraUnicaInput.checked = !!item.muestra_unica;
  sampleFechaMuestraInput.value = isoDate(item.fecha_muestra);
  sampleIdInternoInput.value = item.id_interno || "";
  sampleEspecificacionesInput.value = item.especificaciones || "";
  sampleEstadoInput.value = item.estado || "registrada";
  ensureSampleLoteRows(item.lote_muestras || []);
  if (sampleLoteCountInput) {
    sampleLoteCountInput.value = String((item.lote_muestras || []).length || 1);
  }
  toggleSampleModeUI();

  const analisis = item.analisis || {};
  document.querySelectorAll(".sample-analisis-tipo").forEach((el) => {
    el.checked = (analisis.tipos || []).includes(el.value);
  });
  document.querySelectorAll(".sample-analisis-metodo").forEach((el) => {
    el.checked = (analisis.metodos || []).includes(el.value);
  });
  document.querySelectorAll(".sample-analisis-muestra").forEach((el) => {
    el.checked = (analisis.tipos_muestra || []).includes(el.value);
  });
  if (analisisMetodoOtroInput) {
    analisisMetodoOtroInput.value = analisis.metodo_otro || "";
  }
  if (analisisMuestraOtroInput) {
    analisisMuestraOtroInput.value = analisis.tipo_muestra_otro || "";
  }
  toggleSampleAnalysisOtherFields();
  sampleAnalisisObservacionesInput.value = analisis.observaciones || "";

  const inspeccion = item.inspeccion || {};
  renderInspeccionRows(inspeccion.checklist || []);
  sampleInspeccionGeneralInput.value = inspeccion.observaciones_generales || "";

  const solicitante = item.datos_solicitante || {};
  sampleSolicitanteNombreInput.value = solicitante.nombre_entrega || "";
  sampleSolicitanteFirmaInput.value = solicitante.firma_conformidad || "";

  const custodio = item.datos_custodio || {};
  sampleCustodioNombreInput.value = custodio.nombre_cargo_firma || "";
  sampleCustodioLugarInput.value = custodio.lugar_resguardo || "";
  sampleCustodioOtroInput.value = custodio.lugar_otro || "";
};

const mapSampleRow = (item) => {
  const canUpdate = canModuleAction("muestras", "update");
  const canDelete = canModuleAction("muestras", "delete");
  const canCreate = canModuleAction("muestras", "create");
  return `
    <tr>
      <td><span class="fw-semibold">${formatSampleFolio(item)}</span></td>
      <td>${item.solicitante || "-"}</td>
      <td>${fmtDate(item.fecha_recepcion)}</td>
      <td>${item.hora_recepcion || "-"}</td>
      <td>${item.estado || "registrada"}</td>
      <td>
        <div class="d-flex gap-1">
          <button class="role-action-btn" data-sample-action="process" data-sample-id="${item.id}" ${canCreate ? "" : "disabled"}>Procesar</button>
          <button class="role-action-btn" data-sample-action="edit" data-sample-id="${item.id}" ${canUpdate ? "" : "disabled"}>Editar</button>
          <button class="role-action-btn" data-sample-action="delete" data-sample-id="${item.id}" ${canDelete ? "" : "disabled"}>Eliminar</button>
        </div>
      </td>
    </tr>
  `;
};

const loadSamplesData = async (force = false) => {
  if (!force && loadedPages.has("muestras")) {
    return;
  }

  const token = getStoredToken();
  if (!token) {
    return;
  }

  const search = (samplesSearchInput?.value || "").trim();
  try {
    const data = await getJsonAuth(`${API_BASE_URL}/samples/reception/?search=${encodeURIComponent(search)}`, token);
    samplesCache = data.items || [];
    renderRows(muestrasTableBody, samplesCache, mapSampleRow, 6);
    showSamplesFeedback("");
    loadedPages.add("muestras");
  } catch (error) {
    samplesCache = [];
    renderRows(muestrasTableBody, [], mapSampleRow, 6);
    showSamplesFeedback(error.message || "No se pudieron cargar muestras", true);
  }
};

const editSample = async (id) => {
  const token = getStoredToken();
  if (!token) {
    return;
  }
  try {
    const data = await getJsonAuth(`${API_BASE_URL}/samples/reception/${id}`, token);
    fillSampleForm(data.item || {});
    if (sampleModal) {
      sampleModal.show();
    }
  } catch (error) {
    showSamplesFeedback(error.message || "No se pudo cargar la recepcion", true);
  }
};

const deleteSample = async (id) => {
  if (!window.confirm("¿Eliminar este registro de recepcion?")) {
    return;
  }
  const token = getStoredToken();
  if (!token) {
    return;
  }
  try {
    await sendJsonAuth("DELETE", `${API_BASE_URL}/samples/reception/${id}`, token);
    showSamplesFeedback("Recepcion eliminada");
    loadedPages.delete("muestras");
    await loadSamplesData(true);
  } catch (error) {
    showSamplesFeedback(error.message || "No se pudo eliminar", true);
  }
};

const showProcessingFeedback = (message, isError = false) => {
  if (!processingFeedback) {
    return;
  }
  processingFeedback.textContent = message || "";
  processingFeedback.classList.toggle("text-danger", isError);
  processingFeedback.classList.toggle("text-success", !isError && !!message);
  processingFeedback.classList.toggle("text-secondary", !message);
};

const showExtractionFeedback = (message, isError = false) => {
  if (!extractionFeedback) {
    return;
  }
  extractionFeedback.textContent = message || "";
  extractionFeedback.classList.toggle("text-danger", isError);
  extractionFeedback.classList.toggle("text-success", !isError && !!message);
  extractionFeedback.classList.toggle("text-secondary", !message);
};

const formatExtractionFolio = (item) => {
  const type = (item.tipo_registro || "E-A").toUpperCase();
  const num = Number(item.folio_num || 0);
  return `${type} ${String(num).padStart(7, "0")}`;
};

const mapExtractionRow = (item) => {
  const canUpdate = canModuleAction("muestras", "update");
  const canDelete = canModuleAction("muestras", "delete");
  const folioE = item.folio_num ? formatExtractionFolio(item) : "-";
  const folioP = item.folio_procesamiento_num ? `P ${String(item.folio_procesamiento_num).padStart(7, "0")}` : "-";
  return `
    <tr>
      <td>${folioE}</td>
      <td>${folioP}</td>
      <td>${item.id_interno || "-"}</td>
      <td>${fmtDate(item.fecha_extraccion)}</td>
      <td>${item.hora_extraccion || "-"}</td>
      <td>${item.estado || "registrada"}</td>
      <td>
        <div class="d-flex gap-1">
          <button class="role-action-btn" data-extraction-action="edit" data-extraction-id="${item.id}" ${canUpdate ? "" : "disabled"}>Editar</button>
          <button class="role-action-btn" data-extraction-action="delete" data-extraction-id="${item.id}" ${canDelete ? "" : "disabled"}>Eliminar</button>
        </div>
      </td>
    </tr>
  `;
};

const loadProcessingOptionsForExtraction = async (selectedProcessingId = null) => {
  if (!extractionProcessingSelect) {
    return;
  }
  const token = getStoredToken();
  if (!token) {
    return;
  }
  try {
    const data = await getJsonAuth(`${API_BASE_URL}/samples/processing/?search=`, token);
    const items = data.items || [];
    extractionProcessingSelect.innerHTML = ['<option value="">Sin vincular</option>']
      .concat(
        items.map((item) => {
          const selected = selectedProcessingId && Number(selectedProcessingId) === Number(item.id) ? "selected" : "";
          return `<option value="${item.id}" data-folio-p="${item.folio_num || ""}" data-id-interno="${item.id_interno || ""}" data-muestra-tipo="${item.muestra_tipo || ""}" ${selected}>P ${String(item.folio_num || "").padStart(7, "0")} - ${item.id_interno || "Sin ID interno"}</option>`;
        })
      )
      .join("");
  } catch (_error) {
    extractionProcessingSelect.innerHTML = '<option value="">Sin vincular</option>';
  }
};

const getProcessingDetailForExtraction = async (processingId) => {
  if (!processingId) {
    return null;
  }

  if (extractionProcessingDetailCache.has(processingId)) {
    return extractionProcessingDetailCache.get(processingId);
  }

  const token = getStoredToken();
  if (!token) {
    return null;
  }

  const data = await getJsonAuth(`${API_BASE_URL}/samples/processing/${processingId}`, token);
  const item = data?.item || null;
  if (item) {
    extractionProcessingDetailCache.set(processingId, item);
  }
  return item;
};

const getExtractionRowsFromProcessing = (processing) => {
  if (!processing) {
    return [];
  }

  if ((processing.muestra_tipo || "") === "lote") {
    return Array.isArray(processing.lote_seleccion) ? processing.lote_seleccion : [];
  }

  return [
    {
      id_interno: processing.id_interno || null,
      nombre_organismo: (processing.tipo_organismo || []).join(", ") || null,
      sitio_muestreo: null,
    },
  ].filter((row) => row.id_interno || row.nombre_organismo);
};

const clearExtractionProcessingDerivedData = () => {
  if (extractionIdInternoInput) {
    extractionIdInternoInput.value = "";
  }
  if (extractionMuestraTipoInput) {
    extractionMuestraTipoInput.value = "unica";
  }
  if (extractionProcessingSummary) {
    extractionProcessingSummary.textContent = "";
  }
  if (extractionSampleTableBody) {
    extractionSampleTableBody.innerHTML = '<tr><td colspan="6" class="text-secondary">Selecciona un folio de procesamiento.</td></tr>';
  }
};

const renderExtractionSampleRows = (rows = [], existingWeights = []) => {
  if (!extractionSampleTableBody) {
    return;
  }

  if (!Array.isArray(rows) || !rows.length) {
    extractionSampleTableBody.innerHTML = '<tr><td colspan="6" class="text-secondary">El procesamiento no tiene muestras seleccionadas.</td></tr>';
    return;
  }

  const weightsById = new Map(
    (existingWeights || [])
      .filter((entry) => entry && entry.id_muestra)
      .map((entry) => [String(entry.id_muestra), entry])
  );

  extractionSampleTableBody.innerHTML = rows
    .map((row, index) => {
      const id = String(row.id_interno || `Muestra ${index + 1}`).trim();
      const existing = weightsById.get(id) || {};
      return `
        <tr data-id-muestra="${id}" data-organismo="${row.nombre_organismo || ""}" data-sitio="${row.sitio_muestreo || ""}">
          <td class="fw-semibold">${id}</td>
          <td>${row.nombre_organismo || "-"}</td>
          <td>${row.sitio_muestreo || "-"}</td>
          <td><input type="number" min="0" step="0.0001" class="form-control form-control-sm extraction-sample-weight" value="${existing.peso_muestra ?? ""}" /></td>
          <td><input class="form-control form-control-sm extraction-sample-replica" value="${existing.replica || `${id}_R1`}" /></td>
          <td><input type="number" min="0" step="0.0001" class="form-control form-control-sm extraction-replica-weight" value="${existing.peso_replica ?? ""}" /></td>
        </tr>
      `;
    })
    .join("");
};

const collectExtractionSampleWeights = () => {
  if (!extractionSampleTableBody) {
    return [];
  }

  return Array.from(extractionSampleTableBody.querySelectorAll("tr[data-id-muestra]"))
    .map((row) => ({
      id_muestra: row.dataset.idMuestra || null,
      organismo: row.dataset.organismo || null,
      sitio_muestreo: row.dataset.sitio || null,
      peso_muestra: parseFloatOrNull(row.querySelector(".extraction-sample-weight")?.value),
      replica: (row.querySelector(".extraction-sample-replica")?.value || "").trim() || null,
      peso_replica: parseFloatOrNull(row.querySelector(".extraction-replica-weight")?.value),
    }))
    .filter((entry) => entry.id_muestra);
};

const setExtractionDefaultChecklist = (processing = null) => {
  const frozen = !!processing?.resguardo?.congelador_co1 || !!processing?.resguardo?.congelador_co2 || !!processing?.resguardo?.congelador_co3;

  if (extrStep1) {
    extrStep1.checked = frozen;
  }
  if (extrStep2) {
    extrStep2.checked = frozen;
  }
  if (extrStep3) {
    extrStep3.checked = true;
  }
  [extrStep4, extrStep5, extrStep6, extrStep7, extrStep8, extrStep10].forEach((step) => {
    if (step) {
      step.checked = true;
    }
  });
  if (extrStep9) {
    extrStep9.checked = false;
  }
};

const applyProcessingToExtractionForm = (processing, existingWeights = []) => {
  if (!processing) {
    clearExtractionProcessingDerivedData();
    setExtractionDefaultChecklist();
    return;
  }

  const rows = getExtractionRowsFromProcessing(processing);
  const ids = rows.map((row) => row.id_interno).filter(Boolean).join(", ");
  const muestraTipo = processing.muestra_tipo || (rows.length > 1 ? "lote" : "unica");
  const frozen = !!processing.resguardo?.congelador_co1 || !!processing.resguardo?.congelador_co2 || !!processing.resguardo?.congelador_co3;

  if (extractionIdInternoInput) {
    extractionIdInternoInput.value = ids || processing.id_interno || "";
  }
  if (extractionMuestraTipoInput) {
    extractionMuestraTipoInput.value = muestraTipo;
  }
  if (extrMolienda1) {
    extrMolienda1.checked = !frozen;
  }
  if (extrMolienda2) {
    extrMolienda2.checked = frozen;
  }
  if (extractionProcessingSummary) {
    const folio = processing.folio_num ? `P ${String(processing.folio_num).padStart(7, "0")}` : "Procesamiento";
    extractionProcessingSummary.textContent = `${folio} cargado: ${rows.length || 1} muestra(s) lista(s) para extraccion.`;
  }

  renderExtractionSampleRows(rows, existingWeights);
  setExtractionDefaultChecklist(processing);
};

const handleExtractionProcessingSelection = async (existingWeights = []) => {
  const processingId = parseIntOrNull(extractionProcessingSelect?.value);
  if (!processingId) {
    clearExtractionProcessingDerivedData();
    return;
  }

  try {
    const processing = await getProcessingDetailForExtraction(processingId);
    applyProcessingToExtractionForm(processing, existingWeights);
  } catch (error) {
    showExtractionFeedback(error.message || "No se pudo leer el procesamiento seleccionado", true);
    clearExtractionProcessingDerivedData();
  }
};

const resetExtractionForm = async (withNextFolio = true, prefillProcessing = null) => {
  if (!extractionForm) {
    return;
  }
  extractionForm.reset();
  extractionIdInput.value = "";
  extractionFormTitle.textContent = "Formato de Extraccion de Muestra";
  extractionClaveRevisionInput.value = "FX-TCF-GME-A";
  extractionTipoRegistroInput.value = "E-A";
  extractionFechaEmisionInput.value = isoDate(new Date());
  extractionFechaInput.value = isoDate(new Date());
  extractionEstadoInput.value = "registrada";
  if (extractionQuienExtrajoInput) {
    extractionQuienExtrajoInput.value = formatActiveUserSignature();
  }
  clearExtractionProcessingDerivedData();
  extractionProcessingDetailCache = new Map();
  setExtractionDefaultChecklist();
  await loadProcessingOptionsForExtraction(prefillProcessing?.id || null);

  if (prefillProcessing && extractionProcessingSelect) {
    extractionProcessingSelect.value = String(prefillProcessing.id || "");
    const processing = await getProcessingDetailForExtraction(prefillProcessing.id);
    applyProcessingToExtractionForm(processing || prefillProcessing);
  }

  if (!withNextFolio) {
    return;
  }
  const token = getStoredToken();
  if (!token) {
    return;
  }
  try {
    const data = await getJsonAuth(`${API_BASE_URL}/samples/extraction/next-folio`, token);
    extractionFolioInput.value = data.next_folio || "";
  } catch (_error) {
    extractionFolioInput.value = "";
  }
};

const buildExtractionPayload = () => {
  const selectedOption = extractionProcessingSelect?.selectedOptions?.[0];
  const selectedMolienda = document.querySelector('.extraction-molienda:checked')?.value || null;
  const limpieza = extrLimpiezaSi?.checked ? "si" : extrLimpiezaNo?.checked ? "no" : null;
  const sampleWeights = collectExtractionSampleWeights();
  return {
    folio_num: parseIntOrNull(extractionFolioInput.value),
    tipo_registro: (extractionTipoRegistroInput.value || "E-A").trim() || "E-A",
    clave_revision: (extractionClaveRevisionInput.value || "FX-TCF-GME-A").trim() || "FX-TCF-GME-A",
    fecha_emision: extractionFechaEmisionInput.value || null,
    fecha_extraccion: extractionFechaInput.value || null,
    hora_extraccion: extractionHoraInput.value || null,
    procesamiento_id: parseIntOrNull(extractionProcessingSelect.value),
    folio_procesamiento_num: parseIntOrNull(selectedOption?.dataset?.folioP),
    muestra_tipo: extractionMuestraTipoInput.value || null,
    id_interno: (extractionIdInternoInput.value || "").trim() || null,
    tipo_molienda: selectedMolienda,
    pasos: {
      checklist: collectCheckedValues(".extraction-step:checked"),
      id_equipo_licuadora: (extrLicuadoraEquipoInput?.value || "").trim() || null,
      id_ba1: (extrBA1Input?.value || "").trim() || null,
      id_probeta: (extrProbetaInput?.value || "").trim() || null,
      folio_reactivo: (extrReactivoInput?.value || "").trim() || null,
      id_homogeneizador: (extrHomogeneizadorInput?.value || "").trim() || null,
      id_cronometro: (extrCronometroInput?.value || "").trim() || null,
      limpieza,
    },
    registro_pesos: sampleWeights.length ? sampleWeights : [
      { submuestra: 1, peso: parseFloatOrNull(extrSub1PesoInput?.value) },
      { submuestra: 2, peso: parseFloatOrNull(extrSub2PesoInput?.value) },
      { submuestra: 3, peso: parseFloatOrNull(extrSub3PesoInput?.value) },
      { submuestra: "total", peso: parseFloatOrNull(extrPesoTotalInput?.value) },
    ].filter((it) => it.peso !== null),
    observaciones_generales: (extractionObservacionesInput.value || "").trim() || null,
    nombre_quien_extrajo: (extractionQuienExtrajoInput.value || "").trim() || null,
    nombre_quien_superviso: (extractionQuienSupervisoInput.value || "").trim() || null,
    estado: extractionEstadoInput.value || "registrada",
  };
};

const fillExtractionForm = async (item) => {
  await loadProcessingOptionsForExtraction(item.procesamiento_id);
  extractionIdInput.value = item.id || "";
  extractionFormTitle.textContent = `Editar Extraccion ${formatExtractionFolio(item)}`;
  extractionClaveRevisionInput.value = item.clave_revision || "FX-TCF-GME-A";
  extractionFechaEmisionInput.value = isoDate(item.fecha_emision);
  extractionTipoRegistroInput.value = item.tipo_registro || "E-A";
  extractionFolioInput.value = item.folio_num || "";
  extractionFechaInput.value = isoDate(item.fecha_extraccion);
  extractionHoraInput.value = item.hora_extraccion || "";
  extractionEstadoInput.value = item.estado || "registrada";
  extractionMuestraTipoInput.value = item.muestra_tipo || "unica";
  extractionIdInternoInput.value = item.id_interno || "";
  if (item.procesamiento_id) {
    await handleExtractionProcessingSelection(item.registro_pesos || []);
  }

  if (item.tipo_molienda) {
    document.querySelectorAll(".extraction-molienda").forEach((el) => {
      el.checked = item.tipo_molienda === el.value;
    });
  }

  const pasos = item.pasos || {};
  const selectedSteps = Array.isArray(pasos.checklist) ? pasos.checklist : [];
  document.querySelectorAll(".extraction-step").forEach((el) => {
    el.checked = selectedSteps.includes(el.value);
  });

  if (extrLicuadoraEquipoInput) extrLicuadoraEquipoInput.value = pasos.id_equipo_licuadora || "";
  if (extrBA1Input) extrBA1Input.value = pasos.id_ba1 || "";
  if (extrProbetaInput) extrProbetaInput.value = pasos.id_probeta || "";
  if (extrReactivoInput) extrReactivoInput.value = pasos.folio_reactivo || "";
  if (extrHomogeneizadorInput) extrHomogeneizadorInput.value = pasos.id_homogeneizador || "";
  if (extrCronometroInput) extrCronometroInput.value = pasos.id_cronometro || "";
  if (extrLimpiezaSi) extrLimpiezaSi.checked = pasos.limpieza === "si";
  if (extrLimpiezaNo) extrLimpiezaNo.checked = pasos.limpieza === "no";

  const pesosMap = new Map();
  (item.registro_pesos || []).forEach((entry) => {
    if (!entry || entry.peso === undefined || entry.peso === null) {
      return;
    }
    pesosMap.set(String(entry.submuestra), entry.peso);
  });
  if (extrSub1PesoInput) extrSub1PesoInput.value = pesosMap.get("1") ?? "";
  if (extrSub2PesoInput) extrSub2PesoInput.value = pesosMap.get("2") ?? "";
  if (extrSub3PesoInput) extrSub3PesoInput.value = pesosMap.get("3") ?? "";
  if (extrPesoTotalInput) extrPesoTotalInput.value = pesosMap.get("total") ?? "";

  extractionObservacionesInput.value = item.observaciones_generales || "";
  extractionQuienExtrajoInput.value = item.nombre_quien_extrajo || "";
  extractionQuienSupervisoInput.value = item.nombre_quien_superviso || "";
};

const editExtraction = async (id) => {
  const token = getStoredToken();
  if (!token) {
    return;
  }
  try {
    const data = await getJsonAuth(`${API_BASE_URL}/samples/extraction/${id}`, token);
    await fillExtractionForm(data.item || {});
    if (extractionModal) {
      extractionModal.show();
    }
  } catch (error) {
    showExtractionFeedback(error.message || "No se pudo cargar extraccion", true);
  }
};

const deleteExtraction = async (id) => {
  if (!window.confirm("¿Eliminar este registro de extraccion?")) {
    return;
  }
  const token = getStoredToken();
  if (!token) {
    return;
  }
  try {
    await sendJsonAuth("DELETE", `${API_BASE_URL}/samples/extraction/${id}`, token);
    showExtractionFeedback("Extraccion eliminada");
    loadedPages.delete("muestras-extraction");
    await loadExtractionData(true);
  } catch (error) {
    showExtractionFeedback(error.message || "No se pudo eliminar", true);
  }
};

const loadExtractionData = async (force = false) => {
  if (!force && loadedPages.has("muestras-extraction")) {
    return;
  }
  const token = getStoredToken();
  if (!token) {
    return;
  }
  const search = (extractionSearchInput?.value || "").trim();
  try {
    const data = await getJsonAuth(`${API_BASE_URL}/samples/extraction/?search=${encodeURIComponent(search)}`, token);
    extractionCache = data.items || [];
    renderRows(extractionTableBody, extractionCache, mapExtractionRow, 7);
    showExtractionFeedback("");
    loadedPages.add("muestras-extraction");
  } catch (error) {
    extractionCache = [];
    renderRows(extractionTableBody, [], mapExtractionRow, 7);
    showExtractionFeedback(error.message || "No se pudieron cargar extracciones", true);
  }
};

const setSamplesSection = async (section, loadData = true) => {
  activeSamplesSection = section;
  samplesSectionButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.samplesSectionBtn === section);
  });

  if (samplesSectionRecepcion) {
    const hide = section !== "recepcion";
    samplesSectionRecepcion.hidden = hide;
    samplesSectionRecepcion.classList.toggle("d-none", hide);
    samplesSectionRecepcion.style.display = hide ? "none" : "block";
  }
  if (samplesSectionProcesamiento) {
    const hide = section !== "procesamiento";
    samplesSectionProcesamiento.hidden = hide;
    samplesSectionProcesamiento.classList.toggle("d-none", hide);
    samplesSectionProcesamiento.style.display = hide ? "none" : "block";
  }
  if (samplesSectionExtraccion) {
    const hide = section !== "extraccion";
    samplesSectionExtraccion.hidden = hide;
    samplesSectionExtraccion.classList.toggle("d-none", hide);
    samplesSectionExtraccion.style.display = hide ? "none" : "block";
  }

  if (!loadData) {
    return;
  }

  if (section === "recepcion") {
    loadedPages.delete("muestras");
    await loadSamplesData(true);
    return;
  }

  if (section === "procesamiento") {
    loadedPages.delete("muestras-processing");
    await loadProcessingData(true);
    return;
  }

  if (section === "extraccion") {
    loadedPages.delete("muestras-extraction");
    await loadExtractionData(true);
  }
};

const formatProcessingFolio = (item) => {
  const type = (item.tipo_registro || "P").toUpperCase();
  const num = Number(item.folio_num || 0);
  return `${type} ${String(num).padStart(7, "0")}`;
};

const renderProcessingLoteSelectionRows = (items = [], selectedIds = []) => {
  if (!processingLoteSelectionBody) {
    return;
  }

  if (!Array.isArray(items) || !items.length) {
    processingLoteSelectionBody.innerHTML = '<tr><td colspan="7" class="text-secondary">Este folio no contiene muestras de lote.</td></tr>';
    return;
  }

  const selectedSet = new Set((selectedIds || []).map((it) => String(it || "")).filter(Boolean));
  processingLoteSelectionBody.innerHTML = items
    .map((item, index) => {
      const idInterno = String(item?.id_interno || "").trim();
      const selectedByDefault = item?.trabajar !== false;
      const checked = selectedSet.size ? selectedSet.has(idInterno) : selectedByDefault;
      return `
        <tr
          data-id-interno="${idInterno}"
          data-nombre-organismo="${String(item?.nombre_organismo || "").trim()}"
          data-cantidad-volumen="${String(item?.cantidad_volumen || "").trim()}"
          data-sitio-muestreo="${String(item?.sitio_muestreo || "").trim()}"
          data-fecha-muestra="${item?.fecha_muestra || ""}"
          data-informacion-adicional="${String(item?.informacion_adicional || "").trim()}"
        >
          <td><input type="checkbox" class="form-check-input processing-lote-selected" ${checked ? "checked" : ""} /></td>
          <td>${idInterno || `Muestra ${index + 1}`}</td>
          <td>${item?.nombre_organismo || "-"}</td>
          <td>${item?.cantidad_volumen || "-"}</td>
          <td>${item?.sitio_muestreo || "-"}</td>
          <td>${fmtDate(item?.fecha_muestra)}</td>
          <td>${item?.informacion_adicional || "-"}</td>
        </tr>
      `;
    })
    .join("");
};

const collectProcessingSelectedLoteRows = () => {
  if (!processingLoteSelectionBody) {
    return [];
  }

  return Array.from(processingLoteSelectionBody.querySelectorAll("tr"))
    .filter((row) => !!row.querySelector(".processing-lote-selected:checked"))
    .map((row) => ({
      trabajar: true,
      id_interno: (row.dataset.idInterno || "").trim() || null,
      nombre_organismo: (row.dataset.nombreOrganismo || "").trim() || null,
      cantidad_volumen: (row.dataset.cantidadVolumen || "").trim() || null,
      sitio_muestreo: (row.dataset.sitioMuestreo || "").trim() || null,
      fecha_muestra: row.dataset.fechaMuestra || null,
      informacion_adicional: (row.dataset.informacionAdicional || "").trim() || null,
    }));
};

const syncProcessingIdInternoFromLoteSelection = () => {
  if (!processingIdInternoInput || processingMuestraTipoInput?.value !== "lote") {
    return;
  }
  const selected = collectProcessingSelectedLoteRows();
  const joinedIds = selected.map((row) => row.id_interno).filter(Boolean).join(", ");
  processingIdInternoInput.value = joinedIds;
};

const clearProcessingReceptionDerivedData = () => {
  if (processingMuestraTipoInput) {
    processingMuestraTipoInput.value = "unica";
    processingMuestraTipoInput.disabled = false;
  }
  if (processingIdInternoInput) {
    processingIdInternoInput.disabled = false;
    processingIdInternoInput.value = "";
  }
  if (processingLoteSelectionWrap) {
    processingLoteSelectionWrap.classList.add("d-none");
  }
  if (processingLoteSelectionBody) {
    processingLoteSelectionBody.innerHTML = '<tr><td colspan="7" class="text-secondary">Selecciona un folio de recepcion para cargar muestras.</td></tr>';
  }
};

const getReceptionDetailForProcessing = async (receptionId) => {
  if (!receptionId) {
    return null;
  }

  if (processingReceptionDetailCache.has(receptionId)) {
    return processingReceptionDetailCache.get(receptionId);
  }

  const token = getStoredToken();
  if (!token) {
    return null;
  }

  const data = await getJsonAuth(`${API_BASE_URL}/samples/reception/${receptionId}`, token);
  const item = data?.item || null;
  if (item) {
    processingReceptionDetailCache.set(receptionId, item);
  }
  return item;
};

const applyReceptionToProcessingForm = (reception, selectedLoteRows = []) => {
  if (!reception) {
    clearProcessingReceptionDerivedData();
    return;
  }

  const isUnique = !!reception.muestra_unica;
  if (processingMuestraTipoInput) {
    processingMuestraTipoInput.value = isUnique ? "unica" : "lote";
    processingMuestraTipoInput.disabled = true;
  }

  if (isUnique) {
    if (processingLoteSelectionWrap) {
      processingLoteSelectionWrap.classList.add("d-none");
    }
    if (processingIdInternoInput) {
      processingIdInternoInput.disabled = false;
      processingIdInternoInput.value = reception.id_interno || "";
    }
    return;
  }

  if (processingLoteSelectionWrap) {
    processingLoteSelectionWrap.classList.remove("d-none");
  }
  const selectedIds = (selectedLoteRows || []).map((row) => row?.id_interno || "").filter(Boolean);
  renderProcessingLoteSelectionRows(reception.lote_muestras || [], selectedIds);
  if (processingIdInternoInput) {
    processingIdInternoInput.disabled = true;
  }
  syncProcessingIdInternoFromLoteSelection();
};

const handleProcessingReceptionSelection = async (selectedLoteRows = []) => {
  const receptionId = parseIntOrNull(processingReceptionSelect?.value);
  if (!receptionId) {
    clearProcessingReceptionDerivedData();
    return;
  }

  try {
    const reception = await getReceptionDetailForProcessing(receptionId);
    applyReceptionToProcessingForm(reception, selectedLoteRows);
  } catch (error) {
    showProcessingFeedback(error.message || "No se pudo leer la recepcion seleccionada", true);
    clearProcessingReceptionDerivedData();
  }
};

const loadReceptionOptionsForProcessing = async (selectedReceptionId = null) => {
  if (!processingReceptionSelect) {
    return;
  }
  const token = getStoredToken();
  if (!token) {
    return;
  }
  try {
    const data = await getJsonAuth(`${API_BASE_URL}/samples/reception/?search=`, token);
    const items = data.items || [];
    processingReceptionSelect.innerHTML = ['<option value="">Sin vincular</option>']
      .concat(
        items.map((item) => {
          const selected = selectedReceptionId && Number(selectedReceptionId) === Number(item.id) ? "selected" : "";
          return `<option value="${item.id}" data-folio-r="${item.folio_num || ""}" data-id-interno="${item.id_interno || ""}" ${selected}>R ${String(item.folio_num || "").padStart(7, "0")} - ${item.solicitante || "Sin solicitante"}</option>`;
        })
      )
      .join("");
  } catch (_error) {
    processingReceptionSelect.innerHTML = '<option value="">Sin vincular</option>';
  }
};

const resetProcessingForm = async (withNextFolio = true) => {
  if (!processingForm) {
    return;
  }
  processingForm.reset();
  processingIdInput.value = "";
  processingFormTitle.textContent = "Formato de Procesamiento de Muestra";
  processingClaveRevisionInput.value = "FX-TCF-GMP";
  processingTipoRegistroInput.value = "P";
  processingFechaEmisionInput.value = isoDate(new Date());
  processingFechaInput.value = isoDate(new Date());
  processingEstadoInput.value = "registrada";
  if (processingQuienProcesoInput) {
    processingQuienProcesoInput.value = formatActiveUserSignature();
  }
  clearProcessingReceptionDerivedData();
  processingReceptionDetailCache = new Map();
  document.querySelectorAll(".processing-organismo").forEach((el) => {
    el.checked = false;
  });
  setProcessingOrganismSections();
  await loadEquipmentOptionsForProcessing();
  await loadReceptionOptionsForProcessing();

  if (!withNextFolio) {
    return;
  }
  const token = getStoredToken();
  if (!token) {
    return;
  }
  try {
    const data = await getJsonAuth(`${API_BASE_URL}/samples/processing/next-folio`, token);
    processingFolioInput.value = data.next_folio || "";
  } catch (_error) {
    processingFolioInput.value = "";
  }
};

const collectCheckedValues = (selector) => {
  return Array.from(document.querySelectorAll(selector)).filter((el) => el.checked).map((el) => el.value);
};

const parseFloatOrNull = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

const getProcessingSelectedOrganism = () => {
  const selected = document.querySelector('.processing-organismo:checked');
  return selected ? selected.value : "";
};

const setProcessingStepExtraVisibility = () => {
  if (procBiv7Extra) {
    procBiv7Extra.classList.toggle("d-none", !procBiv7?.checked);
  }
  if (procBiv8Extra) {
    procBiv8Extra.classList.toggle("d-none", !procBiv8?.checked);
  }
  if (procSar3Extra) {
    procSar3Extra.classList.toggle("d-none", !procSar3?.checked);
  }
  if (procSar4Extra) {
    procSar4Extra.classList.toggle("d-none", !procSar4?.checked);
  }
};

const setProcessingOrganismSections = () => {
  const selected = getProcessingSelectedOrganism();
  if (processingBivalvosWrap) {
    processingBivalvosWrap.classList.toggle("d-none", selected !== "bivalvos");
  }
  if (processingSardinasWrap) {
    processingSardinasWrap.classList.toggle("d-none", selected !== "sardinas");
  }
  if (processingOtroWrap) {
    processingOtroWrap.classList.toggle("d-none", selected !== "otro");
  }
  setProcessingStepExtraVisibility();
};

const loadEquipmentOptionsForProcessing = async () => {
  const selects = document.querySelectorAll(".processing-equipment-select");
  if (!selects.length) {
    return;
  }

  const token = getStoredToken();
  if (!token) {
    return;
  }

  if (!processingEquipmentCache.length) {
    try {
      const data = await getJsonAuth(`${API_BASE_URL}/inventory/equipos`, token);
      processingEquipmentCache = data.items || [];
    } catch (_error) {
      processingEquipmentCache = [];
    }
  }

  const options = ['<option value="">Seleccionar equipo</option>']
    .concat(
      processingEquipmentCache.map((eq) => {
        const label = [eq.nombre || "Equipo", eq.marca || "", eq.modelo || ""].filter(Boolean).join(" - ");
        return `<option value="${eq.id}">${label}</option>`;
      })
    )
    .join("");

  selects.forEach((select) => {
    const current = select.value;
    select.innerHTML = options;
    if (current) {
      select.value = current;
    }
  });
};

const collectProcessingStepObjects = (selector, extrasMap = {}) => {
  return Array.from(document.querySelectorAll(selector))
    .filter((el) => el.checked)
    .map((el) => {
      const cfg = extrasMap[el.id] || {};
      return {
        step: el.value,
        equipo_id: cfg.equipo ? parseIntOrNull(cfg.equipo.value) : null,
        peso: cfg.peso ? parseFloatOrNull(cfg.peso.value) : null,
      };
    });
};

const buildProcessingPayload = () => {
  const selectedOption = processingReceptionSelect?.selectedOptions?.[0];
  const selectedLoteRows = collectProcessingSelectedLoteRows();
  const isLote = processingMuestraTipoInput.value === "lote";
  const idInternoLote = selectedLoteRows.map((row) => row.id_interno).filter(Boolean).join(", ");
  const selectedOrganism = getProcessingSelectedOrganism();
  const bivalvos = collectProcessingStepObjects(".processing-bivalvos-step", {
    procBiv7: { equipo: procBiv7Equipo, peso: procBiv7Peso },
    procBiv8: { equipo: procBiv8Equipo, peso: procBiv8Peso },
  });
  const sardinas = collectProcessingStepObjects(".processing-sardinas-step", {
    procSar3: { equipo: procSar3Equipo, peso: procSar3Peso },
    procSar4: { equipo: procSar4Equipo, peso: procSar4Peso },
  });
  return {
    folio_num: parseIntOrNull(processingFolioInput.value),
    tipo_registro: (processingTipoRegistroInput.value || "P").trim() || "P",
    clave_revision: (processingClaveRevisionInput.value || "FX-TCF-GMP").trim() || "FX-TCF-GMP",
    fecha_emision: processingFechaEmisionInput.value || null,
    fecha_procesamiento: processingFechaInput.value || null,
    hora_procesamiento: processingHoraInput.value || null,
    recepcion_id: parseIntOrNull(processingReceptionSelect.value),
    folio_recepcion_num: parseIntOrNull(selectedOption?.dataset?.folioR),
    muestra_tipo: processingMuestraTipoInput.value || null,
    id_interno: (isLote ? idInternoLote : processingIdInternoInput.value || "").trim() || null,
    lote_seleccion: isLote ? selectedLoteRows : [],
    tipo_organismo: selectedOrganism ? [selectedOrganism] : [],
    parte_organismo: collectCheckedValues(".processing-parte:checked"),
    bivalvos_steps: bivalvos,
    sardinas_steps: sardinas,
    otro_procesamiento: selectedOrganism === "otro" ? (processingOtroInput.value || "").trim() || null : null,
    resguardo: {
      entregado_extraccion: !!procRes1?.checked,
      refrigerador_re1: !!procRes2?.checked,
      congelador_co1: !!procRes3?.checked,
      congelador_co2: !!procRes4?.checked,
      congelador_co3: !!procRes5?.checked,
    },
    observaciones_generales: (processingObservacionesInput.value || "").trim() || null,
    nombre_quien_proceso: (processingQuienProcesoInput.value || "").trim() || null,
    nombre_quien_superviso: (processingQuienSupervisoInput.value || "").trim() || null,
    estado: processingEstadoInput.value || "registrada",
  };
};

const fillProcessingForm = async (item) => {
  await loadReceptionOptionsForProcessing(item.recepcion_id);
  processingIdInput.value = item.id || "";
  processingFormTitle.textContent = `Editar Procesamiento ${formatProcessingFolio(item)}`;
  processingClaveRevisionInput.value = item.clave_revision || "FX-TCF-GMP";
  processingFechaEmisionInput.value = isoDate(item.fecha_emision);
  processingTipoRegistroInput.value = item.tipo_registro || "P";
  processingFolioInput.value = item.folio_num || "";
  processingFechaInput.value = isoDate(item.fecha_procesamiento);
  processingHoraInput.value = item.hora_procesamiento || "";
  processingEstadoInput.value = item.estado || "registrada";

  if (item.recepcion_id) {
    await handleProcessingReceptionSelection(item.lote_seleccion || []);
    if ((item.muestra_tipo || "") === "unica" && processingIdInternoInput) {
      processingIdInternoInput.value = item.id_interno || "";
    }
  } else {
    clearProcessingReceptionDerivedData();
    processingMuestraTipoInput.value = item.muestra_tipo || "unica";
    processingIdInternoInput.value = item.id_interno || "";
  }

  const tipoOrganismo = Array.isArray(item.tipo_organismo) ? item.tipo_organismo[0] || "" : "";
  document.querySelectorAll(".processing-organismo").forEach((el) => {
    el.checked = !!tipoOrganismo && tipoOrganismo === el.value;
  });
  document.querySelectorAll(".processing-parte").forEach((el) => {
    el.checked = (item.parte_organismo || []).includes(el.value);
  });

  const bivalvosNames = (item.bivalvos_steps || []).map((step) => (typeof step === "string" ? step : step.step));
  const sardinasNames = (item.sardinas_steps || []).map((step) => (typeof step === "string" ? step : step.step));
  document.querySelectorAll(".processing-bivalvos-step").forEach((el) => {
    el.checked = bivalvosNames.includes(el.value);
  });
  document.querySelectorAll(".processing-sardinas-step").forEach((el) => {
    el.checked = sardinasNames.includes(el.value);
  });

  const getStepObj = (arr, stepName) => {
    return (arr || []).find((step) => typeof step === "object" && step.step === stepName) || null;
  };
  const biv7Obj = getStepObj(item.bivalvos_steps, "Moler 1-2 min 100-150g");
  const biv8Obj = getStepObj(item.bivalvos_steps, "Reservar molienda en bolsa hermetica");
  const sar3Obj = getStepObj(item.sardinas_steps, "Moler 1-2 min 100-150g");
  const sar4Obj = getStepObj(item.sardinas_steps, "Pesar molienda obtenida");

  if (procBiv7Equipo) procBiv7Equipo.value = biv7Obj?.equipo_id || "";
  if (procBiv8Equipo) procBiv8Equipo.value = biv8Obj?.equipo_id || "";
  if (procSar3Equipo) procSar3Equipo.value = sar3Obj?.equipo_id || "";
  if (procSar4Equipo) procSar4Equipo.value = sar4Obj?.equipo_id || "";

  if (procBiv7Peso) procBiv7Peso.value = biv7Obj?.peso ?? "";
  if (procBiv8Peso) procBiv8Peso.value = biv8Obj?.peso ?? "";
  if (procSar3Peso) procSar3Peso.value = sar3Obj?.peso ?? "";
  if (procSar4Peso) procSar4Peso.value = sar4Obj?.peso ?? "";

  processingOtroInput.value = item.otro_procesamiento || "";
  const res = item.resguardo || {};
  if (procRes1) procRes1.checked = !!res.entregado_extraccion;
  if (procRes2) procRes2.checked = !!res.refrigerador_re1;
  if (procRes3) procRes3.checked = !!res.congelador_co1;
  if (procRes4) procRes4.checked = !!res.congelador_co2;
  if (procRes5) procRes5.checked = !!res.congelador_co3;
  processingObservacionesInput.value = item.observaciones_generales || "";
  processingQuienProcesoInput.value = item.nombre_quien_proceso || "";
  processingQuienSupervisoInput.value = item.nombre_quien_superviso || "";
  setProcessingOrganismSections();
};

const mapProcessingRow = (item) => {
  const canCreate = canModuleAction("muestras", "create");
  const canUpdate = canModuleAction("muestras", "update");
  const canDelete = canModuleAction("muestras", "delete");
  return `
    <tr>
      <td><span class="fw-semibold">${formatProcessingFolio(item)}</span></td>
      <td>${item.folio_recepcion_num ? `R ${String(item.folio_recepcion_num).padStart(7, "0")}` : "-"}</td>
      <td>${item.id_interno || "-"}</td>
      <td>${fmtDate(item.fecha_procesamiento)}</td>
      <td>${item.hora_procesamiento || "-"}</td>
      <td>${item.estado || "registrada"}</td>
      <td>
        <div class="d-flex gap-1">
          <button class="role-action-btn" data-processing-action="extract" data-processing-id="${item.id}" ${canCreate ? "" : "disabled"}>Extraer</button>
          <button class="role-action-btn" data-processing-action="edit" data-processing-id="${item.id}" ${canUpdate ? "" : "disabled"}>Editar</button>
          <button class="role-action-btn" data-processing-action="delete" data-processing-id="${item.id}" ${canDelete ? "" : "disabled"}>Eliminar</button>
        </div>
      </td>
    </tr>
  `;
};

const loadProcessingData = async (force = false) => {
  if (!force && loadedPages.has("muestras-processing")) {
    return;
  }
  const token = getStoredToken();
  if (!token) {
    return;
  }
  const search = (processingSearchInput?.value || "").trim();
  try {
    const data = await getJsonAuth(`${API_BASE_URL}/samples/processing/?search=${encodeURIComponent(search)}`, token);
    processingCache = data.items || [];
    renderRows(processingTableBody, processingCache, mapProcessingRow, 7);
    showProcessingFeedback("");
    loadedPages.add("muestras-processing");
  } catch (error) {
    processingCache = [];
    renderRows(processingTableBody, [], mapProcessingRow, 7);
    showProcessingFeedback(error.message || "No se pudieron cargar procesamientos", true);
  }
};

const editProcessing = async (id) => {
  const token = getStoredToken();
  if (!token) {
    return;
  }
  try {
    const data = await getJsonAuth(`${API_BASE_URL}/samples/processing/${id}`, token);
    await fillProcessingForm(data.item || {});
    if (processingModal) {
      processingModal.show();
    }
  } catch (error) {
    showProcessingFeedback(error.message || "No se pudo cargar procesamiento", true);
  }
};

const deleteProcessing = async (id) => {
  if (!window.confirm("¿Eliminar este registro de procesamiento?")) {
    return;
  }
  const token = getStoredToken();
  if (!token) {
    return;
  }
  try {
    await sendJsonAuth("DELETE", `${API_BASE_URL}/samples/processing/${id}`, token);
    showProcessingFeedback("Procesamiento eliminado");
    loadedPages.delete("muestras-processing");
    await loadProcessingData(true);
  } catch (error) {
    showProcessingFeedback(error.message || "No se pudo eliminar procesamiento", true);
  }
};

const updateConsumablesStats = (items) => {
  if (!consumablesTotalCount) {
    return;
  }

  const total = items.length;
  const available = items.filter((item) => Number(item.piezas || 0) > 5).length;
  const lowStock = items.filter((item) => Number(item.piezas || 0) > 0 && Number(item.piezas || 0) <= 5).length;
  const outOfStock = items.filter((item) => Number(item.piezas || 0) <= 0).length;

  consumablesTotalCount.textContent = fmt(total);
  consumablesAvailableCount.textContent = fmt(available);
  consumablesLowStockCount.textContent = fmt(lowStock);
  consumablesOutOfStockCount.textContent = fmt(outOfStock);
};

const loadConsumablesData = async (force = false) => {
  if (!force && loadedPages.has("consumibles")) {
    return;
  }

  const token = getStoredToken();
  if (!token) {
    return;
  }

  const search = (consumablesSearchInput?.value || "").trim();
  const url = `${API_BASE_URL}/consumables/?search=${encodeURIComponent(search)}`;

  try {
    const data = await getJsonAuth(url, token);
    const items = Array.isArray(data) ? data : data.items || [];
    consumablesCache = items;
    renderRows(consumiblesTableBody, items, mapConsumableRow, 10);
    updateConsumablesStats(items);
    showConsumablesFeedback("");
    loadedPages.add("consumibles");
  } catch (error) {
    consumablesCache = [];
    renderRows(consumiblesTableBody, [], mapConsumableRow, 10);
    showConsumablesFeedback(error.message || "No se pudieron cargar consumibles", true);
  }
};

const editConsumable = (id) => {
  const item = consumablesCache.find((row) => Number(row.id) === Number(id));
  if (!item || !consumableModal) {
    return;
  }
  fillConsumableForm(item);
  consumableModal.show();
};

const deleteConsumable = async (id) => {
  if (!window.confirm("¿Eliminar este consumible?")) {
    return;
  }

  const token = getStoredToken();
  if (!token) {
    return;
  }

  try {
    await sendJsonAuth("DELETE", `${API_BASE_URL}/consumables/${id}`, token);
    showConsumablesFeedback("Consumible eliminado");
    loadedPages.delete("consumibles");
    await loadConsumablesData(true);
  } catch (error) {
    showConsumablesFeedback(error.message || "No se pudo eliminar", true);
  }
};

const getReactivoTypeConfig = (type) => {
  return REACTIVO_TYPES.find((item) => item.value === type) || REACTIVO_TYPES[0];
};

const showReactivosFeedback = (message, isError = false) => {
  if (!reactivosFeedback) return;
  reactivosFeedback.textContent = message || "";
  reactivosFeedback.classList.toggle("text-danger", isError);
  reactivosFeedback.classList.toggle("text-success", !isError && !!message);
};

const formatReactivoName = (item) => item.producto || item.item_name || item.nombre_crm || item.nombre || "-";
const getReactivoExpiry = (item) => item.caducidad || item.expiration_date || item.fecha_vencimiento || null;
const getReactivoLocation = (item) => [item.localizacion || item.ubicacion, item.sub_localizacion].filter(Boolean).join(" / ") || "-";

const getReactivoStockText = (item) => {
  if (item.piezas !== null && item.piezas !== undefined && item.piezas !== "") return `${fmt(item.piezas)} piezas`;
  if (item.capacidad_litros !== null && item.capacidad_litros !== undefined && item.capacidad_litros !== "") return `${fmt(item.capacidad_litros)} L`;
  if (item.capacidad_kilos !== null && item.capacidad_kilos !== undefined && item.capacidad_kilos !== "") return `${fmt(item.capacidad_kilos)} kg`;
  if (item.amount_in_stock !== null && item.amount_in_stock !== undefined && item.amount_in_stock !== "") return fmt(item.amount_in_stock);
  return "-";
};

const mapReactivoRow = (item) => {
  const canUpdate = canModuleAction("reactivos", "update");
  const canDelete = canModuleAction("reactivos", "delete");
  const type = getReactivoTypeConfig(item.tipo_reactivo || item.categoria);
  return `
    <tr>
      <td><span class="badge-row ajuste">${type.label}</span></td>
      <td><span class="fw-semibold">${formatReactivoName(item)}</span><div class="small text-secondary">${item.catalogo_parte_cas_lote || item.catalogo || item.cas_number || item.numero_cas || ""}</div></td>
      <td>${[item.marca, item.proveedor || item.vendor].filter(Boolean).join(" / ") || "-"}</td>
      <td>${getReactivoLocation(item)}</td>
      <td>${fmtDate(getReactivoExpiry(item))}</td>
      <td>${getReactivoStockText(item)}</td>
      <td><div class="d-flex gap-1"><button class="role-action-btn" data-reactivo-action="edit" data-reactivo-id="${item.id}" ${canUpdate ? "" : "disabled"}>Editar</button><button class="role-action-btn" data-reactivo-action="delete" data-reactivo-id="${item.id}" ${canDelete ? "" : "disabled"}>Eliminar</button></div></td>
    </tr>
  `;
};

const updateReactivosStats = (items = []) => {
  if (reactivosTotalCount) reactivosTotalCount.textContent = fmt(items.length);
  if (reactivosExpiryCount) reactivosExpiryCount.textContent = fmt(items.filter((item) => !!getReactivoExpiry(item)).length);
  if (reactivosTypesCount) reactivosTypesCount.textContent = fmt(new Set(items.map((item) => item.tipo_reactivo || item.categoria).filter(Boolean)).size);
};

const setupReactivoTypeOptions = () => {
  if (!reactivoTipoInput) return;
  reactivoTipoInput.innerHTML = REACTIVO_TYPES.map((type) => `<option value="${type.value}">${type.label}</option>`).join("");
};

const renderReactivoDynamicFields = (values = {}) => {
  if (!reactivoDynamicFields || !reactivoTipoInput) return;
  const config = getReactivoTypeConfig(reactivoTipoInput.value);
  if (reactivoTypeHint) reactivoTypeHint.textContent = config.hint;
  reactivoDynamicFields.innerHTML = config.fields
    .map((fieldKey) => {
      const meta = REACTIVO_FIELD_META[fieldKey] || { label: fieldKey };
      const target = meta.target || fieldKey;
      const value = values[fieldKey] ?? values[target] ?? "";
      const colClass = meta.wide ? "col-12" : "col-12 col-md-6 col-xl-4";
      if (meta.textarea) {
        return `<div class="${colClass}"><label class="form-label" for="reactivoField_${fieldKey}">${meta.label}${meta.required ? " *" : ""}</label><textarea id="reactivoField_${fieldKey}" class="form-control reactivo-field" data-field="${fieldKey}" data-target="${target}" rows="3" ${meta.required ? "required" : ""}>${value || ""}</textarea></div>`;
      }
      if (meta.options) {
        return `<div class="${colClass}"><label class="form-label" for="reactivoField_${fieldKey}">${meta.label}${meta.required ? " *" : ""}</label><select id="reactivoField_${fieldKey}" class="form-select reactivo-field" data-field="${fieldKey}" data-target="${target}" ${meta.required ? "required" : ""}><option value="">Seleccionar</option>${meta.options.map((option) => `<option value="${option}" ${value === option ? "selected" : ""}>${option}</option>`).join("")}</select></div>`;
      }
      return `<div class="${colClass}"><label class="form-label" for="reactivoField_${fieldKey}">${meta.label}${meta.required ? " *" : ""}</label><input id="reactivoField_${fieldKey}" class="form-control reactivo-field" data-field="${fieldKey}" data-target="${target}" type="${meta.type || "text"}" step="${meta.step || ""}" value="${value || ""}" ${meta.required ? "required" : ""} /></div>`;
    })
    .join("");
};

const collectReactivoPayload = () => {
  const payload = { tipo_reactivo: reactivoTipoInput?.value || "" };
  document.querySelectorAll(".reactivo-field").forEach((field) => {
    const key = field.dataset.target || field.dataset.field;
    payload[key] = field.value || null;
  });
  return payload;
};

const resetReactivoForm = (item = null) => {
  if (!reactivoForm) return;
  reactivoForm.reset();
  setupReactivoTypeOptions();
  reactivoIdInput.value = item?.id || "";
  reactivoFormTitle.textContent = item ? "Editar Reactivo" : "Nuevo Reactivo";
  reactivoTipoInput.value = item?.tipo_reactivo || item?.categoria || REACTIVO_TYPES[0].value;
  renderReactivoDynamicFields(item || {});
};

const loadReactivosData = async (force = false) => {
  if (!force && loadedPages.has("reactivos")) return;
  const token = getStoredToken();
  if (!token) return;
  const search = (reactivosSearchInput?.value || "").trim();
  try {
    const data = await getJsonAuth(`${API_BASE_URL}/inventory/reactivos?search=${encodeURIComponent(search)}`, token);
    reactivosCache = data.items || [];
    renderRows(reactivosTableBody, reactivosCache, mapReactivoRow, 7);
    updateReactivosStats(reactivosCache);
    showReactivosFeedback("");
    loadedPages.add("reactivos");
  } catch (error) {
    reactivosCache = [];
    renderRows(reactivosTableBody, [], mapReactivoRow, 7);
    updateReactivosStats([]);
    showReactivosFeedback(error.message || "No se pudieron cargar reactivos", true);
  }
};

const editReactivo = async (id) => {
  const token = getStoredToken();
  if (!token) return;
  try {
    const data = await getJsonAuth(`${API_BASE_URL}/inventory/reactivos/${id}`, token);
    resetReactivoForm(data.item || {});
    if (reactivoModal) reactivoModal.show();
  } catch (error) {
    showReactivosFeedback(error.message || "No se pudo cargar el reactivo", true);
  }
};

const deleteReactivo = async (id) => {
  if (!window.confirm("Â¿Eliminar este reactivo?")) return;
  const token = getStoredToken();
  if (!token) return;
  try {
    await sendJsonAuth("DELETE", `${API_BASE_URL}/inventory/reactivos/${id}`, token);
    showReactivosFeedback("Reactivo eliminado");
    loadedPages.delete("reactivos");
    await loadReactivosData(true);
  } catch (error) {
    showReactivosFeedback(error.message || "No se pudo eliminar el reactivo", true);
  }
};

const getUserInitials = (name = "", email = "") => {
  const source = (name || email || "U").trim();
  const parts = source.includes("@") ? [source[0]] : source.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "U";
};

const normalizeText = (value) => String(value || "").toLowerCase();

const updateUsuariosStats = (items = []) => {
  if (usuariosTotalCount) usuariosTotalCount.textContent = fmt(items.length);
  if (usuariosActiveCount) usuariosActiveCount.textContent = fmt(items.filter((item) => !!item.activo).length);
  if (usuariosInactiveCount) usuariosInactiveCount.textContent = fmt(items.filter((item) => !item.activo).length);
  if (usuariosAdminCount) {
    usuariosAdminCount.textContent = fmt(items.filter((item) => normalizeText(item.rol).includes("admin")).length);
  }
};

const showUsuariosFeedback = (message, isError = false) => {
  if (!usuariosFeedback) return;
  usuariosFeedback.textContent = message || "";
  usuariosFeedback.classList.toggle("text-danger", isError);
  usuariosFeedback.classList.toggle("text-success", !isError && !!message);
  usuariosFeedback.classList.toggle("text-secondary", !message);
};

const updateUsuariosRoleFilter = (items = []) => {
  if (!usuariosRoleFilter) return;
  const current = usuariosRoleFilter.value;
  const roles = Array.from(new Set(items.map((item) => item.rol).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  usuariosRoleFilter.innerHTML = [
    '<option value="">Todos los roles</option>',
    ...roles.map((role) => `<option value="${role}">${role}</option>`),
  ].join("");
  if (roles.includes(current)) {
    usuariosRoleFilter.value = current;
  }
};

const getFilteredUsuarios = () => {
  const search = normalizeText(usuariosSearchInput?.value);
  const role = usuariosRoleFilter?.value || "";
  return usuariosCache.filter((item) => {
    const matchesSearch = !search || normalizeText(`${item.nombre || ""} ${item.email || ""}`).includes(search);
    const matchesRole = !role || item.rol === role;
    return matchesSearch && matchesRole;
  });
};

const renderUsuariosTable = () => {
  const items = getFilteredUsuarios();
  renderRows(usuariosTableBody, items, mapUsuarioRow, 7);
};

const mapUsuarioRow = (item) => {
  const canUpdate = canModuleAction("usuarios", "update");
  const canDelete = canModuleAction("usuarios", "delete");
  const initials = getUserInitials(item.nombre, item.email);
  const statusClass = item.activo ? "active" : "inactive";
  const statusText = item.activo ? "Activo" : "Inactivo";
  const roleClass = normalizeText(item.rol).includes("admin") ? "admin" : "neutral";
  return `
    <tr>
      <td>
        <div class="user-cell">
          <span class="user-avatar">${initials}</span>
          <span class="user-name">${item.nombre || "Usuario sin nombre"}</span>
        </div>
      </td>
      <td><span class="user-email"><i class="bi bi-envelope"></i>${item.email || "-"}</span></td>
      <td><span class="user-role-pill ${roleClass}">${item.rol || "Sin rol"}</span></td>
      <td>${item.departamento || "-"}</td>
      <td>${fmtDate(item.ultimo_acceso || item.creado_en)}</td>
      <td><span class="user-status-pill ${statusClass}"><i class="bi ${item.activo ? "bi-check-circle" : "bi-x-circle"}"></i>${statusText}</span></td>
      <td>
        <button class="icon-action-btn" type="button" title="Editar usuario" aria-label="Editar usuario" data-user-action="edit" data-user-id="${item.id}" ${canUpdate ? "" : "disabled"}>
          <i class="bi bi-pencil"></i>
        </button>
        <button class="icon-action-btn" type="button" title="Eliminar usuario" aria-label="Eliminar usuario" data-user-action="delete" data-user-id="${item.id}" ${canDelete ? "" : "disabled"}>
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
  `;
};

const loadUserRoleOptions = async (selectedRoleId = null) => {
  if (!userRoleInput) return;
  const token = getStoredToken();
  if (!token) return;
  if (!rolesCache.length) {
    const data = await getJsonAuth(`${API_BASE_URL}/admin/roles`, token);
    rolesCache = data.items || [];
  }
  userRoleInput.innerHTML = [
    '<option value="">Seleccionar rol</option>',
    ...rolesCache
      .filter((role) => !!role.activo)
      .map((role) => `<option value="${role.id}" ${Number(selectedRoleId) === Number(role.id) ? "selected" : ""}>${role.nombre}</option>`),
  ].join("");
};

const resetUserForm = async (item = null) => {
  if (!userForm) return;
  userForm.reset();
  userIdInput.value = item?.id || "";
  userFormTitle.textContent = item ? "Editar Usuario" : "Nuevo Usuario";
  userNameInput.value = item?.nombre || "";
  userEmailInput.value = item?.email || "";
  userDepartmentInput.value = item?.departamento || "";
  userActiveInput.checked = item ? !!item.activo : true;
  await loadUserRoleOptions(item?.id_rol || null);
};

const buildUserPayload = () => ({
  nombre: (userNameInput?.value || "").trim(),
  email: (userEmailInput?.value || "").trim(),
  id_rol: Number(userRoleInput?.value || 0),
  departamento: (userDepartmentInput?.value || "").trim() || null,
  activo: !!userActiveInput?.checked,
});

const editUsuario = async (id) => {
  const token = getStoredToken();
  if (!token) return;
  try {
    const data = await getJsonAuth(`${API_BASE_URL}/admin/usuarios/${id}`, token);
    await resetUserForm(data.item || {});
    if (userModal) userModal.show();
  } catch (error) {
    showUsuariosFeedback(error.message || "No se pudo cargar el usuario", true);
  }
};

const deleteUsuario = async (id) => {
  if (!window.confirm("¿Eliminar este usuario?")) return;
  const token = getStoredToken();
  if (!token) return;
  try {
    await sendJsonAuth("DELETE", `${API_BASE_URL}/admin/usuarios/${id}`, token);
    showUsuariosFeedback("Usuario eliminado");
    loadedPages.delete("usuarios");
    await loadUsuariosData(true);
  } catch (error) {
    showUsuariosFeedback(error.message || "No se pudo eliminar el usuario", true);
  }
};

const loadUsuariosData = async (force = false) => {
  if (!force && loadedPages.has("usuarios")) return;
  const token = getStoredToken();
  if (!token) return;
  try {
    const data = await getJsonAuth(`${API_BASE_URL}/admin/usuarios`, token);
    usuariosCache = data.items || [];
    updateUsuariosStats(usuariosCache);
    updateUsuariosRoleFilter(usuariosCache);
    renderUsuariosTable();
    showUsuariosFeedback("");
    loadedPages.add("usuarios");
  } catch (error) {
    usuariosCache = [];
    updateUsuariosStats([]);
    updateUsuariosRoleFilter([]);
    renderRows(usuariosTableBody, [], mapUsuarioRow, 7);
    showUsuariosFeedback(error.message || "No se pudieron cargar usuarios", true);
  }
};

const EQUIPO_STATUS_META = {
  operativo: { label: "Operativo", className: "active", icon: "bi-check-circle" },
  mantenimiento: { label: "En Mantenimiento", className: "warning", icon: "bi-wrench-adjustable" },
  calibracion_pendiente: { label: "Calibracion Pendiente", className: "info", icon: "bi-clock-history" },
  fuera_servicio: { label: "Fuera de Servicio", className: "danger", icon: "bi-exclamation-triangle" },
};

const MANTENIMIENTO_STATUS_META = {
  programado: { label: "Programado", className: "neutral", icon: "bi-calendar-event" },
  en_proceso: { label: "En Proceso", className: "info", icon: "bi-clock-history" },
  completado: { label: "Completado", className: "active", icon: "bi-check-circle" },
  vencido: { label: "Vencido", className: "danger", icon: "bi-exclamation-triangle" },
};

const MANTENIMIENTO_TYPE_META = {
  preventivo: { label: "Preventivo", className: "outline" },
  correctivo: { label: "Correctivo", className: "warning" },
  calibracion: { label: "Calibracion", className: "purple" },
};

const statusBadge = (metaMap, value) => {
  const meta = metaMap[value] || { label: value || "-", className: "neutral", icon: "bi-dot" };
  return `<span class="user-status-pill ${meta.className}"><i class="bi ${meta.icon}"></i>${meta.label}</span>`;
};

const typeBadge = (value) => {
  const meta = MANTENIMIENTO_TYPE_META[value] || { label: value || "-", className: "outline" };
  return `<span class="maintenance-type-pill ${meta.className}">${meta.label}</span>`;
};

const showEquiposFeedback = (message, isError = false) => {
  if (!equiposFeedback) return;
  equiposFeedback.textContent = message || "";
  equiposFeedback.classList.toggle("text-danger", isError);
  equiposFeedback.classList.toggle("text-success", !isError && !!message);
  equiposFeedback.classList.toggle("text-secondary", !message);
};

const showMantenimientoFeedback = (message, isError = false) => {
  if (!mantenimientoFeedback) return;
  mantenimientoFeedback.textContent = message || "";
  mantenimientoFeedback.classList.toggle("text-danger", isError);
  mantenimientoFeedback.classList.toggle("text-success", !isError && !!message);
  mantenimientoFeedback.classList.toggle("text-secondary", !message);
};

const updateEquiposStats = (items = []) => {
  if (equiposTotalCount) equiposTotalCount.textContent = fmt(items.length);
  if (equiposOperativosCount) equiposOperativosCount.textContent = fmt(items.filter((item) => item.estado === "operativo").length);
  if (equiposMantenimientoCount) equiposMantenimientoCount.textContent = fmt(items.filter((item) => item.estado === "mantenimiento").length);
  if (equiposAlertasCount) {
    equiposAlertasCount.textContent = fmt(items.filter((item) => ["fuera_servicio", "calibracion_pendiente"].includes(item.estado)).length);
  }
};

const updateMantenimientoStats = (items = []) => {
  if (mantenimientoTotalCount) mantenimientoTotalCount.textContent = fmt(items.length);
  if (mantenimientoPendientesCount) {
    mantenimientoPendientesCount.textContent = fmt(items.filter((item) => ["programado", "en_proceso"].includes(item.estado)).length);
  }
  if (mantenimientoCompletadosCount) mantenimientoCompletadosCount.textContent = fmt(items.filter((item) => item.estado === "completado").length);
  if (mantenimientoVencidosCount) mantenimientoVencidosCount.textContent = fmt(items.filter((item) => item.estado === "vencido").length);
};

const mapEquipoRow = (item) => {
  const canUpdate = canModuleAction("equipos", "update");
  const canDelete = canModuleAction("equipos", "delete");
  return `
    <tr>
      <td><strong>${item.nombre || "-"}</strong><div class="text-secondary small">ID ${item.id}</div></td>
      <td>${item.marca || "-"}<div class="text-secondary small">${item.modelo || ""}</div></td>
      <td>${item.numero_serie || "-"}</td>
      <td>${item.ubicacion || "-"}</td>
      <td>${item.responsable || "-"}</td>
      <td>${fmtDate(item.fecha_prox_calibracion)}</td>
      <td>${statusBadge(EQUIPO_STATUS_META, item.estado)}</td>
      <td>
        <button class="icon-action-btn" type="button" title="Editar equipo" data-equipo-action="edit" data-equipo-id="${item.id}" ${canUpdate ? "" : "disabled"}><i class="bi bi-pencil"></i></button>
        <button class="icon-action-btn" type="button" title="Eliminar equipo" data-equipo-action="delete" data-equipo-id="${item.id}" ${canDelete ? "" : "disabled"}><i class="bi bi-trash"></i></button>
      </td>
    </tr>
  `;
};

const mapMantenimientoRow = (item) => {
  const canUpdate = canModuleAction("mantenimiento", "update");
  const canDelete = canModuleAction("mantenimiento", "delete");
  const equipoLabel = [item.equipo, item.equipo_marca, item.equipo_modelo].filter(Boolean).join(" ");
  return `
    <tr>
      <td><strong>${equipoLabel || "-"}</strong></td>
      <td>${typeBadge(item.tipo)}</td>
      <td>${fmtDate(item.fecha_programada)}${item.fecha_realizado ? `<div class="text-secondary small">Realizado: ${fmtDate(item.fecha_realizado)}</div>` : ""}</td>
      <td>${item.tecnico_proveedor || "-"}<div class="text-secondary small">${item.responsable || ""}</div></td>
      <td>${statusBadge(MANTENIMIENTO_STATUS_META, item.estado)}</td>
      <td>${item.observaciones || "-"}</td>
      <td>
        <button class="icon-action-btn" type="button" title="Editar mantenimiento" data-maintenance-action="edit" data-maintenance-id="${item.id}" ${canUpdate ? "" : "disabled"}><i class="bi bi-pencil"></i></button>
        <button class="icon-action-btn" type="button" title="Eliminar mantenimiento" data-maintenance-action="delete" data-maintenance-id="${item.id}" ${canDelete ? "" : "disabled"}><i class="bi bi-trash"></i></button>
      </td>
    </tr>
  `;
};

const loadResponsableOptions = async (selectEl, selectedId = null) => {
  if (!selectEl) return;
  const token = getStoredToken();
  if (!token) return;
  if (!usuariosCache.length) {
    const data = await getJsonAuth(`${API_BASE_URL}/admin/usuarios`, token);
    usuariosCache = data.items || [];
  }
  selectEl.innerHTML = [
    '<option value="">Sin responsable</option>',
    ...usuariosCache
      .filter((user) => !!user.activo)
      .map((user) => `<option value="${user.id}" ${Number(selectedId) === Number(user.id) ? "selected" : ""}>${user.nombre}</option>`),
  ].join("");
};

const loadEquipoOptionsForMaintenance = async (selectedId = null) => {
  if (!mantenimientoEquipoInput) return;
  const token = getStoredToken();
  if (!token) return;
  const data = await getJsonAuth(`${API_BASE_URL}/inventory/equipos`, token);
  equiposCache = data.items || [];
  mantenimientoEquipoInput.innerHTML = [
    '<option value="">Seleccionar equipo</option>',
    ...equiposCache.map((item) => {
      const label = [item.nombre, item.marca, item.modelo].filter(Boolean).join(" - ");
      return `<option value="${item.id}" ${Number(selectedId) === Number(item.id) ? "selected" : ""}>${label || `Equipo ${item.id}`}</option>`;
    }),
  ].join("");
};

const buildEquipoPayload = () => ({
  nombre: (equipoNombreInput?.value || "").trim(),
  marca: (equipoMarcaInput?.value || "").trim() || null,
  modelo: (equipoModeloInput?.value || "").trim() || null,
  numero_serie: (equipoSerieInput?.value || "").trim() || null,
  ubicacion: (equipoUbicacionInput?.value || "").trim() || null,
  id_responsable: Number(equipoResponsableInput?.value || 0) || null,
  fecha_prox_calibracion: equipoCalibracionInput?.value || null,
  estado: equipoEstadoInput?.value || "operativo",
});

const buildMantenimientoPayload = () => ({
  id_equipo: Number(mantenimientoEquipoInput?.value || 0),
  tipo: mantenimientoTipoInput?.value || "preventivo",
  fecha_programada: mantenimientoFechaProgramadaInput?.value || null,
  fecha_realizado: mantenimientoFechaRealizadoInput?.value || null,
  tecnico_proveedor: (mantenimientoTecnicoInput?.value || "").trim() || null,
  id_responsable: Number(mantenimientoResponsableInput?.value || 0) || null,
  estado: mantenimientoEstadoInput?.value || "programado",
  observaciones: (mantenimientoObservacionesInput?.value || "").trim() || null,
});

const resetEquipoForm = async (item = null) => {
  if (!equipoForm) return;
  equipoForm.reset();
  equipoIdInput.value = item?.id || "";
  equipoFormTitle.textContent = item ? "Editar Equipo" : "Nuevo Equipo";
  equipoNombreInput.value = item?.nombre || "";
  equipoMarcaInput.value = item?.marca || "";
  equipoModeloInput.value = item?.modelo || "";
  equipoSerieInput.value = item?.numero_serie || "";
  equipoUbicacionInput.value = item?.ubicacion || "";
  equipoCalibracionInput.value = toDateOnly(item?.fecha_prox_calibracion);
  equipoEstadoInput.value = item?.estado || "operativo";
  await loadResponsableOptions(equipoResponsableInput, item?.id_responsable || null);
};

const resetMantenimientoForm = async (item = null) => {
  if (!mantenimientoForm) return;
  mantenimientoForm.reset();
  mantenimientoIdInput.value = item?.id || "";
  mantenimientoFormTitle.textContent = item ? "Editar Mantenimiento" : "Programar Mantenimiento";
  mantenimientoTipoInput.value = item?.tipo || "preventivo";
  mantenimientoFechaProgramadaInput.value = toDateOnly(item?.fecha_programada);
  mantenimientoFechaRealizadoInput.value = toDateOnly(item?.fecha_realizado);
  mantenimientoTecnicoInput.value = item?.tecnico_proveedor || "";
  mantenimientoEstadoInput.value = item?.estado || "programado";
  mantenimientoObservacionesInput.value = item?.observaciones || "";
  await Promise.all([
    loadEquipoOptionsForMaintenance(item?.id_equipo || null),
    loadResponsableOptions(mantenimientoResponsableInput, item?.id_responsable || null),
  ]);
};

const loadEquiposData = async (force = false) => {
  if (!force && loadedPages.has("equipos")) return;
  const token = getStoredToken();
  if (!token) return;
  const search = (equiposSearchInput?.value || "").trim();
  const estado = equiposEstadoFilter?.value || "";
  try {
    const data = await getJsonAuth(`${API_BASE_URL}/inventory/equipos?search=${encodeURIComponent(search)}&estado=${encodeURIComponent(estado)}`, token);
    equiposCache = data.items || [];
    updateEquiposStats(equiposCache);
    renderRows(equiposTableBody, equiposCache, mapEquipoRow, 8);
    showEquiposFeedback("");
    loadedPages.add("equipos");
  } catch (error) {
    equiposCache = [];
    updateEquiposStats([]);
    renderRows(equiposTableBody, [], mapEquipoRow, 8);
    showEquiposFeedback(error.message || "No se pudieron cargar equipos", true);
  }
};

const loadMantenimientosData = async (force = false) => {
  if (!force && loadedPages.has("mantenimiento")) return;
  const token = getStoredToken();
  if (!token) return;
  const search = (mantenimientoSearchInput?.value || "").trim();
  const tipo = mantenimientoTipoFilter?.value || "";
  const estado = mantenimientoEstadoFilter?.value || "";
  try {
    const data = await getJsonAuth(`${API_BASE_URL}/inventory/mantenimientos?search=${encodeURIComponent(search)}&tipo=${encodeURIComponent(tipo)}&estado=${encodeURIComponent(estado)}`, token);
    mantenimientosCache = data.items || [];
    updateMantenimientoStats(mantenimientosCache);
    renderRows(mantenimientosTableBody, mantenimientosCache, mapMantenimientoRow, 7);
    showMantenimientoFeedback("");
    loadedPages.add("mantenimiento");
  } catch (error) {
    mantenimientosCache = [];
    updateMantenimientoStats([]);
    renderRows(mantenimientosTableBody, [], mapMantenimientoRow, 7);
    showMantenimientoFeedback(error.message || "No se pudieron cargar mantenimientos", true);
  }
};

const editEquipo = async (id) => {
  const token = getStoredToken();
  if (!token) return;
  try {
    const data = await getJsonAuth(`${API_BASE_URL}/inventory/equipos/${id}`, token);
    await resetEquipoForm(data.item || {});
    if (equipoModal) equipoModal.show();
  } catch (error) {
    showEquiposFeedback(error.message || "No se pudo cargar el equipo", true);
  }
};

const deleteEquipo = async (id) => {
  if (!window.confirm("Eliminar este equipo?")) return;
  const token = getStoredToken();
  if (!token) return;
  try {
    await sendJsonAuth("DELETE", `${API_BASE_URL}/inventory/equipos/${id}`, token);
    showEquiposFeedback("Equipo eliminado");
    loadedPages.delete("equipos");
    await loadEquiposData(true);
  } catch (error) {
    showEquiposFeedback(error.message || "No se pudo eliminar el equipo", true);
  }
};

const editMantenimiento = async (id) => {
  const token = getStoredToken();
  if (!token) return;
  try {
    const data = await getJsonAuth(`${API_BASE_URL}/inventory/mantenimientos/${id}`, token);
    await resetMantenimientoForm(data.item || {});
    if (mantenimientoModal) mantenimientoModal.show();
  } catch (error) {
    showMantenimientoFeedback(error.message || "No se pudo cargar el mantenimiento", true);
  }
};

const deleteMantenimiento = async (id) => {
  if (!window.confirm("Eliminar este mantenimiento?")) return;
  const token = getStoredToken();
  if (!token) return;
  try {
    await sendJsonAuth("DELETE", `${API_BASE_URL}/inventory/mantenimientos/${id}`, token);
    showMantenimientoFeedback("Mantenimiento eliminado");
    loadedPages.delete("mantenimiento");
    await loadMantenimientosData(true);
  } catch (error) {
    showMantenimientoFeedback(error.message || "No se pudo eliminar el mantenimiento", true);
  }
};

const loadPageData = async (page) => {
  if (loadedPages.has(page)) {
    return;
  }

  const token = getStoredToken();
  if (!token) {
    return;
  }

  if (page === "dashboard") {
    await loadDashboard();
    loadedPages.add(page);
    return;
  }

  const pageConfig = {
    reactivos: {
      loader: async () => {
        await loadReactivosData(true);
      },
    },
    consumibles: {
      loader: async () => {
        await loadConsumablesData(true);
      },
    },
    equipos: {
      loader: async () => {
        await loadEquiposData(true);
      },
    },
    muestras: {
      loader: async () => {
        activeSamplesSection = "recepcion";
        await loadSamplesData(true);
        await loadProcessingData(true);
        await loadExtractionData(true);
        await setSamplesSection(activeSamplesSection, false);
      },
    },
    movimientos: {
      url: `${API_BASE_URL}/inventory/movimientos`,
      tbody: movimientosTableBody,
      emptyCols: 5,
      mapRow: (r) => `<tr><td>${fmtDate(r.fecha_hora)}</td><td>${r.referencia || "-"}</td><td>${r.tipo || "-"}</td><td>${r.tabla_origen || "-"}</td><td>${fmt(r.cantidad)}</td></tr>`,
    },
    mantenimiento: {
      loader: async () => {
        await loadMantenimientosData(true);
      },
    },
    documentos: {
      url: `${API_BASE_URL}/documents/`,
      tbody: documentosTableBody,
      emptyCols: 5,
      mapRow: (r) => `<tr><td>${r.codigo || "-"}</td><td>${r.version || "-"}</td><td>${r.estado || "-"}</td><td>${fmtDate(r.fecha_reporte)}</td><td>${r.tipo_mantenimiento || "-"}</td></tr>`,
    },
    roles: {
      loader: async () => {
        await loadRolesCrudData();
      },
    },
    usuarios: {
      loader: async () => {
        await loadUsuariosData(true);
      },
    },
    reportes: {
      url: `${API_BASE_URL}/documents/`,
      tbody: documentosTableBody,
      emptyCols: 5,
      mapRow: (r) => `<tr><td>${r.codigo || "-"}</td><td>${r.version || "-"}</td><td>${r.estado || "-"}</td><td>${fmtDate(r.fecha_reporte)}</td><td>${r.tipo_mantenimiento || "-"}</td></tr>`,
    },
  };

  const cfg = pageConfig[page];
  if (!cfg) {
    return;
  }

  if (cfg.loader) {
    try {
      await cfg.loader();
      loadedPages.add(page);
    } catch (_error) {
      // Fallback visual para evitar que quede el estado "Cargando...".
      if (page === "consumibles") {
        renderRows(consumiblesTableBody, [], mapConsumableRow, 10);
      }
      if (page === "reactivos") {
        renderRows(reactivosTableBody, [], mapReactivoRow, 7);
      }
      if (page === "usuarios") {
        renderRows(usuariosTableBody, [], mapUsuarioRow, 7);
      }
      if (page === "equipos") {
        renderRows(equiposTableBody, [], mapEquipoRow, 8);
      }
      if (page === "mantenimiento") {
        renderRows(mantenimientosTableBody, [], mapMantenimientoRow, 7);
      }
      if (page === "muestras") {
        renderRows(muestrasTableBody, [], mapSampleRow, 6);
        renderRows(processingTableBody, [], mapProcessingRow, 7);
      }
    }
    return;
  }

  try {
    const data = await getJsonAuth(cfg.url, token);
    renderRows(cfg.tbody, data.items || [], cfg.mapRow, cfg.emptyCols);
    loadedPages.add(page);
  } catch (error) {
    renderRows(cfg.tbody, [], cfg.mapRow, cfg.emptyCols);
  }
};

const setActivePage = async (page) => {
  if (!canAccessPage(page, "read")) {
    const fallback = getFirstAllowedPage();
    if (!fallback) {
      alert("Tu rol no tiene permisos de lectura en ningun modulo.");
      return;
    }
    if (fallback !== page) {
      page = fallback;
    }
  }

  activePage = page;

  navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.page === page);
  });

  contentPages.forEach((section) => {
    section.classList.toggle("active", section.id === `page-${page}`);
  });

  // Actualizar breadcrumb móvil
  const PAGE_LABELS = {
    dashboard: "Dashboard",
    reactivos: "Reactivos",
    consumibles: "Consumibles",
    equipos: "Equipos",
    muestras: "Muestras",
    movimientos: "Movimientos",
    mantenimiento: "Mantenimiento",
    documentos: "Documentos SGC",
    reportes: "Reportes Mantenimiento",
    roles: "Roles",
    usuarios: "Usuarios",
  };
  const breadcrumb = document.getElementById("mobileBreadcrumbPage");
  if (breadcrumb) breadcrumb.textContent = PAGE_LABELS[page] || page;

  // Cerrar sidebar en móvil al navegar
  closeSidebar();

  await loadPageData(page);
};

const renderMovements = (items) => {
  if (!items || items.length === 0) {
    recentMovementsBody.innerHTML = '<tr><td colspan="5" class="text-secondary">No hay movimientos registrados.</td></tr>';
    return;
  }

  recentMovementsBody.innerHTML = items
    .map((item) => {
      const type = String(item.tipo || "").toLowerCase();
      const badgeClass = type === "entrada" ? "entrada" : type === "salida" ? "salida" : "ajuste";
      return `
        <tr>
          <td>${fmtDate(item.fecha_hora)}</td>
          <td><span class="badge-row ${badgeClass}">${item.tipo || "-"}</span></td>
          <td>${item.tabla_origen || "-"}</td>
          <td>${item.item_nombre || "Item #" + item.id}</td>
          <td>${fmt(item.cantidad)}</td>
        </tr>
      `;
    })
    .join("");
};

const renderMaintenances = (items) => {
  if (!items || items.length === 0) {
    maintenanceList.innerHTML = '<p class="text-secondary mb-0">No hay mantenimientos registrados.</p>';
    return;
  }

  maintenanceList.innerHTML = items
    .map(
      (item) => `
      <div class="maintenance-row">
        <strong>${item.equipo || "Equipo sin nombre"}</strong>
        <p>${item.tipo || "-"} | ${item.estado || "-"}</p>
        <p>Fecha: ${fmtDate(item.fecha_programada)} | Responsable: ${item.responsable || "N/A"}</p>
      </div>
    `
    )
    .join("");
};

const renderDashboardData = (payload) => {
  const counters = payload.counters || {};

  metricReactivos.textContent = fmt(counters.total_reactivos);
  metricConsumibles.textContent = fmt(counters.total_consumibles);
  metricMantenimientoProximo.textContent = fmt(counters.mantenimientos_proximos);
  metricMuestras.textContent = fmt(counters.total_muestras);

  metricReactivosMeta.textContent = `Equipos registrados: ${fmt(counters.total_equipos)}`;
  metricConsumiblesMeta.textContent = `Entradas acumuladas: ${fmt(counters.entradas_consumibles)}`;
  metricMantenimientoMeta.textContent = `Pendientes: ${fmt(counters.mantenimientos_pendientes)}`;

  entryReactivos.textContent = fmt(counters.entradas_reactivos);
  entryConsumibles.textContent = fmt(counters.entradas_consumibles);
  outReactivos.textContent = fmt(counters.salidas_reactivos);
  outConsumibles.textContent = fmt(counters.salidas_consumibles);

  maintenanceDone.textContent = fmt(counters.mantenimientos_realizados);
  maintenancePending.textContent = fmt(counters.mantenimientos_pendientes);
  maintenanceOverdue.textContent = fmt(counters.mantenimientos_vencidos);

  renderMovements(payload.recent_movements || []);
  renderMaintenances(payload.recent_maintenances || []);

  dashboardSyncStatus.textContent = "Sincronizado con backend";
};

const loadDashboard = async () => {
  const token = getStoredToken();
  if (!token) {
    return;
  }

  dashboardSyncStatus.textContent = "Sincronizando con backend...";

  try {
    const payload = await getJsonAuth(`${API_BASE_URL}/dashboard/overview`, token);
    renderDashboardData(payload);
  } catch (error) {
    dashboardSyncStatus.textContent = "No se pudo cargar el dashboard";
    recentMovementsBody.innerHTML = '<tr><td colspan="5" class="text-danger">Error al cargar movimientos.</td></tr>';
    maintenanceList.innerHTML = '<p class="text-danger mb-0">Error al cargar mantenimientos.</p>';
  }
};

const init = async () => {
  const token = getStoredToken();
  if (!token) {
    showLogin();
    return;
  }

  currentPermissions = getStoredPermissions();

  try {
    const data = await getJsonAuth(`${API_BASE_URL}/auth/me`, token);
    setPermissions(data.permissions || {});
    applyNavigationPermissions();
    showDashboard(data.user || {});
    const firstPage = getFirstAllowedPage();
    await setActivePage(firstPage || activePage);
  } catch (error) {
    clearSession();
    showLogin();
  }
};

navItems.forEach((item) => {
  item.addEventListener("click", async (event) => {
    event.preventDefault();
    const nextPage = item.dataset.page;
    if (!nextPage) {
      return;
    }
    await setActivePage(nextPage);
  });
});

if (rolesTableBody) {
  rolesTableBody.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const action = target.dataset.roleAction;
    const roleId = Number(target.dataset.roleId);
    if (!action || !roleId) {
      return;
    }

    if (action === "edit") {
      if (!canModuleAction("roles", "update")) {
        return;
      }
      await editRole(roleId);
    } else if (action === "delete") {
      if (!canModuleAction("roles", "delete")) {
        return;
      }
      await deleteRole(roleId);
    }
  });
}

if (openCreateRoleModalBtn) {
  openCreateRoleModalBtn.addEventListener("click", () => {
    resetRoleForm();
    if (roleModal) {
      roleModal.show();
    }
  });
}

if (rolesSearchInput) {
  rolesSearchInput.addEventListener("input", () => {
    filterAndRenderRoles();
  });
}

if (roleCancelBtn) {
  roleCancelBtn.addEventListener("click", () => {
    resetRoleForm();
  });
}

if (roleForm) {
  roleForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const token = getStoredToken();
    if (!token) {
      return;
    }

    const payload = {
      nombre: (roleNameInput.value || "").trim(),
      descripcion: (roleDescriptionInput.value || "").trim(),
      activo: roleActiveInput.checked,
      permissions: collectRolePermissions(),
    };

    if (!payload.nombre) {
      showRolesFeedback("El nombre del rol es obligatorio", true);
      roleNameInput.focus();
      return;
    }

    roleSaveBtn.disabled = true;
    try {
      const editingId = Number(roleIdInput.value || 0);
      if (editingId && !canModuleAction("roles", "update")) {
        throw new Error("No tienes permiso para modificar roles");
      }
      if (!editingId && !canModuleAction("roles", "create")) {
        throw new Error("No tienes permiso para crear roles");
      }

      if (editingId) {
        await sendJsonAuth("PUT", `${API_BASE_URL}/admin/roles/${editingId}`, token, payload);
        showRolesFeedback("Rol actualizado");
      } else {
        await sendJsonAuth("POST", `${API_BASE_URL}/admin/roles`, token, payload);
        showRolesFeedback("Rol creado");
      }

      await loadRolesCrudData(true);
      loadedPages.delete("roles");
      loadedPages.add("roles");
      if (roleModal) {
        roleModal.hide();
      }
    } catch (error) {
      showRolesFeedback(error.message || "No se pudo guardar el rol", true);
    } finally {
      roleSaveBtn.disabled = false;
    }
  });
}

if (openCreateConsumableModalBtn) {
  openCreateConsumableModalBtn.addEventListener("click", () => {
    if (!canModuleAction("consumibles", "create")) {
      return;
    }
    resetConsumableForm();
    showConsumablesFeedback("");
    if (consumableModal) {
      consumableModal.show();
    }
  });
}

if (openImportConsumablesModalBtn) {
  openImportConsumablesModalBtn.addEventListener("click", () => {
    if (!canModuleAction("consumibles", "create")) {
      return;
    }
    if (importConsumablesForm) {
      importConsumablesForm.reset();
    }
    importPreviewRows = [];
    importDetectedColumns = [];
    renderImportPreview();
    if (importConsumablesModal) {
      importConsumablesModal.show();
    }
  });
}

if (importConsumablesFileInput) {
  importConsumablesFileInput.addEventListener("change", async () => {
    const file = importConsumablesFileInput.files?.[0];
    if (!file) {
      importPreviewRows = [];
      importDetectedColumns = [];
      renderImportPreview();
      return;
    }

    try {
      const text = await file.text();
      const delimiter = detectCsvDelimiter(text);
      const csvRows = parseCsvText(text, delimiter);
      const mapped = mapCsvToPreviewRows(csvRows);
      importDetectedColumns = mapped.detected;
      importPreviewRows = mapped.rows;
      renderImportPreview();

      if (importPreviewRows.length === 0) {
        showConsumablesFeedback("El CSV no contiene filas para importar", true);
      } else {
        showConsumablesFeedback("");
      }
    } catch (_error) {
      importPreviewRows = [];
      importDetectedColumns = [];
      renderImportPreview();
      showConsumablesFeedback("No se pudo leer el archivo CSV", true);
    }
  });
}

if (importConsumablesPreviewBody) {
  importConsumablesPreviewBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const idx = Number(target.dataset.importRemoveRow);
    if (!Number.isFinite(idx)) {
      return;
    }

    importPreviewRows = importPreviewRows.filter((_row, index) => index !== idx);
    renderImportPreview();
  });
}

if (consumablesSearchInput) {
  consumablesSearchInput.addEventListener("input", async () => {
    loadedPages.delete("consumibles");
    await loadConsumablesData(true);
  });
}

if (openCreateReactivoModalBtn) {
  openCreateReactivoModalBtn.addEventListener("click", () => {
    if (!canModuleAction("reactivos", "create")) {
      return;
    }
    resetReactivoForm();
    showReactivosFeedback("");
    if (reactivoModal) {
      reactivoModal.show();
    }
  });
}

if (reactivoTipoInput) {
  reactivoTipoInput.addEventListener("change", () => {
    renderReactivoDynamicFields();
  });
}

if (reactivosSearchInput) {
  reactivosSearchInput.addEventListener("input", async () => {
    loadedPages.delete("reactivos");
    await loadReactivosData(true);
  });
}

if (reactivosTableBody) {
  reactivosTableBody.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const action = target.dataset.reactivoAction;
    const rowId = Number(target.dataset.reactivoId);
    if (!action || !rowId) {
      return;
    }

    if (action === "edit") {
      if (!canModuleAction("reactivos", "update")) {
        return;
      }
      await editReactivo(rowId);
      return;
    }

    if (action === "delete") {
      if (!canModuleAction("reactivos", "delete")) {
        return;
      }
      await deleteReactivo(rowId);
    }
  });
}

if (reactivoForm) {
  reactivoForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = getStoredToken();
    if (!token) {
      return;
    }

    const payload = collectReactivoPayload();
    const productName = payload.producto || payload.item_name || payload.nombre_crm;
    if (!payload.tipo_reactivo || !productName) {
      showReactivosFeedback("Selecciona el tipo y captura el nombre principal del reactivo", true);
      return;
    }

    reactivoSaveBtn.disabled = true;
    try {
      const editingId = Number(reactivoIdInput.value || 0);
      if (editingId) {
        if (!canModuleAction("reactivos", "update")) {
          throw new Error("No tienes permiso para editar reactivos");
        }
        await sendJsonAuth("PUT", `${API_BASE_URL}/inventory/reactivos/${editingId}`, token, payload);
        showReactivosFeedback("Reactivo actualizado");
      } else {
        if (!canModuleAction("reactivos", "create")) {
          throw new Error("No tienes permiso para crear reactivos");
        }
        await sendJsonAuth("POST", `${API_BASE_URL}/inventory/reactivos`, token, payload);
        showReactivosFeedback("Reactivo creado");
      }
      loadedPages.delete("reactivos");
      await loadReactivosData(true);
      if (reactivoModal) {
        safelyHideModal(reactivoModal, openCreateReactivoModalBtn || mobileUserBtn || null);
      }
    } catch (error) {
      showReactivosFeedback(error.message || "No se pudo guardar el reactivo", true);
    } finally {
      reactivoSaveBtn.disabled = false;
    }
  });
}

if (usuariosSearchInput) {
  usuariosSearchInput.addEventListener("input", () => {
    renderUsuariosTable();
  });
}

if (usuariosRoleFilter) {
  usuariosRoleFilter.addEventListener("change", () => {
    renderUsuariosTable();
  });
}

if (openCreateUserBtn) {
  openCreateUserBtn.addEventListener("click", async () => {
    if (!canModuleAction("usuarios", "create")) {
      return;
    }
    await resetUserForm();
    showUsuariosFeedback("");
    if (userModal) userModal.show();
  });
}

if (usuariosTableBody) {
  usuariosTableBody.addEventListener("click", async (event) => {
    const target = event.target instanceof HTMLElement ? event.target.closest("[data-user-action]") : null;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.userAction;
    const userId = Number(target.dataset.userId);
    if (!action || !userId) return;
    if (action === "edit") {
      if (!canModuleAction("usuarios", "update")) return;
      await editUsuario(userId);
      return;
    }
    if (action === "delete") {
      if (!canModuleAction("usuarios", "delete")) return;
      await deleteUsuario(userId);
    }
  });
}

if (userForm) {
  userForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = getStoredToken();
    if (!token) return;
    const payload = buildUserPayload();
    if (!payload.nombre) {
      showUsuariosFeedback("El nombre es obligatorio", true);
      userNameInput.focus();
      return;
    }
    if (!payload.email) {
      showUsuariosFeedback("El email es obligatorio", true);
      userEmailInput.focus();
      return;
    }
    if (!payload.id_rol) {
      showUsuariosFeedback("Selecciona un rol", true);
      userRoleInput.focus();
      return;
    }

    userSaveBtn.disabled = true;
    try {
      const editingId = Number(userIdInput.value || 0);
      if (editingId) {
        if (!canModuleAction("usuarios", "update")) throw new Error("No tienes permiso para editar usuarios");
        await sendJsonAuth("PUT", `${API_BASE_URL}/admin/usuarios/${editingId}`, token, payload);
        showUsuariosFeedback("Usuario actualizado");
      } else {
        if (!canModuleAction("usuarios", "create")) throw new Error("No tienes permiso para crear usuarios");
        await sendJsonAuth("POST", `${API_BASE_URL}/admin/usuarios`, token, payload);
        showUsuariosFeedback("Usuario creado");
      }
      loadedPages.delete("usuarios");
      await loadUsuariosData(true);
      if (userModal) safelyHideModal(userModal, openCreateUserBtn || mobileUserBtn || null);
    } catch (error) {
      showUsuariosFeedback(error.message || "No se pudo guardar el usuario", true);
    } finally {
      userSaveBtn.disabled = false;
    }
  });
}

if (equiposSearchInput) {
  equiposSearchInput.addEventListener("input", async () => {
    loadedPages.delete("equipos");
    await loadEquiposData(true);
  });
}

if (equiposEstadoFilter) {
  equiposEstadoFilter.addEventListener("change", async () => {
    loadedPages.delete("equipos");
    await loadEquiposData(true);
  });
}

if (openCreateEquipoBtn) {
  openCreateEquipoBtn.addEventListener("click", async () => {
    if (!canModuleAction("equipos", "create")) return;
    await resetEquipoForm();
    showEquiposFeedback("");
    if (equipoModal) equipoModal.show();
  });
}

if (equiposTableBody) {
  equiposTableBody.addEventListener("click", async (event) => {
    const target = event.target instanceof HTMLElement ? event.target.closest("[data-equipo-action]") : null;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.equipoAction;
    const id = Number(target.dataset.equipoId);
    if (!action || !id) return;
    if (action === "edit") {
      if (!canModuleAction("equipos", "update")) return;
      await editEquipo(id);
      return;
    }
    if (action === "delete") {
      if (!canModuleAction("equipos", "delete")) return;
      await deleteEquipo(id);
    }
  });
}

if (equipoForm) {
  equipoForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = getStoredToken();
    if (!token) return;
    const payload = buildEquipoPayload();
    if (!payload.nombre) {
      showEquiposFeedback("El nombre del equipo es obligatorio", true);
      equipoNombreInput.focus();
      return;
    }
    equipoSaveBtn.disabled = true;
    try {
      const editingId = Number(equipoIdInput.value || 0);
      if (editingId) {
        if (!canModuleAction("equipos", "update")) throw new Error("No tienes permiso para editar equipos");
        await sendJsonAuth("PUT", `${API_BASE_URL}/inventory/equipos/${editingId}`, token, payload);
        showEquiposFeedback("Equipo actualizado");
      } else {
        if (!canModuleAction("equipos", "create")) throw new Error("No tienes permiso para crear equipos");
        await sendJsonAuth("POST", `${API_BASE_URL}/inventory/equipos`, token, payload);
        showEquiposFeedback("Equipo creado");
      }
      loadedPages.delete("equipos");
      equiposCache = [];
      await loadEquiposData(true);
      if (equipoModal) safelyHideModal(equipoModal, openCreateEquipoBtn || mobileUserBtn || null);
    } catch (error) {
      showEquiposFeedback(error.message || "No se pudo guardar el equipo", true);
    } finally {
      equipoSaveBtn.disabled = false;
    }
  });
}

if (mantenimientoSearchInput) {
  mantenimientoSearchInput.addEventListener("input", async () => {
    loadedPages.delete("mantenimiento");
    await loadMantenimientosData(true);
  });
}

if (mantenimientoTipoFilter) {
  mantenimientoTipoFilter.addEventListener("change", async () => {
    loadedPages.delete("mantenimiento");
    await loadMantenimientosData(true);
  });
}

if (mantenimientoEstadoFilter) {
  mantenimientoEstadoFilter.addEventListener("change", async () => {
    loadedPages.delete("mantenimiento");
    await loadMantenimientosData(true);
  });
}

if (openCreateMantenimientoBtn) {
  openCreateMantenimientoBtn.addEventListener("click", async () => {
    if (!canModuleAction("mantenimiento", "create")) return;
    await resetMantenimientoForm();
    showMantenimientoFeedback("");
    if (mantenimientoModal) mantenimientoModal.show();
  });
}

if (mantenimientosTableBody) {
  mantenimientosTableBody.addEventListener("click", async (event) => {
    const target = event.target instanceof HTMLElement ? event.target.closest("[data-maintenance-action]") : null;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.maintenanceAction;
    const id = Number(target.dataset.maintenanceId);
    if (!action || !id) return;
    if (action === "edit") {
      if (!canModuleAction("mantenimiento", "update")) return;
      await editMantenimiento(id);
      return;
    }
    if (action === "delete") {
      if (!canModuleAction("mantenimiento", "delete")) return;
      await deleteMantenimiento(id);
    }
  });
}

if (mantenimientoForm) {
  mantenimientoForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = getStoredToken();
    if (!token) return;
    const payload = buildMantenimientoPayload();
    if (!payload.id_equipo) {
      showMantenimientoFeedback("Selecciona un equipo", true);
      mantenimientoEquipoInput.focus();
      return;
    }
    if (!payload.fecha_programada) {
      showMantenimientoFeedback("La fecha programada es obligatoria", true);
      mantenimientoFechaProgramadaInput.focus();
      return;
    }
    mantenimientoSaveBtn.disabled = true;
    try {
      const editingId = Number(mantenimientoIdInput.value || 0);
      if (editingId) {
        if (!canModuleAction("mantenimiento", "update")) throw new Error("No tienes permiso para editar mantenimientos");
        await sendJsonAuth("PUT", `${API_BASE_URL}/inventory/mantenimientos/${editingId}`, token, payload);
        showMantenimientoFeedback("Mantenimiento actualizado");
      } else {
        if (!canModuleAction("mantenimiento", "create")) throw new Error("No tienes permiso para programar mantenimientos");
        await sendJsonAuth("POST", `${API_BASE_URL}/inventory/mantenimientos`, token, payload);
        showMantenimientoFeedback("Mantenimiento programado");
      }
      loadedPages.delete("mantenimiento");
      await loadMantenimientosData(true);
      if (mantenimientoModal) safelyHideModal(mantenimientoModal, openCreateMantenimientoBtn || mobileUserBtn || null);
    } catch (error) {
      showMantenimientoFeedback(error.message || "No se pudo guardar el mantenimiento", true);
    } finally {
      mantenimientoSaveBtn.disabled = false;
    }
  });
}

if (consumiblesTableBody) {
  consumiblesTableBody.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const action = target.dataset.consumableAction;
    const rowId = Number(target.dataset.consumableId);
    if (!action || !rowId) {
      return;
    }

    if (action === "edit") {
      if (!canModuleAction("consumibles", "update")) {
        return;
      }
      editConsumable(rowId);
      return;
    }

    if (action === "delete") {
      if (!canModuleAction("consumibles", "delete")) {
        return;
      }
      await deleteConsumable(rowId);
    }
  });
}

if (consumableForm) {
  consumableForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const token = getStoredToken();
    if (!token) {
      return;
    }

    const payload = buildConsumablePayload();
    if (!payload.producto) {
      showConsumablesFeedback("El producto es obligatorio", true);
      consumableProductoInput.focus();
      return;
    }

    consumableSaveBtn.disabled = true;
    try {
      const editingId = Number(consumableIdInput.value || 0);
      if (editingId) {
        if (!canModuleAction("consumibles", "update")) {
          throw new Error("No tienes permiso para editar consumibles");
        }
        await sendJsonAuth("PUT", `${API_BASE_URL}/consumables/${editingId}`, token, payload);
        showConsumablesFeedback("Consumible actualizado");
      } else {
        if (!canModuleAction("consumibles", "create")) {
          throw new Error("No tienes permiso para crear consumibles");
        }
        await sendJsonAuth("POST", `${API_BASE_URL}/consumables/`, token, payload);
        showConsumablesFeedback("Consumible creado");
      }

      loadedPages.delete("consumibles");
      await loadConsumablesData(true);
      if (consumableModal) {
        safelyHideModal(consumableModal, openCreateConsumableModalBtn || mobileUserBtn || null);
      }
    } catch (error) {
      showConsumablesFeedback(error.message || "No se pudo guardar", true);
    } finally {
      consumableSaveBtn.disabled = false;
    }
  });
}

if (importConsumablesForm) {
  importConsumablesForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const token = getStoredToken();
    if (!token) {
      return;
    }

    if (!importPreviewRows.length) {
      showConsumablesFeedback("Primero carga un CSV y valida filas", true);
      return;
    }

    const rowsToImport = importPreviewRows
      .filter((row) => row._valid)
      .map((row) => ({
        producto: row.producto,
        marca: row.marca,
        proveedor: row.proveedor,
        catalogo_parte_cas: row.catalogo_parte_cas,
        fecha_ingreso: row.fecha_ingreso,
        tamano_capacidad: row.tamano_capacidad,
        contenedor: row.contenedor,
        piezas: row.piezas,
        cantidad_por_pieza: row.cantidad_por_pieza,
      }));

    if (!rowsToImport.length) {
      showConsumablesFeedback("No hay filas válidas para importar", true);
      return;
    }

    importConsumablesBtn.disabled = true;
    try {
      const result = await sendJsonAuth("POST", `${API_BASE_URL}/consumables/import`, token, { rows: rowsToImport });
      const inserted = Number(result.insertados || 0);
      showConsumablesFeedback(`Importación completada. Registros insertados: ${inserted}`);

      loadedPages.delete("consumibles");
      await loadConsumablesData(true);
      importPreviewRows = [];
      importDetectedColumns = [];
      renderImportPreview();
      if (importConsumablesModal) {
        safelyHideModal(importConsumablesModal, openImportConsumablesModalBtn || mobileUserBtn || null);
      }
    } catch (error) {
      showConsumablesFeedback(error.message || "No se pudo importar el CSV", true);
    } finally {
      importConsumablesBtn.disabled = false;
    }
  });
}

if (openCreateSampleModalBtn) {
  openCreateSampleModalBtn.addEventListener("click", async () => {
    if (!canModuleAction("muestras", "create")) {
      return;
    }
    await resetSampleForm(true);
    showSamplesFeedback("");
    if (sampleModal) {
      sampleModal.show();
    }
  });
}

if (samplesSearchInput) {
  samplesSearchInput.addEventListener("input", async () => {
    loadedPages.delete("muestras");
    await loadSamplesData(true);
  });
}

samplesSectionButtons.forEach((btn) => {
  btn.addEventListener("click", async () => {
    const section = btn.dataset.samplesSectionBtn;
    if (!section) {
      return;
    }
    await setSamplesSection(section, true);
  });
});

if (addSampleLoteRowBtn) {
  addSampleLoteRowBtn.addEventListener("click", () => {
    if (sampleLoteTableBody) {
      sampleLoteTableBody.appendChild(buildSampleLoteRow());
      if (sampleLoteCountInput) {
        sampleLoteCountInput.value = String(sampleLoteTableBody.querySelectorAll("tr").length || 1);
      }
    }
  });
}

if (sampleLoteCountInput) {
  sampleLoteCountInput.addEventListener("input", () => {
    if (sampleMuestraUnicaInput?.checked) {
      return;
    }
    syncSampleLoteRowsCount(sampleLoteCountInput.value);
  });
}

if (sampleMuestraUnicaInput) {
  sampleMuestraUnicaInput.addEventListener("change", () => {
    toggleSampleModeUI();
  });
}

document.querySelectorAll(".sample-analisis-metodo, .sample-analisis-muestra").forEach((input) => {
  input.addEventListener("change", toggleSampleAnalysisOtherFields);
});

if (sampleLoteTableBody) {
  sampleLoteTableBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (!target.classList.contains("sample-remove-lote-row")) {
      return;
    }
    const row = target.closest("tr");
    if (row) {
      row.remove();
    }
    if (!sampleLoteTableBody.querySelector("tr")) {
      sampleLoteTableBody.appendChild(buildSampleLoteRow());
    }
    if (sampleLoteCountInput) {
      sampleLoteCountInput.value = String(sampleLoteTableBody.querySelectorAll("tr").length || 1);
    }
  });
}

if (muestrasTableBody) {
  muestrasTableBody.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const action = target.dataset.sampleAction;
    const sampleId = Number(target.dataset.sampleId);
    if (!action || !sampleId) {
      return;
    }

    if (action === "edit") {
      if (!canModuleAction("muestras", "update")) {
        return;
      }
      await editSample(sampleId);
      return;
    }

    if (action === "process") {
      if (!canModuleAction("muestras", "create")) {
        return;
      }
      const source = samplesCache.find((item) => Number(item.id) === sampleId);
      await resetProcessingForm(true);
      if (source && processingReceptionSelect) {
        processingReceptionSelect.value = String(source.id);
        await handleProcessingReceptionSelection();
      }
      if (processingModal) {
        processingModal.show();
      }
      return;
    }

    if (action === "delete") {
      if (!canModuleAction("muestras", "delete")) {
        return;
      }
      await deleteSample(sampleId);
    }
  });
}

if (openCreateProcessingModalBtn) {
  openCreateProcessingModalBtn.addEventListener("click", async () => {
    if (!canModuleAction("muestras", "create")) {
      return;
    }
    await resetProcessingForm(true);
    showProcessingFeedback("");
    if (processingModal) {
      processingModal.show();
    }
  });
}

if (openCreateExtractionModalBtn) {
  openCreateExtractionModalBtn.addEventListener("click", async () => {
    if (!canModuleAction("muestras", "create")) {
      return;
    }
    await resetExtractionForm(true);
    showExtractionFeedback("");
    if (extractionModal) {
      extractionModal.show();
    }
  });
}

if (processingSearchInput) {
  processingSearchInput.addEventListener("input", async () => {
    loadedPages.delete("muestras-processing");
    await loadProcessingData(true);
  });
}

if (extractionSearchInput) {
  extractionSearchInput.addEventListener("input", async () => {
    loadedPages.delete("muestras-extraction");
    await loadExtractionData(true);
  });
}

if (processingTableBody) {
  processingTableBody.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const action = target.dataset.processingAction;
    const processingId = Number(target.dataset.processingId);
    if (!action || !processingId) {
      return;
    }
    if (action === "edit") {
      if (!canModuleAction("muestras", "update")) {
        return;
      }
      await editProcessing(processingId);
      return;
    }
    if (action === "extract") {
      if (!canModuleAction("muestras", "create")) {
        return;
      }
      const source = processingCache.find((item) => Number(item.id) === processingId);
      await resetExtractionForm(true, source || null);
      if (extractionModal) {
        extractionModal.show();
      }
      return;
    }
    if (action === "delete") {
      if (!canModuleAction("muestras", "delete")) {
        return;
      }
      await deleteProcessing(processingId);
    }
  });
}

if (extractionTableBody) {
  extractionTableBody.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const action = target.dataset.extractionAction;
    const extractionId = Number(target.dataset.extractionId);
    if (!action || !extractionId) {
      return;
    }
    if (action === "edit") {
      if (!canModuleAction("muestras", "update")) {
        return;
      }
      await editExtraction(extractionId);
      return;
    }
    if (action === "delete") {
      if (!canModuleAction("muestras", "delete")) {
        return;
      }
      await deleteExtraction(extractionId);
    }
  });
}

if (processingReceptionSelect) {
  processingReceptionSelect.addEventListener("change", async () => {
    await handleProcessingReceptionSelection();
  });
}

if (processingLoteSelectionBody) {
  processingLoteSelectionBody.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (!target.classList.contains("processing-lote-selected")) {
      return;
    }
    syncProcessingIdInternoFromLoteSelection();
  });
}

if (extractionProcessingSelect) {
  extractionProcessingSelect.addEventListener("change", async () => {
    await handleExtractionProcessingSelection();
  });
}

document.querySelectorAll(".processing-organismo").forEach((el) => {
  el.addEventListener("change", () => {
    setProcessingOrganismSections();
  });
});

[procBiv7, procBiv8, procSar3, procSar4].forEach((checkbox) => {
  if (!checkbox) {
    return;
  }
  checkbox.addEventListener("change", () => {
    setProcessingStepExtraVisibility();
  });
});

if (processingForm) {
  processingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = getStoredToken();
    if (!token) {
      return;
    }
    const payload = buildProcessingPayload();
    if (!payload.folio_num) {
      showProcessingFeedback("El folio de procesamiento es obligatorio", true);
      processingFolioInput.focus();
      return;
    }

    if (payload.muestra_tipo === "unica" && !payload.id_interno) {
      showProcessingFeedback("La recepcion seleccionada es muestra unica, falta ID interno", true);
      processingIdInternoInput.focus();
      return;
    }

    if (payload.muestra_tipo === "lote" && !(payload.lote_seleccion || []).length) {
      showProcessingFeedback("Selecciona al menos una muestra del lote para trabajar y enviar a extraccion", true);
      return;
    }

    if (!payload.tipo_organismo.length) {
      showProcessingFeedback("Selecciona el tipo de organismo para abrir el bloque de procesamiento", true);
      return;
    }

    processingSaveBtn.disabled = true;
    try {
      const editingId = Number(processingIdInput.value || 0);
      if (editingId) {
        if (!canModuleAction("muestras", "update")) {
          throw new Error("No tienes permiso para editar procesamiento");
        }
        await sendJsonAuth("PUT", `${API_BASE_URL}/samples/processing/${editingId}`, token, payload);
        showProcessingFeedback("Procesamiento actualizado");
      } else {
        if (!canModuleAction("muestras", "create")) {
          throw new Error("No tienes permiso para crear procesamiento");
        }
        await sendJsonAuth("POST", `${API_BASE_URL}/samples/processing/`, token, payload);
        showProcessingFeedback("Procesamiento creado");
      }

      loadedPages.delete("muestras-processing");
      await loadProcessingData(true);
      if (processingModal) {
        safelyHideModal(processingModal, openCreateProcessingModalBtn || mobileUserBtn || null);
      }
    } catch (error) {
      showProcessingFeedback(error.message || "No se pudo guardar el procesamiento", true);
    } finally {
      processingSaveBtn.disabled = false;
    }
  });
}

if (extractionForm) {
  extractionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = getStoredToken();
    if (!token) {
      return;
    }

    const payload = buildExtractionPayload();
    if (!payload.folio_num) {
      showExtractionFeedback("El folio de extraccion es obligatorio", true);
      extractionFolioInput.focus();
      return;
    }
    if (payload.procesamiento_id && !payload.id_interno) {
      showExtractionFeedback("El procesamiento seleccionado no tiene muestras para extraccion", true);
      extractionProcessingSelect.focus();
      return;
    }

    extractionSaveBtn.disabled = true;
    try {
      const editingId = Number(extractionIdInput.value || 0);
      if (editingId) {
        if (!canModuleAction("muestras", "update")) {
          throw new Error("No tienes permiso para editar extraccion");
        }
        await sendJsonAuth("PUT", `${API_BASE_URL}/samples/extraction/${editingId}`, token, payload);
        showExtractionFeedback("Extraccion actualizada");
      } else {
        if (!canModuleAction("muestras", "create")) {
          throw new Error("No tienes permiso para crear extraccion");
        }
        await sendJsonAuth("POST", `${API_BASE_URL}/samples/extraction/`, token, payload);
        showExtractionFeedback("Extraccion creada");
      }

      loadedPages.delete("muestras-extraction");
      await loadExtractionData(true);
      if (extractionModal) {
        safelyHideModal(extractionModal, openCreateExtractionModalBtn || mobileUserBtn || null);
      }
    } catch (error) {
      showExtractionFeedback(error.message || "No se pudo guardar la extraccion", true);
    } finally {
      extractionSaveBtn.disabled = false;
    }
  });
}

if (sampleForm) {
  sampleForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = getStoredToken();
    if (!token) {
      return;
    }

    const payload = buildSamplePayload();
    if (!payload.folio_num) {
      showSamplesFeedback("El folio es obligatorio", true);
      sampleFolioInput.focus();
      return;
    }

    if (payload.muestra_unica && !payload.id_interno) {
      showSamplesFeedback("En muestra unica, el ID interno es obligatorio", true);
      sampleIdInternoInput.focus();
      return;
    }

    if (!payload.muestra_unica && payload.lote_muestras.length === 0) {
      showSamplesFeedback("En lote, selecciona al menos un ID interno a trabajar", true);
      return;
    }

    sampleSaveBtn.disabled = true;
    try {
      const editingId = Number(sampleIdInput.value || 0);
      if (editingId) {
        if (!canModuleAction("muestras", "update")) {
          throw new Error("No tienes permiso para editar muestras");
        }
        await sendJsonAuth("PUT", `${API_BASE_URL}/samples/reception/${editingId}`, token, payload);
        showSamplesFeedback("Recepcion actualizada");
      } else {
        if (!canModuleAction("muestras", "create")) {
          throw new Error("No tienes permiso para crear muestras");
        }
        await sendJsonAuth("POST", `${API_BASE_URL}/samples/reception/`, token, payload);
        showSamplesFeedback("Recepcion creada");
      }

      loadedPages.delete("muestras");
      await loadSamplesData(true);
      if (sampleModal) {
        safelyHideModal(sampleModal, openCreateSampleModalBtn || mobileUserBtn || null);
      }
    } catch (error) {
      showSamplesFeedback(error.message || "No se pudo guardar la recepcion", true);
    } finally {
      sampleSaveBtn.disabled = false;
    }
  });
}

emailLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim().toLowerCase();
  const isValid = emailInput.checkValidity();
  emailInput.classList.toggle("is-invalid", !isValid);

  if (!isValid) {
    emailInput.focus();
    return;
  }

  const submitBtn = emailLoginForm.querySelector("button[type='submit']");
  submitBtn.disabled = true;

  try {
    const data = await postJson(`${API_BASE_URL}/auth/login`, { email });
    setSession(data.token, data.user);
    setPermissions(data.permissions || {});
    applyNavigationPermissions();
    showDashboard(data.user || {});
    loadedPages.clear();
    const firstPage = getFirstAllowedPage();
    activePage = firstPage || "dashboard";
    await setActivePage(activePage);
  } catch (error) {
    alert(error.message || "No fue posible iniciar sesion");
  } finally {
    submitBtn.disabled = false;
  }
});

logoutBtn.addEventListener("click", () => {
  clearSession();
  showLogin();
});

// ── Sidebar móvil ─────────────────────────────────────────────
const sidebarPanel = document.querySelector(".sidebar-panel");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");

const closeSidebar = () => {
  if (sidebarPanel) sidebarPanel.classList.remove("sidebar-open");
  if (sidebarOverlay) sidebarOverlay.classList.remove("active");
};

const openSidebar = () => {
  if (sidebarPanel) sidebarPanel.classList.add("sidebar-open");
  if (sidebarOverlay) sidebarOverlay.classList.add("active");
};

if (sidebarToggleBtn) {
  sidebarToggleBtn.addEventListener("click", () => {
    if (sidebarPanel && sidebarPanel.classList.contains("sidebar-open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });
}

if (sidebarOverlay) {
  sidebarOverlay.addEventListener("click", closeSidebar);
}

// ── Tarjetas de módulos en dashboard (móvil) ──────────────────
const MODULE_CARDS_CONFIG = [
  { page: "reactivos",    label: "Reactivos",                desc: "Gestiona el cat\u00e1logo de reactivos del laboratorio",    icon: "bi-flask",                       color: "" },
  { page: "consumibles",  label: "Consumibles",              desc: "Control de materiales consumibles",                        icon: "bi-box-seam",                    color: "amber" },
  { page: "equipos",      label: "Equipos",                  desc: "Registro y calibraci\u00f3n de equipos",                   icon: "bi-magic",                       color: "violet" },
  { page: "muestras",     label: "Muestras",                 desc: "Recepci\u00f3n y seguimiento de muestras",                 icon: "bi-eyedropper",                  color: "green" },
  { page: "movimientos",  label: "Movimientos",              desc: "Historial de entradas y salidas de inventario",            icon: "bi-journal-text",                color: "sky" },
  { page: "mantenimiento",label: "Mantenimiento",            desc: "Programaci\u00f3n y registro de mantenimientos",           icon: "bi-wrench-adjustable-circle",    color: "rose" },
  { page: "documentos",   label: "Documentos SGC",           desc: "Gesti\u00f3n documental del sistema de calidad",           icon: "bi-file-earmark-text",           color: "slate" },
];

const renderModuleCards = () => {
  const grid = document.getElementById("modulesShortcutGrid");
  if (!grid) return;

  const visibleModules = MODULE_CARDS_CONFIG.filter((m) => canAccessPage(m.page, "read"));

  if (visibleModules.length === 0) {
    grid.innerHTML = "";
    return;
  }

  grid.innerHTML = visibleModules
    .map(
      (m) => `
      <a href="#" class="module-shortcut-card ${m.color}" data-shortcut-page="${m.page}">
        <div class="module-shortcut-body">
          <h5>${m.label}</h5>
          <p>${m.desc}</p>
          <span class="module-shortcut-link">Ver m\u00e1s \u2192</span>
        </div>
        <div class="module-shortcut-icon ${m.color}">
          <i class="bi ${m.icon}"></i>
        </div>
      </a>`
    )
    .join("");

  grid.querySelectorAll("[data-shortcut-page]").forEach((card) => {
    card.addEventListener("click", async (e) => {
      e.preventDefault();
      await setActivePage(card.dataset.shortcutPage);
    });
  });
};

init();
