import { useNavigate } from 'react-router-dom'
import { dashboardCards, sectionPathByKey } from '../data/appData'

export default function DashboardPage() {
  const navigate = useNavigate()

  return (
    <>
      <header className="page-header fade-up">
        <h1>Bienvenido, Usuario</h1>
        <p>Sistema de Gestion de Laboratorio FICOTOX - ISO 17025</p>
        <span className="role-pill">Analista</span>
      </header>

      <section className="quick-grid">
        {dashboardCards.map((card, index) => (
          <article
            key={card.key}
            className={`quick-card tone-${card.tone} fade-up anim-delay-${index + 1}`}
          >
            <h3>{card.title}</h3>
            <p>{card.description}</p>
            <button type="button" onClick={() => navigate(sectionPathByKey[card.key])}>
              Ver mas
            </button>
          </article>
        ))}
      </section>

      <section className="panel access-panel fade-up anim-delay-3">
        <h3>Accesos Rapidos</h3>
        <div className="chip-row">
          <button type="button" onClick={() => navigate('/movimientos')}>
            Movimientos de Inventario
          </button>
          <button type="button" onClick={() => navigate('/mantenimiento')}>
            Programa de Mantenimiento
          </button>
          <button type="button" onClick={() => navigate('/reportes-mantenimiento')}>
            Reportes SGC
          </button>
        </div>
      </section>
    </>
  )
}
