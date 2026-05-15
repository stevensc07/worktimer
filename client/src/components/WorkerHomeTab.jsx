import { useEffect, useMemo, useState } from "react";
import AttendanceAction from "./AttendanceAction";
import InfoHint from "./InfoHint";
import { getCurrentPosition } from "../hooks/useGeolocation";
import { toLatLngFromGeoJsonPoint } from "../utils/location";

function WorkerHomeTab({ token, activeSession, onSessionChange }) {
  const [location, setLocation] = useState(null);
  const [gpsMessage, setGpsMessage] = useState("Sin lectura de GPS reciente.");

  const sessionLocation = useMemo(
    () => toLatLngFromGeoJsonPoint(activeSession?.checkInLocation),
    [activeSession],
  );

  useEffect(() => {
    if (sessionLocation) {
      setLocation(sessionLocation);
      setGpsMessage("Ubicación tomada del check-in activo.");
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
        lng: current.coords.longitude,
      };

      setLocation(nextLocation);
      setGpsMessage("GPS actualizado correctamente.");
    } catch (error) {
      setGpsMessage(
        error.message || "No fue posible leer el GPS del dispositivo.",
      );
    }
  }

  return (
    <div className="tab-content-grid home-tab-grid">
      <section className="panel quick-status-panel slide-up">
        <InfoHint
          title="Estado rapido"
          text="Muestra si el telefono tiene GPS y red antes de entrar o salir de la jornada."
        />
        <div className="status-grid">
          <article className="status-box">
            <InfoHint
              title="GPS"
              text="Confirma que el telefono puede guardar la ubicacion de entrada y salida."
            />
            <span className="status-icon" aria-hidden>📍</span>
            <p className="eyebrow">GPS</p>
            <h3>{location ? "Listo" : "Pendiente"}</h3>
            <p className="hint">{gpsMessage}</p>
          </article>

          <article className="status-box">
            <InfoHint
              title="Red"
              text="Indica si el telefono tiene conexion para enviar los datos al servidor."
            />
            <span className="status-icon" aria-hidden>{navigator.onLine ? "📶" : "⚠️"}</span>
            <p className="eyebrow">Red</p>
            <h3>{navigator.onLine ? "Con señal" : "Sin señal"}</h3>
            <p className="hint">{navigator.onLine ? "Datos guardados en servidor." : "Revisa la conexión."}</p>
          </article>
        </div>

        <button
          type="button"
          className="secondary-action"
          onClick={refreshLocation}
        >
          Actualizar GPS
        </button>
      </section>

      <AttendanceAction
        token={token}
        activeSession={activeSession}
        onSessionChange={onSessionChange}
        onLocationCaptured={setLocation}
      />
    </div>
  );
}

export default WorkerHomeTab;
