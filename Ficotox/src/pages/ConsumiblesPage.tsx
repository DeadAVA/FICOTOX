import SectionTemplate from '../components/SectionTemplate'
import type { ModuleConfig } from '../data/appData'

const config: ModuleConfig = {
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
    {
      key: 'c4',
      cells: ['Papel Filtro Whatman No. 1', 'Filtracion', 'Whatman', '200 hojas', 'ALM-02', { text: 'Disponible', tone: 'green' }],
    },
    {
      key: 'c5',
      cells: ['Viales HPLC 2 mL', 'Cromatografia', 'Agilent', '80 piezas', 'ALM-04', { text: 'Bajo Stock', tone: 'amber' }],
    },
    {
      key: 'c6',
      cells: ['Cubrebocas N95', 'Proteccion', '3M', '150 piezas', 'ALM-01', { text: 'Disponible', tone: 'green' }],
    },
  ],
}

export default function ConsumiblesPage() {
  return <SectionTemplate config={config} />
}
