import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { adminNav, docsNav, mainNav } from '../data/appData'

function MenuGroup({
  title,
  items,
}: {
  title: string
  items: Array<{ path: string; icon: string; label: string }>
}) {
  return (
    <>
      <p className="menu-title">{title}</p>
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => (isActive ? 'menu-item active' : 'menu-item')}
        >
          <span>{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </>
  )
}

export default function AppLayout() {
  const navigate = useNavigate()

  function logout() {
    localStorage.removeItem('ficotox_auth')
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-icon">F</div>
          <div>
            <strong>FICOTOX</strong>
            <p>ISO 17025</p>
          </div>
        </div>

        <nav>
          <MenuGroup title="Principal" items={mainNav} />
          <MenuGroup title="Documentos SGC" items={docsNav} />
          <MenuGroup title="Administracion" items={adminNav} />
        </nav>

        <div className="sidebar-user">
          <div className="avatar">U</div>
          <div>
            <strong>Usuario FICOTOX 108</strong>
            <p>Analista</p>
          </div>
          <button type="button" className="logout-btn" onClick={logout} aria-label="Cerrar sesion">
            Salir
          </button>
        </div>
      </aside>

      <main className="content-area">
        <Outlet />
      </main>
    </div>
  )
}
