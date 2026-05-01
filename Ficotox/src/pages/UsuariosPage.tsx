import SectionTemplate from '../components/SectionTemplate'
import type { ModuleConfig } from '../data/appData'

const config: ModuleConfig = {
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
      cells: ['Juan Rodriguez', 'juan.rodriguez@ficotox.com', { text: 'Analista', tone: 'neutral' }, 'Laboratorio', '30-abr, 04:45 p.m.', { text: 'Activo', tone: 'green' }],
    },
    {
      key: 'u4',
      cells: ['Ana Martinez', 'ana.martinez@ficotox.com', { text: 'Supervisor', tone: 'neutral' }, 'Calidad', '29-abr, 02:20 p.m.', { text: 'Activo', tone: 'green' }],
    },
    {
      key: 'u5',
      cells: ['Roberto Sanchez', 'roberto.sanchez@ficotox.com', { text: 'Visor', tone: 'neutral' }, 'Direccion', '28-abr, 10:00 a.m.', { text: 'Activo', tone: 'green' }],
    },
    {
      key: 'u6',
      cells: ['Laura Torres', 'laura.torres@ficotox.com', { text: 'Capturista', tone: 'neutral' }, 'Laboratorio', 'Nunca', { text: 'Inactivo', tone: 'neutral' }],
    },
  ],
}

export default function UsuariosPage() {
  return <SectionTemplate config={config} />
}
