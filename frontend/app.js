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
const consumiblesTableBody = document.getElementById("consumablesTableBody");
const equiposTableBody = document.getElementById("equiposTableBody");
const muestrasTableBody = document.getElementById("muestrasTableBody");
const movimientosTableBody = document.getElementById("movimientosTableBody");
const mantenimientosTableBody = document.getElementById("mantenimientosTableBody");
const documentosTableBody = document.getElementById("documentosTableBody");
const rolesTableBody = document.getElementById("rolesTableBody");
const usuariosTableBody = document.getElementById("usuariosTableBody");
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
const sampleIdInternoInput = document.getElementById("sampleIdInternoInput");
const sampleIdInternoFieldWrap = document.getElementById("sampleIdInternoFieldWrap");
const sampleEstadoInput = document.getElementById("sampleEstadoInput");
const sampleEspecificacionesInput = document.getElementById("sampleEspecificacionesInput");
const sampleLoteSectionWrap = document.getElementById("sampleLoteSectionWrap");
const sampleLoteTableBody = document.getElementById("sampleLoteTableBody");
const addSampleLoteRowBtn = document.getElementById("addSampleLoteRowBtn");
const sampleAnalisisObservacionesInput = document.getElementById("sampleAnalisisObservacionesInput");
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
const processingMuestraTipoInput = document.getElementById("processingMuestraTipoInput");
const processingOtroInput = document.getElementById("processingOtroInput");
const processingObservacionesInput = document.getElementById("processingObservacionesInput");
const processingQuienProcesoInput = document.getElementById("processingQuienProcesoInput");
const processingQuienSupervisoInput = document.getElementById("processingQuienSupervisoInput");
const processingSaveBtn = document.getElementById("processingSaveBtn");
const processingBivalvosWrap = document.getElementById("processingBivalvosWrap");
const processingSardinasWrap = document.getElementById("processingSardinasWrap");

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
const extractionObservacionesInput = document.getElementById("extractionObservacionesInput");
const extractionQuienExtrajoInput = document.getElementById("extractionQuienExtrajoInput");
const extractionQuienSupervisoInput = document.getElementById("extractionQuienSupervisoInput");
const extractionSaveBtn = document.getElementById("extractionSaveBtn");

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
let consumablesCache = [];
let samplesCache = [];
let processingCache = [];
let extractionCache = [];
let processingEquipmentCache = [];
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
    return;
  }
  items.forEach((item) => sampleLoteTableBody.appendChild(buildSampleLoteRow(item)));
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
      id_interno: (row.querySelector(".sample-lote-id-interno")?.value || "").trim() || null,
      nombre_organismo: (row.querySelector(".sample-lote-organismo")?.value || "").trim() || null,
      cantidad_volumen: (row.querySelector(".sample-lote-cantidad")?.value || "").trim() || null,
      sitio_muestreo: (row.querySelector(".sample-lote-sitio")?.value || "").trim() || null,
      fecha_muestra: row.querySelector(".sample-lote-fecha")?.value || null,
      informacion_adicional: (row.querySelector(".sample-lote-info")?.value || "").trim() || null,
    }))
    .filter((row) => Object.values(row).some((value) => value));
};

const toggleSampleModeUI = () => {
  const isUnique = !!sampleMuestraUnicaInput?.checked;
  if (sampleIdInternoFieldWrap) {
    sampleIdInternoFieldWrap.classList.toggle("d-none", !isUnique);
  }
  if (sampleIdInternoInput) {
    sampleIdInternoInput.disabled = !isUnique;
    if (!isUnique) {
      sampleIdInternoInput.value = "";
    }
  }
  if (sampleLoteSectionWrap) {
    sampleLoteSectionWrap.classList.toggle("d-none", isUnique);
  }
  if (addSampleLoteRowBtn) {
    addSampleLoteRowBtn.disabled = isUnique;
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
        <td><input type="radio" name="insp-${btoa(unescape(encodeURIComponent(req))).slice(0, 12)}" class="sample-insp-status" data-req="${req}" value="C" ${status === "C" ? "checked" : ""} /></td>
        <td><input type="radio" name="insp-${btoa(unescape(encodeURIComponent(req))).slice(0, 12)}" class="sample-insp-status" data-req="${req}" value="NC" ${status === "NC" ? "checked" : ""} /></td>
        <td><input type="radio" name="insp-${btoa(unescape(encodeURIComponent(req))).slice(0, 12)}" class="sample-insp-status" data-req="${req}" value="NA" ${status === "NA" ? "checked" : ""} /></td>
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
  ensureSampleLoteRows();
  toggleSampleModeUI();
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
    lote_muestras: isUnique ? [] : collectSampleLoteRows(true),
    analisis: {
      tipos: Array.from(document.querySelectorAll(".sample-analisis-tipo:checked")).map((el) => el.value),
      metodos: Array.from(document.querySelectorAll(".sample-analisis-metodo:checked")).map((el) => el.value),
      tipos_muestra: Array.from(document.querySelectorAll(".sample-analisis-muestra:checked")).map((el) => el.value),
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
  await loadProcessingOptionsForExtraction(prefillProcessing?.id || null);

  if (prefillProcessing && extractionProcessingSelect) {
    extractionProcessingSelect.value = String(prefillProcessing.id || "");
    extractionIdInternoInput.value = prefillProcessing.id_interno || "";
    extractionMuestraTipoInput.value = prefillProcessing.muestra_tipo || "unica";
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
    registro_pesos: [
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

  document.querySelectorAll(".extraction-molienda").forEach((el) => {
    el.checked = item.tipo_molienda === el.value;
  });

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
    id_interno: (processingIdInternoInput.value || "").trim() || null,
    tipo_organismo: selectedOrganism ? [selectedOrganism] : [],
    parte_organismo: collectCheckedValues(".processing-parte:checked"),
    bivalvos_steps: bivalvos,
    sardinas_steps: sardinas,
    otro_procesamiento: (processingOtroInput.value || "").trim() || null,
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
  processingMuestraTipoInput.value = item.muestra_tipo || "unica";
  processingIdInternoInput.value = item.id_interno || "";
  processingEstadoInput.value = item.estado || "registrada";

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
      url: `${API_BASE_URL}/inventory/reactivos`,
      tbody: reactivosTableBody,
      emptyCols: 5,
      mapRow: (r) => `<tr><td>${r.nombre || "-"}</td><td>${r.categoria || "-"}</td><td>${fmt(r.cantidad_actual)}</td><td>${r.unidad || "-"}</td><td>${fmt(r.stock_minimo)}</td></tr>`,
    },
    consumibles: {
      loader: async () => {
        await loadConsumablesData(true);
      },
    },
    equipos: {
      url: `${API_BASE_URL}/inventory/equipos`,
      tbody: equiposTableBody,
      emptyCols: 5,
      mapRow: (r) => `<tr><td>${r.nombre || "-"}</td><td>${r.marca || "-"}</td><td>${r.modelo || "-"}</td><td>${r.estado || "-"}</td><td>${fmtDate(r.fecha_prox_calibracion)}</td></tr>`,
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
      url: `${API_BASE_URL}/inventory/mantenimientos`,
      tbody: mantenimientosTableBody,
      emptyCols: 5,
      mapRow: (r) => `<tr><td>${r.equipo || "-"}</td><td>${r.tipo || "-"}</td><td>${r.estado || "-"}</td><td>${fmtDate(r.fecha_programada)}</td><td>${r.responsable || "-"}</td></tr>`,
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
      url: `${API_BASE_URL}/admin/usuarios`,
      tbody: usuariosTableBody,
      emptyCols: 5,
      mapRow: (r) => `<tr><td>${r.nombre || "-"}</td><td>${r.email || "-"}</td><td>${r.rol || "-"}</td><td>${r.departamento || "-"}</td><td>${r.activo ? "Si" : "No"}</td></tr>`,
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
    }
  });
}

if (sampleMuestraUnicaInput) {
  sampleMuestraUnicaInput.addEventListener("change", () => {
    toggleSampleModeUI();
  });
}

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
        processingIdInternoInput.value = source.id_interno || "";
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
  processingReceptionSelect.addEventListener("change", () => {
    const selected = processingReceptionSelect.selectedOptions?.[0];
    if (!selected) {
      return;
    }
    const idInterno = selected.dataset.idInterno || "";
    if (!processingIdInternoInput.value) {
      processingIdInternoInput.value = idInterno;
    }
  });
}

if (extractionProcessingSelect) {
  extractionProcessingSelect.addEventListener("change", () => {
    const selected = extractionProcessingSelect.selectedOptions?.[0];
    if (!selected) {
      return;
    }
    const idInterno = selected.dataset.idInterno || "";
    if (!extractionIdInternoInput.value) {
      extractionIdInternoInput.value = idInterno;
    }
    const muestraTipo = selected.dataset.muestraTipo || "";
    if (muestraTipo) {
      extractionMuestraTipoInput.value = muestraTipo;
    }
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
