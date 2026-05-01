import SectionTemplate from '../components/SectionTemplate'
import type { ModuleConfig } from '../data/appData'

const config: ModuleConfig = {
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
      cells: ['HPLC Agilent 1260', { text: 'Preventivo', tone: 'neutral' }, '14/5/2026', 'Tecnico Agilent / Agilent Technologies', { text: 'Programado', tone: 'neutral' }, 'Mantenimiento semestral programado'],
    },
    {
      key: 'mt2',
      cells: ['Espectrofotometro UV-Vis', { text: 'Calibracion', tone: 'blue' }, '9/5/2026', 'Lab. Calibraciones SA / Metrologia CICESE', { text: 'En Proceso', tone: 'blue' }, 'Calibracion anual requerida por ISO 17025'],
    },
    {
      key: 'mt3',
      cells: ['Centrifuga Eppendorf 5430R', { text: 'Correctivo', tone: 'amber' }, '27/4/2026', 'Servicio Tecnico Eppendorf / BioSolutions Mexico', { text: 'Completado', tone: 'green' }, 'Reemplazo de rotor danado'],
    },
    {
      key: 'mt4',
      cells: ['GC-MS Shimadzu', { text: 'Correctivo', tone: 'amber' }, '14/4/2026', 'Shimadzu Mexico / Shimadzu Corp.', { text: 'Vencido', tone: 'red' }, 'Falla en detector - pendiente refaccion'],
    },
    {
      key: 'mt5',
      cells: ['Balanza Analitica Mettler', { text: 'Calibracion', tone: 'blue' }, '19/4/2026', 'Metrologia CICESE', { text: 'Completado', tone: 'green' }, 'Calibracion trimestral completada'],
    },
    {
      key: 'mt6',
      cells: ['pH-metro Hanna', { text: 'Preventivo', tone: 'neutral' }, '19/5/2026', 'Personal interno', { text: 'Programado', tone: 'neutral' }, 'Limpieza y verificacion de electrodo'],
    },
  ],
}

export default function MantenimientoPage() {
  return <SectionTemplate config={config} />
}
