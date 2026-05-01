import SectionTemplate from '../components/SectionTemplate'
import type { ModuleConfig } from '../data/appData'

const config: ModuleConfig = {
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
    {
      key: 'mv4',
      cells: ['MOV-2026-0086', '30/4/2026 02:20 p.m.', { text: 'Salida', tone: 'blue' }, 'Puntas de Micropipeta 100-1000 uL', '48 piezas', 'Maria Lopez', 'Uso en laboratorio'],
    },
    {
      key: 'mv5',
      cells: ['MOV-2026-0085', '29/4/2026 11:00 a.m.', { text: 'Entrada', tone: 'green' }, 'Acetonitrilo HPLC', '+2500 mL', 'Carlos Garcia', 'Recepcion de pedido PO-2026-044'],
    },
    {
      key: 'mv6',
      cells: ['MOV-2026-0084', '29/4/2026 09:30 a.m.', { text: 'Salida', tone: 'blue' }, 'Viales HPLC 2 mL', '24 piezas', 'Juan Rodriguez', 'Analisis cromatografico'],
    },
  ],
}

export default function MovimientosPage() {
  return <SectionTemplate config={config} />
}
