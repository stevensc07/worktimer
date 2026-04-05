import { useEffect, useState } from 'react';
import { checkIn, checkOut } from '../api/attendanceApi';
import { getCurrentPosition } from '../hooks/useGeolocation';

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
      <h2>Tiempo de Turno Actual</h2>
      <p className="timer">{formatElapsed(activeSession?.startTime, elapsedRefresher)}</p>
      <p className={`status-chip ${activeSession ? 'online' : 'offline'}`}>
        {activeSession ? 'Jornada en curso' : 'Sin jornada activa'}
      </p>

      <div className="action-grid">
        <button
          type="button"
          className="touch-button checkin"
          disabled={isRunning || Boolean(activeSession)}
          onClick={() => runAction('check-in')}
        >
          {isRunning ? 'Obteniendo GPS...' : 'Accionar Check-in'}
        </button>

        <button
          type="button"
          className="touch-button checkout"
          disabled={isRunning || !activeSession}
          onClick={() => runAction('check-out')}
        >
          {isRunning ? 'Procesando salida...' : 'Accionar Check-out'}
        </button>
      </div>

      {feedback ? <p className="feedback">{feedback}</p> : null}
    </section>
  );
}

export default AttendanceAction;
