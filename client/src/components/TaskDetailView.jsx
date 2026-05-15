import { useEffect, useMemo, useState } from 'react';
import { formatBostonDateTime } from '../utils/dateTime';
import InfoHint from './InfoHint';
import SpeakButton from './SpeakButton';
import VoiceTextInput from './VoiceTextInput';

function getDurationMinutes(task, nowEpoch) {
  if (!task) {
    return 0;
  }

  if (task.status === 'PENDING') {
    return 0;
  }

  const storedMinutes = Number(task.taskDurationMinutes) || 0;

  if (task.status === 'STOPPED' || task.status === 'COMPLETED') {
    return storedMinutes;
  }

  const start = task.startedAt ? new Date(task.startedAt).getTime() : null;
  if (!start || Number.isNaN(start)) {
    return storedMinutes;
  }

  const end = nowEpoch;

  return storedMinutes + Math.max(0, Math.round((end - start) / 60000));
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

  if (task.status === 'STOPPED') {
    return 'Tiempo detenido';
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
  onSetStatus,
  onUploadPhoto,
  onAddComment,
  uploadingTaskId,
  addingComment = false
}) {
  const [nowEpoch, setNowEpoch] = useState(Date.now());
  const [commentText, setCommentText] = useState('');
  const [commentSource, setCommentSource] = useState('typed');

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

  const comments = task.comments || [];

  async function handleAddComment(event) {
    event.preventDefault();

    if (!commentText.trim()) {
      return;
    }

    await onAddComment?.(task, {
      text: commentText.trim(),
      source: commentSource
    });
    setCommentText('');
    setCommentSource('typed');
  }

  function requestStatus(nextStatus) {
    onSetStatus?.(task, nextStatus);
  }

  return (
    <section className="panel slide-up task-detail-panel">
      <InfoHint
        title="Detalle de tarea"
        text="Pantalla para revisar una tarea, escucharla, ver tiempos, agregar comentarios y subir fotos."
      />
      <div className="panel-header-row">
        <h2>Detalle</h2>
        <button type="button" className="secondary-action" onClick={onBack}>
          Volver
        </button>
      </div>

      <article className="task-card">
        <InfoHint
          title="Descripcion"
          text="Nombre o instruccion de la tarea. Use Escuchar si el trabajador no puede leerla."
        />
        <div className="task-card-header">
          <div className="task-title-with-audio">
            <h3>{task.description}</h3>
            <SpeakButton text={task.description} label="Escuchar tarea" />
          </div>
          <span className={`badge status-${task.status.toLowerCase()}`}>
            {statusLabels?.[task.status] || task.status}
          </span>
        </div>
      </article>

      <div className="summary-grid">
        <article className="summary-card">
          <InfoHint title="Creada" text="Fecha y hora en Boston en que se creo la tarea." />
          <p className="eyebrow">Creada</p>
          <p>{formatBostonDateTime(task.createdAt)}</p>
        </article>
        <article className="summary-card">
          <InfoHint title="Inicio real" text="Momento en que el contador de esta tarea empezo a correr." />
          <p className="eyebrow">Inicio real</p>
          <p>{task.startedAt ? formatBostonDateTime(task.startedAt) : 'Sin iniciar'}</p>
        </article>
        <article className="summary-card">
          <InfoHint title="Finalizacion" text="Momento en que la tarea fue marcada como terminada." />
          <p className="eyebrow">Finalización</p>
          <p>{task.completedAt ? formatBostonDateTime(task.completedAt) : (task.status === 'IN_PROGRESS' ? 'En curso' : '-')}</p>
        </article>
        <article className="summary-card">
          <InfoHint title="Ultima parada" text="Ultima vez que el contador de esta tarea fue detenido." />
          <p className="eyebrow">Última parada</p>
          <p>{task.stoppedAt ? formatBostonDateTime(task.stoppedAt) : '-'}</p>
        </article>
        <article className="summary-card">
          <InfoHint title="Tiempo" text="Tiempo acumulado en esta tarea. Si esta en marcha, sigue contando." />
          <p className="eyebrow">{getPrimaryDurationLabel(task)}</p>
          <h3>{formatDurationLabel(durationMinutes)}</h3>
        </article>
        <article className="summary-card">
          <InfoHint title="Fotos" text="Cantidad de fotos guardadas como evidencia de esta tarea." />
          <p className="eyebrow">Fotos adjuntas</p>
          <h3>{photos.length}</h3>
        </article>
      </div>

      {canManage ? (
        <div className="task-action-board" aria-label="Acciones de tarea">
          <InfoHint
            title="Acciones"
            text="Botones para iniciar, detener, reanudar o terminar el contador de la tarea."
          />
          {task.status === 'PENDING' ? (
            <button type="button" className="large-action start" onClick={() => requestStatus('IN_PROGRESS')}>
              <span aria-hidden>▶</span>
              <span>Iniciar</span>
            </button>
          ) : null}

          {task.status === 'IN_PROGRESS' ? (
            <>
              <button type="button" className="large-action stop" onClick={() => requestStatus('STOPPED')}>
                <span aria-hidden>■</span>
                <span>Detener</span>
              </button>
              <button type="button" className="large-action done" onClick={() => requestStatus('COMPLETED')}>
                <span aria-hidden>✓</span>
                <span>Terminar</span>
              </button>
            </>
          ) : null}

          {task.status === 'STOPPED' ? (
            <>
              <button type="button" className="large-action start" onClick={() => requestStatus('IN_PROGRESS')}>
                <span aria-hidden>▶</span>
                <span>Reanudar</span>
              </button>
              <button type="button" className="large-action done" onClick={() => requestStatus('COMPLETED')}>
                <span aria-hidden>✓</span>
                <span>Terminar</span>
              </button>
            </>
          ) : null}

          {task.status === 'COMPLETED' ? (
            <button type="button" className="large-action done" disabled>
              <span aria-hidden>✓</span>
              <span>Lista</span>
            </button>
          ) : null}

          <label htmlFor={`task-detail-photo-${task._id}`} className="secondary-action">
            <span aria-hidden>📷</span>
            <span>{uploadingTaskId === task._id ? 'Subiendo...' : 'Foto'}</span>
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

      {onAddComment ? (
        <form className="comment-form" onSubmit={handleAddComment}>
          <InfoHint
            title="Nuevo comentario"
            text="Guarde una nota de voz transcrita o escrita sobre lo que paso en la tarea."
          />
          <VoiceTextInput
            id={`task-comment-${task._id}`}
            label="Comentario"
            value={commentText}
            onChange={(nextValue) => {
              setCommentText(nextValue);
              if (commentSource !== 'voice') {
                setCommentSource('typed');
              }
            }}
            onVoiceCapture={() => setCommentSource('voice')}
            placeholder="Habla o escribe"
            rows={3}
            disabled={addingComment}
          />
          <button type="submit" className="cta-button" disabled={addingComment || !commentText.trim()}>
            {addingComment ? 'Guardando...' : 'Guardar comentario'}
          </button>
        </form>
      ) : null}

      <div className="panel-header-row">
        <h2>Comentarios</h2>
        <InfoHint
          title="Comentarios"
          text="Notas guardadas por trabajadores o supervisores. Cada comentario puede escucharse."
        />
        <span className="badge badge-muted">{comments.length}</span>
      </div>

      <div className="comment-list">
        {comments.map((comment) => (
          <article key={comment._id || `${comment.createdAt}-${comment.text}`} className="comment-card">
            <InfoHint
              title="Comentario"
              text="Nota asociada a esta tarea. Puede venir de voz o de texto."
            />
            <p>{comment.text}</p>
            <div className="comment-meta">
              <span>{comment.createdByName || 'Usuario'}</span>
              <span>{comment.source === 'voice' ? 'Voz' : 'Texto'}</span>
              <SpeakButton text={comment.text} label="Escuchar" />
            </div>
          </article>
        ))}

        {comments.length === 0 ? <p className="hint">Sin comentarios.</p> : null}
      </div>

      <div className="panel-header-row">
        <h2>Fotos</h2>
        <InfoHint
          title="Fotos"
          text="Evidencias fotograficas guardadas en Google Drive para esta tarea."
        />
        <span className="badge badge-muted">{photos.length}</span>
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
