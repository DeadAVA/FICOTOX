import { type Badge, type ModuleConfig, type Tone } from '../data/appData'

function toneClass(tone: Tone): string {
  return `tone-${tone}`
}

function isBadge(cell: string | Badge): cell is Badge {
  return typeof cell !== 'string'
}

function StatCards({ items }: { items: ModuleConfig['stats'] }) {
  return (
    <section className="stat-grid fade-up">
      {items.map((item, index) => (
        <article className={`stat-card anim-delay-${index + 1}`} key={item.label}>
          <p>{item.label}</p>
          <strong className={item.tone ? toneClass(item.tone) : ''}>{item.value}</strong>
        </article>
      ))}
    </section>
  )
}

function DataTable({ columns, rows }: Pick<ModuleConfig, 'columns' | 'rows'>) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              {row.cells.map((cell, index) => (
                <td key={`${row.key}-${index}`}>
                  {isBadge(cell) ? (
                    <span className={`badge ${toneClass(cell.tone)}`}>{cell.text}</span>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function SectionTemplate({ config }: { config: ModuleConfig }) {
  return (
    <>
      <header className="page-header page-header-tight fade-up">
        <div>
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <button type="button" className="primary-btn">
          + {config.cta}
        </button>
      </header>

      <StatCards items={config.stats} />

      <section className="panel toolbar fade-up anim-delay-2">
        <input type="search" placeholder={config.searchPlaceholder} />
        <div className="filter-row">
          {config.filters.map((filter) => (
            <select
              key={filter}
              defaultValue={filter}
              title={filter}
              aria-label={`Filtro ${filter}`}
            >
              <option>{filter}</option>
            </select>
          ))}
        </div>
      </section>

      <section className="panel fade-up anim-delay-3">
        <DataTable columns={config.columns} rows={config.rows} />
      </section>
    </>
  )
}
