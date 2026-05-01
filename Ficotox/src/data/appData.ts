export type SectionKey =
  | 'dashboard'
  | 'reactivos'
  | 'consumibles'
  | 'equipos'
  | 'muestras'
  | 'movimientos'
  | 'mantenimiento'
  | 'reportes'
  | 'roles'
  | 'usuarios'

export type Tone = 'neutral' | 'teal' | 'green' | 'amber' | 'red' | 'blue'

export type Badge = {
  text: string
  tone: Tone
}

export type RowCell = string | Badge

export type ListRow = {
  key: string
  cells: RowCell[]
}

export type StatItem = {
  label: string
  value: string
  tone?: Tone
}

export type ModuleConfig = {
  title: string
  subtitle: string
  cta: string
  searchPlaceholder: string
  filters: string[]
  stats: StatItem[]
  columns: string[]
  rows: ListRow[]
}

export type NavItem = {
  key: SectionKey
  label: string
  icon: string
  path: string
}

export const mainNav: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'DB', path: '/dashboard' },
  { key: 'reactivos', label: 'Reactivos', icon: 'R', path: '/reactivos' },
  { key: 'consumibles', label: 'Consumibles', icon: 'C', path: '/consumibles' },
  { key: 'equipos', label: 'Equipos', icon: 'E', path: '/equipos' },
  { key: 'muestras', label: 'Muestras', icon: 'M', path: '/muestras' },
  { key: 'movimientos', label: 'Movimientos', icon: 'MV', path: '/movimientos' },
  { key: 'mantenimiento', label: 'Mantenimiento', icon: 'MT', path: '/mantenimiento' },
]

export const docsNav: NavItem[] = [
  {
    key: 'reportes',
    label: 'Reportes Mantenimiento',
    icon: 'RP',
    path: '/reportes-mantenimiento',
  },
]

export const adminNav: NavItem[] = [
  { key: 'roles', label: 'Roles', icon: 'RL', path: '/roles' },
  { key: 'usuarios', label: 'Usuarios', icon: 'US', path: '/usuarios' },
]

export const dashboardCards: Array<{
  key: SectionKey
  title: string
  description: string
  tone: Tone
}> = [
  {
    key: 'reactivos',
    title: 'Reactivos',
    description: 'Gestiona el catalogo de reactivos del laboratorio',
    tone: 'teal',
  },
  {
    key: 'consumibles',
    title: 'Consumibles',
    description: 'Control de materiales consumibles',
    tone: 'amber',
  },
  {
    key: 'equipos',
    title: 'Equipos',
    description: 'Administra los equipos del laboratorio',
    tone: 'blue',
  },
  {
    key: 'muestras',
    title: 'Muestras',
    description: 'Registro y seguimiento de muestras',
    tone: 'green',
  },
]

export const sectionPathByKey: Record<SectionKey, string> = {
  dashboard: '/dashboard',
  reactivos: '/reactivos',
  consumibles: '/consumibles',
  equipos: '/equipos',
  muestras: '/muestras',
  movimientos: '/movimientos',
  mantenimiento: '/mantenimiento',
  reportes: '/reportes-mantenimiento',
  roles: '/roles',
  usuarios: '/usuarios',
}

export const moduleData: Record<Exclude<SectionKey, 'dashboard'>, ModuleConfig> = {
  reactivos: {
    title: 'Reactivos',
    subtitle: 'Gestion del catalogo de reactivos del laboratorio',
    cta: 'Nuevo Reactivo',
    searchPlaceholder: 'Buscar por nombre o CAS...',
    filters: ['Todas las categorias'],
    stats: [
      { label: 'Total Reactivos', value: '6' },
      { label: 'Disponibles', value: '3', tone: 'green' },
      { label: 'Bajo Stock', value: '1', tone: 'amber' },
      { label: 'Alertas', value: '2', tone: 'red' },
    ],
    columns: ['Nombre', 'CAS', 'Categoria', 'Cantidad', 'Ubicacion', 'Vencimiento', 'Estado'],
    rows: [
      {
        key: 'r1',
        cells: ['Acido Clorhidrico 37%', '7647-01-0', 'Acidos', '2500 mL', 'A-01-03', '14/8/2026', { text: 'Disponible', tone: 'green' }],
      },
      {
        key: 'r2',
        cells: ['Metanol HPLC', '67-56-1', 'Solventes', '150 mL', 'B-02-01', '30/11/2026', { text: 'Bajo Stock', tone: 'amber' }],
      },
      {
        key: 'r3',
        cells: ['Acetonitrilo HPLC', '75-05-8', 'Solventes', '0 mL', 'B-02-02', '19/3/2027', { text: 'Agotado', tone: 'red' }],
      },
      {
        key: 'r4',
        cells: ['Cloruro de Sodio ACS', '7647-14-5', 'Sales', '800 g', 'C-01-05', '9/1/2025', { text: 'Vencido', tone: 'red' }],
      },
    ],
  },
  consumibles: {
    title: 'Consumibles',
    subtitle: 'Control de materiales consumibles',
    cta: 'Nuevo Consumible',
    searchPlaceholder: 'Buscar por nombre o marca...',
    filters: ['Todas las categorias'],
    stats: [
      { label: 'Total', value: '6' },
      { label: 'Disponibles', value: '3', tone: 'green' },
      { label: 'Bajo Stock', value: '2', tone: 'amber' },
      { label: 'Agotados', value: '1', tone: 'red' },
    ],
    columns: ['Nombre', 'Categoria', 'Marca', 'Cantidad', 'Ubicacion', 'Estado'],
    rows: [
      {
        key: 'c1',
        cells: ['Guantes de Nitrilo (M)', 'Proteccion', 'Kimtech', '500 piezas', 'ALM-01', { text: 'Disponible', tone: 'green' }],
      },
      {
        key: 'c2',
        cells: ['Puntas de Micropipeta 100-1000 uL', 'Pipeteo', 'Eppendorf', '45 piezas', 'ALM-02', { text: 'Bajo Stock', tone: 'amber' }],
      },
      {
        key: 'c3',
        cells: ['Tubos Falcon 50 mL', 'Contenedores', 'Corning', '0 piezas', 'ALM-03', { text: 'Agotado', tone: 'red' }],
      },
    ],
  },
  equipos: {
    title: 'Equipos',
    subtitle: 'Administracion de equipos del laboratorio',
    cta: 'Nuevo Equipo',
    searchPlaceholder: 'Buscar por nombre, marca o modelo...',
    filters: ['Todos los estados'],
    stats: [
      { label: 'Total Equipos', value: '6' },
      { label: 'Operativos', value: '3', tone: 'green' },
      { label: 'En Mantenimiento', value: '1', tone: 'amber' },
      { label: 'Alertas', value: '2', tone: 'red' },
    ],
    columns: ['Equipo', 'Marca / Modelo', 'No. Serie', 'Ubicacion', 'Responsable', 'Prox. Calibracion', 'Estado'],
    rows: [
      {
        key: 'e1',
        cells: ['HPLC', 'Agilent 1260 Infinity II', 'DE12345678', 'Lab-01', 'Dr. Garcia', '14/5/2026', { text: 'Operativo', tone: 'green' }],
      },
      {
        key: 'e2',
        cells: ['Espectrofotometro UV-Vis', 'Thermo Scientific Evolution 300', 'UV67891234', 'Lab-02', 'Dra. Lopez', '19/3/2026', { text: 'Calibracion Pendiente', tone: 'blue' }],
      },
      {
        key: 'e3',
        cells: ['Centrifuga', 'Eppendorf 5430R', 'CF78901234', 'Lab-03', 'Dr. Garcia', '4/2/2026', { text: 'En Mantenimiento', tone: 'amber' }],
      },
    ],
  },
  muestras: {
    title: 'Muestras',
    subtitle: 'Registro y seguimiento de muestras',
    cta: 'Nueva Muestra',
    searchPlaceholder: 'Buscar por codigo o cliente...',
    filters: ['Todos los estados'],
    stats: [
      { label: 'Total Muestras', value: '18' },
      { label: 'En Analisis', value: '7', tone: 'blue' },
      { label: 'Completadas', value: '9', tone: 'green' },
      { label: 'Urgentes', value: '2', tone: 'red' },
    ],
    columns: ['Codigo', 'Cliente', 'Tipo', 'Ingreso', 'Analista', 'Prioridad', 'Estado'],
    rows: [
      {
        key: 'm1',
        cells: ['M-2026-0142', 'BioLabs SA', 'Agua residual', '30/4/2026', 'Maria Lopez', { text: 'Alta', tone: 'red' }, { text: 'En Proceso', tone: 'blue' }],
      },
      {
        key: 'm2',
        cells: ['M-2026-0141', 'Farma Norte', 'Materia prima', '29/4/2026', 'Juan Rodriguez', { text: 'Media', tone: 'amber' }, { text: 'Completada', tone: 'green' }],
      },
      {
        key: 'm3',
        cells: ['M-2026-0139', 'Quimicos MX', 'Producto final', '29/4/2026', 'Ana Martinez', { text: 'Normal', tone: 'neutral' }, { text: 'Pendiente', tone: 'amber' }],
      },
    ],
  },
  movimientos: {
    title: 'Movimientos',
    subtitle: 'Historial de movimientos de inventario',
    cta: 'Nuevo Movimiento',
    searchPlaceholder: 'Buscar por item, referencia o usuario...',
    filters: ['Todos los tipos'],
    stats: [
      { label: 'Total Movimientos', value: '6' },
      { label: 'Entradas', value: '2', tone: 'green' },
      { label: 'Salidas', value: '3', tone: 'blue' },
      { label: 'Ajustes', value: '1', tone: 'neutral' },
    ],
    columns: ['Referencia', 'Fecha / Hora', 'Tipo', 'Item', 'Cantidad', 'Usuario', 'Motivo'],
    rows: [
      {
        key: 'mv1',
        cells: ['MOV-2026-0089', '1/5/2026 10:30 a.m.', { text: 'Salida', tone: 'blue' }, 'Acido Clorhidrico 37%', '250 mL', 'Maria Lopez', 'Analisis de muestras M-2026-0142'],
      },
      {
        key: 'mv2',
        cells: ['MOV-2026-0088', '1/5/2026 09:15 a.m.', { text: 'Entrada', tone: 'green' }, 'Guantes de Nitrilo (M)', '+200 piezas', 'Carlos Garcia', 'Recepcion de pedido PO-2026-045'],
      },
      {
        key: 'mv3',
        cells: ['MOV-2026-0087', '30/4/2026 04:45 p.m.', { text: 'Ajuste', tone: 'neutral' }, 'Metanol HPLC', '-50 mL', 'Juan Rodriguez', 'Ajuste por inventario fisico'],
      },
    ],
  },
  mantenimiento: {
    title: 'Mantenimiento',
    subtitle: 'Programa de mantenimiento de equipos',
    cta: 'Programar Mantenimiento',
    searchPlaceholder: 'Buscar por equipo o proveedor...',
    filters: ['Todos los tipos', 'Todos los estados'],
    stats: [
      { label: 'Total', value: '6' },
      { label: 'Pendientes', value: '3', tone: 'blue' },
      { label: 'Completados', value: '2', tone: 'green' },
      { label: 'Vencidos', value: '1', tone: 'red' },
    ],
    columns: ['Equipo', 'Tipo', 'Fecha Programada', 'Tecnico / Proveedor', 'Estado', 'Observaciones'],
    rows: [
      {
        key: 'mt1',
        cells: ['HPLC Agilent 1260', { text: 'Preventivo', tone: 'neutral' }, '14/5/2026', 'Tecnico Agilent', { text: 'Programado', tone: 'neutral' }, 'Mantenimiento semestral programado'],
      },
      {
        key: 'mt2',
        cells: ['Espectrofotometro UV-Vis', { text: 'Calibracion', tone: 'blue' }, '9/5/2026', 'Lab. Calibraciones SA', { text: 'En Proceso', tone: 'blue' }, 'Calibracion anual requerida'],
      },
      {
        key: 'mt3',
        cells: ['GC-MS Shimadzu', { text: 'Correctivo', tone: 'amber' }, '14/4/2026', 'Shimadzu Mexico', { text: 'Vencido', tone: 'red' }, 'Falla en detector - pendiente refaccion'],
      },
    ],
  },
  reportes: {
    title: 'Reportes de Mantenimiento',
    subtitle: 'Documentos SGC - ISO 17025',
    cta: 'Exportar',
    searchPlaceholder: 'Buscar por codigo o equipo...',
    filters: ['Todos los estados'],
    stats: [
      { label: 'Total Reportes', value: '6' },
      { label: 'Publicados', value: '3', tone: 'green' },
      { label: 'En Proceso', value: '2', tone: 'amber' },
      { label: 'Aprobados', value: '1', tone: 'blue' },
    ],
    columns: ['Codigo', 'Equipo', 'Tipo', 'Fecha', 'Responsable', 'Version', 'Estado'],
    rows: [
      {
        key: 'rp1',
        cells: ['SGC-MNT-2026-042', 'HPLC Agilent 1260', 'Preventivo', '29/4/2026', 'Dr. Garcia', 'v1.0', { text: 'Publicado', tone: 'green' }],
      },
      {
        key: 'rp2',
        cells: ['SGC-MNT-2026-041', 'Espectrofotometro UV-Vis', 'Calibracion', '27/4/2026', 'Dra. Lopez', 'v1.0', { text: 'Aprobado', tone: 'blue' }],
      },
      {
        key: 'rp3',
        cells: ['SGC-MNT-2026-038', 'pH-metro Hanna', 'Preventivo', '14/4/2026', 'Dra. Lopez', 'v0.2', { text: 'En Revision', tone: 'amber' }],
      },
    ],
  },
  roles: {
    title: 'Roles',
    subtitle: 'Gestion de roles del sistema',
    cta: 'Nuevo Rol',
    searchPlaceholder: 'Buscar roles...',
    filters: ['Todos'],
    stats: [
      { label: 'Total Roles', value: '5' },
      { label: 'Activos', value: '4', tone: 'green' },
      { label: 'Sistemicos', value: '1', tone: 'blue' },
      { label: 'Usuarios Asignados', value: '12' },
    ],
    columns: ['Rol', 'Descripcion', 'Usuarios', 'Estado', 'Tipo'],
    rows: [
      {
        key: 'rl1',
        cells: ['Administrador', 'Acceso completo al sistema', '2', { text: 'Activo', tone: 'green' }, { text: 'Sistemico', tone: 'blue' }],
      },
      {
        key: 'rl2',
        cells: ['Analista', 'Gestion de muestras y reactivos', '5', { text: 'Activo', tone: 'green' }, { text: 'Personalizado', tone: 'neutral' }],
      },
      {
        key: 'rl3',
        cells: ['Capturista', 'Captura de datos y movimientos', '0', { text: 'Inactivo', tone: 'neutral' }, { text: 'Personalizado', tone: 'neutral' }],
      },
    ],
  },
  usuarios: {
    title: 'Usuarios',
    subtitle: 'Administracion de usuarios del sistema',
    cta: 'Nuevo Usuario',
    searchPlaceholder: 'Buscar por nombre o email...',
    filters: ['Todos los roles'],
    stats: [
      { label: 'Total Usuarios', value: '6' },
      { label: 'Activos', value: '5', tone: 'green' },
      { label: 'Inactivos', value: '1', tone: 'neutral' },
      { label: 'Administradores', value: '1', tone: 'blue' },
    ],
    columns: ['Usuario', 'Email', 'Rol', 'Departamento', 'Ultimo Acceso', 'Estado'],
    rows: [
      {
        key: 'u1',
        cells: ['Carlos Garcia', 'carlos.garcia@ficotox.com', { text: 'Administrador', tone: 'teal' }, 'TI', '01-may, 08:30 a.m.', { text: 'Activo', tone: 'green' }],
      },
      {
        key: 'u2',
        cells: ['Maria Lopez', 'maria.lopez@ficotox.com', { text: 'Analista', tone: 'neutral' }, 'Laboratorio', '01-may, 09:15 a.m.', { text: 'Activo', tone: 'green' }],
      },
      {
        key: 'u3',
        cells: ['Laura Torres', 'laura.torres@ficotox.com', { text: 'Capturista', tone: 'neutral' }, 'Laboratorio', 'Nunca', { text: 'Inactivo', tone: 'neutral' }],
      },
    ],
  },
}
