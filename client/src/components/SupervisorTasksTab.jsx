import { useEffect, useMemo, useState } from 'react';
import { addTaskComment, listTasks, updateTaskStatus } from '../api/taskApi';
import { listWorkers } from '../api/userApi';
import InfoHint from './InfoHint';
import SpeakButton from './SpeakButton';
import TaskDetailView from './TaskDetailView';

const STATUS_LABEL = {
  PENDING: 'Por hacer',
  IN_PROGRESS: 'En marcha',
  STOPPED: 'Detenida',
  COMPLETED: 'Lista'
};

const STATUS_ICON = {
  PENDING: '🟡',
  IN_PROGRESS: '🟢',
  STOPPED: '🛑',
  COMPLETED: '✅'
};

function SupervisorTasksTab({ token }) {
  const [workers, setWorkers] = useState([]);
  const [workerId, setWorkerId] = useState('');
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [addingComment, setAddingComment] = useState(false);

  const selectedTask = useMemo(
    () => tasks.find((task) => String(task._id) === String(selectedTaskId)) || null,
    [tasks, selectedTaskId]
  );

  function mergeUpdatedTask(updated) {
    setTasks((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
  }

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
    async function loadTasks() {
      if (!workerId) {
        setTasks([]);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const data = await listTasks(token, { workerId });
        setTasks(data);
        setSelectedTaskId((current) => (
          current && !data.some((item) => String(item._id) === String(current)) ? '' : current
        ));
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, [token, workerId]);

  async function handleSetStatus(task, status) {
    setUpdatingTaskId(task._id);
    setError('');

    try {
      const updated = await updateTaskStatus(token, task._id, status);
      mergeUpdatedTask(updated);
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function handleAddComment(task, payload) {
    setAddingComment(true);
    setError('');

    try {
      const updated = await addTaskComment(token, task._id, payload);
      mergeUpdatedTask(updated);
    } catch (commentError) {
      setError(commentError.message);
      throw commentError;
    } finally {
      setAddingComment(false);
    }
  }

  function renderSupervisorActions(task) {
    if (task.status !== 'IN_PROGRESS') {
      return null;
    }

    return (
      <button
        type="button"
        className="large-action stop"
        onClick={() => handleSetStatus(task, 'STOPPED')}
        disabled={updatingTaskId === task._id}
      >
        <span aria-hidden>■</span>
        <span>Detener</span>
      </button>
    );
  }

  return (
    <div className="tab-content-grid supervisor-tasks-grid">
      <section className="panel slide-up">
        <InfoHint
          title="Filtro de trabajador"
          text="Seleccione un obrero para revisar sus tareas y detener una tarea en marcha si hace falta."
        />
        <div className="panel-header-row">
          <h2>Tareas</h2>
          {loading ? <span className="badge badge-muted">Cargando...</span> : null}
        </div>

        <label htmlFor="tasks-worker-select" className="eyebrow">Trabajador</label>
        <select
          id="tasks-worker-select"
          className="input-select"
          value={workerId}
          onChange={(event) => {
            setWorkerId(event.target.value);
            setSelectedTaskId('');
          }}
        >
          {workers.map((worker) => (
            <option key={worker._id} value={worker._id}>
              {worker.name} ({worker.employeeId})
            </option>
          ))}
        </select>
      </section>

      {selectedTask ? (
        <TaskDetailView
          task={selectedTask}
          onBack={() => setSelectedTaskId('')}
          statusLabels={STATUS_LABEL}
          canManage
          onSetStatus={handleSetStatus}
          onAddComment={handleAddComment}
          addingComment={addingComment}
        />
      ) : (
        <section className="panel slide-up">
          <InfoHint
            title="Tareas del trabajador"
            text="Muestra todas las tareas del obrero seleccionado con estado, fotos y comentarios."
          />
          <div className="task-list">
            {tasks.map((task) => (
              <article key={task._id} className={`task-card task-status-${task.status.toLowerCase()}`}>
                <InfoHint
                  title="Tarea supervisada"
                  text="Toque el cuadro para abrir detalles. Si esta en marcha, puede detener el contador."
                />
                <button
                  type="button"
                  className="task-card-open"
                  onClick={() => setSelectedTaskId(String(task._id))}
                >
                  <span className="task-state-icon" aria-hidden>{STATUS_ICON[task.status]}</span>
                  <span className="task-card-main">
                    <strong>{task.description}</strong>
                    <small>
                      {STATUS_LABEL[task.status]} · Fotos {task.googleDriveFileIds?.length || 0} · Comentarios {task.comments?.length || 0}
                    </small>
                  </span>
                  <span className={`badge status-${task.status.toLowerCase()}`}>
                    {STATUS_LABEL[task.status]}
                  </span>
                </button>

                <div className="task-card-actions">
                  <SpeakButton text={task.description} label="Escuchar" />
                  {renderSupervisorActions(task)}
                </div>
              </article>
            ))}

            {!loading && tasks.length === 0 ? <p className="hint">Sin tareas.</p> : null}
          </div>

          {error ? <p className="feedback error" aria-live="polite">{error}</p> : null}
        </section>
      )}

      {selectedTask && error ? <p className="feedback error" aria-live="polite">{error}</p> : null}
    </div>
  );
}

export default SupervisorTasksTab;
