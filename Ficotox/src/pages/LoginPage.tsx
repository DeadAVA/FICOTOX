import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const navigate = useNavigate()

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim()) {
      return
    }

    localStorage.setItem('ficotox_auth', email)
    navigate('/dashboard', { replace: true })
  }

  return (
    <main className="login-shell">
      <div className="grid-background" />
      <section className="login-brand fade-up">
        <div className="logo">F</div>
        <h1>FICOTOX</h1>
        <p>Sistema de Laboratorio</p>
      </section>

      <section className="login-card fade-up anim-delay-2">
        <h2>Iniciar Sesion</h2>
        <p>Ingrese su correo electronico registrado</p>

        <form onSubmit={onSubmit} className="login-form">
          <label htmlFor="email">Correo Electronico</label>
          <input
            id="email"
            type="email"
            value={email}
            placeholder="usuario@ejemplo.com"
            onChange={(event) => setEmail(event.target.value)}
          />
          <button type="submit" disabled={email.trim().length === 0}>
            Iniciar Sesion
          </button>
        </form>

        <small>No tiene acceso? Contacte al administrador del sistema.</small>
      </section>

      <footer>Sistema de Gestion de Laboratorio FICOTOX</footer>
    </main>
  )
}
