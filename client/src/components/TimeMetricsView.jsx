import { formatBostonDate, formatBostonDateTime } from '../utils/dateTime';
import InfoHint from './InfoHint';

const GRANULARITY_LABELS = {
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual'
};

function formatMinutesToLabel(minutes = 0) {
  const safeMinutes = Number(minutes) || 0;

  if (safeMinutes < 60) {
    return `${safeMinutes.toFixed(0)} min`;
  }

  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = Math.round(safeMinutes % 60);

  return `${hours}h ${remainingMinutes}m`;
}

function formatHours(value = 0) {
  const numberValue = Number(value) || 0;
  return numberValue.toFixed(2);
}

function TimeMetricsView({
  title,
  metrics,
  granularity,
  onGranularityChange,
  loading,
  error
}) {
  const periodRows = metrics?.[granularity] || [];
  const totals = metrics?.totals || {
    totalWorkedHours: 0,
    totalCompletedTasks: 0,
    avgTaskCompletionMinutes: 0,
    totalTaskCompletionHours: 0
  };

  return (
    <div className="tab-content-grid metrics-view metrics-tab-grid">
      <section className="panel slide-up">
        <InfoHint
          title="Reportes"
          text="Resumen de horas y tareas calculado con horario de Boston."
        />
        <div className="panel-header-row">
          <h2>{title}</h2>
          {loading ? <span className="badge badge-muted">Actualizando...</span> : null}
        </div>

        <div className="metrics-config-row">
          <label htmlFor="metrics-granularity" className="eyebrow">Ver por</label>
          <select
            id="metrics-granularity"
            className="input-select"
            value={granularity}
            onChange={(event) => onGranularityChange(event.target.value)}
          >
            <option value="daily">Por día</option>
            <option value="weekly">Por semana</option>
            <option value="monthly">Por mes</option>
          </select>
        </div>

        <div className="summary-grid totals-grid">
          <article className="summary-card">
            <InfoHint title="Horas totales" text="Todas las horas de jornada acumuladas para este trabajador." />
            <p className="eyebrow">Horas totales</p>
            <h3>{totals.totalWorkedHours} h</h3>
          </article>
          <article className="summary-card">
            <InfoHint title="Tareas completadas" text="Cantidad de tareas marcadas como listas." />
            <p className="eyebrow">Tareas completadas</p>
            <h3>{totals.totalCompletedTasks}</h3>
          </article>
          <article className="summary-card">
            <InfoHint title="Promedio por tarea" text="Tiempo promedio usado para terminar cada tarea." />
            <p className="eyebrow">Tiempo prom. tarea</p>
            <h3>{formatMinutesToLabel(totals.avgTaskCompletionMinutes)}</h3>
          </article>
          <article className="summary-card">
            <InfoHint title="Horas en tareas" text="Tiempo acumulado solo dentro de tareas completadas." />
            <p className="eyebrow">Horas en tareas</p>
            <h3>{totals.totalTaskCompletionHours} h</h3>
          </article>
        </div>
      </section>

      <section className="panel slide-up">
        <InfoHint
          title="Resumen por periodo"
          text="Compara horas, sesiones y tareas por dia, semana o mes."
        />
        <div className="panel-header-row">
          <h2>Resumen {GRANULARITY_LABELS[granularity]}</h2>
          <span className="badge badge-muted">{periodRows.length} periodos</span>
        </div>

        <div className="metric-list">
          {periodRows.map((item) => (
            <article key={item.periodStart} className="metric-row metric-row-extended">
              <InfoHint
                title="Periodo"
                text="Fila con horas trabajadas, sesiones y tareas completadas en ese periodo."
              />
              <div>
                <h3>
                  {formatBostonDate(item.periodStart)} - {formatBostonDate(item.periodEnd)}
                </h3>
                <p className="hint">Sesiones: {item.sessions}</p>
                <p className="hint">Tareas completadas: {item.completedTasks}</p>
              </div>
              <div className="metric-values">
                <strong>{item.totalHours} h</strong>
                <small>{formatMinutesToLabel(item.avgTaskCompletionMinutes)} prom/tarea</small>
              </div>
            </article>
          ))}

          {!loading && periodRows.length === 0 ? (
            <p className="hint">No hay registros para esta configuración.</p>
          ) : null}
        </div>

        {error ? <p className="feedback error">{error}</p> : null}
      </section>

      <section className="panel slide-up">
        <InfoHint
          title="Sesiones"
          text="Cada fila es una jornada de trabajo con inicio, fin y duracion."
        />
        <div className="panel-header-row">
          <h2>Horas por sesión</h2>
          <span className="badge badge-muted">{metrics?.sessions?.length || 0} sesiones</span>
        </div>

        <div className="metrics-session-list">
          {(metrics?.sessions || []).map((session) => (
            <article key={session.sessionId} className="metric-row metric-row-extended">
              <InfoHint
                title="Jornada"
                text="Registro de entrada y salida de una jornada. Si dice en curso, sigue abierta."
              />
              <div>
                <h3>{formatBostonDateTime(session.startTime)}</h3>
                <p className="hint">
                  Fin: {session.isOpen ? 'En curso' : formatBostonDateTime(session.endTime)}
                </p>
              </div>
              <div className="metric-values">
                <strong>{formatHours(session.durationHours)} h</strong>
                <small>{formatMinutesToLabel(session.durationMinutes)}</small>
              </div>
            </article>
          ))}

          {!loading && (!metrics?.sessions || metrics.sessions.length === 0) ? (
            <p className="hint">No hay sesiones registradas todavía.</p>
          ) : null}
        </div>
      </section>

      <section className="panel slide-up">
        <InfoHint
          title="Tiempo por tarea"
          text="Muestra cuanto tomo terminar cada tarea completada."
        />
        <div className="panel-header-row">
          <h2>Tiempo de completado por tarea</h2>
          <span className="badge badge-muted">{metrics?.taskCompletions?.length || 0} tareas</span>
        </div>

        <div className="metrics-task-list">
          {(metrics?.taskCompletions || []).map((task) => (
            <article key={task.taskId} className="metrics-task-card">
              <InfoHint
                title="Tarea completada"
                text="Fila con el tiempo que tomo completar esta tarea."
              />
              <div className="metrics-task-card-header">
                <h3>{task.description || 'Tarea sin descripción'}</h3>
                <span className="badge badge-live">{formatMinutesToLabel(task.completionMinutes)}</span>
              </div>
              <p className="hint">Inicio: {formatBostonDateTime(task.createdAt)}</p>
              <p className="hint">Fin: {formatBostonDateTime(task.completedAt)}</p>
            </article>
          ))}

          {!loading && (!metrics?.taskCompletions || metrics.taskCompletions.length === 0) ? (
            <p className="hint">No hay tareas completadas todavía.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default TimeMetricsView;
