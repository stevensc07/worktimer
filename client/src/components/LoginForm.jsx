import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function LoginForm() {
  const { login, authNotice } = useAuth();

  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
    setIsSubmitting(true);

    try {
      await login({ employeeId, pin });
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-card fade-in">
        <div className="brand-block">
          <div className="brand-icon" aria-hidden>
            <span>🏗</span>
          </div>
          <h1>SITE OPS</h1>
          <p>Acceso restringido para personal autorizado.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="employeeId">ID de Empleado</label>
          <input
            id="employeeId"
            type="text"
            autoComplete="username"
            placeholder="Ej: 8820-X"
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value.toUpperCase())}
            required
          />

          <label htmlFor="pin">PIN / Contraseña</label>
          <input
            id="pin"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            required
          />

          {authNotice ? <p className="feedback warning">{authNotice}</p> : null}
          {error ? <p className="feedback error">{error}</p> : null}

          <button type="submit" className="cta-button" disabled={isSubmitting}>
            {isSubmitting ? 'Validando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default LoginForm;
