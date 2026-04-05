import { useEffect, useState } from 'react';
import { getHoursMetrics } from '../api/metricsApi';
import { listWorkers } from '../api/userApi';
import TimeMetricsView from './TimeMetricsView';

function SupervisorMetricsTab({ token }) {
  const [workers, setWorkers] = useState([]);
  const [workerId, setWorkerId] = useState('');
  const [metrics, setMetrics] = useState({
    daily: [],
    weekly: [],
    monthly: [],
    sessions: [],
    taskCompletions: [],
    totals: {}
  });
  const [granularity, setGranularity] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadWorkers() {
      try {
        const data = await listWorkers(token);
        setWorkers(data);

        if (data.length > 0) {
          setWorkerId(String(data[0]._id));
        }
      } catch (loadError) {
        setError(loadError.message);
      }
    }

    loadWorkers();
  }, [token]);

  useEffect(() => {
    async function loadMetrics() {
      if (!workerId) {
        setMetrics({ daily: [], weekly: [], monthly: [], sessions: [], taskCompletions: [], totals: {} });
        return;
      }

      setLoading(true);
      setError('');

      try {
        const data = await getHoursMetrics(token, workerId);
        setMetrics(data);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, [token, workerId]);

  return (
    <div className="tab-content-grid supervisor-metrics-root">
      <section className="panel slide-up">
        <div className="panel-header-row">
          <h2>Métricas por Trabajador</h2>
          {loading ? <span className="badge badge-muted">Cargando...</span> : null}
        </div>

        <label htmlFor="worker-select" className="eyebrow">Seleccionar trabajador</label>
        <select
          id="worker-select"
          className="input-select"
          value={workerId}
          onChange={(event) => setWorkerId(event.target.value)}
        >
          {workers.map((worker) => (
            <option key={worker._id} value={worker._id}>
              {worker.name} ({worker.employeeId})
            </option>
          ))}
        </select>
      </section>

      <TimeMetricsView
        title="Estadísticas del Trabajador"
        metrics={metrics}
        granularity={granularity}
        onGranularityChange={setGranularity}
        loading={loading}
        error={error}
      />
    </div>
  );
}

export default SupervisorMetricsTab;
