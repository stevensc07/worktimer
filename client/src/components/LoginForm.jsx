import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import InfoHint from './InfoHint';

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
        <InfoHint
          title="Entrada"
          text="Use el numero de trabajador y el PIN para abrir la aplicacion."
        />
        <div className="brand-block">
          <div className="brand-icon" aria-hidden>
            <span>🏗️</span>
          </div>
          <h1>Entrar a obra</h1>
          <p>SITE OPS</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="employeeId">Número de trabajador</label>
          <input
            id="employeeId"
            type="text"
            autoComplete="username"
            placeholder="Ej: 8820"
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value.toUpperCase())}
            required
          />

          <label htmlFor="pin">PIN</label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            placeholder="••••"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            required
          />

          {authNotice ? <p className="feedback warning">{authNotice}</p> : null}
          {error ? <p className="feedback error">{error}</p> : null}

          <button type="submit" className="cta-button" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default LoginForm;
