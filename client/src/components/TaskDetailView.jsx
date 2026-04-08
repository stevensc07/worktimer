import { useEffect, useMemo, useState } from 'react';

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getDurationMinutes(task, nowEpoch) {
  if (!task) {
    return 0;
  }

  if (task.status === 'PENDING') {
    return 0;
  }

  const start = task.startedAt ? new Date(task.startedAt).getTime() : null;
  if (!start || Number.isNaN(start)) {
    return 0;
  }

  const end = task.status === 'COMPLETED'
    ? new Date(task.completedAt || task.updatedAt || task.startedAt).getTime()
    : nowEpoch;

  return Math.max(0, Math.round((end - start) / 60000));
}

function formatDurationLabel(totalMinutes) {
  const safeMinutes = Number(totalMinutes) || 0;
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
}

function buildDriveUrls(fileId) {
  return {
    viewUrl: `https://drive.google.com/file/d/${fileId}/view`,
    directImageUrl: `https://lh3.googleusercontent.com/d/${fileId}=w1600`,
    fallbackImageUrl: `https://drive.google.com/uc?export=view&id=${fileId}`
  };
}

function getPrimaryDurationLabel(task) {
  if (task.status === 'COMPLETED') {
    return 'Tiempo total';
  }

  if (task.status === 'IN_PROGRESS') {
    return 'Tiempo en curso';
  }

  return 'Tiempo sin iniciar';
}

function TaskPhotoItem({ photo, index }) {
  const [imageSrc, setImageSrc] = useState(photo.directImageUrl);
  const [usedFallback, setUsedFallback] = useState(false);

  function handleImageError() {
    if (!usedFallback) {
      setUsedFallback(true);
      setImageSrc(photo.fallbackImageUrl);
      return;
    }

    setImageSrc('');
  }

  return (
    <a
      className="task-photo-card"
      href={photo.viewUrl}
      target="_blank"
      rel="noreferrer"
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={`Evidencia ${index + 1}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={handleImageError}
        />
      ) : (
        <div className="task-photo-broken">Vista previa no disponible</div>
      )}
      <span>Foto {index + 1}</span>
    </a>
  );
}

function TaskDetailView({
  task,
  onBack,
  statusLabels,
  canManage = false,
  onAdvanceStatus,
  onUploadPhoto,
  uploadingTaskId
}) {
  const [nowEpoch, setNowEpoch] = useState(Date.now());

  useEffect(() => {
    if (!task || task.status !== 'IN_PROGRESS') {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setNowEpoch(Date.now());
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [task]);

  const durationMinutes = useMemo(() => getDurationMinutes(task, nowEpoch), [task, nowEpoch]);

  const photos = useMemo(
    () => (task.googleDriveFileIds || []).map((fileId) => ({ fileId, ...buildDriveUrls(fileId) })),
    [task.googleDriveFileIds]
  );

  return (
    <section className="panel slide-up task-detail-panel">
      <div className="panel-header-row">
        <h2>Detalle de Tarea</h2>
        <button type="button" className="secondary-action" onClick={onBack}>
          Volver a lista
        </button>
      </div>

      <article className="task-card">
        <div className="task-card-header">
          <h3>{task.description}</h3>
          <span className={`badge status-${task.status.toLowerCase()}`}>
            {statusLabels?.[task.status] || task.status}
          </span>
        </div>
      </article>

      <div className="summary-grid">
        <article className="summary-card">
          <p className="eyebrow">Creada</p>
          <p>{formatDateTime(task.createdAt)}</p>
        </article>
        <article className="summary-card">
          <p className="eyebrow">Inicio real</p>
          <p>{task.startedAt ? formatDateTime(task.startedAt) : 'Sin iniciar'}</p>
        </article>
        <article className="summary-card">
          <p className="eyebrow">Finalización</p>
          <p>{task.completedAt ? formatDateTime(task.completedAt) : (task.status === 'IN_PROGRESS' ? 'En curso' : '-')}</p>
        </article>
        <article className="summary-card">
          <p className="eyebrow">{getPrimaryDurationLabel(task)}</p>
          <h3>{formatDurationLabel(durationMinutes)}</h3>
        </article>
        <article className="summary-card">
          <p className="eyebrow">Fotos adjuntas</p>
          <h3>{photos.length}</h3>
        </article>
      </div>

      {canManage ? (
        <div className="task-card-actions">
          <button
            type="button"
            className="secondary-action"
            onClick={() => onAdvanceStatus?.(task)}
            disabled={task.status === 'COMPLETED'}
          >
            {task.status === 'PENDING' && 'Iniciar'}
            {task.status === 'IN_PROGRESS' && 'Marcar completada'}
            {task.status === 'COMPLETED' && 'Completada'}
          </button>

          <label htmlFor={`task-detail-photo-${task._id}`} className="secondary-action">
            {uploadingTaskId === task._id ? 'Subiendo...' : 'Adjuntar foto'}
          </label>
          <input
            id={`task-detail-photo-${task._id}`}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => onUploadPhoto?.(task, event.target.files?.[0])}
            disabled={uploadingTaskId === task._id}
          />
        </div>
      ) : null}

      <div className="panel-header-row">
        <h2>Evidencia fotográfica</h2>
        <span className="badge badge-muted">{photos.length} archivos</span>
      </div>

      <div className="task-photo-grid">
        {photos.map((photo, index) => (
          <TaskPhotoItem
            key={photo.fileId}
            photo={photo}
            index={index}
          />
        ))}

        {photos.length === 0 ? (
          <p className="hint">Esta tarea todavía no tiene fotos adjuntas.</p>
        ) : null}
      </div>
    </section>
  );
}

export default TaskDetailView;
