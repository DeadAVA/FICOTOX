import SectionTemplate from '../components/SectionTemplate'
import type { ModuleConfig } from '../data/appData'

const config: ModuleConfig = {
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
    {
      key: 'r5',
      cells: ['Hidroxido de Sodio', '1310-73-2', 'Bases', '450 g', 'A-02-01', '29/6/2027', { text: 'Disponible', tone: 'green' }],
    },
    {
      key: 'r6',
      cells: ['Acido Sulfurico 98%', '7664-93-9', 'Acidos', '1200 mL', 'A-01-04', '27/2/2027', { text: 'Disponible', tone: 'green' }],
    },
  ],
}

export default function ReactivosPage() {
  return <SectionTemplate config={config} />
}
