import { useEffect, useMemo, useState } from 'react';
import { getWorkersOverview } from '../api/metricsApi';
import LocationMapCard from './LocationMapCard';

function SupervisorHomeTab({ token }) {
  const [overview, setOverview] = useState({ summary: null, workers: [] });
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadOverview() {
    setLoading(true);
    setError('');

    try {
      const data = await getWorkersOverview(token);
      setOverview(data);
      setSelectedWorkerId((current) => current || String(data.workers[0]?.id || ''));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();

    const intervalId = window.setInterval(loadOverview, 45000);
    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const selectedWorker = useMemo(() => {
    if (!overview.workers.length) {
      return null;
    }

    const bySelectedId = overview.workers.find((worker) => String(worker.id) === selectedWorkerId);
    return bySelectedId || overview.workers[0];
  }, [overview.workers, selectedWorkerId]);

  const summary = overview.summary || {
    totalWorkers: 0,
    activeWorkers: 0,
    totalWeekHours: 0,
    completionRate: 0,
    totalPendingTasks: 0,
    totalCompletedTasks: 0
  };

  return (
    <div className="tab-content-grid supervisor-home-grid">
      <section className="panel slide-up">
        <div className="panel-header-row">
          <h2>Panel de Supervisión</h2>
          {loading ? <span className="badge badge-muted">Actualizando...</span> : null}
        </div>

        <div className="summary-grid">
          <article className="summary-card">
            <p className="eyebrow">Personal en obra</p>
            <h3>{summary.totalWorkers}</h3>
          </article>
          <article className="summary-card">
            <p className="eyebrow">Activos ahora</p>
            <h3>{summary.activeWorkers}</h3>
          </article>
          <article className="summary-card">
            <p className="eyebrow">Horas semanales</p>
            <h3>{summary.totalWeekHours} h</h3>
          </article>
          <article className="summary-card">
            <p className="eyebrow">Cumplimiento</p>
            <h3>{summary.completionRate}%</h3>
          </article>
        </div>
      </section>

      <section className="panel slide-up">
        <div className="panel-header-row">
          <h2>Trabajadores</h2>
          <span className="badge badge-muted">{overview.workers.length} registros</span>
        </div>

        <div className="worker-list">
          {overview.workers.map((worker) => (
            <button
              type="button"
              key={worker.id}
              className={`worker-row ${String(worker.id) === String(selectedWorker?.id) ? 'active' : ''}`}
              onClick={() => setSelectedWorkerId(String(worker.id))}
            >
              <div>
                <h3>{worker.name}</h3>
                <p className="hint">{worker.employeeId}</p>
              </div>
              <div className="worker-row-meta">
                <span className={`badge ${worker.activeSession ? 'badge-live' : 'badge-muted'}`}>
                  {worker.activeSession ? 'En jornada' : 'Fuera de jornada'}
                </span>
                <small>{worker.weekHours} h/sem</small>
              </div>
            </button>
          ))}

          {!loading && overview.workers.length === 0 ? (
            <p className="hint">No hay trabajadores registrados para supervisión.</p>
          ) : null}
        </div>

        {error ? <p className="feedback error">{error}</p> : null}
      </section>

      <LocationMapCard
        title="Ubicación del Trabajador Seleccionado"
        subtitle={selectedWorker ? `${selectedWorker.name} (${selectedWorker.employeeId})` : 'Sin selección'}
        location={selectedWorker?.activeSession?.checkInLocation || null}
      />
    </div>
  );
}

export default SupervisorHomeTab;
