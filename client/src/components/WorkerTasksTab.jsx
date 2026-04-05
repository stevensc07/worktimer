import { useEffect, useState } from 'react';
import { uploadActivityPhoto } from '../api/activityApi';
import { createTask, listTasks, updateTaskStatus } from '../api/taskApi';

const TASK_STATUS = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
const TASK_STATUS_LABEL = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completada'
};

function nextTaskStatus(current) {
  const index = TASK_STATUS.indexOf(current);
  if (index < 0 || index === TASK_STATUS.length - 1) {
    return TASK_STATUS[TASK_STATUS.length - 1];
  }

  return TASK_STATUS[index + 1];
}

function WorkerTasksTab({ token, activeSession }) {
  const [description, setDescription] = useState('');
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [uploadingTaskId, setUploadingTaskId] = useState(null);

  async function loadTasks(nextFilter = statusFilter) {
    setIsLoading(true);

    try {
      const data = await listTasks(token, {
        status: nextFilter || undefined
      });

      setTasks(data);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTasks('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleCreateTask(event) {
    event.preventDefault();

    if (!description.trim()) {
      setFeedback('Debes escribir una descripción para crear la tarea.');
      return;
    }

    setFeedback('');
    setIsCreating(true);

    try {
      await createTask(token, {
        description: description.trim(),
        workSessionId: activeSession?._id
      });

      setDescription('');
      setFeedback('Tarea creada correctamente.');
      await loadTasks();
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleStatusAdvance(task) {
    const status = nextTaskStatus(task.status);

    if (status === task.status) {
      return;
    }

    try {
      const updated = await updateTaskStatus(token, task._id, status);

      setTasks((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
      setFeedback(`Tarea actualizada a ${TASK_STATUS_LABEL[status]}.`);
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function handlePhotoUpload(task, file) {
    if (!file) {
      return;
    }

    setUploadingTaskId(task._id);

    try {
      await uploadActivityPhoto(token, {
        file,
        taskId: task._id,
        workSessionId: activeSession?._id
      });

      setFeedback(`Foto adjuntada a la tarea: ${task.description}`);
      await loadTasks();
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setUploadingTaskId(null);
    }
  }

  async function handleFilterChange(nextFilter) {
    setStatusFilter(nextFilter);
    await loadTasks(nextFilter);
  }

  return (
    <div className="tab-content-grid tasks-tab-grid">
      <section className="panel slide-up">
        <div className="panel-header-row">
          <h2>Crear Actividad</h2>
          <span className="badge badge-muted">{tasks.length} tareas</span>
        </div>

        <form className="task-create-form" onSubmit={handleCreateTask}>
          <input
            type="text"
            placeholder="Describe la actividad de obra"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
          />
          <button type="submit" className="cta-button" disabled={isCreating}>
            {isCreating ? 'Creando...' : 'Crear tarea'}
          </button>
        </form>

        <div className="filter-row">
          <button
            type="button"
            className={`filter-chip ${statusFilter === '' ? 'active' : ''}`}
            onClick={() => handleFilterChange('')}
          >
            Todas
          </button>
          <button
            type="button"
            className={`filter-chip ${statusFilter === 'PENDING' ? 'active' : ''}`}
            onClick={() => handleFilterChange('PENDING')}
          >
            Pendientes
          </button>
          <button
            type="button"
            className={`filter-chip ${statusFilter === 'IN_PROGRESS' ? 'active' : ''}`}
            onClick={() => handleFilterChange('IN_PROGRESS')}
          >
            En progreso
          </button>
          <button
            type="button"
            className={`filter-chip ${statusFilter === 'COMPLETED' ? 'active' : ''}`}
            onClick={() => handleFilterChange('COMPLETED')}
          >
            Completadas
          </button>
        </div>
      </section>

      <section className="panel slide-up">
        <div className="panel-header-row">
          <h2>Tareas de la Jornada</h2>
          {isLoading ? <span className="badge badge-muted">Cargando...</span> : null}
        </div>

        <div className="task-list">
          {tasks.map((task) => (
            <article key={task._id} className="task-card">
              <div className="task-card-header">
                <h3>{task.description}</h3>
                <span className={`badge status-${task.status.toLowerCase()}`}>
                  {TASK_STATUS_LABEL[task.status]}
                </span>
              </div>

              <p className="hint">Fotos adjuntas: {task.googleDriveFileIds?.length || 0}</p>

              <div className="task-card-actions">
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => handleStatusAdvance(task)}
                  disabled={task.status === 'COMPLETED'}
                >
                  {task.status === 'PENDING' && 'Iniciar'}
                  {task.status === 'IN_PROGRESS' && 'Marcar completada'}
                  {task.status === 'COMPLETED' && 'Completada'}
                </button>

                <label htmlFor={`task-photo-${task._id}`} className="secondary-action">
                  {uploadingTaskId === task._id ? 'Subiendo...' : 'Adjuntar foto'}
                </label>
                <input
                  id={`task-photo-${task._id}`}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(event) => handlePhotoUpload(task, event.target.files?.[0])}
                  disabled={uploadingTaskId === task._id}
                />
              </div>
            </article>
          ))}

          {!isLoading && tasks.length === 0 ? <p className="hint">No hay tareas registradas aún.</p> : null}
        </div>

        {feedback ? <p className="feedback">{feedback}</p> : null}
      </section>
    </div>
  );
}

export default WorkerTasksTab;
