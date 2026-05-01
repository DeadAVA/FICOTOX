import SectionTemplate from '../components/SectionTemplate'
import { moduleData, type SectionKey } from '../data/appData'

export default function ModulePage({ section }: { section: Exclude<SectionKey, 'dashboard'> }) {
  return <SectionTemplate config={moduleData[section]} />
}
