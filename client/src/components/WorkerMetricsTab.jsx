import { useEffect, useState } from 'react';
import { getHoursMetrics } from '../api/metricsApi';
import TimeMetricsView from './TimeMetricsView';

function WorkerMetricsTab({ token }) {
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
    async function loadMetrics() {
      setLoading(true);
      setError('');

      try {
        const data = await getHoursMetrics(token);
        setMetrics(data);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, [token]);

  return (
    <TimeMetricsView
      title="Métricas de Rendimiento"
      metrics={metrics}
      granularity={granularity}
      onGranularityChange={setGranularity}
      loading={loading}
      error={error}
    />
  );
}

export default WorkerMetricsTab;
