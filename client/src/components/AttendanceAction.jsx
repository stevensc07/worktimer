import { useEffect, useState } from 'react';
import { checkIn, checkOut } from '../api/attendanceApi';
import { getCurrentPosition } from '../hooks/useGeolocation';
import InfoHint from './InfoHint';

function formatElapsed(startTime, now = Date.now()) {
  if (!startTime) {
    return '00:00:00';
  }

  const elapsedMs = Math.max(0, now - new Date(startTime).getTime());
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
}

function AttendanceAction({ token, activeSession, onSessionChange, onLocationCaptured }) {
  const [isRunning, setIsRunning] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [elapsedRefresher, setElapsedRefresher] = useState(Date.now());

  useEffect(() => {
    if (!activeSession) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setElapsedRefresher(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [activeSession]);

  async function resolveLocation() {
    // Se solicita GPS de alta precisión para respaldo de entrada/salida en obra.
    const geo = await getCurrentPosition();

    return {
      lat: geo.coords.latitude,
      lng: geo.coords.longitude
    };
  }

  async function runAction(type) {
    setFeedback('');
    setIsRunning(true);

    try {
      const location = await resolveLocation();
      onLocationCaptured?.(location);

      if (type === 'check-in') {
        const session = await checkIn(token, location);
        onSessionChange(session);
        setFeedback('Check-in exitoso con ubicación GPS registrada.');
      } else {
        await checkOut(token, location);
        onSessionChange(null);
        setFeedback('Check-out exitoso. Jornada cerrada correctamente.');
      }
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <section className="panel attendance-panel slide-up">
      <InfoHint
        title="Jornada"
        text="Aqui el trabajador entra al comenzar el dia y sale al terminar. El tiempo queda guardado con GPS."
      />
      <div className="panel-header-row">
        <div>
          <p className="eyebrow">Jornada</p>
          <h2>{activeSession ? 'Trabajando' : 'Sin iniciar'}</h2>
        </div>
        <span className={`status-dot ${activeSession ? 'online' : 'offline'}`} aria-hidden />
      </div>

      <p className="timer" aria-label="Tiempo de jornada">
        {formatElapsed(activeSession?.startTime, elapsedRefresher)}
      </p>
      <p className={`status-chip ${activeSession ? 'online' : 'offline'}`} aria-live="polite">
        {activeSession ? 'Jornada abierta' : 'Toca entrar para comenzar'}
      </p>

      <div className="action-grid">
        <button
          type="button"
          className="touch-button checkin"
          disabled={isRunning || Boolean(activeSession)}
          onClick={() => runAction('check-in')}
        >
          <span aria-hidden>🟢</span>
          <span>{isRunning ? 'GPS...' : 'Entrar'}</span>
        </button>

        <button
          type="button"
          className="touch-button checkout"
          disabled={isRunning || !activeSession}
          onClick={() => runAction('check-out')}
        >
          <span aria-hidden>🛑</span>
          <span>{isRunning ? 'Cerrando...' : 'Salir'}</span>
        </button>
      </div>

      {feedback ? <p className="feedback" aria-live="polite">{feedback}</p> : null}
    </section>
  );
}

export default AttendanceAction;
