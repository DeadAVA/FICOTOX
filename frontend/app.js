const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const emailLoginForm = document.getElementById("emailLoginForm");
const emailInput = document.getElementById("emailInput");
const microsoftLoginBtn = document.getElementById("microsoftLoginBtn");
const loginFeedback = document.getElementById("loginFeedback");
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
const openImportReactivosModalBtn = document.getElementById("openImportReactivosModalBtn");
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
const importReactivosModalEl = document.getElementById("importReactivosModal");
const importReactivosModal = importReactivosModalEl && window.bootstrap ? new window.bootstrap.Modal(importReactivosModalEl) : null;
const importReactivosForm = document.getElementById("importReactivosForm");
const importReactivosFileInput = document.getElementById("importReactivosFileInput");
const importReactivosBtn = document.getElementById("importReactivosBtn");
const importReactivosSummary = document.getElementById("importReactivosSummary");
const importReactivosSheetsBody = document.getElementById("importReactivosSheetsBody");
const importReactivosErrorsBody = document.getElementById("importReactivosErrorsBody");
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
const movimientosReactivosTableBody = document.getElementById("movimientosReactivosTableBody");
const movimientosConsumiblesTableBody = document.getElementById("movimientosConsumiblesTableBody");
const movimientosTotalCount = document.getElementById("movimientosTotalCount");
const movimientosTodayCount = document.getElementById("movimientosTodayCount");
const movimientosWeekCount = document.getElementById("movimientosWeekCount");
const movimientosMonthCount = document.getElementById("movimientosMonthCount");
const movimientosReactivosCount = document.getElementById("movimientosReactivosCount");
const movimientosConsumiblesCount = document.getElementById("movimientosConsumiblesCount");
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
const rolePermissionsSelectAll = document.getElementById("rolePermissionsSelectAll");
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
const stockRefillModalEl = document.getElementById("stockRefillModal");
const stockRefillModal = stockRefillModalEl && window.bootstrap ? new window.bootstrap.Modal(stockRefillModalEl) : null;
const stockRefillForm = document.getElementById("stockRefillForm");
const stockRefillTitle = document.getElementById("stockRefillTitle");
const stockRefillItemLabel = document.getElementById("stockRefillItemLabel");
const stockRefillTypeInput = document.getElementById("stockRefillTypeInput");
const stockRefillIdInput = document.getElementById("stockRefillIdInput");
const stockRefillAmountInput = document.getElementById("stockRefillAmountInput");
const stockRefillReasonInput = document.getElementById("stockRefillReasonInput");
const stockRefillSaveBtn = document.getElementById("stockRefillSaveBtn");

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
const samplesFlowCards = document.querySelectorAll("[data-samples-flow-card]");
const sampleReceptionCount = document.getElementById("sampleReceptionCount");
const sampleProcessingCount = document.getElementById("sampleProcessingCount");
const sampleExtractionCount = document.getElementById("sampleExtractionCount");
const sampleTotalCount = document.getElementById("sampleTotalCount");
const sampleReceptionCountLabel = document.getElementById("sampleReceptionCountLabel");
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
const sampleRecibidoPorVisualInput = document.getElementById("sampleRecibidoPorVisualInput");
const sampleReceptionMethodVisualInput = document.getElementById("sampleReceptionMethodVisualInput");
const sampleSolicitanteInput = document.getElementById("sampleSolicitanteInput");
const sampleMuestraUnicaInput = document.getElementById("sampleMuestraUnicaInput");
const sampleLoteModeVisualInput = document.getElementById("sampleLoteModeVisualInput");
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
const sampleCustodioFirmaInput = document.getElementById("sampleCustodioFirmaInput");
const sampleCustodioLugarInput = document.getElementById("sampleCustodioLugarInput");
const sampleCustodioOtroInput = document.getElementById("sampleCustodioOtroInput");
const sampleSaveBtn = document.getElementById("sampleSaveBtn");
const sampleClearBtn = document.getElementById("sampleClearBtn");
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
const processingSingleSampleVisualInput = document.getElementById("processingSingleSampleVisualInput");
const processingLotSampleVisualInput = document.getElementById("processingLotSampleVisualInput");
const processingLotIdVisualInput = document.getElementById("processingLotIdVisualInput");
const processingOtroInput = document.getElementById("processingOtroInput");
const processingObservacionesInput = document.getElementById("processingObservacionesInput");
const processingQuienProcesoInput = document.getElementById("processingQuienProcesoInput");
const processingQuienSupervisoInput = document.getElementById("processingQuienSupervisoInput");
const processingFirmaProcesoInput = document.getElementById("processingFirmaProcesoInput");
const processingFirmaSupervisoInput = document.getElementById("processingFirmaSupervisoInput");
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
const extractionSingleSampleVisualInput = document.getElementById("extractionSingleSampleVisualInput");
const extractionLotSampleVisualInput = document.getElementById("extractionLotSampleVisualInput");
const extractionLotIdVisualInput = document.getElementById("extractionLotIdVisualInput");
const extractionProcessingSummary = document.getElementById("extractionProcessingSummary");
const extractionSampleTableBody = document.getElementById("extractionSampleTableBody");
const extractionObservacionesInput = document.getElementById("extractionObservacionesInput");
const extractionObservacionesProcesoInput = document.getElementById("extractionObservacionesProcesoInput");
const extractionQuienExtrajoInput = document.getElementById("extractionQuienExtrajoInput");
const extractionQuienLimpiezaInput = document.getElementById("extractionQuienLimpiezaInput");
const extractionQuienSupervisoInput = document.getElementById("extractionQuienSupervisoInput");
const extractionFirmaExtrajoInput = document.getElementById("extractionFirmaExtrajoInput");
const extractionFirmaLimpiezaInput = document.getElementById("extractionFirmaLimpiezaInput");
const extractionFirmaSupervisoInput = document.getElementById("extractionFirmaSupervisoInput");
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

const API_BASE_URL = "/api";
const SESSION_TOKEN_KEY = "ficotox_access_token";
const SESSION_USER_KEY = "ficotox_user";
const SESSION_PERMISSIONS_KEY = "ficotox_permissions";
let authConfig = null;
let msalClient = null;
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
let importReactivosSheets = [];

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
    label: "\u00c1cidos",
    hint: "Registro principal de \u00e1cidos: identificaci\u00f3n, proveedor, caducidad, contenedor y existencia en litros.",
    fields: ["id_interno", "producto", "marca", "proveedor", "catalogo_parte_cas_lote", "caducidad", "fecha_apertura", "fecha_ingreso", "contenedor", "capacidad_litros", "piezas", "total_litros_2025"],
  },
  {
    value: "alcoholes_solventes",
    label: "Alcoholes y solventes org\u00e1nicos",
    hint: "Incluye localizaci\u00f3n f\u00edsica, caducidad y remanente para solventes de uso frecuente.",
    fields: ["id_interno", "producto", "marca", "proveedor", "catalogo_parte_cas_lote", "localizacion", "caducidad", "fecha_apertura", "fecha_ingreso", "contenedor", "capacidad_litros", "piezas", "total_litros_2025", "restante_190126"],
  },
  {
    value: "compuestos_amonio",
    label: "Compuestos de Amonio",
    hint: "Control de sales y compuestos de amonio con contenedor, piezas y capacidad.",
    fields: ["id_interno", "producto", "marca", "proveedor", "catalogo_parte_cas_lote", "caducidad", "fecha_apertura", "fecha_ingreso", "contenedor", "capacidad_litros", "piezas", "total_litros_2025"],
  },
  {
    value: "compuestos_sodio",
    label: "Compuestos de Sodio",
    hint: "Registro de compuestos s\u00f3lidos con capacidad en kilos.",
    fields: ["id_interno", "producto", "marca", "proveedor", "catalogo_parte_cas_lote", "caducidad", "fecha_apertura", "fecha_ingreso", "contenedor", "capacidad_kilos", "piezas", "total_litros_2025"],
  },
  {
    value: "estandares_preparados",
    label: "Est\u00e1ndares preparados",
    hint: "Formato corto para preparaciones internas y notas de preparaci\u00f3n.",
    fields: ["item_name", "localizacion", "sub_localizacion", "fecha_preparacion", "informacion_extra"],
  },
  {
    value: "materiales_referencia",
    label: "Materiales de Referencia",
    hint: "Control de CRM por lote, proveedor, m\u00e9todo, estado, volumen y URL.",
    fields: ["id_interno", "nombre_crm", "lot_number", "proveedor", "localizacion", "url", "metodo", "caducidad", "fecha_apertura", "estado_reactivo", "volumen"],
  },
  {
    value: "miscelaneos",
    label: "Miscel\u00e1neos",
    hint: "Registro flexible para sustancias, presentaciones y materiales no clasificados.",
    fields: ["item_name", "vendor", "catalogo", "localizacion", "sub_localizacion", "amount_in_stock", "expiration_date", "lot_number", "cas_number", "bottle_tag_color", "date_opened", "fecha_ingreso", "formula", "id_interno", "physical_state", "presentacion", "tipo_sustancia", "observaciones"],
  },
  {
    value: "columnas_cromatograficas",
    label: "Columnas cromatogr\u00e1ficas",
    hint: "Registro t\u00e9cnico de columnas por lote, parte, serie, m\u00e9todo y condici\u00f3n de uso.",
    fields: ["id_interno", "producto", "marca", "proveedor", "localizacion", "lote", "parte", "serie", "descripcion", "fecha_ingreso", "fecha_apertura", "nuevo_usado", "metodo", "observaciones"],
  },
];

const REACTIVO_FIELD_META = {
  producto: { label: "Producto", required: true },
  marca: { label: "Marca" },
  proveedor: { label: "Proveedor", required: true },
  catalogo_parte_cas_lote: { label: "#cat\u00e1logo / #parte / CAS / lote" },
  localizacion: { label: "Localizaci\u00f3n" },
  sub_localizacion: { label: "Sub-location" },
  caducidad: { label: "Caducidad", type: "date", required: true },
  fecha_apertura: { label: "Fecha de apertura", type: "date" },
  fecha_ingreso: { label: "Fecha de ingreso", type: "date" },
  contenedor: { label: "Contenedor" },
  capacidad_litros: { label: "Capacidad (litros)", type: "number", step: "0.0001", min: "0", required: true },
  capacidad_kilos: { label: "Capacidad (kilos)", type: "number", step: "0.0001", min: "0", required: true },
  piezas: { label: "Piezas", type: "number", step: "1", min: "0", required: true },
  total_litros_2025: { label: "Total en litros 2025", type: "number", step: "0.0001", min: "0" },
  restante_190126: { label: "Restante al 19/01/26", type: "number", step: "0.0001", min: "0" },
  lote: { label: "# Lote" },
  parte: { label: "# Parte" },
  serie: { label: "# Serie" },
  descripcion: { label: "Descripci\u00f3n", textarea: true, wide: true },
  nuevo_usado: { label: "Nuevo o usado", options: ["Nuevo", "Usado"] },
  metodo: { label: "M\u00e9todo" },
  observaciones: { label: "Observaciones", textarea: true, wide: true },
  item_name: { label: "Item Name", required: true },
  fecha_preparacion: { label: "Fecha de preparaci\u00f3n", type: "date" },
  informacion_extra: { label: "Informaci\u00f3n extra", textarea: true, wide: true },
  nombre_crm: { label: "Nombre del CRM", required: true },
  lot_number: { label: "Lot Number" },
  url: { label: "URL", type: "url", wide: true },
  estado_reactivo: { label: "Estado", options: ["Nuevo", "Abierto"] },
  volumen: { label: "Volumen", type: "number", step: "0.0001", min: "0", required: true },
  vendor: { label: "Vendor" },
  catalogo: { label: "Catalog #" },
  amount_in_stock: { label: "Amount in Stock", type: "number", step: "0.0001", min: "0", required: true },
  expiration_date: { label: "Expiration Date", type: "date" },
  cas_number: { label: "CAS Number" },
  bottle_tag_color: { label: "Bottle Tag Color" },
  date_opened: { label: "Date Opened", type: "date" },
  formula: { label: "Formula" },
  id_interno: { label: "ID", required: true },
  physical_state: { label: "Physical State", options: ["S\u00f3lido", "L\u00edquido", "Gas", "Mixto"] },
  presentacion: { label: "Presentaci\u00f3n" },
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

const parseNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const clampPercent = (value) => Math.max(0, Math.min(100, Math.round(value)));

const buildStockProgress = (currentValue, maxValue, label = "") => {
  const current = parseNumberOrNull(currentValue) ?? 0;
  const max = parseNumberOrNull(maxValue);
  const percent = max && max > 0 ? clampPercent((current / max) * 100) : current > 0 ? 100 : 0;
  const stateClass = percent <= 0 ? "empty" : percent <= 25 ? "low" : percent <= 60 ? "medium" : "good";
  return `
    <div class="stock-meter ${stateClass}" title="${escapeHtml(label || `${percent}% en stock`)}">
      <div class="stock-meter-top">
        <span>${escapeHtml(label || "Stock")}</span>
        <strong>${percent}%</strong>
      </div>
      <div class="stock-meter-track"><span style="width:${percent}%"></span></div>
    </div>
  `;
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
  activeUserEmail.textContent = user.email || "usuario@cicese.mx";
  welcomeUserName.textContent = `Bienvenido, ${user.nombre || "Usuario"}`;
  welcomeUserRole.textContent = user.rol || "Sin rol";
  loginView.classList.remove("active-view");
  dashboardView.classList.add("active-view");
};

const showLogin = () => {
  dashboardView.classList.remove("active-view");
  loginView.classList.add("active-view");
  emailLoginForm.reset();
  emailInput.classList.remove("is-invalid");
  if (loginFeedback) loginFeedback.textContent = "";
  updateLoginOptions();
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

  if (openImportReactivosModalBtn) {
    openImportReactivosModalBtn.classList.toggle("d-none", !canModuleAction("reactivos", "create"));
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

const showLoginFeedback = (message, isError = false) => {
  if (!loginFeedback) return;
  loginFeedback.textContent = message || "";
  loginFeedback.classList.toggle("text-danger", !!isError);
  loginFeedback.classList.toggle("text-secondary", !isError);
};

const loadAuthConfig = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/config`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "No se pudo leer la configuraci\u00f3n de acceso");
    }
    authConfig = data;
  } catch (_error) {
    authConfig = { microsoft: { enabled: false }, manualLoginEnabled: true };
  }
  updateLoginOptions();
  return authConfig;
};

const updateLoginOptions = () => {
  const manualEnabled = authConfig.manualLoginEnabled !== false;
  if (microsoftLoginBtn) {
    microsoftLoginBtn.classList.add("d-none");
    microsoftLoginBtn.disabled = true;
  }
  if (emailLoginForm) {
    emailLoginForm.classList.toggle("d-none", !manualEnabled);
  }
  if (loginFeedback) {
    loginFeedback.textContent = "";
  }
};

const getMsalClient = () => {
  if (msalClient) return msalClient;
  const config = authConfig.microsoft || {};
  if (!config.enabled || !window.msal) {
    throw new Error("Microsoft Entra ID no est\u00e1 configurado");
  }
  msalClient = new window.msal.PublicClientApplication({
    auth: {
      clientId: config.clientId,
      authority: config.authority,
      redirectUri: window.location.origin + "/",
    },
    cache: {
      cacheLocation: "sessionStorage",
      storeAuthStateInCookie: false,
    },
  });
  return msalClient;
};

const loginWithMicrosoft = async () => {
  if (!authConfig) {
    await loadAuthConfig();
  }
  const client = getMsalClient();
  const request = { scopes: ["openid", "profile", "email"] };
  let authResult;
  try {
    authResult = await client.loginPopup(request);
  } catch (error) {
    if (String(error.errorCode || "").includes("popup")) {
      await client.loginRedirect(request);
      return null;
    }
    throw error;
  }

  if (!authResult.idToken) {
    throw new Error("Microsoft no devolvi\u00f3 un token de identidad");
  }

  return postJson(`${API_BASE_URL}/auth/microsoft`, { id_token: authResult.idToken });
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

const setButtonSubmittingState = (button, isSubmitting, busyLabel) => {
  if (!button) {
    return;
  }

  if (!button.dataset.idleHtml) {
    button.dataset.idleHtml = button.innerHTML;
  }

  button.disabled = !!isSubmitting;
  button.innerHTML = isSubmitting
    ? `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>${busyLabel}`
    : button.dataset.idleHtml;
};

const getRoleNameById = (roleId) => {
  const role = rolesCache.find((item) => Number(item.id) === Number(roleId));
  return role.nombre || "Sin rol";
};

const adjustRoleUserCount = (roleId, delta) => {
  if (!Number.isFinite(Number(roleId)) || !Number.isFinite(Number(delta)) || Number(delta) === 0) {
    return;
  }

  const idx = rolesCache.findIndex((item) => Number(item.id) === Number(roleId));
  if (idx < 0) {
    return;
  }

  const role = rolesCache[idx];
  const nextTotal = Math.max(0, Number(role.total_usuarios || 0) + Number(delta));
  rolesCache[idx] = { ...role, total_usuarios: nextTotal };
  updateRoleStats(rolesCache);
  filterAndRenderRoles();
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

const permissionFlags = ["can_read", "can_create", "can_update", "can_delete"];

const getRolePermissionRows = () => {
  if (!rolePermissionsBody) {
    return [];
  }
  return Array.from(rolePermissionsBody.querySelectorAll("tr[data-permission-row]"));
};

const getRowPermissionCheckboxes = (row) => {
  return permissionFlags
    .map((flag) => row.querySelector(`input[data-flag="${flag}"]`))
    .filter((input) => input instanceof HTMLInputElement);
};

const setRowPermissionsChecked = (row, checked) => {
  getRowPermissionCheckboxes(row).forEach((input) => {
    input.checked = checked;
  });
};

const updateRowSelectAllControl = (row) => {
  const rowSelectAllInput = row.querySelector(".role-row-select-all");
  if (!(rowSelectAllInput instanceof HTMLInputElement)) {
    return;
  }
  const rowPermissionInputs = getRowPermissionCheckboxes(row);
  rowSelectAllInput.checked = rowPermissionInputs.length > 0 && rowPermissionInputs.every((input) => input.checked);
};

const updateGlobalPermissionsSelectAll = () => {
  if (!(rolePermissionsSelectAll instanceof HTMLInputElement)) {
    return;
  }

  const rows = getRolePermissionRows();
  const rowCount = rows.length;
  const rowsFullyChecked = rows.filter((row) => {
    const inputs = getRowPermissionCheckboxes(row);
    return inputs.length > 0 && inputs.every((input) => input.checked);
  }).length;

  rolePermissionsSelectAll.disabled = rowCount === 0;
  rolePermissionsSelectAll.indeterminate = rowCount > 0 && rowsFullyChecked > 0 && rowsFullyChecked < rowCount;
  rolePermissionsSelectAll.checked = rowCount > 0 && rowsFullyChecked === rowCount;
};

const renderPermissionsMatrix = (items) => {
  if (!rolePermissionsBody) {
    return;
  }

  if (!items || items.length === 0) {
    rolePermissionsBody.innerHTML = '<tr><td colspan="5" class="text-secondary">Sin permisos configurados.</td></tr>';
    updateGlobalPermissionsSelectAll();
    return;
  }

  rolePermissionsBody.innerHTML = items
    .map(
      (perm) => `
      <tr data-permission-row="${perm.permiso_id || perm.id}">
        <td>
          <div class="role-module-cell">
            <div>
              <div class="fw-semibold">${perm.nombre}</div>
              <small class="text-secondary">${perm.descripcion || ""}</small>
            </div>
            <label class="form-check form-switch role-row-toggle mb-0">
              <input type="checkbox" class="form-check-input role-row-select-all" ${perm.can_read && perm.can_create && perm.can_update && perm.can_delete ? "checked" : ""} />
              <span class="form-check-label">Todo</span>
            </label>
          </div>
        </td>
        <td><input type="checkbox" data-flag="can_read" ${perm.can_read ? "checked" : ""} /></td>
        <td><input type="checkbox" data-flag="can_create" ${perm.can_create ? "checked" : ""} /></td>
        <td><input type="checkbox" data-flag="can_update" ${perm.can_update ? "checked" : ""} /></td>
        <td><input type="checkbox" data-flag="can_delete" ${perm.can_delete ? "checked" : ""} /></td>
      </tr>
    `
    )
    .join("");

  getRolePermissionRows().forEach((row) => updateRowSelectAllControl(row));
  updateGlobalPermissionsSelectAll();
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
    const role = resolveApiEntity(data, ["role"]);
    roleIdInput.value = role.id || "";
    roleNameInput.value = role.nombre || "";
    roleDescriptionInput.value = role.descripcion || "";
    roleActiveInput.checked = !!role.activo;
    roleFormTitle.textContent = `Editar Rol #${role.id}`;
    renderPermissionsMatrix(data.permissions || role.permissions || permissionsCatalog);
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
  const trimmed = String(value).replace(/\s+/g, " ").trim();
  if (["", "-", "--", "n/a", "na", "null", "undefined"].includes(trimmed.toLowerCase())) {
    return null;
  }
  return trimmed ? trimmed : null;
};

const normalizeImportInteger = (value) => {
  const normalized = normalizeImportCell(value);
  if (!normalized) {
    return null;
  }
  const clean = String(normalized).replace(/[^0-9-]/g, "");
  return parseIntOrNull(clean);
};

const normalizeImportDate = (value) => {
  const normalized = normalizeImportCell(value);
  if (!normalized) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }
  const slashMatch = normalized.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]);
    let year = Number(slashMatch[3]);
    if (year < 100) {
      year += year >= 70 ? 1900 : 2000;
    }
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
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
      fecha_ingreso: normalizeImportDate(rawRow.fecha_ingreso),
      tamano_capacidad: normalizeImportCell(rawRow.tamano_capacidad),
      contenedor: normalizeImportCell(rawRow.contenedor),
      piezas: normalizeImportInteger(rawRow.piezas),
      cantidad_por_pieza: normalizeImportInteger(rawRow.cantidad_por_pieza),
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

const isConsumablesSheetName = (sheetName) => {
  const normalized = normalizeImportKey(sheetName);
  return normalized === "consumibles" || normalized.includes("consumible");
};

const hasConsumablesHeaderSignature = (detectedHeaders) => {
  const detected = Array.isArray(detectedHeaders) ? detectedHeaders : [];
  if (!detected.includes("producto")) {
    return false;
  }

  const distinctiveFields = [
    "catalogo_parte_cas",
    "tamano_capacidad",
    "contenedor",
    "piezas",
    "cantidad_por_pieza",
  ];

  return distinctiveFields.some((field) => detected.includes(field));
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
    importConsumablesPreviewBody.innerHTML = '<tr><td colspan="11" class="text-secondary">Selecciona un archivo CSV o Excel para previsualizar.</td></tr>';
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
  const pieces = parseNumberOrNull(r.piezas) ?? 0;
  const maxStock = parseNumberOrNull(r.stock_maximo) || pieces;
  const stockLabel = `${fmt(pieces)} de ${fmt(maxStock)} piezas`;

  return `
    <tr>
      <td>${r.producto || "-"}</td>
      <td>${r.marca || "-"}</td>
      <td>${r.proveedor || "-"}</td>
      <td>${r.catalogo_parte_cas || "-"}</td>
      <td>${fmtDate(r.fecha_ingreso)}</td>
      <td>${r.tamano_capacidad || "-"}</td>
      <td>${r.contenedor || "-"}</td>
      <td>${buildStockProgress(pieces, maxStock, stockLabel)}</td>
      <td>${fmt(r.cantidad_por_pieza)}</td>
      <td>
        <div class="d-flex gap-1 flex-wrap">
          <button class="role-action-btn" data-consumable-action="refill" data-consumable-id="${r.id}" ${canUpdate ? "" : "disabled"}>Rellenar</button>
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

const normalizeSampleStatus = (status) => String(status || "registrada").toLowerCase().replace(/\s+/g, "_");

const sampleStatusLabel = (status) => {
  const normalized = normalizeSampleStatus(status);
  const labels = {
    registrada: "Registrada",
    procesamiento: "En proceso",
    extraccion: "Extracci\u00f3n",
    en_proceso: "En proceso",
    completada: "Completada",
    finalizada: "Finalizada",
    cancelada: "Cancelada",
  };
  return labels[normalized] || String(status || "Registrada");
};

const sampleStatusChip = (status) => {
  const normalized = normalizeSampleStatus(status);
  return `<span class="sample-status-chip ${normalized}">${sampleStatusLabel(status)}</span>`;
};

const sampleFolioChip = (folio, type = "R") => {
  return `<span class="sample-folio-chip ${type.toLowerCase()}"><span>${type}</span>${folio}</span>`;
};

const SAMPLE_ANALYSIS_LABELS = {
  acido_domoico: "Acido domoico",
  toxinas_lipofilicas: "Toxinas lipofilicas",
  toxinas_paralizantes: "Toxinas paralizantes",
  pigmentos: "Pigmentos",
  plancton: "Plancton",
  otro: "Otro",
};

const SAMPLE_MATRIX_LABELS = {
  organismo: "Organismo",
  organismo_plancton: "Organismo plancton",
  fitotox: "Fitotox",
  agua_mar: "Agua de mar",
  otro: "Otro",
};

const getSampleAnalysisSummary = (item) => {
  const analysis = item.analisis || {};
  const values = Array.isArray(analysis.tipos) ? analysis.tipos : [];
  const labels = values.map((value) => SAMPLE_ANALYSIS_LABELS[value] || value).filter(Boolean);
  if (analysis.metodo_otro) {
    labels.push(analysis.metodo_otro);
  }
  return labels.length ? labels.join(", ") : "-";
};

const getSampleTypeSummary = (item) => {
  const analysis = item.analisis || {};
  const matrix = Array.isArray(analysis.tipos_muestra) ? analysis.tipos_muestra : [];
  const matrixLabel = matrix.map((value) => SAMPLE_MATRIX_LABELS[value] || value).filter(Boolean).join(", ");
  if (matrixLabel) {
    return matrixLabel;
  }
  if (item.muestra_unica) {
    return "Muestra \u00fanica";
  }
  return "Lote";
};

const samplePriorityChip = (priority = "normal") => {
  const normalized = String(priority || "normal").toLowerCase();
  const labels = {
    normal: "Normal",
    alta: "Alta",
    urgente: "Urgente",
  };
  return `<span class="sample-priority-chip ${normalized}">${labels[normalized] || priority}</span>`;
};

const updateSamplesFlowCounts = () => {
  if (sampleReceptionCount) sampleReceptionCount.textContent = fmt(samplesCache.length);
  if (sampleProcessingCount) sampleProcessingCount.textContent = fmt(processingCache.length);
  if (sampleExtractionCount) sampleExtractionCount.textContent = fmt(extractionCache.length);
  if (sampleReceptionCountLabel) sampleReceptionCountLabel.textContent = fmt(samplesCache.length);
  if (sampleTotalCount) sampleTotalCount.textContent = fmt(samplesCache.length + processingCache.length + extractionCache.length);
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
      sampleLoteTableBody.querySelector("tr:last-child").remove();
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
      id_interno: (row.querySelector(".sample-lote-id-interno").value || "").trim() || null,
      nombre_organismo: (row.querySelector(".sample-lote-organismo").value || "").trim() || null,
      cantidad_volumen: (row.querySelector(".sample-lote-cantidad").value || "").trim() || null,
      sitio_muestreo: (row.querySelector(".sample-lote-sitio").value || "").trim() || null,
      fecha_muestra: row.querySelector(".sample-lote-fecha").value || null,
      informacion_adicional: (row.querySelector(".sample-lote-info").value || "").trim() || null,
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
  const isUnique = !!sampleMuestraUnicaInput.checked;
  if (sampleLoteModeVisualInput) {
    sampleLoteModeVisualInput.checked = !isUnique;
  }
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
    syncSampleLoteRowsCount(sampleLoteCountInput.value || 1);
  }
  if (addSampleLoteRowBtn) {
    addSampleLoteRowBtn.disabled = isUnique;
  }
  if (sampleLoteCountInput) {
    sampleLoteCountInput.disabled = isUnique;
  }
};

const toggleSampleAnalysisOtherFields = () => {
  const methodOtherChecked = !!document.getElementById("analisisMetodo5").checked;
  const sampleOtherChecked = !!document.getElementById("analisisMuestra5").checked;

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

const syncSampleReceptionMirrors = () => {
  document.querySelectorAll(".sample-reception-date-mirror").forEach((input) => {
    input.value = sampleFechaRecepcionInput.value || "";
  });
  document.querySelectorAll(".sample-reception-time-mirror").forEach((input) => {
    input.value = sampleHoraRecepcionInput.value || "";
  });
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
      observacion: (obs.value || "").trim() || null,
    };
  });
};

const resetSampleForm = async (withNextFolio = true) => {
  if (!sampleForm) {
    return;
  }

  sampleForm.reset();
  sampleIdInput.value = "";
  sampleFormTitle.textContent = "Nueva Muestra - Recepci\u00f3n";
  sampleClaveRevisionInput.value = "FX-TCF-GMR";
  sampleTipoRegistroInput.value = "R";
  sampleFechaEmisionInput.value = isoDate(new Date());
  sampleFechaRecepcionInput.value = isoDate(new Date());
  sampleEstadoInput.value = "registrada";
  sampleMuestraUnicaInput.checked = true;
  if (sampleCustodioNombreInput) {
    sampleCustodioNombreInput.value = formatActiveUserSignature();
  }
  clearSignaturePadsIn(sampleForm);
  document.querySelectorAll(".sample-custody-radio").forEach((input) => {
    input.checked = false;
  });
  ensureSampleLoteRows();
  if (sampleLoteCountInput) {
    sampleLoteCountInput.value = "1";
  }
  toggleSampleModeUI();
  toggleSampleAnalysisOtherFields();
  syncSampleReceptionMirrors();
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
    recibido_por: (sampleRecibidoPorVisualInput?.value || "").trim() || null,
    medio_recepcion: (sampleReceptionMethodVisualInput?.value || "").trim() || null,
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
      metodo_otro: document.getElementById("analisisMetodo5").checked ? (analisisMetodoOtroInput.value || "").trim() || null : null,
      tipos_muestra: Array.from(document.querySelectorAll(".sample-analisis-muestra:checked")).map((el) => el.value),
      tipo_muestra_otro: document.getElementById("analisisMuestra5").checked ? (analisisMuestraOtroInput.value || "").trim() || null : null,
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
      firma_digital: (sampleCustodioFirmaInput.value || "").trim() || null,
      lugar_resguardo: sampleCustodioLugarInput.value || null,
      lugar_otro: (sampleCustodioOtroInput.value || "").trim() || null,
    },
  };
};

const fillSampleForm = (item) => {
  sampleIdInput.value = item.id || "";
  sampleFormTitle.textContent = `Editar Muestra - ${formatSampleFolio(item)}`;
  sampleClaveRevisionInput.value = item.clave_revision || "FX-TCF-GMR";
  sampleFechaEmisionInput.value = isoDate(item.fecha_emision);
  sampleTipoRegistroInput.value = item.tipo_registro || "R";
  sampleFolioInput.value = item.folio_num || "";
  sampleFechaRecepcionInput.value = isoDate(item.fecha_recepcion);
  sampleHoraRecepcionInput.value = item.hora_recepcion || "";
  if (sampleRecibidoPorVisualInput) {
    sampleRecibidoPorVisualInput.value = item.recibido_por || "";
  }
  if (sampleReceptionMethodVisualInput) {
    sampleReceptionMethodVisualInput.value = item.medio_recepcion || "";
  }
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
  syncSampleReceptionMirrors();

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
  setSignatureInputValue(sampleSolicitanteFirmaInput, solicitante.firma_conformidad || "");
  setSignatureInputValue(sampleCustodioFirmaInput, custodio.firma_digital || "");
  sampleCustodioLugarInput.value = custodio.lugar_resguardo || "";
  document.querySelectorAll(".sample-custody-radio").forEach((input) => {
    input.checked = !!custodio.lugar_resguardo && input.value === custodio.lugar_resguardo;
  });
  sampleCustodioOtroInput.value = custodio.lugar_otro || "";
};

const mapSampleRow = (item) => {
  const canUpdate = canModuleAction("muestras", "update");
  const canDelete = canModuleAction("muestras", "delete");
  const canCreate = canModuleAction("muestras", "create");
  const folio = formatSampleFolio(item);
  return `
    <tr class="samples-data-row">
      <td>${sampleFolioChip(folio, "R")}</td>
      <td>${fmtDate(item.fecha_recepcion)}</td>
      <td>${item.solicitante || "-"}</td>
      <td>${item.id_interno || folio}</td>
      <td>${getSampleTypeSummary(item)}</td>
      <td class="samples-analysis-cell">${getSampleAnalysisSummary(item)}</td>
      <td>${samplePriorityChip(item.prioridad || "normal")}</td>
      <td>${sampleStatusChip(item.estado)}</td>
      <td class="text-end">
        <div class="samples-actions">
          <button class="icon-action-btn sample-action-btn" type="button" title="Ver detalle" aria-label="Ver detalle" data-sample-action="edit" data-sample-id="${item.id}" ${canUpdate ? "" : "disabled"}><i class="bi bi-eye"></i></button>
          <button class="icon-action-btn sample-action-btn" type="button" title="Editar" aria-label="Editar" data-sample-action="edit" data-sample-id="${item.id}" ${canUpdate ? "" : "disabled"}><i class="bi bi-pencil"></i></button>
          <button class="icon-action-btn sample-action-btn" type="button" title="Imprimir etiqueta" aria-label="Imprimir etiqueta" disabled><i class="bi bi-printer"></i></button>
          <button class="icon-action-btn sample-action-btn" type="button" title="Procesar" aria-label="Procesar" data-sample-action="process" data-sample-id="${item.id}" ${canCreate ? "" : "disabled"}><i class="bi bi-arrow-right"></i></button>
          <button class="icon-action-btn sample-action-btn danger" type="button" title="Cancelar recepcion" aria-label="Cancelar recepcion" data-sample-action="delete" data-sample-id="${item.id}" ${canDelete ? "" : "disabled"}><i class="bi bi-x-circle"></i></button>
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

  const search = (samplesSearchInput.value || "").trim();
  try {
    const data = await getJsonAuth(`${API_BASE_URL}/samples/reception/?search=${encodeURIComponent(search)}`, token);
    samplesCache = data.items || [];
    renderRows(muestrasTableBody, samplesCache, mapSampleRow, 9);
    updateSamplesFlowCounts();
    showSamplesFeedback("");
    loadedPages.add("muestras");
  } catch (error) {
    samplesCache = [];
    renderRows(muestrasTableBody, [], mapSampleRow, 9);
    updateSamplesFlowCounts();
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
    fillSampleForm(resolveApiEntity(data));
    if (sampleModal) {
      sampleModal.show();
    }
  } catch (error) {
    showSamplesFeedback(error.message || "No se pudo cargar la recepcion", true);
  }
};

const deleteSample = async (id) => {
  if (!window.confirm("\u00bfEliminar este registro de recepci\u00f3n?")) {
    return;
  }
  const token = getStoredToken();
  if (!token) {
    return;
  }
  try {
    await sendJsonAuth("DELETE", `${API_BASE_URL}/samples/reception/${id}`, token);
    showSamplesFeedback("Recepci\u00f3n eliminada");
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
    <tr class="samples-data-row">
      <td>${sampleFolioChip(folioE, "E")}</td>
      <td>${folioP === "-" ? "-" : sampleFolioChip(folioP, "P")}</td>
      <td>${item.id_interno || "-"}</td>
      <td>${fmtDate(item.fecha_extraccion)}</td>
      <td>${item.hora_extraccion || "-"}</td>
      <td>${sampleStatusChip(item.estado)}</td>
      <td>
        <div class="samples-actions">
          <button class="icon-action-btn sample-action-btn" type="button" title="Editar" aria-label="Editar" data-extraction-action="edit" data-extraction-id="${item.id}" ${canUpdate ? "" : "disabled"}><i class="bi bi-pencil"></i></button>
          <button class="icon-action-btn sample-action-btn danger" type="button" title="Eliminar" aria-label="Eliminar" data-extraction-action="delete" data-extraction-id="${item.id}" ${canDelete ? "" : "disabled"}><i class="bi bi-trash3"></i></button>
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
  const item = data.item || null;
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
    syncExtractionSampleTypeVisual();
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

// ── Insumos / Descuento de inventario helpers ─────────────────────────────
let _insumoReactivosCache = null;
let _insumoConsumiblesCache = null;
let _insumoEquiposCache = null;
let _insumoLoadingPromise = null;

const loadInsumoOptions = () => {
  if (_insumoReactivosCache !== null) return Promise.resolve();
  if (_insumoLoadingPromise) return _insumoLoadingPromise;
  const token = getStoredToken();
  if (!token) return Promise.resolve();
  _insumoLoadingPromise = Promise.all([
    getJsonAuth(`${API_BASE_URL}/inventory/reactivos?search=`, token).catch(() => ({})),
    getJsonAuth(`${API_BASE_URL}/consumables/?search=`, token).catch(() => ({})),
    getJsonAuth(`${API_BASE_URL}/inventory/equipos?search=`, token).catch(() => ({})),
  ]).then(([rData, cData, eData]) => {
    _insumoReactivosCache = (rData.items || []).map((r) => ({
      ref: String(r.id),
      label: [r.producto, r.catalogo].filter(Boolean).join(" · ") || String(r.id),
      cantidad_actual: r.cantidad_actual ?? null,
      unidad: r.unidad || "",
    }));
    _insumoConsumiblesCache = (Array.isArray(cData) ? cData : cData.items || []).map((c) => ({
      ref: String(c.id),
      piezas: c.piezas ?? null,
      unidad: "piezas",
      label: [c.producto, c.catalogo_parte_cas].filter(Boolean).join(" · ") || String(c.id),
    }));
    _insumoEquiposCache = (eData.items || []).map((e) => ({
      ref: e.nombre || String(e.id),
      label: [e.nombre, e.marca, e.modelo].filter(Boolean).join(" · ") || String(e.id),
    }));
    _insumoLoadingPromise = null;
  }).catch(() => { _insumoLoadingPromise = null; });
  return _insumoLoadingPromise;
};

const _getInsumoOptions = (tipo) => {
  if (tipo === "reactivo") return _insumoReactivosCache || [];
  if (tipo === "equipo") return _insumoEquiposCache || [];
  return _insumoConsumiblesCache || [];
};

const _findInsumoOption = (tipo, ref) => {
  const value = String(ref || "").trim();
  if (!value) return null;
  return _getInsumoOptions(tipo).find((item) => String(item.ref) === value || item.label === value) || null;
};

const _normalizeInsumoText = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const _findInsumoByAutoQuery = (tipo, query) => {
  const tokens = _normalizeInsumoText(query).split(" ").filter(Boolean);
  if (!tokens.length) return null;
  const indexed = _getInsumoOptions(tipo)
    .map((item) => ({ item, text: _normalizeInsumoText(item.label) }));
  const exact = indexed.filter(({ text }) => tokens.every((token) => text.includes(token)));
  if (exact.length) return exact[0].item;
  const alphaTokens = tokens.filter((token) => !/^\d+$/.test(token));
  const candidates = indexed
    .filter(({ text }) => alphaTokens.every((token) => text.includes(token)))
    .map(({ item, text }) => ({
      item,
      score: tokens.reduce((total, token) => total + (text.includes(token) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score);
  return candidates[0]?.item || null;
};

const _positionInsumoDropdown = (wrapper, dropdown) => {
  if (!wrapper || !dropdown) return;

  const gap = 4;
  const minHeight = 120;
  const defaultMaxHeight = 210;
  const margin = 12;
  const wrapperRect = wrapper.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const spaceBelow = Math.max(0, viewportHeight - wrapperRect.bottom - margin);
  const spaceAbove = Math.max(0, wrapperRect.top - margin);
  const shouldOpenUp = spaceBelow < 160 && spaceAbove > spaceBelow;

  dropdown.style.top = shouldOpenUp ? "auto" : `calc(100% + ${gap}px)`;
  dropdown.style.bottom = shouldOpenUp ? `calc(100% + ${gap}px)` : "auto";

  const available = shouldOpenUp ? spaceAbove : spaceBelow;
  const measuredHeight = dropdown.scrollHeight || defaultMaxHeight;
  const dynamicMaxHeight = Math.min(defaultMaxHeight, Math.max(minHeight, Math.min(available, measuredHeight)));
  dropdown.style.maxHeight = `${dynamicMaxHeight}px`;
};

const _renderInsumoDropdown = (dropdown, tipo, query) => {
  if (!dropdown) return;
  const q = (query || "").toLowerCase();
  const options = _getInsumoOptions(tipo);
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  const shown = filtered.slice(0, 60);
  if (!shown.length) {
    dropdown.innerHTML = `<div class="list-group-item text-secondary small py-1">${_insumoReactivosCache === null ? "Cargando..." : "Sin resultados"}</div>`;
  } else {
    dropdown.innerHTML = shown
      .map((o) => `<button type="button" class="list-group-item list-group-item-action py-1 small insumo-ref-option" data-ref="${o.ref.replace(/"/g, "&quot;")}" data-label="${o.label.replace(/"/g, "&quot;")}">${o.label}</button>`)
      .join("");
  }
  dropdown.style.display = "block";
  const wrapper = dropdown.closest(".insumo-search-wrapper");
  _positionInsumoDropdown(wrapper, dropdown);
};

const addInventarioRow = (tbodyId) => {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>
      <select class="form-select form-select-sm insumo-tipo">
        <option value="consumible">Consumible</option>
        <option value="reactivo">Reactivo</option>
      </select>
    </td>
    <td>
      <div class="position-relative insumo-search-wrapper">
        <input type="text" class="form-control form-control-sm insumo-ref-search" placeholder="Buscar insumo..." autocomplete="off" />
        <input type="hidden" class="insumo-ref" />
        <div class="insumo-ref-dropdown list-group shadow-sm" style="position:absolute;top:100%;left:0;width:100%;max-height:210px;overflow-y:auto;z-index:1060;display:none;"></div>
      </div>
    </td>
    <td><input type="number" class="form-control form-control-sm insumo-cantidad" min="0.001" step="0.001" value="1" /></td>
    <td><button type="button" class="btn btn-link btn-sm text-danger p-0 remove-insumo-row" title="Quitar"><i class="bi bi-x-circle"></i></button></td>
  `;
  tbody.appendChild(tr);
};

const collectInventarioRows = (tbodyId) => {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return [];
  return Array.from(tbody.querySelectorAll("tr"))
    .map((tr) => {
      const hidden = (tr.querySelector(".insumo-ref")?.value || "").trim();
      const search = (tr.querySelector(".insumo-ref-search")?.value || "").trim();
      return {
        tipo: tr.querySelector(".insumo-tipo")?.value || "consumible",
        ref: hidden || search,
        cantidad: parseFloat(tr.querySelector(".insumo-cantidad")?.value) || 1,
      };
    })
    .filter((r) => r.ref !== "");
};

const renderInventarioRows = (tbodyId, rows) => {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = "";
  (rows || []).forEach((row) => {
    addInventarioRow(tbodyId);
    const tr = tbody.lastElementChild;
    if (!tr) return;
    const tipoSel = tr.querySelector(".insumo-tipo");
    if (tipoSel) tipoSel.value = row.tipo || "consumible";
    const refInput = tr.querySelector(".insumo-ref");
    if (refInput) refInput.value = row.ref || row.nombre || "";
    const searchInput = tr.querySelector(".insumo-ref-search");
    if (searchInput) {
      const option = _findInsumoOption(row.tipo || "consumible", row.ref || row.nombre || "");
      searchInput.value = option?.label || row.nombre || row.ref || "";
    }
    const cantInput = tr.querySelector(".insumo-cantidad");
    if (cantInput) cantInput.value = row.cantidad ?? 1;
  });
};
// ─────────────────────────────────────────────────────────────────────────────

// Llena un search-wrapper estático (con data-tipo fijo) a partir de un valor guardado
const _fillSearchWrapper = (idOrEl, value) => {
  const el = typeof idOrEl === "string" ? document.getElementById(idOrEl) : idOrEl;
  if (!el) return;
  el.value = value || "";
  const wrapper = el.closest(".insumo-search-wrapper");
  if (!wrapper) return;
  const search = wrapper.querySelector(".insumo-ref-search");
  if (search) {
    const tipo = wrapper.dataset.tipo || "consumible";
    const option = _findInsumoOption(tipo, value);
    search.value = option?.label || value || "";
  }
};

const _autoResolveFixedFormInsumos = (formId, { showReactivoStock = false } = {}) => {
  const form = document.getElementById(formId);
  if (!form) return;
  form.querySelectorAll(".insumo-ref[data-cantidad-fija][data-auto-query]").forEach((hiddenInput) => {
    const wrapper = hiddenInput.closest(".insumo-search-wrapper");
    if (!wrapper) return;
    const tipo = wrapper.dataset.tipo || "consumible";
    const currentRef = (hiddenInput.value || "").trim();
    if (!currentRef || !_findInsumoOption(tipo, currentRef)) {
      const match = _findInsumoByAutoQuery(tipo, hiddenInput.dataset.autoQuery);
      if (match) {
        hiddenInput.value = match.ref;
        const search = wrapper.querySelector(".insumo-ref-search");
        if (search) search.value = match.label;
      }
    }
    if (showReactivoStock && tipo === "reactivo") {
      _checkReactivoStock(wrapper);
    }
  });
};

const _autoResolveFixedExtractionReactivos = () => {
  _autoResolveFixedFormInsumos("extractionForm", { showReactivoStock: true });
};

const _normalizeInventoryUnit = (unit) => {
  const value = String(unit || "").trim().toLowerCase();
  if (!value) return "";
  if (["l", "lt", "ltr", "litro", "litros"].includes(value)) return "litros";
  if (["ml", "mililitro", "mililitros"].includes(value)) return "ml";
  return value;
};

const _formatInventoryAmount = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";
  return numeric.toLocaleString("es-MX", { maximumFractionDigits: 4 });
};

const _resolveFixedInventoryAmount = (input, item = null) => {
  const protocolAmount = parseFloat(input?.dataset?.cantidadFija);
  if (!protocolAmount) {
    return null;
  }

  const protocolUnit = _normalizeInventoryUnit(input?.dataset?.cantidadUnidad);
  const stockUnit = _normalizeInventoryUnit(item?.unidad);

  let amount = protocolAmount;
  if (protocolUnit && stockUnit && protocolUnit !== stockUnit) {
    if (protocolUnit === "ml" && stockUnit === "litros") {
      amount = protocolAmount / 1000;
    } else if (protocolUnit === "litros" && stockUnit === "ml") {
      amount = protocolAmount * 1000;
    }
  }

  return {
    amount,
    protocolAmount,
    protocolUnit,
    stockUnit: stockUnit || item?.unidad || "",
  };
};

const _isProtocolInsumoEnabled = (input) => {
  const stepCheckboxId = String(input?.dataset?.stepCheckbox || "").trim();
  if (!stepCheckboxId) return true;
  const checkbox = document.getElementById(stepCheckboxId);
  return !!checkbox?.checked;
};

// Construye uso_inventario automáticamente desde los campos de protocolo con cantidad fija
const _buildProtocolInventarioFromForm = (formId) => {
  const result = [];
  const form = document.getElementById(formId);
  if (!form) return result;
  form.querySelectorAll(".insumo-ref[data-cantidad-fija]").forEach((el) => {
    if (!_isProtocolInsumoEnabled(el)) return;
    const ref = (el.value || "").trim();
    if (!ref) return;
    const tipo = el.closest(".insumo-search-wrapper")?.dataset?.tipo || "reactivo";
    const item = _findInsumoOption(tipo, ref);
    const resolved = _resolveFixedInventoryAmount(el, item);
    const cantidad = resolved?.amount || 1;
    result.push({ tipo, ref, cantidad });
  });
  return result;
};

const _buildExtractionProtocolInventario = () => {
  const result = _buildProtocolInventarioFromForm("extractionForm");
  const puntasRef = (document.getElementById("extrTotalPuntasRef")?.value || "").trim();
  const puntasCantidad = parseFloat(document.getElementById("extrTotalPuntasCantidad")?.value) || 0;
  if (puntasRef && puntasCantidad > 0) result.push({ tipo: "consumible", ref: puntasRef, cantidad: puntasCantidad });
  return result;
};

const _buildExtractionInventario = () => {
  const result = _buildExtractionProtocolInventario();
  result.push(...collectInventarioRows("extractionInventarioBody"));
  return result;
};

const _buildProcessingProtocolInventario = () => _buildProtocolInventarioFromForm("processingForm");

const _buildProcessingInventario = () => {
  const result = _buildProcessingProtocolInventario();
  result.push(...collectInventarioRows("processingInventarioBody"));
  return result;
};

const _filterExtractionManualInventario = (rows) => {
  const protocolCounts = new Map();
  _buildExtractionProtocolInventario().forEach((row) => {
    const key = `${row.tipo}|${row.ref}|${row.cantidad}`;
    protocolCounts.set(key, (protocolCounts.get(key) || 0) + 1);
  });
  return (rows || []).filter((row) => {
    const key = `${row.tipo || "consumible"}|${row.ref || row.nombre || ""}|${row.cantidad ?? 1}`;
    const count = protocolCounts.get(key) || 0;
    if (count <= 0) return true;
    protocolCounts.set(key, count - 1);
    return false;
  });
};

const _filterProcessingManualInventario = (rows) => {
  const protocolCounts = new Map();
  _buildProcessingProtocolInventario().forEach((row) => {
    const key = `${row.tipo}|${row.ref}|${row.cantidad}`;
    protocolCounts.set(key, (protocolCounts.get(key) || 0) + 1);
  });
  return (rows || []).filter((row) => {
    const key = `${row.tipo || "consumible"}|${row.ref || row.nombre || ""}|${row.cantidad ?? 1}`;
    const count = protocolCounts.get(key) || 0;
    if (count <= 0) return true;
    protocolCounts.set(key, count - 1);
    return false;
  });
};

// Muestra badge de stock bajo el wrapper de un reactivo con cantidad fija
const _checkReactivoStock = (wrapper) => {
  const hiddenInput = wrapper.querySelector(".insumo-ref");
  if (!hiddenInput) return;
  if (!_isProtocolInsumoEnabled(hiddenInput)) {
    const badge = wrapper.querySelector(".insumo-stock-badge");
    if (badge) badge.innerHTML = "";
    return;
  }
  const resolvedBase = _resolveFixedInventoryAmount(hiddenInput);
  if (!resolvedBase) return;
  let badge = wrapper.querySelector(".insumo-stock-badge");
  if (!badge) {
    badge = document.createElement("div");
    badge.className = "insumo-stock-badge small mt-1";
    wrapper.appendChild(badge);
  }
  const ref = (hiddenInput.value || "").trim();
  if (!ref) {
    badge.innerHTML = `<span class="text-warning"><i class="bi bi-exclamation-triangle-fill"></i> No se encontró en inventario para descuento automático</span>`;
    return;
  }
  const item = (_insumoReactivosCache || []).find((r) => r.ref === ref);
  if (!item) {
    badge.innerHTML = `<span class="text-warning"><i class="bi bi-exclamation-triangle-fill"></i> No encontrado en inventario</span>`;
    return;
  }
  const resolved = _resolveFixedInventoryAmount(hiddenInput, item);
  if (!resolved) return;
  const cantidadFija = resolved.amount;
  const stock = item.cantidad_actual ?? null;
  const u = item.unidad || "";
  if (stock === null) {
    badge.innerHTML = `<span class="text-secondary"><i class="bi bi-dash-circle"></i> Stock no registrado</span>`;
    return;
  }
  const protocolInfo = resolved.protocolUnit && resolved.protocolUnit !== _normalizeInventoryUnit(u)
    ? ` (${_formatInventoryAmount(resolved.protocolAmount)} ${resolved.protocolUnit})`
    : "";
  if (stock >= cantidadFija) {
    badge.innerHTML = `<span class="text-success"><i class="bi bi-check-circle-fill"></i> Descuento automático activo: se descontarán ${_formatInventoryAmount(cantidadFija)} ${u}${protocolInfo} al guardar. Disponible: ${_formatInventoryAmount(stock)} ${u}</span>`;
  } else {
    badge.innerHTML = `<span class="text-danger fw-semibold"><i class="bi bi-x-circle-fill"></i> Stock insuficiente: ${_formatInventoryAmount(stock)} ${u} disponibles, se requieren ${_formatInventoryAmount(cantidadFija)} ${u}${protocolInfo}</span>`;
  }
};

// Valida stock de todos los reactivos con cantidad fija del formulario de extraccion
const _validateExtractionStock = () => {
  const errors = [];
  document.getElementById("extractionForm")?.querySelectorAll(".insumo-search-wrapper[data-tipo='reactivo']").forEach((wrapper) => {
    const hiddenInput = wrapper.querySelector(".insumo-ref");
    if (!_isProtocolInsumoEnabled(hiddenInput)) return;
    const resolvedBase = _resolveFixedInventoryAmount(hiddenInput);
    if (!resolvedBase) return;
    const ref = (hiddenInput?.value || "").trim();
    if (!ref) {
      errors.push(`• ${hiddenInput?.dataset?.autoQuery || "reactivo fijo"}: no se encontró en inventario para descuento automático`);
      return;
    }
    const item = (_insumoReactivosCache || []).find((r) => r.ref === ref);
    if (!item) return;
    const resolved = _resolveFixedInventoryAmount(hiddenInput, item);
    if (!resolved) return;
    const cantidadFija = resolved.amount;
    const stock = item.cantidad_actual ?? null;
    if (stock !== null && stock < cantidadFija) {
      const u = item.unidad || "";
      errors.push(`• ${ref}: ${_formatInventoryAmount(stock)} ${u} disponibles, se requieren ${_formatInventoryAmount(cantidadFija)} ${u}`);
    }
  });
  return errors;
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
      peso_muestra: parseFloatOrNull(row.querySelector(".extraction-sample-weight").value),
      replica: (row.querySelector(".extraction-sample-replica").value || "").trim() || null,
      peso_replica: parseFloatOrNull(row.querySelector(".extraction-replica-weight").value),
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
  const frozen = !!processing.resguardo.congelador_co1 || !!processing.resguardo.congelador_co2 || !!processing.resguardo.congelador_co3;

  if (extractionIdInternoInput) {
    extractionIdInternoInput.value = ids || processing.id_interno || "";
  }
  if (extractionMuestraTipoInput) {
    extractionMuestraTipoInput.value = muestraTipo;
  }
  syncExtractionSampleTypeVisual();
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
  const processingId = parseIntOrNull(extractionProcessingSelect.value);
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
  extractionFormTitle.textContent = prefillProcessing?.id_interno
    ? `Extraer Muestra - ${prefillProcessing.id_interno}`
    : "Nueva Muestra - Extracción";
  extractionClaveRevisionInput.value = "FX-TCF-GME-A";
  extractionTipoRegistroInput.value = "E-A";
  extractionFechaEmisionInput.value = isoDate(new Date());
  extractionFechaInput.value = isoDate(new Date());
  extractionEstadoInput.value = "registrada";
  if (extractionQuienExtrajoInput) {
    extractionQuienExtrajoInput.value = formatActiveUserSignature();
  }
  clearSignaturePadsIn(extractionForm);
  renderInventarioRows("extractionInventarioBody", []);
  clearExtractionProcessingDerivedData();
  extractionProcessingDetailCache = new Map();
  setExtractionDefaultChecklist();
  await loadProcessingOptionsForExtraction(prefillProcessing?.id || null);
  await loadInsumoOptions();
  _autoResolveFixedExtractionReactivos();

  if (prefillProcessing && extractionProcessingSelect) {
    extractionProcessingSelect.value = String(prefillProcessing.id || "");
    const processing = await getProcessingDetailForExtraction(prefillProcessing.id);
    applyProcessingToExtractionForm(processing || prefillProcessing);
    _autoResolveFixedExtractionReactivos();
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
  const selectedOption = extractionProcessingSelect.selectedOptions?.[0];
  const selectedMolienda = document.querySelector('.extraction-molienda:checked').value || null;
  const limpieza = extrLimpiezaSi.checked ? "si" : extrLimpiezaNo.checked ? "no" : null;
  const sampleWeights = collectExtractionSampleWeights();
  return {
    folio_num: parseIntOrNull(extractionFolioInput.value),
    tipo_registro: (extractionTipoRegistroInput.value || "E-A").trim() || "E-A",
    clave_revision: (extractionClaveRevisionInput.value || "FX-TCF-GME-A").trim() || "FX-TCF-GME-A",
    fecha_emision: extractionFechaEmisionInput.value || null,
    fecha_extraccion: extractionFechaInput.value || null,
    hora_extraccion: extractionHoraInput.value || null,
    procesamiento_id: parseIntOrNull(extractionProcessingSelect.value),
    folio_procesamiento_num: parseIntOrNull(selectedOption.dataset.folioP),
    muestra_tipo: extractionMuestraTipoInput.value || null,
    id_interno: (extractionIdInternoInput.value || "").trim() || null,
    tipo_molienda: selectedMolienda,
    pasos: {
      checklist: collectCheckedValues(".extraction-step:checked"),
      id_equipo_licuadora: (extrLicuadoraEquipoInput.value || "").trim() || null,
      id_ba1: (extrBA1Input.value || "").trim() || null,
      id_probeta: (extrProbetaInput.value || "").trim() || null,
      folio_reactivo: (extrReactivoInput?.value || "").trim() || null,
      id_homogeneizador: (extrHomogeneizadorInput.value || "").trim() || null,
      id_cronometro: (extrCronometroInput.value || "").trim() || null,
      limpieza,
      observaciones_extraccion: (extractionObservacionesProcesoInput.value || "").trim() || null,
      limp_micropipeta_1: (document.getElementById("extrLimpMicropipeta1")?.value || "").trim() || null,
      limp_reactivo_metanol: (document.getElementById("extrLimpReactivoMetanol")?.value || "").trim() || null,
      limp_micropipeta_2: (document.getElementById("extrLimpMicropipeta2")?.value || "").trim() || null,
      limp_micropipeta_4: (document.getElementById("extrLimpMicropipeta4")?.value || "").trim() || null,
      limp_micropipeta_5: (document.getElementById("extrLimpMicropipeta5")?.value || "").trim() || null,
      limp_micropipeta_8: (document.getElementById("extrLimpMicropipeta8")?.value || "").trim() || null,
      limp_reactivo_acetico: (document.getElementById("extrLimpReactivoAcetico")?.value || "").trim() || null,
      limp_vortex: (document.getElementById("extrLimpVortex")?.value || "").trim() || null,
      limp_micropipeta_10: (document.getElementById("extrLimpMicropipeta10")?.value || "").trim() || null,
      limp_total_puntas_ref: (document.getElementById("extrTotalPuntasRef")?.value || "").trim() || null,
      limp_total_puntas_cantidad: parseFloat(document.getElementById("extrTotalPuntasCantidad")?.value) || null,
      filtrado: {
        volumen_filtrado: (document.getElementById("extrVolumenFiltradoInput").value || "").trim() || null,
        volumen_recuperado: (document.getElementById("extrVolumenRecuperadoInput").value || "").trim() || null,
        filtro: (document.getElementById("extrFiltroInput").value || "").trim() || null,
      },
      resguardo_extracto: {
        entregado_fx106: !!document.getElementById("extrResExtracto1").checked,
        refrigerador_re1: !!document.getElementById("extrResExtracto2").checked,
        congelador_co1: !!document.getElementById("extrResExtracto3").checked,
        congelador_co2: !!document.getElementById("extrResExtracto4").checked,
        congelador_co3: !!document.getElementById("extrResExtracto5").checked,
      },
      resguardo_molienda_restante: {
        no_sobro: !!document.getElementById("extrResMolida1").checked,
        refrigerador_re1: !!document.getElementById("extrResMolida2").checked,
        congelador_co1: !!document.getElementById("extrResMolida3").checked,
        congelador_co2: !!document.getElementById("extrResMolida4").checked,
        congelador_co3: !!document.getElementById("extrResMolida5").checked,
      },
    },
    registro_pesos: sampleWeights.length ? sampleWeights : [
      { submuestra: 1, peso: parseFloatOrNull(extrSub1PesoInput.value) },
      { submuestra: 2, peso: parseFloatOrNull(extrSub2PesoInput.value) },
      { submuestra: 3, peso: parseFloatOrNull(extrSub3PesoInput.value) },
      { submuestra: "total", peso: parseFloatOrNull(extrPesoTotalInput.value) },
    ].filter((it) => it.peso !== null),
    observaciones_generales: (extractionObservacionesInput.value || "").trim() || null,
    nombre_quien_extrajo: (extractionQuienExtrajoInput.value || "").trim() || null,
    nombre_quien_limpieza: (extractionQuienLimpiezaInput.value || "").trim() || null,
    nombre_quien_superviso: (extractionQuienSupervisoInput.value || "").trim() || null,
    firma_quien_extrajo: (extractionFirmaExtrajoInput.value || "").trim() || null,
    firma_quien_limpieza: (extractionFirmaLimpiezaInput.value || "").trim() || null,
    firma_quien_superviso: (extractionFirmaSupervisoInput.value || "").trim() || null,
    estado: extractionEstadoInput.value || "registrada",
    uso_inventario: _buildExtractionInventario(),
  };
};

const fillExtractionForm = async (item) => {
  await loadProcessingOptionsForExtraction(item.procesamiento_id);
  extractionIdInput.value = item.id || "";
  extractionFormTitle.textContent = `Editar Extracci\u00f3n - ${formatExtractionFolio(item)}`;
  extractionClaveRevisionInput.value = item.clave_revision || "FX-TCF-GME-A";
  extractionFechaEmisionInput.value = isoDate(item.fecha_emision);
  extractionTipoRegistroInput.value = item.tipo_registro || "E-A";
  extractionFolioInput.value = item.folio_num || "";
  extractionFechaInput.value = isoDate(item.fecha_extraccion);
  extractionHoraInput.value = item.hora_extraccion || "";
  extractionEstadoInput.value = item.estado || "registrada";
  extractionMuestraTipoInput.value = item.muestra_tipo || "unica";
  extractionIdInternoInput.value = item.id_interno || "";
  syncExtractionSampleTypeVisual();
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

  if (extrLicuadoraEquipoInput) _fillSearchWrapper(extrLicuadoraEquipoInput, pasos.id_equipo_licuadora);
  if (extrBA1Input) extrBA1Input.value = pasos.id_ba1 || "";
  if (extrProbetaInput) _fillSearchWrapper(extrProbetaInput, pasos.id_probeta);
  if (extrReactivoInput) _fillSearchWrapper(extrReactivoInput, pasos.folio_reactivo);
  if (extrHomogeneizadorInput) _fillSearchWrapper(extrHomogeneizadorInput, pasos.id_homogeneizador);
  if (extrCronometroInput) _fillSearchWrapper(extrCronometroInput, pasos.id_cronometro);
  if (extrLimpiezaSi) extrLimpiezaSi.checked = pasos.limpieza === "si";
  if (extrLimpiezaNo) extrLimpiezaNo.checked = pasos.limpieza === "no";
  _fillSearchWrapper("extrLimpMicropipeta1", pasos.limp_micropipeta_1);
  _fillSearchWrapper("extrLimpReactivoMetanol", pasos.limp_reactivo_metanol);
  _fillSearchWrapper("extrLimpMicropipeta2", pasos.limp_micropipeta_2);
  _fillSearchWrapper("extrLimpMicropipeta4", pasos.limp_micropipeta_4);
  _fillSearchWrapper("extrLimpMicropipeta5", pasos.limp_micropipeta_5);
  _fillSearchWrapper("extrLimpMicropipeta8", pasos.limp_micropipeta_8);
  _fillSearchWrapper("extrLimpReactivoAcetico", pasos.limp_reactivo_acetico);
  _fillSearchWrapper("extrLimpVortex", pasos.limp_vortex);
  _fillSearchWrapper("extrLimpMicropipeta10", pasos.limp_micropipeta_10);
  _fillSearchWrapper("extrTotalPuntasRef", pasos.limp_total_puntas_ref);
  const puntasCantInput = document.getElementById("extrTotalPuntasCantidad");
  if (puntasCantInput) puntasCantInput.value = pasos.limp_total_puntas_cantidad || "";
  if (extractionObservacionesProcesoInput) extractionObservacionesProcesoInput.value = pasos.observaciones_extraccion || "";
  await loadInsumoOptions();
  _autoResolveFixedExtractionReactivos();
  const filtrado = pasos.filtrado || {};
  const resguardoExtracto = pasos.resguardo_extracto || {};
  const resguardoMolida = pasos.resguardo_molienda_restante || {};
  if (document.getElementById("extrVolumenFiltradoInput")) document.getElementById("extrVolumenFiltradoInput").value = filtrado.volumen_filtrado || "";
  if (document.getElementById("extrVolumenRecuperadoInput")) document.getElementById("extrVolumenRecuperadoInput").value = filtrado.volumen_recuperado || "";
  if (document.getElementById("extrFiltroInput")) document.getElementById("extrFiltroInput").value = filtrado.filtro || "0.45 µm";
  if (document.getElementById("extrResExtracto1")) document.getElementById("extrResExtracto1").checked = !!resguardoExtracto.entregado_fx106;
  if (document.getElementById("extrResExtracto2")) document.getElementById("extrResExtracto2").checked = !!resguardoExtracto.refrigerador_re1;
  if (document.getElementById("extrResExtracto3")) document.getElementById("extrResExtracto3").checked = !!resguardoExtracto.congelador_co1;
  if (document.getElementById("extrResExtracto4")) document.getElementById("extrResExtracto4").checked = !!resguardoExtracto.congelador_co2;
  if (document.getElementById("extrResExtracto5")) document.getElementById("extrResExtracto5").checked = !!resguardoExtracto.congelador_co3;
  if (document.getElementById("extrResMolida1")) document.getElementById("extrResMolida1").checked = !!resguardoMolida.no_sobro;
  if (document.getElementById("extrResMolida2")) document.getElementById("extrResMolida2").checked = !!resguardoMolida.refrigerador_re1;
  if (document.getElementById("extrResMolida3")) document.getElementById("extrResMolida3").checked = !!resguardoMolida.congelador_co1;
  if (document.getElementById("extrResMolida4")) document.getElementById("extrResMolida4").checked = !!resguardoMolida.congelador_co2;
  if (document.getElementById("extrResMolida5")) document.getElementById("extrResMolida5").checked = !!resguardoMolida.congelador_co3;

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
  if (extractionQuienLimpiezaInput) extractionQuienLimpiezaInput.value = item.nombre_quien_limpieza || "";
  extractionQuienSupervisoInput.value = item.nombre_quien_superviso || "";
  setSignatureInputValue(extractionFirmaExtrajoInput, item.firma_quien_extrajo || "");
  setSignatureInputValue(extractionFirmaLimpiezaInput, item.firma_quien_limpieza || "");
  setSignatureInputValue(extractionFirmaSupervisoInput, item.firma_quien_superviso || "");
  await loadInsumoOptions();
  renderInventarioRows("extractionInventarioBody", _filterExtractionManualInventario(item.uso_inventario || []));
};

const editExtraction = async (id) => {
  const token = getStoredToken();
  if (!token) {
    return;
  }
  try {
    const data = await getJsonAuth(`${API_BASE_URL}/samples/extraction/${id}`, token);
    await fillExtractionForm(resolveApiEntity(data));
    if (extractionModal) {
      extractionModal.show();
    }
  } catch (error) {
    showExtractionFeedback(error.message || "No se pudo cargar extraccion", true);
  }
};

const deleteExtraction = async (id) => {
  if (!window.confirm("\u00bfEliminar este registro de extracci\u00f3n?")) {
    return;
  }
  const token = getStoredToken();
  if (!token) {
    return;
  }
  try {
    await sendJsonAuth("DELETE", `${API_BASE_URL}/samples/extraction/${id}`, token);
    showExtractionFeedback("Extracci\u00f3n eliminada");
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
  const search = (extractionSearchInput.value || "").trim();
  try {
    const data = await getJsonAuth(`${API_BASE_URL}/samples/extraction/?search=${encodeURIComponent(search)}`, token);
    extractionCache = data.items || [];
    renderRows(extractionTableBody, extractionCache, mapExtractionRow, 7);
    updateSamplesFlowCounts();
    showExtractionFeedback("");
    loadedPages.add("muestras-extraction");
  } catch (error) {
    extractionCache = [];
    renderRows(extractionTableBody, [], mapExtractionRow, 7);
    updateSamplesFlowCounts();
    showExtractionFeedback(error.message || "No se pudieron cargar extracciones", true);
  }
};

const setSamplesSection = async (section, loadData = true) => {
  activeSamplesSection = section;
  samplesSectionButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.samplesSectionBtn === section);
  });
  samplesFlowCards.forEach((card) => {
    card.classList.toggle("active", card.dataset.samplesFlowCard === section);
  });

  const setSectionVisibility = (element, visible) => {
    if (!element) {
      return;
    }
    element.hidden = !visible;
    element.classList.toggle("d-none", !visible);
    element.classList.toggle("active", visible);
    element.style.display = visible ? "block" : "none";
  };

  setSectionVisibility(samplesSectionRecepcion, section === "recepcion");
  setSectionVisibility(samplesSectionProcesamiento, section === "procesamiento");
  setSectionVisibility(samplesSectionExtraccion, section === "extraccion");

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
      const idInterno = String(item.id_interno || "").trim();
      const selectedByDefault = item.trabajar !== false;
      const checked = selectedSet.size ? selectedSet.has(idInterno) : selectedByDefault;
      return `
        <tr
          data-id-interno="${idInterno}"
          data-nombre-organismo="${String(item.nombre_organismo || "").trim()}"
          data-cantidad-volumen="${String(item.cantidad_volumen || "").trim()}"
          data-sitio-muestreo="${String(item.sitio_muestreo || "").trim()}"
          data-fecha-muestra="${item.fecha_muestra || ""}"
          data-informacion-adicional="${String(item.informacion_adicional || "").trim()}"
        >
          <td><input type="checkbox" class="form-check-input processing-lote-selected" ${checked ? "checked" : ""} /></td>
          <td>${idInterno || `Muestra ${index + 1}`}</td>
          <td>${item.nombre_organismo || "-"}</td>
          <td>${item.cantidad_volumen || "-"}</td>
          <td>${item.sitio_muestreo || "-"}</td>
          <td>${fmtDate(item.fecha_muestra)}</td>
          <td>${item.informacion_adicional || "-"}</td>
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
  if (!processingIdInternoInput || processingMuestraTipoInput.value !== "lote") {
    return;
  }
  const selected = collectProcessingSelectedLoteRows();
  const joinedIds = selected.map((row) => row.id_interno).filter(Boolean).join(", ");
  processingIdInternoInput.value = joinedIds;
  if (processingLotIdVisualInput) {
    processingLotIdVisualInput.value = joinedIds;
  }
};

const syncExtractionSampleTypeVisual = () => {
  const isLote = extractionMuestraTipoInput.value === "lote";
  if (extractionSingleSampleVisualInput) {
    extractionSingleSampleVisualInput.checked = !isLote;
  }
  if (extractionLotSampleVisualInput) {
    extractionLotSampleVisualInput.checked = isLote;
  }
  if (extractionIdInternoInput) {
    extractionIdInternoInput.disabled = isLote;
  }
  if (extractionLotIdVisualInput) {
    extractionLotIdVisualInput.value = isLote ? extractionIdInternoInput.value || "" : "";
  }
};

const syncProcessingSampleTypeVisual = () => {
  const isLote = processingMuestraTipoInput.value === "lote";
  if (processingSingleSampleVisualInput) {
    processingSingleSampleVisualInput.checked = !isLote;
  }
  if (processingLotSampleVisualInput) {
    processingLotSampleVisualInput.checked = isLote;
  }
  if (processingIdInternoInput) {
    processingIdInternoInput.disabled = isLote;
  }
  if (processingLoteSelectionWrap) {
    processingLoteSelectionWrap.classList.toggle("d-none", !isLote);
  }
  if (processingLotIdVisualInput && !isLote) {
    processingLotIdVisualInput.value = "";
  }
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
  syncProcessingSampleTypeVisual();
};

const signaturePadControllers = new Map();

const drawSignaturePlaceholder = (canvas) => {
  const ctx = canvas.getContext?.("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.fillStyle = "#64748b";
  ctx.font = "24px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Firma digital", canvas.width / 2, canvas.height / 2 - 4);
  ctx.font = "16px sans-serif";
  ctx.fillText("Sube una imagen o usa el pincel", canvas.width / 2, canvas.height / 2 + 24);
  ctx.restore();
};

const setSignaturePadValue = (pad, dataUrl = "") => {
  if (!pad) return;
  const target = document.getElementById(pad.dataset.target || "");
  const canvas = pad.querySelector(".signature-canvas");
  const ctx = canvas.getContext?.("2d");
  if (target) {
    target.value = dataUrl || "";
  }
  if (!ctx || !canvas) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!dataUrl) {
    pad.classList.add("is-empty");
    drawSignaturePlaceholder(canvas);
    return;
  }

  const image = new Image();
  image.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  };
  image.src = dataUrl;
  pad.classList.remove("is-empty");
};

const updateSignaturePadHiddenValue = (pad) => {
  const canvas = pad.querySelector?.(".signature-canvas");
  const target = document.getElementById(pad.dataset.target || "");
  if (!canvas || !target) return;
  target.value = canvas.toDataURL("image/png");
  pad.classList.remove("is-empty");
};

const setSignaturePadMode = (pad, mode) => {
  if (!pad) return;
  const nextMode = mode === "draw" ? "draw" : "upload";
  pad.dataset.mode = nextMode;
  pad.classList.toggle("is-draw-mode", nextMode === "draw");
  pad.classList.toggle("is-upload-mode", nextMode === "upload");
  pad.querySelectorAll("[data-signature-action]").forEach((button) => {
    const isActive = button.dataset.signatureAction === nextMode;
    if (button.dataset.signatureAction === "clear") return;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
};

const initializeSignaturePads = () => {
  document.querySelectorAll("[data-signature-pad]").forEach((pad) => {
    if (signaturePadControllers.has(pad)) return;

    const canvas = pad.querySelector(".signature-canvas");
    const fileInput = pad.querySelector(".signature-file-input");
    const ctx = canvas.getContext?.("2d");
    if (!canvas || !ctx) return;

    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";

    let drawing = false;
    const getPoint = (event) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * canvas.width,
        y: ((event.clientY - rect.top) / rect.height) * canvas.height,
      };
    };
    const startDrawing = (event) => {
      if (pad.dataset.mode !== "draw") {
        return;
      }
      event.preventDefault();
      drawing = true;
      const { x, y } = getPoint(event);
      if (pad.classList.contains("is-empty")) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pad.classList.remove("is-empty");
      }
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    const draw = (event) => {
      if (!drawing) return;
      event.preventDefault();
      const { x, y } = getPoint(event);
      ctx.lineTo(x, y);
      ctx.stroke();
    };
    const stopDrawing = () => {
      if (!drawing) return;
      drawing = false;
      updateSignaturePadHiddenValue(pad);
    };

    canvas.addEventListener("pointerdown", startDrawing);
    canvas.addEventListener("pointermove", draw);
    canvas.addEventListener("pointerup", stopDrawing);
    canvas.addEventListener("pointerleave", stopDrawing);
    canvas.addEventListener("pointercancel", stopDrawing);

    pad.querySelector('[data-signature-action="upload"]').addEventListener("click", () => {
      setSignaturePadMode(pad, "upload");
      fileInput.click();
    });
    pad.querySelector('[data-signature-action="draw"]').addEventListener("click", () => {
      setSignaturePadMode(pad, "draw");
      canvas.focus();
    });
    pad.querySelector('[data-signature-action="clear"]').addEventListener("click", () => setSignaturePadValue(pad, ""));

    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setSignaturePadValue(pad, String(reader.result || ""));
      reader.readAsDataURL(file);
    });

    setSignaturePadMode(pad, pad.dataset.mode || "upload");
    setSignaturePadValue(pad, document.getElementById(pad.dataset.target || "").value || "");
    signaturePadControllers.set(pad, true);
  });
};

const setSignatureInputValue = (input, dataUrl) => {
  if (!input) return;
  input.value = dataUrl || "";
  const pad = document.querySelector(`[data-signature-pad][data-target="${input.id}"]`);
  setSignaturePadValue(pad, input.value);
};

const clearSignaturePadsIn = (root) => {
  root.querySelectorAll?.("[data-signature-pad]").forEach((pad) => setSignaturePadValue(pad, ""));
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
  const item = data.item || null;
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
  syncProcessingSampleTypeVisual();

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
  const selectedIds = (selectedLoteRows || []).map((row) => row.id_interno || "").filter(Boolean);
  renderProcessingLoteSelectionRows(reception.lote_muestras || [], selectedIds);
  if (processingIdInternoInput) {
    processingIdInternoInput.disabled = true;
  }
  syncProcessingIdInternoFromLoteSelection();
  syncProcessingSampleTypeVisual();
};

const handleProcessingReceptionSelection = async (selectedLoteRows = []) => {
  const receptionId = parseIntOrNull(processingReceptionSelect.value);
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
  renderInventarioRows("processingInventarioBody", []);
  processingIdInput.value = "";
  processingFormTitle.textContent = "Nueva Muestra - Procesamiento";
  processingClaveRevisionInput.value = "FX-TCF-GMP";
  processingTipoRegistroInput.value = "P";
  processingFechaEmisionInput.value = isoDate(new Date());
  processingFechaInput.value = isoDate(new Date());
  processingEstadoInput.value = "registrada";
  if (processingQuienProcesoInput) {
    processingQuienProcesoInput.value = formatActiveUserSignature();
  }
  clearSignaturePadsIn(processingForm);
  clearProcessingReceptionDerivedData();
  processingReceptionDetailCache = new Map();
  document.querySelectorAll(".processing-organismo").forEach((el) => {
    el.checked = false;
  });
  setProcessingOrganismSections();
  await loadEquipmentOptionsForProcessing();
  await loadInsumoOptions();
  _autoResolveFixedFormInsumos("processingForm");
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
    procBiv7Extra.classList.toggle("d-none", !procBiv7.checked);
  }
  if (procBiv8Extra) {
    procBiv8Extra.classList.toggle("d-none", !procBiv8.checked);
  }
  if (procSar3Extra) {
    procSar3Extra.classList.toggle("d-none", !procSar3.checked);
  }
  if (procSar4Extra) {
    procSar4Extra.classList.toggle("d-none", !procSar4.checked);
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
  const selectedOption = processingReceptionSelect.selectedOptions?.[0];
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
    folio_recepcion_num: parseIntOrNull(selectedOption.dataset.folioR),
    muestra_tipo: processingMuestraTipoInput.value || null,
    id_interno: (isLote ? idInternoLote : processingIdInternoInput.value || "").trim() || null,
    lote_seleccion: isLote ? selectedLoteRows : [],
    tipo_organismo: selectedOrganism ? [selectedOrganism] : [],
    parte_organismo: collectCheckedValues(".processing-parte:checked"),
    bivalvos_steps: bivalvos,
    sardinas_steps: sardinas,
    otro_procesamiento: selectedOrganism === "otro" ? (processingOtroInput.value || "").trim() || null : null,
    resguardo: {
      entregado_extraccion: !!procRes1.checked,
      refrigerador_re1: !!procRes2.checked,
      congelador_co1: !!procRes3.checked,
      congelador_co2: !!procRes4.checked,
      congelador_co3: !!procRes5.checked,
    },
    observaciones_generales: (processingObservacionesInput.value || "").trim() || null,
    nombre_quien_proceso: (processingQuienProcesoInput.value || "").trim() || null,
    nombre_quien_superviso: (processingQuienSupervisoInput.value || "").trim() || null,
    firma_quien_proceso: (processingFirmaProcesoInput.value || "").trim() || null,
    firma_quien_superviso: (processingFirmaSupervisoInput.value || "").trim() || null,
    estado: processingEstadoInput.value || "registrada",
    uso_inventario: _buildProcessingInventario(),
  };
};

const fillProcessingForm = async (item) => {
  await loadReceptionOptionsForProcessing(item.recepcion_id);
  processingIdInput.value = item.id || "";
  processingFormTitle.textContent = `Editar Procesamiento - ${formatProcessingFolio(item)}`;
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
    syncProcessingSampleTypeVisual();
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
  setSignatureInputValue(processingFirmaProcesoInput, item.firma_quien_proceso || "");
  setSignatureInputValue(processingFirmaSupervisoInput, item.firma_quien_superviso || "");
  await loadInsumoOptions();
  _autoResolveFixedFormInsumos("processingForm");
  renderInventarioRows("processingInventarioBody", _filterProcessingManualInventario(item.uso_inventario || []));
  setProcessingOrganismSections();
};

const mapProcessingRow = (item) => {
  const canCreate = canModuleAction("muestras", "create");
  const canUpdate = canModuleAction("muestras", "update");
  const canDelete = canModuleAction("muestras", "delete");
  const folioR = item.folio_recepcion_num ? `R ${String(item.folio_recepcion_num).padStart(7, "0")}` : "-";
  return `
    <tr class="samples-data-row">
      <td>${sampleFolioChip(formatProcessingFolio(item), "P")}</td>
      <td>${folioR === "-" ? "-" : sampleFolioChip(folioR, "R")}</td>
      <td>${item.id_interno || "-"}</td>
      <td>${fmtDate(item.fecha_procesamiento)}</td>
      <td>${item.hora_procesamiento || "-"}</td>
      <td>${sampleStatusChip(item.estado)}</td>
      <td>
        <div class="samples-actions">
          <button class="icon-action-btn sample-action-btn" type="button" title="Extraer" aria-label="Extraer" data-processing-action="extract" data-processing-id="${item.id}" ${canCreate ? "" : "disabled"}><i class="bi bi-droplet-half"></i></button>
          <button class="icon-action-btn sample-action-btn" type="button" title="Editar" aria-label="Editar" data-processing-action="edit" data-processing-id="${item.id}" ${canUpdate ? "" : "disabled"}><i class="bi bi-pencil"></i></button>
          <button class="icon-action-btn sample-action-btn danger" type="button" title="Eliminar" aria-label="Eliminar" data-processing-action="delete" data-processing-id="${item.id}" ${canDelete ? "" : "disabled"}><i class="bi bi-trash3"></i></button>
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
  const search = (processingSearchInput.value || "").trim();
  try {
    const data = await getJsonAuth(`${API_BASE_URL}/samples/processing/?search=${encodeURIComponent(search)}`, token);
    processingCache = data.items || [];
    renderRows(processingTableBody, processingCache, mapProcessingRow, 7);
    updateSamplesFlowCounts();
    showProcessingFeedback("");
    loadedPages.add("muestras-processing");
  } catch (error) {
    processingCache = [];
    renderRows(processingTableBody, [], mapProcessingRow, 7);
    updateSamplesFlowCounts();
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
    await fillProcessingForm(resolveApiEntity(data));
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

  const search = (consumablesSearchInput.value || "").trim();
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
  const token = getStoredToken();
  if (!token || !consumableModal) {
    return;
  }

  getJsonAuth(`${API_BASE_URL}/consumables/${id}`, token)
    .then((data) => {
      const item = resolveApiEntity(data);
      fillConsumableForm(item || {});
      consumableModal.show();
    })
    .catch(() => {
      const fallback = consumablesCache.find((row) => Number(row.id) === Number(id));
      if (!fallback) {
        showConsumablesFeedback("No se pudo cargar el consumible", true);
        return;
      }
      fillConsumableForm(fallback);
      consumableModal.show();
    });
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

const openStockRefillModal = (type, id) => {
  if (!stockRefillModal || !stockRefillForm) {
    return;
  }
  const isReactivo = type === "reactivo";
  const collection = isReactivo ? reactivosCache : consumablesCache;
  const item = collection.find((row) => Number(row.id) === Number(id)) || {};
  const name = isReactivo ? formatReactivoName(item) : item.producto || "Consumible";

  stockRefillForm.reset();
  stockRefillTypeInput.value = type;
  stockRefillIdInput.value = id;
  stockRefillTitle.textContent = isReactivo ? "Rellenar Reactivo" : "Rellenar Consumible";
  stockRefillItemLabel.textContent = name;
  stockRefillAmountInput.step = isReactivo ? "0.0001" : "1";
  stockRefillAmountInput.placeholder = isReactivo ? "Cantidad a sumar" : "Piezas a sumar";
  stockRefillReasonInput.value = "Relleno manual de stock";
  stockRefillModal.show();
};

const getReactivoTypeConfig = (type) => {
  return REACTIVO_TYPES.find((item) => item.value === type) || null;
};

const REACTIVO_SHEET_TYPE_LABELS = {
  acidos: "\u00c1cidos",
  alcoholes_solventes: "Alcoholes y solventes org\u00e1nicos",
  compuestos_amonio: "Compuestos de Amonio",
  compuestos_sodio: "Compuestos de Sodio",
  estandares_preparados: "Est\u00e1ndares preparados",
  materiales_referencia: "Materiales de Referencia",
  miscelaneos: "Miscel\u00e1neos",
  columnas_cromatograficas: "Columnas cromatogr\u00e1ficas",
};

const getReactivoSheetType = (sheetName) => {
  const normalized = normalizeImportKey(sheetName);
  if (normalized === "consumibles" || normalized.includes("consumible")) return "";
  const aliases = {
    acidos: "acidos",
    alcoholes_y_solventes_organicos: "alcoholes_solventes",
    alcoholes_solventes_organicos: "alcoholes_solventes",
    alcoholes_y_solventes: "alcoholes_solventes",
    alcoholes_solventes: "alcoholes_solventes",
    compuestos_de_amonio: "compuestos_amonio",
    compuestos_amonio: "compuestos_amonio",
    compuestos_de_sodio: "compuestos_sodio",
    compuestos_sodio: "compuestos_sodio",
    estandares_preparados: "estandares_preparados",
    materiales_de_referencia: "materiales_referencia",
    materiales_referencia: "materiales_referencia",
    miscelaneos: "miscelaneos",
    columnas_cromatograficas: "columnas_cromatograficas",
  };
  return aliases[normalized] || "";
};

const getReactivoTypeLabel = (type) => {
  return getReactivoTypeConfig(type)?.label || type || "Sin tipo";
};

const escapeReactivoValue = (value) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

const getReactivoStockInfo = (item) => {
  const fields = [
    ["restante_190126", "L"],
    ["amount_in_stock", item.unidad || ""],
    ["cantidad_actual", item.unidad || ""],
    ["total_litros_2025", "L"],
    ["capacidad_litros", "L"],
    ["capacidad_kilos", "kg"],
    ["volumen", "volumen"],
    ["piezas", "piezas"],
  ];
  const source = fields.find(([key]) => parseNumberOrNull(item[key]) !== null);
  const current = source ? parseNumberOrNull(item[source[0]]) : null;
  const unit = source ? source[1] : "";
  const max =
    parseNumberOrNull(item.stock_maximo) ??
    parseNumberOrNull(item.capacidad_litros) ??
    parseNumberOrNull(item.capacidad_kilos) ??
    parseNumberOrNull(item.cantidad_total) ??
    parseNumberOrNull(item.total_litros_2025) ??
    parseNumberOrNull(item.amount_in_stock) ??
    current;
  return { current, max, unit };
};

const getReactivoStockText = (item) => {
  if (item.restante_190126 !== null && item.restante_190126 !== undefined && item.restante_190126 !== "") return `${fmt(item.restante_190126)} L restantes`;
  if (item.total_litros_2025 !== null && item.total_litros_2025 !== undefined && item.total_litros_2025 !== "") return `${fmt(item.total_litros_2025)} L`;
  if (item.amount_in_stock !== null && item.amount_in_stock !== undefined && item.amount_in_stock !== "") return fmt(item.amount_in_stock);
  if (item.capacidad_litros !== null && item.capacidad_litros !== undefined && item.capacidad_litros !== "") return `${fmt(item.capacidad_litros)} L`;
  if (item.capacidad_kilos !== null && item.capacidad_kilos !== undefined && item.capacidad_kilos !== "") return `${fmt(item.capacidad_kilos)} kg`;
  if (item.volumen !== null && item.volumen !== undefined && item.volumen !== "") return `${fmt(item.volumen)} volumen`;
  if (item.piezas !== null && item.piezas !== undefined && item.piezas !== "") return `${fmt(item.piezas)} piezas`;
  return "-";
};

const getReactivoStockView = (item) => {
  const { current, max, unit } = getReactivoStockInfo(item);
  if (current === null) {
    return "-";
  }
  const unitText = unit ? ` ${unit}` : "";
  return buildStockProgress(current, max || current, `${fmt(current)} de ${fmt(max || current)}${unitText}`);
};

const renderReactivosImportSheets = (summary = null) => {
  if (!importReactivosSheetsBody) return;
  if (!importReactivosSheets.length && !summary) {
    importReactivosSheetsBody.innerHTML = '<tr><td colspan="4" class="text-secondary">Sin archivo cargado.</td></tr>';
    return;
  }

  const processedByName = new Map((summary?.hojas_procesadas || []).map((sheet) => [sheet.hoja, sheet]));
  const ignoredByName = new Map((summary?.hojas_ignoradas || []).map((sheet) => [sheet.hoja, sheet]));
  importReactivosSheetsBody.innerHTML = importReactivosSheets
    .map((sheet) => {
      const processed = processedByName.get(sheet.name);
      const ignored = ignoredByName.get(sheet.name);
      const status = processed
        ? `Procesada: ${processed.insertados || 0} insertados, ${processed.actualizados || 0} actualizados`
        : ignored
        ? `Ignorada: ${ignored.motivo || "No aplica"}`
        : sheet.valid
        ? "Lista para importar"
        : "Ignorada";
      return `
        <tr>
          <td>${sheet.name}</td>
          <td>${sheet.label || "-"}</td>
          <td>${fmt(sheet.rows.length)}</td>
          <td>${status}</td>
        </tr>
      `;
    })
    .join("");
};

const renderReactivosImportSummary = (summary = null) => {
  if (!importReactivosSummary) return;
  if (!summary) {
    const validSheets = importReactivosSheets.filter((sheet) => sheet.valid).length;
    const ignoredSheets = importReactivosSheets.length - validSheets;
    importReactivosSummary.innerHTML = `
      <div class="d-flex flex-wrap gap-3">
        <span><strong>${fmt(importReactivosSheets.length)}</strong> hojas le\u00eddas</span>
        <span><strong>${fmt(validSheets)}</strong> hojas de reactivos</span>
        <span><strong>${fmt(ignoredSheets)}</strong> hojas ignoradas</span>
      </div>
    `;
    return;
  }

  importReactivosSummary.innerHTML = `
    <div class="d-flex flex-wrap gap-3">
      <span><strong>${fmt(summary.total_hojas_leidas || 0)}</strong> hojas le\u00eddas</span>
      <span><strong>${fmt((summary.hojas_procesadas || []).length)}</strong> procesadas</span>
      <span><strong>${fmt((summary.hojas_ignoradas || []).length)}</strong> ignoradas</span>
      <span><strong>${fmt(summary.reactivos_insertados || 0)}</strong> insertados</span>
      <span><strong>${fmt(summary.reactivos_actualizados || 0)}</strong> actualizados</span>
      <span><strong>${fmt(summary.filas_ignoradas || 0)}</strong> filas ignoradas</span>
      <span><strong>${fmt((summary.errores || []).length)}</strong> errores</span>
    </div>
  `;
};

const renderReactivosImportErrors = (errors = []) => {
  if (!importReactivosErrorsBody) return;
  if (!errors.length) {
    importReactivosErrorsBody.innerHTML = '<tr><td colspan="3" class="text-secondary">Sin errores reportados.</td></tr>';
    return;
  }
  importReactivosErrorsBody.innerHTML = errors.slice(0, 80).map((item) => `
    <tr>
      <td>${item.hoja || "-"}</td>
      <td>${item.fila || "-"}</td>
      <td>${item.error || "-"}</td>
    </tr>
  `).join("");
};

const resetReactivosImportUi = () => {
  importReactivosSheets = [];
  if (importReactivosForm) importReactivosForm.reset();
  renderReactivosImportSummary();
  renderReactivosImportSheets();
  renderReactivosImportErrors([]);
};

const workbookToReactivoSheets = async (file) => {
  /*
   * Importacion Excel de reactivos.
   * Pseudocodigo:
   * 1. Validar extension .xlsx/.xls.
   * 2. Leer workbook con SheetJS.
   * 3. Convertir cada hoja a JSON conservando tipos basicos.
   * 4. Clasificar hojas por nombre; el backend revalida antes de guardar.
   */
  const ext = file.name.split(".").pop().toLowerCase();
  if (!["xlsx", "xls"].includes(ext)) {
    throw new Error("Formato inv\u00e1lido. Solo se aceptan archivos .xlsx o .xls");
  }
  if (!window.XLSX) {
    throw new Error("No se pudo cargar el lector de Excel");
  }

  const buffer = await file.arrayBuffer();
  const workbook = window.XLSX.read(buffer, { type: "array", cellDates: true });
  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = window.XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });
    const sheetType = getReactivoSheetType(sheetName);
    return {
      name: sheetName,
      type: sheetType,
      label: REACTIVO_SHEET_TYPE_LABELS[sheetType] || "",
      valid: !!sheetType,
      rows,
    };
  });
};

const mapReactivoRow = (item) => {
  const canUpdate = canModuleAction("reactivos", "update");
  const canDelete = canModuleAction("reactivos", "delete");
  const typeLabel = getReactivoTypeLabel(item.tipo_reactivo || item.categoria);
  return `
    <tr>
      <td><span class="badge-row ajuste">${typeLabel}</span></td>
      <td><span class="fw-semibold">${formatReactivoName(item)}</span><div class="small text-secondary">${item.catalogo_parte_cas_lote || item.catalogo || item.cas_number || item.numero_cas || ""}</div></td>
      <td>${[item.marca, item.proveedor || item.vendor].filter(Boolean).join(" / ") || "-"}</td>
      <td>${getReactivoLocation(item)}</td>
      <td>${fmtDate(getReactivoExpiry(item))}</td>
      <td>${getReactivoStockView(item)}</td>
      <td><div class="d-flex gap-1 flex-wrap"><button class="role-action-btn" data-reactivo-action="refill" data-reactivo-id="${item.id}" ${canUpdate ? "" : "disabled"}>Rellenar</button><button class="role-action-btn" data-reactivo-action="edit" data-reactivo-id="${item.id}" ${canUpdate ? "" : "disabled"}>Editar</button><button class="role-action-btn" data-reactivo-action="delete" data-reactivo-id="${item.id}" ${canDelete ? "" : "disabled"}>Eliminar</button></div></td>
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
  reactivoTipoInput.innerHTML = [
    '<option value="">Seleccionar categor\u00eda</option>',
    ...REACTIVO_TYPES.map((type) => `<option value="${type.value}">${type.label}</option>`),
  ].join("");
};

const renderReactivoDynamicFields = (values = {}) => {
  /*
   * Formulario dinamico de reactivos.
   * Pseudocodigo:
   * 1. Leer la categoria seleccionada.
   * 2. Buscar la configuracion de campos de esa categoria.
   * 3. Renderizar solo inputs/selects/textareas necesarios.
   * 4. Mantener data-target para que el payload sea compatible con backend.
   */
  if (!reactivoDynamicFields || !reactivoTipoInput) return;
  const config = getReactivoTypeConfig(reactivoTipoInput.value);
  if (!config) {
    if (reactivoTypeHint) reactivoTypeHint.textContent = "Selecciona una categor\u00eda para cargar solo los campos necesarios.";
    reactivoDynamicFields.innerHTML = `
      <div class="col-12">
        <div class="reactivo-empty-state">
          <i class="bi bi-ui-checks-grid"></i>
          <span>Elige el tipo de reactivo para mostrar su formato de captura.</span>
        </div>
      </div>
    `;
    return;
  }
  if (reactivoTypeHint) reactivoTypeHint.textContent = config.hint;
  reactivoDynamicFields.innerHTML = config.fields
    .map((fieldKey) => {
      const meta = REACTIVO_FIELD_META[fieldKey] || { label: fieldKey };
      const target = meta.target || fieldKey;
      const value = values[fieldKey] ?? values[target] ?? "";
      const colClass = meta.wide ? "col-12" : "col-12 col-md-6 col-xl-4";
      const required = meta.required ? "required" : "";
      const requiredMark = meta.required ? " *" : "";
      const min = meta.min !== undefined ? ` min="${meta.min}"` : "";
      const step = meta.step !== undefined ? ` step="${meta.step}"` : "";
      if (meta.textarea) {
        return `<div class="${colClass}"><label class="form-label" for="reactivoField_${fieldKey}">${meta.label}${requiredMark}</label><textarea id="reactivoField_${fieldKey}" class="form-control reactivo-field" data-field="${fieldKey}" data-target="${target}" rows="3" ${required}>${escapeReactivoValue(value)}</textarea></div>`;
      }
      if (meta.options) {
        return `<div class="${colClass}"><label class="form-label" for="reactivoField_${fieldKey}">${meta.label}${requiredMark}</label><select id="reactivoField_${fieldKey}" class="form-select reactivo-field" data-field="${fieldKey}" data-target="${target}" ${required}><option value="">Seleccionar</option>${meta.options.map((option) => `<option value="${escapeReactivoValue(option)}" ${value === option ? "selected" : ""}>${option}</option>`).join("")}</select></div>`;
      }
      return `<div class="${colClass}"><label class="form-label" for="reactivoField_${fieldKey}">${meta.label}${requiredMark}</label><input id="reactivoField_${fieldKey}" class="form-control reactivo-field" data-field="${fieldKey}" data-target="${target}" type="${meta.type || "text"}"${step}${min} value="${escapeReactivoValue(value)}" ${required} /></div>`;
    })
    .join("");
};

const collectReactivoPayload = () => {
  const payload = { tipo_reactivo: reactivoTipoInput.value || "" };
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
  reactivoTipoInput.value = item?.tipo_reactivo || item?.categoria || "";
  renderReactivoDynamicFields(item || {});
};

const loadReactivosData = async (force = false) => {
  if (!force && loadedPages.has("reactivos")) return;
  const token = getStoredToken();
  if (!token) return;
  const search = (reactivosSearchInput.value || "").trim();
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
    resetReactivoForm(resolveApiEntity(data));
    if (reactivoModal) reactivoModal.show();
  } catch (error) {
    showReactivosFeedback(error.message || "No se pudo cargar el reactivo", true);
  }
};

const deleteReactivo = async (id) => {
  if (!window.confirm("¿Eliminar este reactivo?")) return;
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
const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const resolveApiEntity = (payload, preferredKeys = []) => {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const keys = [...preferredKeys, "item", "role", "user", "usuario", "data", "result"];
  for (const key of keys) {
    const value = payload[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value;
    }
  }

  if (Array.isArray(payload.items) && payload.items.length === 1 && typeof payload.items[0] === "object") {
    return payload.items[0];
  }

  return payload;
};

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
  const role = usuariosRoleFilter.value || "";
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
    await resetUserForm(resolveApiEntity(data));
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

const mapMovimientoRow = (item, compact = false) => {
  const originLabel = item.tabla_origen === "reactivos" ? "Reactivo" : item.tabla_origen === "consumibles" ? "Consumible" : item.tabla_origen || "-";
  const insumo = item.item_nombre || item.item_codigo || `#${item.id_item || "-"}`;
  if (compact) {
    return `
      <tr>
        <td>${fmtDate(item.fecha_hora)}</td>
        <td><span class="fw-semibold">${insumo}</span><div class="small text-secondary">${item.item_codigo || ""}</div></td>
        <td>${item.referencia || "-"}</td>
        <td>${fmt(item.cantidad)}</td>
        <td>${item.motivo || "-"}</td>
      </tr>
    `;
  }
  return `
    <tr>
      <td>${fmtDate(item.fecha_hora)}</td>
      <td><span class="fw-semibold">${insumo}</span><div class="small text-secondary">${item.item_codigo || ""}</div></td>
      <td>${item.referencia || "-"}</td>
      <td><span class="badge-row ajuste">${item.tipo || "-"}</span></td>
      <td>${originLabel}</td>
      <td>${fmt(item.cantidad)}</td>
      <td>${item.motivo || "-"}</td>
    </tr>
  `;
};

const updateMovimientosStats = (summary = {}) => {
  if (movimientosTotalCount) movimientosTotalCount.textContent = fmt(summary.total || 0);
  if (movimientosTodayCount) movimientosTodayCount.textContent = fmt(summary.hoy || 0);
  if (movimientosWeekCount) movimientosWeekCount.textContent = fmt(summary.semana || 0);
  if (movimientosMonthCount) movimientosMonthCount.textContent = fmt(summary.mes || 0);
  if (movimientosReactivosCount) movimientosReactivosCount.textContent = fmt(summary.reactivos || 0);
  if (movimientosConsumiblesCount) movimientosConsumiblesCount.textContent = fmt(summary.consumibles || 0);
};

const loadMovimientosData = async (force = false) => {
  /*
   * Movimientos de inventario.
   * Pseudocodigo:
   * 1. Obtener historial y resumen desde backend.
   * 2. Pintar tabla completa.
   * 3. Pintar subconjuntos de reactivos y consumibles.
   * 4. Actualizar contadores de hoy, semana, mes y totales.
   */
  if (!force && loadedPages.has("movimientos")) return;
  const token = getStoredToken();
  if (!token) return;

  try {
    const data = await getJsonAuth(`${API_BASE_URL}/inventory/movimientos`, token);
    const items = data.items || [];
    renderRows(movimientosTableBody, items, (row) => mapMovimientoRow(row), 7);
    renderRows(movimientosReactivosTableBody, items.filter((row) => row.tabla_origen === "reactivos"), (row) => mapMovimientoRow(row, true), 5);
    renderRows(movimientosConsumiblesTableBody, items.filter((row) => row.tabla_origen === "consumibles"), (row) => mapMovimientoRow(row, true), 5);
    updateMovimientosStats(data.summary || {});
    loadedPages.add("movimientos");
  } catch (_error) {
    renderRows(movimientosTableBody, [], (row) => mapMovimientoRow(row), 7);
    renderRows(movimientosReactivosTableBody, [], (row) => mapMovimientoRow(row, true), 5);
    renderRows(movimientosConsumiblesTableBody, [], (row) => mapMovimientoRow(row, true), 5);
    updateMovimientosStats({});
  }
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
  nombre: (equipoNombreInput.value || "").trim(),
  marca: (equipoMarcaInput.value || "").trim() || null,
  modelo: (equipoModeloInput.value || "").trim() || null,
  numero_serie: (equipoSerieInput.value || "").trim() || null,
  ubicacion: (equipoUbicacionInput.value || "").trim() || null,
  id_responsable: Number(equipoResponsableInput.value || 0) || null,
  fecha_prox_calibracion: equipoCalibracionInput.value || null,
  estado: equipoEstadoInput.value || "operativo",
});

const buildMantenimientoPayload = () => ({
  id_equipo: Number(mantenimientoEquipoInput.value || 0),
  tipo: mantenimientoTipoInput.value || "preventivo",
  fecha_programada: mantenimientoFechaProgramadaInput.value || null,
  fecha_realizado: mantenimientoFechaRealizadoInput.value || null,
  tecnico_proveedor: (mantenimientoTecnicoInput.value || "").trim() || null,
  id_responsable: Number(mantenimientoResponsableInput.value || 0) || null,
  estado: mantenimientoEstadoInput.value || "programado",
  observaciones: (mantenimientoObservacionesInput.value || "").trim() || null,
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
  const search = (equiposSearchInput.value || "").trim();
  const estado = equiposEstadoFilter.value || "";
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
  const search = (mantenimientoSearchInput.value || "").trim();
  const tipo = mantenimientoTipoFilter.value || "";
  const estado = mantenimientoEstadoFilter.value || "";
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
    await resetEquipoForm(resolveApiEntity(data));
    if (equipoModal) equipoModal.show();
  } catch (error) {
    showEquiposFeedback(error.message || "No se pudo cargar el equipo", true);
  }
};

const deleteEquipo = async (id) => {
  if (!window.confirm("Eliminar este equipo")) return;
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
    await resetMantenimientoForm(resolveApiEntity(data));
    if (mantenimientoModal) mantenimientoModal.show();
  } catch (error) {
    showMantenimientoFeedback(error.message || "No se pudo cargar el mantenimiento", true);
  }
};

const deleteMantenimiento = async (id) => {
  if (!window.confirm("Eliminar este mantenimiento")) return;
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
      loader: async () => {
        await loadMovimientosData(true);
      },
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
      if (page === "movimientos") {
        renderRows(movimientosTableBody, [], mapMovimientoRow, 7);
        renderRows(movimientosReactivosTableBody, [], (row) => mapMovimientoRow(row, true), 5);
        renderRows(movimientosConsumiblesTableBody, [], (row) => mapMovimientoRow(row, true), 5);
        updateMovimientosStats({});
      }
      if (page === "muestras") {
        renderRows(muestrasTableBody, [], mapSampleRow, 9);
        renderRows(processingTableBody, [], mapProcessingRow, 7);
        updateSamplesFlowCounts();
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
  await loadAuthConfig();
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
    const target = event.target instanceof HTMLElement ? event.target.closest("[data-role-action]") : null;
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

if (rolePermissionsBody) {
  rolePermissionsBody.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const row = target.closest("tr[data-permission-row]");
    if (!(row instanceof HTMLTableRowElement)) {
      return;
    }

    if (target.classList.contains("role-row-select-all")) {
      setRowPermissionsChecked(row, target.checked);
    }

    updateRowSelectAllControl(row);
    updateGlobalPermissionsSelectAll();
  });
}

if (rolePermissionsSelectAll instanceof HTMLInputElement) {
  rolePermissionsSelectAll.addEventListener("change", () => {
    const rows = getRolePermissionRows();
    rows.forEach((row) => {
      setRowPermissionsChecked(row, rolePermissionsSelectAll.checked);
      updateRowSelectAllControl(row);
    });
    updateGlobalPermissionsSelectAll();
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

    setButtonSubmittingState(roleSaveBtn, true, "Aplicando...");
    showRolesFeedback("Aplicando cambios...");
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
        rolesCache = rolesCache.map((role) =>
          Number(role.id) === editingId
            ? {
                ...role,
                nombre: payload.nombre,
                descripcion: payload.descripcion || null,
                activo: !!payload.activo,
              }
            : role
        );

        usuariosCache = usuariosCache.map((user) =>
          Number(user.id_rol) === editingId
            ? {
                ...user,
                rol: payload.nombre,
              }
            : user
        );

        updateUsuariosRoleFilter(usuariosCache);
        renderUsuariosTable();
        updateRoleStats(rolesCache);
        filterAndRenderRoles();
        showRolesFeedback("Rol actualizado");
      } else {
        const created = await sendJsonAuth("POST", `${API_BASE_URL}/admin/roles`, token, payload);
        rolesCache.unshift({
          id: created.id,
          nombre: payload.nombre,
          descripcion: payload.descripcion || null,
          activo: !!payload.activo,
          es_sistemico: 0,
          total_usuarios: 0,
        });
        updateRoleStats(rolesCache);
        filterAndRenderRoles();
        showRolesFeedback("Rol creado");
      }

      await loadUserRoleOptions(Number(userRoleInput?.value || 0) || null);
      loadedPages.add("roles");
      if (roleModal) {
        roleModal.hide();
      }
    } catch (error) {
      showRolesFeedback(error.message || "No se pudo guardar el rol", true);
    } finally {
      setButtonSubmittingState(roleSaveBtn, false, "Aplicando...");
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
      const ext = file.name.split(".").pop().toLowerCase();
      let csvRows;

      if (ext === "xlsx" || ext === "xls") {
        const buffer = await file.arrayBuffer();
        const workbook = window.XLSX.read(buffer, { type: "array", cellDates: true });
        const workbookHasSingleSheet = workbook.SheetNames.length === 1;
        let mergedRows = [];
        const detectedSet = new Set();
        const ignoredSheets = [];
        let validSheets = 0;

        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) {
            return;
          }

          const jsonRows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
          const matrix = jsonRows.map((row) => row.map((cell) => {
            if (cell === null || cell === undefined) return "";
            if (cell instanceof Date) return cell.toISOString().slice(0, 10);
            return String(cell);
          }));

          const mapped = mapCsvToPreviewRows(matrix);
          const hasConsumibleHeaders = hasConsumablesHeaderSignature(mapped.detected);
          const isConsumibleSheet =
            isConsumablesSheetName(sheetName) ||
            (workbookHasSingleSheet && hasConsumibleHeaders);
          if (!isConsumibleSheet) {
            ignoredSheets.push(sheetName);
            return;
          }

          validSheets += 1;
          mapped.detected.forEach((field) => detectedSet.add(field));
          mergedRows = mergedRows.concat(mapped.rows);
        });

        importDetectedColumns = Array.from(detectedSet);
        importPreviewRows = mergedRows;
        renderImportPreview();

        if (!validSheets) {
          showConsumablesFeedback("El Excel no contiene hojas de consumibles reconocidas", true);
          return;
        }

        if (!importPreviewRows.length) {
          showConsumablesFeedback("Las hojas de consumibles no contienen filas válidas", true);
          return;
        }

        showConsumablesFeedback(`Excel leído: ${validSheets} hoja(s) de consumibles. Hojas descartadas: ${ignoredSheets.length}`);
        return;
      } else {
        const readWithEncoding = (f, enc) =>
          new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result);
            fr.onerror = () => reject(fr.error);
            fr.readAsText(f, enc);
          });
        let text = await readWithEncoding(file, "UTF-8");
        if (text.includes("\uFFFD")) {
          text = await readWithEncoding(file, "windows-1252");
        }
        const delimiter = detectCsvDelimiter(text);
        csvRows = parseCsvText(text, delimiter);
      }

      const mapped = mapCsvToPreviewRows(csvRows);
      importDetectedColumns = mapped.detected;
      importPreviewRows = mapped.rows;
      renderImportPreview();

      if (importPreviewRows.length === 0) {
        showConsumablesFeedback("El archivo no contiene filas para importar", true);
      } else {
        showConsumablesFeedback("Archivo cargado correctamente");
      }
    } catch (_error) {
      importPreviewRows = [];
      importDetectedColumns = [];
      renderImportPreview();
      showConsumablesFeedback("No se pudo leer el archivo", true);
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

if (openImportReactivosModalBtn) {
  openImportReactivosModalBtn.addEventListener("click", () => {
    if (!canModuleAction("reactivos", "create")) {
      return;
    }
    resetReactivosImportUi();
    showReactivosFeedback("");
    if (importReactivosModal) {
      importReactivosModal.show();
    }
  });
}

if (importReactivosFileInput) {
  importReactivosFileInput.addEventListener("change", async () => {
    const file = importReactivosFileInput.files?.[0];
    if (!file) {
      resetReactivosImportUi();
      return;
    }

    try {
      importReactivosSheets = await workbookToReactivoSheets(file);
      renderReactivosImportSummary();
      renderReactivosImportSheets();
      renderReactivosImportErrors([]);

      const validSheets = importReactivosSheets.filter((sheet) => sheet.valid);
      if (!validSheets.length) {
        showReactivosFeedback("El Excel no contiene hojas de reactivos reconocidas", true);
      } else {
        showReactivosFeedback(`Excel leído: ${validSheets.length} hoja(s) de reactivos listas para importar`);
      }
    } catch (error) {
      importReactivosSheets = [];
      renderReactivosImportSummary();
      renderReactivosImportSheets();
      renderReactivosImportErrors([{ hoja: file.name, fila: "-", error: error.message || "No se pudo leer el Excel" }]);
      showReactivosFeedback(error.message || "No se pudo leer el Excel", true);
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
    const target = event.target instanceof HTMLElement ? event.target.closest("[data-reactivo-action]") : null;
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

    if (action === "refill") {
      if (!canModuleAction("reactivos", "update")) {
        return;
      }
      openStockRefillModal("reactivo", rowId);
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
      showReactivosFeedback("Selecciona la categor\u00eda y captura el nombre principal del reactivo", true);
      reactivoForm.reportValidity();
      return;
    }

    if (!reactivoForm.checkValidity()) {
      reactivoForm.reportValidity();
      showReactivosFeedback("Completa los campos obligatorios de esta categor\u00eda", true);
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

if (importReactivosForm) {
  importReactivosForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = getStoredToken();
    if (!token) {
      return;
    }

    const validSheets = importReactivosSheets.filter((sheet) => sheet.valid);
    if (!validSheets.length) {
      showReactivosFeedback("Primero carga un Excel con hojas de reactivos reconocidas", true);
      return;
    }

    importReactivosBtn.disabled = true;
    try {
      const result = await sendJsonAuth("POST", `${API_BASE_URL}/inventory/reactivos/import`, token, {
        sheets: importReactivosSheets.map((sheet) => ({
          name: sheet.name,
          rows: sheet.rows,
        })),
      });
      const summary = result.summary || {};
      renderReactivosImportSummary(summary);
      renderReactivosImportSheets(summary);
      renderReactivosImportErrors(summary.errores || []);
      showReactivosFeedback(
        `Importación completada. Insertados: ${fmt(summary.reactivos_insertados || 0)}. Actualizados: ${fmt(summary.reactivos_actualizados || 0)}. Filas ignoradas: ${fmt(summary.filas_ignoradas || 0)}.`
      );
      loadedPages.delete("reactivos");
      await loadReactivosData(true);
    } catch (error) {
      renderReactivosImportErrors([{ hoja: "-", fila: "-", error: error.message || "No se pudo importar el Excel" }]);
      showReactivosFeedback(error.message || "No se pudo importar el Excel", true);
    } finally {
      importReactivosBtn.disabled = false;
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
    if (!payload.email) {
      showUsuariosFeedback("El email es obligatorio", true);
      userEmailInput.focus();
      return;
    }
    const allowedDomain = authConfig.microsoft.allowedDomain || "cicese.mx";
    if (!payload.email.toLowerCase().endsWith(`@${allowedDomain}`)) {
      showUsuariosFeedback(`Solo puedes dar de alta correos @${allowedDomain}`, true);
      userEmailInput.focus();
      return;
    }
    if (!payload.id_rol) {
      showUsuariosFeedback("Selecciona un rol", true);
      userRoleInput.focus();
      return;
    }

    setButtonSubmittingState(userSaveBtn, true, "Aplicando...");
    showUsuariosFeedback("Aplicando cambios...");
    try {
      const editingId = Number(userIdInput.value || 0);
      const displayName = payload.nombre || payload.email.split("@")[0];
      const previousUser = editingId ? usuariosCache.find((item) => Number(item.id) === editingId) : null;
      if (editingId) {
        if (!canModuleAction("usuarios", "update")) throw new Error("No tienes permiso para editar usuarios");
        await sendJsonAuth("PUT", `${API_BASE_URL}/admin/usuarios/${editingId}`, token, payload);

        usuariosCache = usuariosCache.map((item) =>
          Number(item.id) === editingId
            ? {
                ...item,
                nombre: displayName,
                email: payload.email,
                id_rol: payload.id_rol,
                rol: getRoleNameById(payload.id_rol),
                departamento: payload.departamento,
                activo: !!payload.activo,
              }
            : item
        );

        if (previousUser && Number(previousUser.id_rol) !== Number(payload.id_rol)) {
          adjustRoleUserCount(previousUser.id_rol, -1);
          adjustRoleUserCount(payload.id_rol, 1);
        }

        showUsuariosFeedback("Usuario actualizado");
      } else {
        if (!canModuleAction("usuarios", "create")) throw new Error("No tienes permiso para crear usuarios");
        const created = await sendJsonAuth("POST", `${API_BASE_URL}/admin/usuarios`, token, payload);
        usuariosCache.unshift({
          id: created.id,
          nombre: displayName,
          email: payload.email,
          id_rol: payload.id_rol,
          rol: getRoleNameById(payload.id_rol),
          departamento: payload.departamento,
          activo: !!payload.activo,
          creado_en: new Date().toISOString(),
          ultimo_acceso: null,
        });
        adjustRoleUserCount(payload.id_rol, 1);
        showUsuariosFeedback("Usuario creado");
      }

      updateUsuariosStats(usuariosCache);
      updateUsuariosRoleFilter(usuariosCache);
      renderUsuariosTable();
      loadedPages.add("usuarios");
      if (userModal) safelyHideModal(userModal, openCreateUserBtn || mobileUserBtn || null);
    } catch (error) {
      showUsuariosFeedback(error.message || "No se pudo guardar el usuario", true);
    } finally {
      setButtonSubmittingState(userSaveBtn, false, "Aplicando...");
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
    const target = event.target instanceof HTMLElement ? event.target.closest("[data-consumable-action]") : null;
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

    if (action === "refill") {
      if (!canModuleAction("consumibles", "update")) {
        return;
      }
      openStockRefillModal("consumible", rowId);
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

if (stockRefillForm) {
  stockRefillForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = getStoredToken();
    if (!token) {
      return;
    }

    const type = stockRefillTypeInput.value;
    const id = Number(stockRefillIdInput.value || 0);
    const amount = parseNumberOrNull(stockRefillAmountInput.value);
    if (!id || !type || amount === null || amount <= 0) {
      stockRefillAmountInput.focus();
      return;
    }

    stockRefillSaveBtn.disabled = true;
    try {
      const payload = {
        cantidad: type === "consumible" ? Math.round(amount) : amount,
        motivo: (stockRefillReasonInput.value || "").trim() || "Relleno manual de stock",
      };
      if (type === "reactivo") {
        await sendJsonAuth("POST", `${API_BASE_URL}/inventory/reactivos/${id}/refill`, token, payload);
        showReactivosFeedback("Stock de reactivo rellenado");
        loadedPages.delete("reactivos");
        await loadReactivosData(true);
      } else {
        await sendJsonAuth("POST", `${API_BASE_URL}/consumables/${id}/refill`, token, payload);
        showConsumablesFeedback("Stock de consumible rellenado");
        loadedPages.delete("consumibles");
        await loadConsumablesData(true);
      }
      loadedPages.delete("movimientos");
      if (stockRefillModal) {
        safelyHideModal(stockRefillModal, type === "reactivo" ? reactivosSearchInput : consumablesSearchInput);
      }
    } catch (error) {
      const message = error.message || "No se pudo rellenar stock";
      if (type === "reactivo") {
        showReactivosFeedback(message, true);
      } else {
        showConsumablesFeedback(message, true);
      }
    } finally {
      stockRefillSaveBtn.disabled = false;
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
      showConsumablesFeedback("Primero carga un archivo CSV o Excel y valida filas", true);
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
      showConsumablesFeedback(error.message || "No se pudo importar el archivo", true);
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

samplesFlowCards.forEach((card) => {
  card.addEventListener("click", async () => {
    const section = card.dataset.samplesFlowCard;
    if (!section) {
      return;
    }
    await setSamplesSection(section, true);
  });
});

if (sampleClearBtn) {
  sampleClearBtn.addEventListener("click", async () => {
    await resetSampleForm(true);
    showSamplesFeedback("");
  });
}

document.querySelectorAll(".sample-custody-radio").forEach((input) => {
  input.addEventListener("change", () => {
    if (sampleCustodioLugarInput) {
      sampleCustodioLugarInput.value = input.value;
    }
    if (input.value !== "otro" && sampleCustodioOtroInput) {
      sampleCustodioOtroInput.value = "";
    }
  });
});

if (sampleCustodioOtroInput) {
  sampleCustodioOtroInput.addEventListener("input", () => {
    if (!sampleCustodioOtroInput.value.trim()) {
      return;
    }
    if (sampleCustodioLugarInput) {
      sampleCustodioLugarInput.value = "otro";
    }
    document.querySelectorAll(".sample-custody-radio").forEach((input) => {
      input.checked = input.value === "otro";
    });
  });
}

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
    if (sampleMuestraUnicaInput.checked) {
      return;
    }
    syncSampleLoteRowsCount(sampleLoteCountInput.value);
  });
}

if (sampleMuestraUnicaInput) {
  sampleMuestraUnicaInput.addEventListener("change", () => {
    if (!sampleMuestraUnicaInput.checked && sampleLoteModeVisualInput) {
      sampleLoteModeVisualInput.checked = true;
    }
    toggleSampleModeUI();
  });
}

if (sampleLoteModeVisualInput) {
  sampleLoteModeVisualInput.addEventListener("change", () => {
    if (sampleMuestraUnicaInput) {
      sampleMuestraUnicaInput.checked = !sampleLoteModeVisualInput.checked;
    }
    toggleSampleModeUI();
  });
}

[sampleFechaRecepcionInput, sampleHoraRecepcionInput].forEach((input) => {
  if (input) {
    input.addEventListener("input", syncSampleReceptionMirrors);
  }
});

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
    const target = event.target instanceof HTMLElement ? event.target.closest("[data-sample-action]") : null;
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
    const target = event.target instanceof HTMLElement ? event.target.closest("[data-processing-action]") : null;
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
    const target = event.target instanceof HTMLElement ? event.target.closest("[data-extraction-action]") : null;
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

initializeSignaturePads();

if (processingSingleSampleVisualInput) {
  processingSingleSampleVisualInput.addEventListener("change", () => {
    if (!processingSingleSampleVisualInput.checked) {
      syncProcessingSampleTypeVisual();
      return;
    }
    if (processingMuestraTipoInput) {
      processingMuestraTipoInput.value = "unica";
    }
    if (processingIdInternoInput) {
      processingIdInternoInput.disabled = false;
    }
    if (processingLoteSelectionWrap) {
      processingLoteSelectionWrap.classList.add("d-none");
    }
    syncProcessingSampleTypeVisual();
  });
}

if (processingLotSampleVisualInput) {
  processingLotSampleVisualInput.addEventListener("change", () => {
    if (!processingLotSampleVisualInput.checked) {
      syncProcessingSampleTypeVisual();
      return;
    }
    if (processingMuestraTipoInput) {
      processingMuestraTipoInput.value = "lote";
    }
    if (processingIdInternoInput) {
      processingIdInternoInput.disabled = true;
    }
    if (processingLoteSelectionWrap) {
      processingLoteSelectionWrap.classList.remove("d-none");
    }
    syncProcessingIdInternoFromLoteSelection();
    syncProcessingSampleTypeVisual();
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

if (extractionSingleSampleVisualInput) {
  extractionSingleSampleVisualInput.addEventListener("change", () => {
    if (!extractionSingleSampleVisualInput.checked) {
      syncExtractionSampleTypeVisual();
      return;
    }
    if (extractionMuestraTipoInput) extractionMuestraTipoInput.value = "unica";
    syncExtractionSampleTypeVisual();
  });
}

if (extractionLotSampleVisualInput) {
  extractionLotSampleVisualInput.addEventListener("change", () => {
    if (!extractionLotSampleVisualInput.checked) {
      syncExtractionSampleTypeVisual();
      return;
    }
    if (extractionMuestraTipoInput) extractionMuestraTipoInput.value = "lote";
    syncExtractionSampleTypeVisual();
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
    await loadInsumoOptions();
    _autoResolveFixedFormInsumos("processingForm");
    const payload = buildProcessingPayload();
    if (!payload.folio_num) {
      showProcessingFeedback("El folio de procesamiento es obligatorio", true);
      processingFolioInput.focus();
      return;
    }

    if (payload.muestra_tipo === "unica" && !payload.id_interno) {
      showProcessingFeedback("La recepci\u00f3n seleccionada es muestra \u00fanica, falta ID interno", true);
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
      loadedPages.delete("movimientos");
      await loadProcessingData(true);
      await loadMovimientosData(true);
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

    await loadInsumoOptions();
    _autoResolveFixedExtractionReactivos();
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

    const stockErrors = _validateExtractionStock();
    if (stockErrors.length > 0) {
      showExtractionFeedback("No se puede guardar: stock insuficiente para los siguientes reactivos:\n" + stockErrors.join("\n"), true);
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
        showExtractionFeedback("Extracci\u00f3n actualizada. Inventario descontado autom\u00e1ticamente.");
      } else {
        if (!canModuleAction("muestras", "create")) {
          throw new Error("No tienes permiso para crear extraccion");
        }
        await sendJsonAuth("POST", `${API_BASE_URL}/samples/extraction/`, token, payload);
        showExtractionFeedback("Extracci\u00f3n creada. Inventario descontado autom\u00e1ticamente.");
      }

      loadedPages.delete("muestras-extraction");
      loadedPages.delete("movimientos");
      await loadExtractionData(true);
      await loadMovimientosData(true);
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

    if (!payload.recibido_por) {
      showSamplesFeedback("El campo Recibido por es obligatorio", true);
      sampleRecibidoPorVisualInput?.focus();
      return;
    }

    if (!payload.medio_recepcion) {
      showSamplesFeedback("El campo Medio de recepcion es obligatorio", true);
      sampleReceptionMethodVisualInput?.focus();
      return;
    }

    if (payload.muestra_unica && !payload.id_interno) {
      showSamplesFeedback("En muestra \u00fanica, el ID interno es obligatorio", true);
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
        showSamplesFeedback("Recepci\u00f3n actualizada");
      } else {
        if (!canModuleAction("muestras", "create")) {
          throw new Error("No tienes permiso para crear muestras");
        }
        await sendJsonAuth("POST", `${API_BASE_URL}/samples/reception/`, token, payload);
        showSamplesFeedback("Recepci\u00f3n creada");
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

// Botones "Agregar insumo" en formularios de extracción y procesamiento
const extractionAddInsumoBtn = document.getElementById("extractionAddInsumoBtn");
if (extractionAddInsumoBtn) {
  extractionAddInsumoBtn.addEventListener("click", () => addInventarioRow("extractionInventarioBody"));
}
const processingAddInsumoBtn = document.getElementById("processingAddInsumoBtn");
if (processingAddInsumoBtn) {
  processingAddInsumoBtn.addEventListener("click", () => addInventarioRow("processingInventarioBody"));
}
// Delegación: quitar fila, seleccionar opción del dropdown, cerrar al hacer clic fuera
document.addEventListener("click", (e) => {
  if (e.target.closest(".remove-insumo-row")) {
    e.target.closest("tr")?.remove();
    return;
  }
  const opt = e.target.closest(".insumo-ref-option");
  if (opt) {
    const wrapper = opt.closest(".insumo-search-wrapper");
    if (wrapper) {
      const refInput = wrapper.querySelector(".insumo-ref");
      const searchInput = wrapper.querySelector(".insumo-ref-search");
      const dropdown = wrapper.querySelector(".insumo-ref-dropdown");
      if (refInput) refInput.value = opt.dataset.ref || "";
      if (searchInput) searchInput.value = opt.dataset.label || opt.dataset.ref || "";
      if (dropdown) dropdown.style.display = "none";
      if (wrapper.dataset.tipo === "reactivo") _checkReactivoStock(wrapper);
    }
    return;
  }
  if (!e.target.closest(".insumo-search-wrapper")) {
    document.querySelectorAll(".insumo-ref-dropdown").forEach((d) => { d.style.display = "none"; });
  }
});
// Mostrar dropdown al enfocar el input de búsqueda
document.addEventListener("focusin", (e) => {
  if (!e.target.matches(".insumo-ref-search")) return;
  const wrapper = e.target.closest(".insumo-search-wrapper");
  if (!wrapper) return;
  const tipo = wrapper.dataset.tipo || e.target.closest("tr")?.querySelector(".insumo-tipo")?.value || "consumible";
  const dropdown = wrapper.querySelector(".insumo-ref-dropdown");
  loadInsumoOptions().then(() => _renderInsumoDropdown(dropdown, tipo, e.target.value));
});
// Filtrar al escribir
document.addEventListener("input", (e) => {
  if (!e.target.matches(".insumo-ref-search")) return;
  const wrapper = e.target.closest(".insumo-search-wrapper");
  if (!wrapper) return;
  const tipo = wrapper.dataset.tipo || e.target.closest("tr")?.querySelector(".insumo-tipo")?.value || "consumible";
  const dropdown = wrapper.querySelector(".insumo-ref-dropdown");
  const refInput = wrapper.querySelector(".insumo-ref");
  if (refInput) refInput.value = "";
  loadInsumoOptions().then(() => _renderInsumoDropdown(dropdown, tipo, e.target.value));
});
// Limpiar y reabrir dropdown al cambiar tipo
document.addEventListener("change", (e) => {
  if (!e.target.matches(".insumo-tipo")) return;
  const tr = e.target.closest("tr");
  if (!tr) return;
  const wrapper = tr.querySelector(".insumo-search-wrapper");
  if (!wrapper) return;
  const refInput = wrapper.querySelector(".insumo-ref");
  const searchInput = wrapper.querySelector(".insumo-ref-search");
  const dropdown = wrapper.querySelector(".insumo-ref-dropdown");
  if (refInput) refInput.value = "";
  if (searchInput) { searchInput.value = ""; searchInput.focus(); }
  if (dropdown) dropdown.style.display = "none";
});
// Ocultar dropdown al perder el foco (con delay para permitir clicks)
document.addEventListener("focusout", (e) => {
  if (!e.target.matches(".insumo-ref-search")) return;
  const wrapper = e.target.closest(".insumo-search-wrapper");
  setTimeout(() => {
    const dropdown = wrapper?.querySelector(".insumo-ref-dropdown");
    if (dropdown) dropdown.style.display = "none";
  }, 200);
});

if (microsoftLoginBtn) {
  microsoftLoginBtn.addEventListener("click", async () => {

    try {
      const data = await loginWithMicrosoft();
      if (!data) return;
      setSession(data.token, data.user);
      setPermissions(data.permissions || {});
      applyNavigationPermissions();
      showDashboard(data.user || {});
      loadedPages.clear();
      const firstPage = getFirstAllowedPage();
      activePage = firstPage || "dashboard";
      await setActivePage(activePage);
    } catch (error) {
      showLoginFeedback(error.message || "No fue posible iniciar sesion con Microsoft", true);
    } finally {
      setButtonSubmittingState(microsoftLoginBtn, false, "Conectando...");
    }
  });
}

emailLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput?.value.trim().toLowerCase();
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
  if (msalClient) {
    const account = msalClient.getActiveAccount && msalClient.getActiveAccount();
    if (account) {
      msalClient.logoutPopup({ account }).catch(() => {});
    }
  }
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
  { page: "reactivos",    label: "Reactivos",                desc: "Gestiona el cat\u00e1logo de reactivos del laboratorio",    icon: "bi-prescription2",              color: "" },
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
