import { useEffect, useMemo, useState } from 'react';
import AttendanceAction from './AttendanceAction';
import LocationMapCard from './LocationMapCard';
import { getCurrentPosition } from '../hooks/useGeolocation';
import { toLatLngFromGeoJsonPoint } from '../utils/location';

function WorkerHomeTab({ token, activeSession, onSessionChange }) {
  const [location, setLocation] = useState(null);
  const [gpsMessage, setGpsMessage] = useState('Sin lectura de GPS reciente.');

  const sessionLocation = useMemo(
    () => toLatLngFromGeoJsonPoint(activeSession?.checkInLocation),
    [activeSession]
  );

  useEffect(() => {
    if (sessionLocation) {
      setLocation(sessionLocation);
      setGpsMessage('Ubicación tomada del check-in activo.');
    }
  }, [sessionLocation]);

  useEffect(() => {
    if (!sessionLocation) {
      refreshLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLocation]);

  async function refreshLocation() {
    try {
      const current = await getCurrentPosition();
      const nextLocation = {
        lat: current.coords.latitude,
        lng: current.coords.longitude
      };

      setLocation(nextLocation);
      setGpsMessage('GPS actualizado correctamente.');
    } catch (error) {
      setGpsMessage(error.message || 'No fue posible leer el GPS del dispositivo.');
    }
  }

  return (
    <div className="tab-content-grid home-tab-grid">
      <section className="panel quick-status-panel slide-up">
        <div className="status-grid">
          <article className="status-box">
            <p className="eyebrow">Sistema GPS</p>
            <h3>{location ? 'Ubicación activa' : 'Pendiente'}</h3>
            <p className="hint">{gpsMessage}</p>
          </article>

          <article className="status-box">
            <p className="eyebrow">Conexión</p>
            <h3>{navigator.onLine ? 'Estable' : 'Sin red'}</h3>
            <p className="hint">Sincroniza datos con backend en tiempo real.</p>
          </article>
        </div>

        <button type="button" className="secondary-action" onClick={refreshLocation}>
          Actualizar GPS
        </button>
      </section>

      <AttendanceAction
        token={token}
        activeSession={activeSession}
        onSessionChange={onSessionChange}
        onLocationCaptured={setLocation}
      />

      <LocationMapCard
        title="Ubicación de Check-in"
        subtitle="La coordenada se guarda en la sesión y queda disponible para supervisión."
        location={location || sessionLocation}
      />
    </div>
  );
}

export default WorkerHomeTab;
