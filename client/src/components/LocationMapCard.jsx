import { buildOpenStreetMapEmbedUrl, formatCoordinates } from '../utils/location';

function LocationMapCard({ title, subtitle, location }) {
  const mapUrl = buildOpenStreetMapEmbedUrl(location);

  return (
    <section className="panel map-panel slide-up">
      <div className="panel-header-row">
        <div>
          <h2>{title || 'Mapa de Ubicación'}</h2>
          {subtitle ? <p className="hint">{subtitle}</p> : null}
        </div>
        <span className={`badge ${location ? 'badge-live' : 'badge-muted'}`}>
          {location ? 'GPS activo' : 'Sin GPS'}
        </span>
      </div>

      {location ? (
        <>
          <div className="map-frame">
            <iframe title="Ubicación de obra" src={mapUrl} loading="lazy" />
          </div>
          <p className="hint">Coordenadas: {formatCoordinates(location)}</p>
        </>
      ) : (
        <p className="hint">Activa el GPS o registra un check-in para visualizar la ubicación.</p>
      )}
    </section>
  );
}

export default LocationMapCard;
