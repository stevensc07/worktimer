import { useEffect, useMemo, useState } from 'react';
import { uploadActivityPhoto } from '../api/activityApi';
import { addTaskComment, createTask, listTasks, updateTaskStatus } from '../api/taskApi';
import InfoHint from './InfoHint';
import SpeakButton from './SpeakButton';
import TaskDetailView from './TaskDetailView';
import VoiceTextInput from './VoiceTextInput';

const TASK_STATUS_LABEL = {
  PENDING: 'Por hacer',
  IN_PROGRESS: 'En marcha',
  STOPPED: 'Detenida',
  COMPLETED: 'Lista'
};

const TASK_STATUS_ICON = {
  PENDING: '🟡',
  IN_PROGRESS: '🟢',
  STOPPED: '🛑',
  COMPLETED: '✅'
};

const FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'PENDING', label: 'Por hacer' },
  { value: 'IN_PROGRESS', label: 'En marcha' },
  { value: 'STOPPED', label: 'Detenidas' },
  { value: 'COMPLETED', label: 'Listas' }
];

function WorkerTasksTab({ token, activeSession }) {
  const [description, setDescription] = useState('');
  const [descriptionSource, setDescriptionSource] = useState('typed');
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [uploadingTaskId, setUploadingTaskId] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [addingComment, setAddingComment] = useState(false);

  const selectedTask = useMemo(
    () => tasks.find((task) => String(task._id) === String(selectedTaskId)) || null,
    [tasks, selectedTaskId]
  );

  async function loadTasks(nextFilter = statusFilter) {
    setIsLoading(true);

    try {
      const data = await listTasks(token, {
        status: nextFilter || undefined
      });

      setTasks(data);
      setSelectedTaskId((current) => (
        current && !data.some((item) => String(item._id) === String(current)) ? '' : current
      ));
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

  function mergeUpdatedTask(updated) {
    setTasks((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
  }

  async function handleCreateTask(event) {
    event.preventDefault();

    if (!description.trim()) {
      setFeedback('Habla o escribe una tarea.');
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
      setDescriptionSource('typed');
      setFeedback(descriptionSource === 'voice' ? 'Tarea creada con voz.' : 'Tarea creada.');
      await loadTasks();
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSetStatus(task, status) {
    setUpdatingTaskId(task._id);

    try {
      const updated = await updateTaskStatus(token, task._id, status);
      mergeUpdatedTask(updated);
      setFeedback(`Tarea: ${TASK_STATUS_LABEL[status]}.`);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function handleAddComment(task, payload) {
    setAddingComment(true);

    try {
      const updated = await addTaskComment(token, task._id, payload);
      mergeUpdatedTask(updated);
      setFeedback(payload.source === 'voice' ? 'Comentario de voz guardado.' : 'Comentario guardado.');
    } catch (error) {
      setFeedback(error.message);
      throw error;
    } finally {
      setAddingComment(false);
    }
  }

  async function handlePhotoUpload(task, file) {
    if (!file) {
      return;
    }

    setUploadingTaskId(task._id);

    try {
      const uploaded = await uploadActivityPhoto(token, {
        file,
        taskId: task._id,
        workSessionId: activeSession?._id
      });

      setTasks((prev) => prev.map((item) => {
        if (String(item._id) !== String(task._id)) {
          return item;
        }

        const existingFileIds = item.googleDriveFileIds || [];
        if (!uploaded?.fileId || existingFileIds.includes(uploaded.fileId)) {
          return item;
        }

        return {
          ...item,
          googleDriveFileIds: [...existingFileIds, uploaded.fileId]
        };
      }));
      setFeedback('Foto guardada.');
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

  function renderTaskActions(task) {
    const isUpdating = updatingTaskId === task._id;

    return (
      <div className="task-action-board compact" onClick={(event) => event.stopPropagation()}>
        {task.status === 'PENDING' ? (
          <button
            type="button"
            className="large-action start"
            onClick={() => handleSetStatus(task, 'IN_PROGRESS')}
            disabled={isUpdating}
          >
            <span aria-hidden>▶</span>
            <span>Iniciar</span>
          </button>
        ) : null}

        {task.status === 'IN_PROGRESS' ? (
          <>
            <button
              type="button"
              className="large-action stop"
              onClick={() => handleSetStatus(task, 'STOPPED')}
              disabled={isUpdating}
            >
              <span aria-hidden>■</span>
              <span>Detener</span>
            </button>
            <button
              type="button"
              className="large-action done"
              onClick={() => handleSetStatus(task, 'COMPLETED')}
              disabled={isUpdating}
            >
              <span aria-hidden>✓</span>
              <span>Lista</span>
            </button>
          </>
        ) : null}

        {task.status === 'STOPPED' ? (
          <>
            <button
              type="button"
              className="large-action start"
              onClick={() => handleSetStatus(task, 'IN_PROGRESS')}
              disabled={isUpdating}
            >
              <span aria-hidden>▶</span>
              <span>Seguir</span>
            </button>
            <button
              type="button"
              className="large-action done"
              onClick={() => handleSetStatus(task, 'COMPLETED')}
              disabled={isUpdating}
            >
              <span aria-hidden>✓</span>
              <span>Lista</span>
            </button>
          </>
        ) : null}
      </div>
    );
  }

  if (selectedTask) {
    return (
      <div className="tab-content-grid tasks-tab-grid">
        <TaskDetailView
          task={selectedTask}
          onBack={() => setSelectedTaskId('')}
          statusLabels={TASK_STATUS_LABEL}
          canManage
          onSetStatus={handleSetStatus}
          onUploadPhoto={handlePhotoUpload}
          onAddComment={handleAddComment}
          uploadingTaskId={uploadingTaskId}
          addingComment={addingComment}
        />

        {feedback ? <p className="feedback" aria-live="polite">{feedback}</p> : null}
      </div>
    );
  }

  return (
    <div className="tab-content-grid tasks-tab-grid">
      <section className="panel slide-up">
        <InfoHint
          title="Nueva tarea"
          text="Sirve para crear una actividad. Puede hablar por el microfono o escribir."
        />
        <div className="panel-header-row">
          <h2>Nueva tarea</h2>
          <span className="badge badge-muted">{tasks.length}</span>
        </div>

        <form className="task-create-form" onSubmit={handleCreateTask}>
          <VoiceTextInput
            id="task-description"
            label="Tarea"
            value={description}
            onChange={(nextValue) => {
              setDescription(nextValue);
              if (descriptionSource !== 'voice') {
                setDescriptionSource('typed');
              }
            }}
            onVoiceCapture={() => setDescriptionSource('voice')}
            placeholder="Habla o escribe"
            rows={3}
            disabled={isCreating}
          />
          <button type="submit" className="cta-button" disabled={isCreating || !description.trim()}>
            {isCreating ? 'Creando...' : 'Crear tarea'}
          </button>
        </form>

        <div className="filter-row" aria-label="Filtro de tareas">
          {FILTERS.map((filter) => (
            <button
              key={filter.value || 'all'}
              type="button"
              className={`filter-chip ${statusFilter === filter.value ? 'active' : ''}`}
              onClick={() => handleFilterChange(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel slide-up">
        <InfoHint
          title="Mis tareas"
          text="Lista de trabajos del obrero. Desde aqui puede escuchar, iniciar, detener, terminar o tomar foto."
        />
        <div className="panel-header-row">
          <h2>Mis tareas</h2>
          {isLoading ? <span className="badge badge-muted">Cargando...</span> : null}
        </div>

        <div className="task-list">
          {tasks.map((task) => (
            <article key={task._id} className={`task-card task-status-${task.status.toLowerCase()}`}>
              <InfoHint
                title="Tarea"
                text="Este cuadro muestra una tarea, su estado, fotos y comentarios. Toque el cuadro para ver detalles."
              />
              <button
                type="button"
                className="task-card-open"
                onClick={() => setSelectedTaskId(String(task._id))}
              >
                <span className="task-state-icon" aria-hidden>{TASK_STATUS_ICON[task.status]}</span>
                <span className="task-card-main">
                  <strong>{task.description}</strong>
                  <small>
                    {TASK_STATUS_LABEL[task.status]} · Fotos {task.googleDriveFileIds?.length || 0} · Comentarios {task.comments?.length || 0}
                  </small>
                </span>
                <span className={`badge status-${task.status.toLowerCase()}`}>
                  {TASK_STATUS_LABEL[task.status]}
                </span>
              </button>

              <div className="task-card-actions">
                <SpeakButton text={task.description} label="Escuchar" />
                {renderTaskActions(task)}
                <label htmlFor={`task-photo-${task._id}`} className="secondary-action">
                  <span aria-hidden>📷</span>
                  <span>{uploadingTaskId === task._id ? 'Subiendo...' : 'Foto'}</span>
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

          {!isLoading && tasks.length === 0 ? <p className="hint">No hay tareas.</p> : null}
        </div>

        {feedback ? <p className="feedback" aria-live="polite">{feedback}</p> : null}
      </section>
    </div>
  );
}

export default WorkerTasksTab;
