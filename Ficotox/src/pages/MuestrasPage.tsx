import SectionTemplate from '../components/SectionTemplate'
import type { ModuleConfig } from '../data/appData'

const config: ModuleConfig = {
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
    {
      key: 'm4',
      cells: ['M-2026-0138', 'AgroLab', 'Suelo agricola', '28/4/2026', 'Maria Lopez', { text: 'Alta', tone: 'red' }, { text: 'En Proceso', tone: 'blue' }],
    },
    {
      key: 'm5',
      cells: ['M-2026-0137', 'CliniLab SA', 'Agua potable', '28/4/2026', 'Juan Rodriguez', { text: 'Normal', tone: 'neutral' }, { text: 'Completada', tone: 'green' }],
    },
  ],
}

export default function MuestrasPage() {
  return <SectionTemplate config={config} />
}
