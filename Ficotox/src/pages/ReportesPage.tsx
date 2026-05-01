import SectionTemplate from '../components/SectionTemplate'
import type { ModuleConfig } from '../data/appData'

const config: ModuleConfig = {
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
  columns: ['Codigo', 'Equipo', 'Tipo', 'Fecha', 'Responsable', 'Version', 'Estado', 'Acciones'],
  rows: [
    {
      key: 'rp1',
      cells: ['SGC-MNT-2026-042', 'HPLC Agilent 1260', 'Preventivo', '29/4/2026', 'Dr. Garcia', 'v1.0', { text: 'Publicado', tone: 'green' }, '👁 ⬇'],
    },
    {
      key: 'rp2',
      cells: ['SGC-MNT-2026-041', 'Espectrofotometro UV-Vis', 'Calibracion', '27/4/2026', 'Dra. Lopez', 'v1.0', { text: 'Aprobado', tone: 'blue' }, '👁 ⬇'],
    },
    {
      key: 'rp3',
      cells: ['SGC-MNT-2026-040', 'Centrifuga Eppendorf 5430R', 'Correctivo', '24/4/2026', 'Ing. Martinez', 'v1.1', { text: 'Publicado', tone: 'green' }, '👁 ⬇'],
    },
    {
      key: 'rp4',
      cells: ['SGC-MNT-2026-039', 'Balanza Analitica Mettler', 'Calibracion', '19/4/2026', 'Dr. Garcia', 'v1.0', { text: 'Publicado', tone: 'green' }, '👁 ⬇'],
    },
    {
      key: 'rp5',
      cells: ['SGC-MNT-2026-038', 'pH-metro Hanna', 'Preventivo', '14/4/2026', 'Dra. Lopez', 'v0.2', { text: 'En Revision', tone: 'amber' }, '👁 ⬇'],
    },
    {
      key: 'rp6',
      cells: ['SGC-MNT-2026-037', 'GC-MS Shimadzu', 'Correctivo', '9/4/2026', 'Ing. Martinez', 'v0.1', { text: 'Borrador', tone: 'neutral' }, '👁 ⬇'],
    },
  ],
}

export default function ReportesPage() {
  return <SectionTemplate config={config} />
}
