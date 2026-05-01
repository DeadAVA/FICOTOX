import SectionTemplate from '../components/SectionTemplate'
import type { ModuleConfig } from '../data/appData'

const config: ModuleConfig = {
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
      cells: ['Balanza Analitica', 'Mettler Toledo XS205', 'BA45678901', 'Lab-01', 'Ing. Martinez', '9/7/2026', { text: 'Operativo', tone: 'green' }],
    },
    {
      key: 'e4',
      cells: ['Centrifuga', 'Eppendorf 5430R', 'CF78901234', 'Lab-03', 'Dr. Garcia', '4/2/2026', { text: 'En Mantenimiento', tone: 'amber' }],
    },
    {
      key: 'e5',
      cells: ['pH-metro', 'Hanna Instruments HI5522', 'PH23456789', 'Lab-02', 'Dra. Lopez', '27/8/2026', { text: 'Operativo', tone: 'green' }],
    },
    {
      key: 'e6',
      cells: ['GC-MS', 'Shimadzu GCMS-QP2020', 'GC56789012', 'Lab-01', 'Dr. Garcia', '31/5/2025', { text: 'Fuera de Servicio', tone: 'red' }],
    },
  ],
}

export default function EquiposPage() {
  return <SectionTemplate config={config} />
}
