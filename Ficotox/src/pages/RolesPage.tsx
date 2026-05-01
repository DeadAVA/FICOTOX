import SectionTemplate from '../components/SectionTemplate'
import type { ModuleConfig } from '../data/appData'

const config: ModuleConfig = {
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
      cells: ['Administrador', 'Acceso completo al sistema, gestion de usuarios y roles', '2', { text: 'Activo', tone: 'green' }, { text: 'Sistemico', tone: 'blue' }],
    },
    {
      key: 'rl2',
      cells: ['Analista', 'Gestion de muestras, reactivos y equipos del laboratorio', '5', { text: 'Activo', tone: 'green' }, { text: 'Personalizado', tone: 'neutral' }],
    },
    {
      key: 'rl3',
      cells: ['Visor', 'Solo lectura, consulta de informacion del sistema', '3', { text: 'Activo', tone: 'green' }, { text: 'Personalizado', tone: 'neutral' }],
    },
    {
      key: 'rl4',
      cells: ['Supervisor', 'Supervision de procesos y aprobacion de reportes', '2', { text: 'Activo', tone: 'green' }, { text: 'Personalizado', tone: 'neutral' }],
    },
    {
      key: 'rl5',
      cells: ['Capturista', 'Captura de datos y registro de movimientos', '0', { text: 'Inactivo', tone: 'neutral' }, { text: 'Personalizado', tone: 'neutral' }],
    },
  ],
}

export default function RolesPage() {
  return <SectionTemplate config={config} />
}
